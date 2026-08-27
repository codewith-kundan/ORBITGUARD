import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus
from backend.app.services.propagation_service import PropagationService
from backend.app.services.risk_service import RiskService
from backend.app.utils.distance import (
    euclidean_distance_3d,
    compute_spatial_separation
)

logger = logging.getLogger(__name__)


class ConjunctionService:
    """
    Deterministic Space Situational Awareness (SSA) Collision Assessment Engine.
    Stabilized: Always screens the catalog with deterministic seed ranking to produce
    a consistent, high-priority watchlist of close-approach conjunctions (top encounters).
    """

    @staticmethod
    def broad_phase_filter(
        objects: List[OrbitalObject],
        max_pairs: int = 400,
        altitude_buffer_km: float = 75.0
    ) -> List[Tuple[OrbitalObject, OrbitalObject]]:
        """
        Broad-phase spatial screening:
        Filter pairs whose mean orbital shells overlap within altitude_buffer_km.
        Sort deterministically by proximity and inclination intersection.
        """
        valid_objects = [
            o for o in objects
            if o.tle_line1 and o.tle_line2 and o.perigee_km is not None and o.apogee_km is not None
        ]

        if len(valid_objects) < 2:
            return []

        # Deterministic sorting so candidate pairs are identical across runs
        valid_objects.sort(key=lambda o: (o.perigee_km or 0.0, o.norad_id))

        # Prioritize key operational assets (ISS, Tiangong, high-value satellites)
        high_priority_norads = {25544, 48274, 20580, 43013, 44713, 44714, 44715}
        high_value = [o for o in valid_objects if o.norad_id in high_priority_norads or o.object_type == ObjectType.ACTIVE_SATELLITE]
        debris_and_others = [o for o in valid_objects if o not in high_value]

        selected_primaries = high_value[:150] if high_value else valid_objects[:100]
        threat_pool = (debris_and_others + high_value)[:600]

        candidate_pairs = []
        seen_pairs = set()

        for p in selected_primaries:
            p_mid = (p.perigee_km + p.apogee_km) / 2.0
            p_inc = p.inclination or 0.0

            for t in threat_pool:
                if p.id == t.id or p.norad_id == t.norad_id:
                    continue

                t_mid = (t.perigee_km + t.apogee_km) / 2.0
                if abs(p_mid - t_mid) <= altitude_buffer_km:
                    t_inc = t.inclination or 0.0
                    inc_diff = abs(p_inc - t_inc)

                    # Orbital planes crossing score
                    priority = 0.0 if (3.0 <= inc_diff <= 175.0) else 1.0
                    priority += abs(p_mid - t_mid) / 50.0

                    pair_key = tuple(sorted([p.id, t.id]))
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        candidate_pairs.append((priority, pair_key, p, t))

        # Deterministic order
        candidate_pairs.sort(key=lambda x: (x[0], x[1]))
        unique_pairs = [(item[2], item[3]) for item in candidate_pairs[:max_pairs]]

        logger.info(f"Broad-phase screening generated {len(unique_pairs)} candidate crossing pairs")
        return unique_pairs

    @staticmethod
    def find_tca_between_objects(
        obj_a: OrbitalObject,
        obj_b: OrbitalObject,
        start_time: datetime,
        end_time: datetime,
        coarse_step_minutes: float = 3.0,
        threshold_km: float = 80.0
    ) -> List[Dict[str, Any]]:
        """
        Narrow-phase propagation & fine TCA refinement for a candidate pair.
        1. Coarse step search across screening window.
        2. Golden-section/fine refinement around minimum distance point.
        3. Real 3D miss distance, relative velocity, and geodetic coordinates computation.
        """
        coarse_step = timedelta(minutes=max(2.0, coarse_step_minutes))
        curr_time = start_time

        prev_dist = None
        prev_prev_dist = None
        prev_time = None
        candidate_tcas = []

        # Coarse sweep: detect local minima
        while curr_time <= end_time:
            pos_a = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, curr_time)
            pos_b = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, curr_time)

            if pos_a and pos_b:
                dist = euclidean_distance_3d(pos_a.x_km, pos_a.y_km, pos_a.z_km, pos_b.x_km, pos_b.y_km, pos_b.z_km)

                if prev_dist is not None and prev_prev_dist is not None:
                    if prev_dist < prev_prev_dist and prev_dist < dist and prev_dist < (threshold_km * 2.0):
                        candidate_tcas.append((prev_time, prev_dist))

                prev_prev_dist = prev_dist
                prev_dist = dist
                prev_time = curr_time

            curr_time += coarse_step

        close_events = []

        for coarse_tca, c_dist in candidate_tcas:
            # Fine 10-second sweep around minimum
            fine_start = coarse_tca - timedelta(minutes=coarse_step_minutes)
            fine_end = coarse_tca + timedelta(minutes=coarse_step_minutes)
            fine_step = timedelta(seconds=10)

            t = fine_start
            fine_min_dist = float('inf')
            refined_tca = coarse_tca

            while t <= fine_end:
                pa = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, t)
                pb = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, t)
                if pa and pb:
                    d = euclidean_distance_3d(pa.x_km, pa.y_km, pa.z_km, pb.x_km, pb.y_km, pb.z_km)
                    if d < fine_min_dist:
                        fine_min_dist = d
                        refined_tca = t

                t += fine_step

            # Only record if within screening threshold
            if fine_min_dist <= threshold_km:
                sep = compute_spatial_separation(
                    obj_a.tle_line1, obj_a.tle_line2,
                    obj_b.tle_line1, obj_b.tle_line2,
                    target_time=refined_tca
                )

                if sep["miss_distance_km"] < 0.05 and sep["relative_velocity_km_s"] < 0.05:
                    continue

                refined_pos_a = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, refined_tca)
                refined_pos_b = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, refined_tca)

                avg_alt = (refined_pos_a.alt_km + refined_pos_b.alt_km) / 2.0 if refined_pos_a and refined_pos_b else 500.0
                avg_lat = (refined_pos_a.lat + refined_pos_b.lat) / 2.0 if refined_pos_a and refined_pos_b else 0.0
                avg_lon = (refined_pos_a.lon + refined_pos_b.lon) / 2.0 if refined_pos_a and refined_pos_b else 0.0

                score, level, factors = RiskService.compute_risk_score(
                    miss_distance_km=sep["miss_distance_km"],
                    relative_velocity_km_s=sep["relative_velocity_km_s"],
                    tca=refined_tca,
                    current_time=start_time
                )

                close_events.append({
                    "object_a_id": obj_a.id,
                    "object_b_id": obj_b.id,
                    "object_a": obj_a,
                    "object_b": obj_b,
                    "tca": refined_tca,
                    "miss_distance_km": sep["miss_distance_km"],
                    "relative_velocity_km_s": sep["relative_velocity_km_s"],
                    "altitude_km": round(avg_alt, 2),
                    "latitude_deg": round(avg_lat, 4),
                    "longitude_deg": round(avg_lon, 4),
                    "risk_score": score,
                    "risk_level": level,
                    "collision_probability": factors.get("collision_probability", {}).get("probability_percentage", 0.01) if isinstance(factors.get("collision_probability"), dict) else factors.get("collision_probability", 0.01),
                    "probability_method": factors.get("collision_probability", {}).get("mathematical_model", "Foster-2D Isotropic Hard-Body") if isinstance(factors.get("collision_probability"), dict) else factors.get("probability_methodology", "Foster-2D Isotropic Hard-Body"),
                    "approach_angle_deg": factors.get("approach_geometry_factor", {}).get("angle_deg", 45.0),
                    "combined_size_m": factors.get("object_size_factor", {}).get("size_m", 5.0),
                    "factors": factors
                })

        if close_events:
            close_events.sort(key=lambda x: x["miss_distance_km"])
            return [close_events[0]]

        return []

    @staticmethod
    def run_full_conjunction_screening(
        db: Session,
        window_hours: int = 24,
        threshold_km: Optional[float] = None,
        coarse_step_minutes: float = 3.0,
        target_stable_count: int = 12
    ) -> Dict[str, Any]:
        """
        Executes end-to-end conjunction screening across tracked objects in the database.
        Stabilized: Returns a clean, stable top-N watchlist of the highest priority conjunction events.
        """
        if threshold_km is None:
            threshold_km = 80.0

        objects = db.query(OrbitalObject).all()
        if len(objects) < 2:
            return {"screened_pairs": 0, "conjunctions_found": 0, "conjunctions": []}

        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(hours=window_hours)

        candidate_pairs = ConjunctionService.broad_phase_filter(objects, max_pairs=400, altitude_buffer_km=85.0)
        logger.info(f"Broad-phase screened {len(candidate_pairs)} candidate pairs from {len(objects)} objects")

        detected_events = []
        for pair_idx, (obj_a, obj_b) in enumerate(candidate_pairs):
            events = ConjunctionService.find_tca_between_objects(
                obj_a, obj_b, start_time, end_time,
                coarse_step_minutes=coarse_step_minutes,
                threshold_km=threshold_km
            )
            detected_events.extend(events)

        # Stable sorting by risk score descending then miss distance ascending
        detected_events.sort(key=lambda x: (-x["risk_score"], x["miss_distance_km"]))
        top_stable_events = detected_events[:target_stable_count]

        # Atomically replace database records with stable top set
        db.query(Alert).delete()
        db.query(Conjunction).delete()
        
        for ev in top_stable_events:
            conj = Conjunction(
                object_a_id=ev["object_a_id"],
                object_b_id=ev["object_b_id"],
                tca=ev["tca"],
                miss_distance_km=ev["miss_distance_km"],
                relative_velocity_km_s=ev["relative_velocity_km_s"],
                altitude_km=ev["altitude_km"],
                latitude_deg=ev["latitude_deg"],
                longitude_deg=ev["longitude_deg"],
                risk_score=ev["risk_score"],
                risk_level=ev["risk_level"],
                collision_probability=ev.get("collision_probability", 0.01),
                probability_method=ev.get("probability_method", "Foster-2D Isotropic Hard-Body"),
                approach_angle_deg=ev.get("approach_angle_deg", 45.0),
                combined_size_m=ev.get("combined_size_m", 5.0),
                status="ACTIVE",
                calculated_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(conj)
            db.flush()

            if ev["risk_level"] in [RiskLevel.HIGH, RiskLevel.CRITICAL, "HIGH", "CRITICAL"]:
                alert = Alert(
                    conjunction_id=conj.id,
                    severity=ev["risk_level"],
                    title=f"Collision Risk: {ev['object_a'].name} ↔ {ev['object_b'].name}",
                    status=AlertStatus.ACTIVE,
                    message=f"Predicted miss distance of {ev['miss_distance_km']:.2f} km at {ev['tca'].strftime('%Y-%m-%d %H:%M:%S')} UTC (Risk: {ev['risk_score']}/100)",
                    created_at=datetime.utcnow()
                )
                db.add(alert)

        db.commit()
        return {
            "screened_pairs": len(candidate_pairs),
            "conjunctions_found": len(top_stable_events),
            "conjunctions": top_stable_events
        }

    @staticmethod
    def prune_expired_conjunctions(db: Session, grace_period_minutes: int = 15) -> int:
        """Prunes conjunctions that have already passed TCA + grace period."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=grace_period_minutes)
        expired = db.query(Conjunction).filter(Conjunction.tca < cutoff).all()
        count = len(expired)
        for c in expired:
            db.query(Alert).filter(Alert.conjunction_id == c.id).delete()
            db.delete(c)
        db.commit()
        return count
