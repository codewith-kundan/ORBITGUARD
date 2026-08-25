import logging
import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.orbital_object import OrbitalObject
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertStatus
from backend.app.schemas.conjunction import RiskLevel
from backend.app.services.propagation_service import PropagationService
from backend.app.services.risk_service import RiskService
from backend.app.utils.distance import compute_spatial_separation, euclidean_distance_3d

logger = logging.getLogger(__name__)

class ConjunctionService:
    @staticmethod
    def broad_phase_filter(
        objects: List[OrbitalObject],
        altitude_buffer_km: float = 30.0,
        max_pairs: int = 150
    ) -> List[Tuple[OrbitalObject, OrbitalObject]]:
        """
        Targeted broad-phase screening: pairs high-interest primary assets
        against debris/rocket bodies with crossing orbital planes.
        
        Prioritizes:
        1. Active satellites (primaries) vs debris/rockets (secondaries)
        2. Overlapping altitude shells
        3. Different inclinations (crossing orbits — higher collision geometry)
        4. Filters out co-located constellation-mates
        """
        valid_objects = [
            obj for obj in objects
            if obj.perigee_km is not None and obj.apogee_km is not None
               and obj.tle_line1 and obj.tle_line2
               and obj.inclination is not None
        ]
        
        # Separate primaries (assets to protect) from secondaries (threats)
        primaries = []
        secondaries = []
        
        for obj in valid_objects:
            obj_type = (obj.object_type or "").upper()
            name = (obj.name or "").upper()
            
            if obj_type == "ACTIVE_SATELLITE":
                primaries.append(obj)
            elif obj_type in ["DEBRIS", "ROCKET_BODY"]:
                secondaries.append(obj)
        
        # Also allow satellite-vs-satellite screening for high-value assets
        high_value_names = ["ISS", "ZARYA", "TIANGONG", "HUBBLE", "HST", "NOAA", "TERRA"]
        high_value = [p for p in primaries if any(hv in (p.name or "").upper() for hv in high_value_names)]
        
        # Select diverse primary targets across space stations, scientific missions, and constellations
        selected_primaries = []
        seen_prefixes = set()
        
        # First add high-value targets
        for p in high_value:
            selected_primaries.append(p)
            seen_prefixes.add((p.name or "").split("-")[0].split(" ")[0].upper())
        
        # Then add diverse constellation representatives
        for p in primaries:
            prefix = (p.name or "").split("-")[0].split(" ")[0].upper()
            if prefix not in seen_prefixes:
                selected_primaries.append(p)
                seen_prefixes.add(prefix)
            if len(selected_primaries) >= 50:
                break
        
        # If still need more, add more active satellites
        if len(selected_primaries) < 50:
            for p in primaries:
                if len(selected_primaries) >= 50:
                    break
                if p not in selected_primaries:
                    selected_primaries.append(p)
        
        logger.info(f"Selected {len(selected_primaries)} primary targets, {len(secondaries)} secondaries")
        
        candidate_pairs = []
        

        
        for primary in selected_primaries:
            p_min = primary.perigee_km - altitude_buffer_km
            p_max = primary.apogee_km + altitude_buffer_km
            p_inc = primary.inclination or 0.0
            
            # Pool of secondary targets: all debris/rockets + other active satellites
            sec_pool = secondaries + [p for p in primaries if p.id != primary.id] if secondaries else [p for p in valid_objects if p.id != primary.id]
            
            for secondary in sec_pool:
                if secondary.id == primary.id or secondary.norad_id == primary.norad_id:
                    continue
                s_min = secondary.perigee_km - altitude_buffer_km
                s_max = secondary.apogee_km + altitude_buffer_km
                
                # Check altitude shell overlap
                if p_max < s_min or s_max < p_min:
                    continue
                
                s_inc = secondary.inclination or 0.0
                inc_diff = abs(p_inc - s_inc)
                
                # Priority: crossing orbits with inclination differences
                # are most likely to produce high-velocity close approaches
                if 5.0 <= inc_diff <= 50.0:
                    priority = 0.0  # Best: crossing orbits
                elif inc_diff > 50.0:
                    priority = 1.0  # Good: highly inclined crossings
                elif inc_diff >= 0.5:
                    priority = 2.0  # Moderate: slightly offset planes
                else:
                    priority = 3.0  # Coplanar / same constellation train
                
                # Secondary priority: altitude closeness
                alt_diff = abs((primary.perigee_km + primary.apogee_km) / 2.0 - 
                               (secondary.perigee_km + secondary.apogee_km) / 2.0)
                priority += alt_diff / 100.0
                
                # Avoid duplicate pairs
                pair_key = tuple(sorted([primary.id, secondary.id]))
                candidate_pairs.append((priority, pair_key, primary, secondary))
        
        # Deduplicate and sort by priority
        seen_keys = set()
        unique_pairs = []
        candidate_pairs.sort(key=lambda x: x[0])
        for p, k, obj_a, obj_b in candidate_pairs:
            if k not in seen_keys:
                seen_keys.add(k)
                unique_pairs.append((obj_a, obj_b))
                if len(unique_pairs) >= max_pairs:
                    break
        
        logger.info(f"Broad-phase produced {len(unique_pairs)} unique candidate pairs")
        return unique_pairs
        


    @staticmethod
    def find_tca_between_objects(
        obj_a: OrbitalObject,
        obj_b: OrbitalObject,
        start_time: datetime,
        end_time: datetime,
        coarse_step_minutes: int = 3,
        threshold_km: float = 500.0
    ) -> List[Dict[str, Any]]:
        """
        Narrow-phase propagation & fine TCA refinement for a candidate pair.
        Uses coarse sweep to find distance minima, then 5-second fine refinement
        around each minimum to find the true closest approach.
        """
        coarse_step = timedelta(minutes=max(1, coarse_step_minutes))
        curr_time = start_time

        # Track all local minima (distance valleys) across the coarse sweep
        prev_dist = None
        prev_prev_dist = None
        prev_time = None
        candidate_tcas = []

        while curr_time <= end_time:
            pos_a = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, curr_time)
            pos_b = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, curr_time)

            if pos_a and pos_b:
                d = euclidean_distance_3d(pos_a.x_km, pos_a.y_km, pos_a.z_km, pos_b.x_km, pos_b.y_km, pos_b.z_km)
                
                # Detect local minima: prev_dist < both neighbors
                if prev_dist is not None and prev_prev_dist is not None and prev_time is not None:
                    if prev_dist <= d and prev_dist <= prev_prev_dist:
                        if prev_dist <= threshold_km * 2.0:
                            candidate_tcas.append((prev_dist, prev_time))
                
                prev_prev_dist = prev_dist
                prev_dist = d
                prev_time = curr_time

            curr_time += coarse_step

        # Also check if the final point is a minimum
        if prev_dist is not None and prev_prev_dist is not None and prev_time is not None:
            if prev_dist <= prev_prev_dist and prev_dist <= threshold_km * 2.0:
                candidate_tcas.append((prev_dist, prev_time))

        close_events = []
        for _, candidate_tca in candidate_tcas:
            # Fine refinement: 5-second steps within ±coarse_step around candidate
            fine_start = max(start_time, candidate_tca - coarse_step)
            fine_end = min(end_time, candidate_tca + coarse_step)
            fine_step = timedelta(seconds=5)

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

                # Ignore physically docked or co-located objects sharing identical orbits
                if sep["miss_distance_km"] < 0.05 and sep["relative_velocity_km_s"] < 0.1:
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
                    "factors": factors
                })

        # Return only the single closest approach (TCA Minimum) for this pair
        # to avoid repeated consecutive rows for identical satellites
        if close_events:
            close_events.sort(key=lambda x: x["miss_distance_km"])
            return [close_events[0]]

        return []

    @staticmethod
    def run_full_conjunction_screening(
        db: Session,
        window_hours: int = 24,
        threshold_km: Optional[float] = None,
        coarse_step_minutes: int = 3
    ) -> Dict[str, Any]:
        """
        Executes end-to-end conjunction screening across tracked objects in the database.
        All conjunction data is computed from real SGP4 orbital propagation.
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
        for pair_idx, (obj_a, obj_b) in enumerate(candidate_pairs):
            events = ConjunctionService.find_tca_between_objects(
                obj_a, obj_b, start_time, end_time,
                coarse_step_minutes=coarse_step_minutes,
                threshold_km=threshold_km
            )
            detected_events.extend(events)
            if (pair_idx + 1) % 25 == 0:
                logger.info(f"Screened {pair_idx + 1}/{len(candidate_pairs)} pairs, found {len(detected_events)} events so far")

        logger.info(f"Narrow-phase screening found {len(detected_events)} conjunction events from {len(candidate_pairs)} pairs")

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

            # Auto-generate Alert ONLY for HIGH and CRITICAL severity conjunction events
            if ev["risk_level"] in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
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
