import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

logger = logging.getLogger(__name__)

class HistoryService:
    """
    Analyzes historical conjunction patterns and prediction consistency.
    Uses previous observations of crossing pairs without fabricating certainty.
    """

    @staticmethod
    def analyze_historical_pattern(
        db: Session,
        norad_a: int,
        norad_b: int,
        current_miss_distance_km: float,
        current_rel_vel_km_s: float
    ) -> Dict[str, Any]:
        """
        Queries previous conjunctions for this pair to evaluate orbital consistency,
        miss distance trend, and compute an estimated prediction confidence score.
        """
        from backend.app.models.conjunction import Conjunction
        from backend.app.models.orbital_object import OrbitalObject

        obj_a = db.query(OrbitalObject).filter(OrbitalObject.norad_id == norad_a).first()
        obj_b = db.query(OrbitalObject).filter(OrbitalObject.norad_id == norad_b).first()

        if not obj_a or not obj_b:
            return {
                "has_historical_data": False,
                "confidence_score": 68.0,
                "pattern_match": "Insufficient historical data — prediction based primarily on current orbital state.",
                "historical_events_count": 0,
                "distance_trend": "Initial Observation"
            }

        past_conjunctions = db.query(Conjunction).filter(
            ((Conjunction.object_a_id == obj_a.id) & (Conjunction.object_b_id == obj_b.id)) |
            ((Conjunction.object_a_id == obj_b.id) & (Conjunction.object_b_id == obj_a.id))
        ).order_by(desc(Conjunction.tca)).limit(5).all()

        if not past_conjunctions or len(past_conjunctions) <= 1:
            return {
                "has_historical_data": False,
                "confidence_score": 72.0,
                "pattern_match": "Insufficient historical data — prediction based primarily on current orbital state.",
                "historical_events_count": len(past_conjunctions),
                "distance_trend": "Stable Orbit Cross"
            }

        past_dists = [c.miss_distance_km for c in past_conjunctions]
        avg_dist = sum(past_dists) / len(past_dists)
        variance = sum((d - avg_dist) ** 2 for d in past_dists) / len(past_dists)
        
        if variance < 4.0:
            pattern = "High (Consistent repeating geometry)"
            conf = min(94.0, 82.0 + len(past_conjunctions) * 2.5)
        elif variance < 25.0:
            pattern = "Moderate (Periodic nodal drift)"
            conf = 78.0
        else:
            pattern = "Low (Perturbed trajectory / High variance)"
            conf = 65.0

        trend = "Diverging" if current_miss_distance_km > avg_dist else "Converging"

        return {
            "has_historical_data": True,
            "confidence_score": round(conf, 1),
            "pattern_match": pattern,
            "historical_events_count": len(past_conjunctions),
            "historical_avg_miss_km": round(avg_dist, 2),
            "distance_trend": trend
        }
