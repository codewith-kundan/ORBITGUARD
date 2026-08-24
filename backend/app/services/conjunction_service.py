import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.orbital_object import OrbitalObject
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertStatus
from backend.app.services.propagation_service import PropagationService
from backend.app.services.risk_service import RiskService
from backend.app.utils.distance import compute_spatial_separation, euclidean_distance_3d

logger = logging.getLogger(__name__)

class ConjunctionService:
    @staticmethod
    def broad_phase_filter(
        objects: List[OrbitalObject],
        altitude_buffer_km: float = 20.0,
        max_pairs: int = 60
    ) -> List[Tuple[OrbitalObject, OrbitalObject]]:
        """
        High-performance O(N log N) sweep-line broad-phase screening.
        Sorts objects by orbital altitude and checks overlapping intervals using a sliding window.
        """
        valid_objects = [
            obj for obj in objects
            if obj.perigee_km is not None and obj.apogee_km is not None
        ]
        
        # Sort objects by mean altitude
        valid_objects.sort(key=lambda o: (o.perigee_km + o.apogee_km) / 2.0)
        
        candidate_pairs = []
        n = len(valid_objects)

        for i in range(n):
            obj_a = valid_objects[i]
            a_min = obj_a.perigee_km - altitude_buffer_km
            a_max = obj_a.apogee_km + altitude_buffer_km
            a_mid = (obj_a.perigee_km + obj_a.apogee_km) / 2.0

            for j in range(i + 1, min(i + 40, n)):
                obj_b = valid_objects[j]
                b_min = obj_b.perigee_km - altitude_buffer_km
                b_max = obj_b.apogee_km + altitude_buffer_km

                # If obj_b is entirely above obj_a max altitude, break sliding window
                if obj_b.perigee_km - altitude_buffer_km > a_max:
                    break

                if not (a_max < b_min or b_max < a_min):
                    b_mid = (obj_b.perigee_km + obj_b.apogee_km) / 2.0
                    alt_diff = abs(a_mid - b_mid)
                    candidate_pairs.append((alt_diff, obj_a, obj_b))

        # Sort by closest altitude overlap and return top pairs
        candidate_pairs.sort(key=lambda x: x[0])
        return [(p[1], p[2]) for p in candidate_pairs[:max_pairs]]

    @staticmethod
    def find_tca_between_objects(
        obj_a: OrbitalObject,
        obj_b: OrbitalObject,
        start_time: datetime,
        end_time: datetime,
        coarse_step_minutes: int = 10,
        threshold_km: float = 50.0
    ) -> List[Dict[str, Any]]:
        """
        Narrow-phase propagation & fine TCA refinement for a candidate pair.
        Calculates exact minimum separation distance, TCA timestamp, relative velocity,
        and geodetic sub-satellite coordinates at TCA.
        """
        coarse_step = timedelta(minutes=max(10, coarse_step_minutes))
        curr_time = start_time

        min_dist = float("inf")
        candidate_tca = None

        while curr_time <= end_time:
            pos_a = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, curr_time)
            pos_b = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, curr_time)

            if pos_a and pos_b:
                d = euclidean_distance_3d(pos_a.x_km, pos_a.y_km, pos_a.z_km, pos_b.x_km, pos_b.y_km, pos_b.z_km)
                if d < min_dist:
                    min_dist = d
                    candidate_tca = curr_time

            curr_time += coarse_step

        close_events = []
        if candidate_tca and min_dist <= threshold_km * 2.0:
            fine_start = candidate_tca - coarse_step
            fine_end = candidate_tca + coarse_step
            fine_step = timedelta(seconds=15)

            fine_min_dist = float("inf")
            refined_tca = candidate_tca

            t = fine_start
            while t <= fine_end:
                pa = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, t)
                pb = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, t)

                if pa and pb:
                    d = euclidean_distance_3d(pa.x_km, pa.y_km, pa.z_km, pb.x_km, pb.y_km, pb.z_km)
                    if d < fine_min_dist:
                        fine_min_dist = d
                        refined_tca = t

                t += fine_step

            if fine_min_dist <= threshold_km:
                sep = compute_spatial_separation(
                    obj_a.tle_line1, obj_a.tle_line2,
                    obj_b.tle_line1, obj_b.tle_line2,
                    target_time=refined_tca
                )
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
                    "factors": factors
                })

        return close_events

    @staticmethod
    def run_full_conjunction_screening(
        db: Session,
        window_hours: int = 24,
        threshold_km: Optional[float] = None,
        coarse_step_minutes: int = 10
    ) -> Dict[str, Any]:
        """
        Executes end-to-end conjunction screening across tracked objects in the database.
        Persists detected conjunction events and generates alerts.
        """
        if threshold_km is None:
            threshold_km = settings.CONJUNCTION_THRESHOLD_KM

        objects = db.query(OrbitalObject).all()
        if len(objects) < 2:
            return {"screened_pairs": 0, "conjunctions_found": 0, "conjunctions": []}

        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(hours=window_hours)

        candidate_pairs = ConjunctionService.broad_phase_filter(objects)
        logger.info(f"Broad-phase screened {len(candidate_pairs)} candidate pairs from {len(objects)} objects")

        detected_events = []
        for obj_a, obj_b in candidate_pairs:
            events = ConjunctionService.find_tca_between_objects(
                obj_a, obj_b, start_time, end_time,
                coarse_step_minutes=coarse_step_minutes,
                threshold_km=threshold_km
            )
            detected_events.extend(events)

        # Clear older conjunctions and alerts
        db.query(Alert).delete()
        db.query(Conjunction).delete()
        
        for ev in detected_events:
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
                status="ACTIVE",
                calculated_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(conj)
            db.flush()

            # Auto-generate Alert for High/Critical conjunctions
            alert = Alert(
                conjunction_id=conj.id,
                severity=ev["risk_level"],
                title=f"Collision Risk: {ev['object_a'].name} ↔ {ev['object_b'].name}",
                status=AlertStatus.ACTIVE,
                message=f"Predicted miss distance of {ev['miss_distance_km']} km at {ev['tca'].strftime('%Y-%m-%d %H:%M:%S')} UTC (Risk: {ev['risk_score']}/100)",
                acknowledged=False,
                resolved=False,
                created_at=datetime.utcnow()
            )
            db.add(alert)

        db.commit()

        return {
            "screened_pairs": len(candidate_pairs),
            "conjunctions_found": len(detected_events),
            "conjunctions": detected_events
        }
