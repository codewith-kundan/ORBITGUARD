import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.orbital_object import OrbitalObject
from backend.app.models.conjunction import Conjunction
from backend.app.services.propagation_service import PropagationService
from backend.app.services.risk_service import RiskService
from backend.app.utils.distance import compute_spatial_separation, euclidean_distance_3d

logger = logging.getLogger(__name__)

class ConjunctionService:
    @staticmethod
    def broad_phase_filter(objects: List[OrbitalObject], altitude_buffer_km: float = 60.0) -> List[Tuple[OrbitalObject, OrbitalObject]]:
        """
        Broad-phase screening: filters candidate pairs whose orbital altitude envelopes overlap.
        Avoids O(N^2) full trajectory propagation for non-intersecting orbital shells.
        """
        candidate_pairs = []
        n = len(objects)
        
        for i in range(n):
            obj_a = objects[i]
            if obj_a.perigee_km is None or obj_a.apogee_km is None:
                continue

            for j in range(i + 1, n):
                obj_b = objects[j]
                if obj_b.perigee_km is None or obj_b.apogee_km is None:
                    continue

                # Check if radial ranges overlap within buffer
                a_min = obj_a.perigee_km - altitude_buffer_km
                a_max = obj_a.apogee_km + altitude_buffer_km
                b_min = obj_b.perigee_km - altitude_buffer_km
                b_max = obj_b.apogee_km + altitude_buffer_km

                if not (a_max < b_min or b_max < a_min):
                    candidate_pairs.append((obj_a, obj_b))

        return candidate_pairs

    @staticmethod
    def find_tca_between_objects(
        obj_a: OrbitalObject,
        obj_b: OrbitalObject,
        start_time: datetime,
        end_time: datetime,
        coarse_step_minutes: int = 5,
        threshold_km: float = 50.0
    ) -> List[Dict[str, Any]]:
        """
        Narrow-phase propagation & fine TCA refinement for a candidate pair.
        Calculates exact minimum separation distance, TCA timestamp, relative velocity,
        and geodetic sub-satellite coordinates at TCA.
        """
        coarse_step = timedelta(minutes=max(1, coarse_step_minutes))
        curr_time = start_time
        
        close_events = []
        min_in_window = float("inf")
        best_time = None
        best_pos_a = None
        best_pos_b = None

        # Coarse scan across prediction window
        while curr_time <= end_time:
            pos_a = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, curr_time)
            pos_b = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, curr_time)

            if pos_a and pos_b:
                sep = compute_spatial_separation(pos_a, pos_b)
                dist = sep["miss_distance_km"]

                # If approaching close boundary
                if dist < 120.0 and dist < min_in_window:
                    min_in_window = dist
                    best_time = curr_time
                    best_pos_a = pos_a
                    best_pos_b = pos_b

            curr_time += coarse_step

        # If a candidate minimum was found, refine using 10-second sub-stepping
        if best_time and min_in_window <= 120.0:
            fine_start = best_time - timedelta(minutes=coarse_step_minutes)
            fine_end = best_time + timedelta(minutes=coarse_step_minutes)
            fine_step = timedelta(seconds=10)

            refined_min_dist = float("inf")
            refined_tca = best_time
            refined_pos_a = best_pos_a
            refined_pos_b = best_pos_b

            t = fine_start
            while t <= fine_end:
                pa = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, t)
                pb = PropagationService.propagate_satellite(obj_b.tle_line1, obj_b.tle_line2, t)
                if pa and pb:
                    d = euclidean_distance_3d((pa.x_km, pa.y_km, pa.z_km), (pb.x_km, pb.y_km, pb.z_km))
                    if d < refined_min_dist:
                        refined_min_dist = d
                        refined_tca = t
                        refined_pos_a = pa
                        refined_pos_b = pb
                t += fine_step

            if refined_min_dist <= threshold_km and refined_pos_a and refined_pos_b:
                sep = compute_spatial_separation(refined_pos_a, refined_pos_b)
                avg_alt = (refined_pos_a.alt_km + refined_pos_b.alt_km) / 2.0
                avg_lat = (refined_pos_a.lat + refined_pos_b.lat) / 2.0
                avg_lon = (refined_pos_a.lon + refined_pos_b.lon) / 2.0

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
        coarse_step_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Executes end-to-end conjunction screening across all tracked objects in the database.
        Persists detected conjunction events to the database.
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

        # Clear older conjunctions and save new detected events
        db.query(Conjunction).delete()
        
        for ev in detected_events:
            conj = Conjunction(
                object_a_id=ev["object_a_id"],
                object_b_id=ev["object_b_id"],
                tca=ev["tca"].replace(tzinfo=None) if ev["tca"].tzinfo else ev["tca"],
                miss_distance_km=ev["miss_distance_km"],
                relative_velocity_km_s=ev["relative_velocity_km_s"],
                altitude_km=ev["altitude_km"],
                latitude_deg=ev["latitude_deg"],
                longitude_deg=ev["longitude_deg"],
                risk_score=ev["risk_score"],
                risk_level=ev["risk_level"],
                created_at=datetime.utcnow()
            )
            db.add(conj)

        db.commit()
        logger.info(f"Screening complete: {len(detected_events)} conjunctions stored")

        return {
            "screened_pairs": len(candidate_pairs),
            "conjunctions_found": len(detected_events),
            "conjunctions": detected_events
        }
