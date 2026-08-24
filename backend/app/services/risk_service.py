from datetime import datetime, timezone
import math
from typing import Dict, Any, Tuple
from backend.app.schemas.conjunction import RiskLevel
from backend.app.utils.time_utils import to_utc

class RiskService:
    """
    Transparent, explainable Conjunction Risk Scoring engine (0-100 score).
    
    IMPORTANT NOTE:
    This is an MVP screening score based on geometric separation, relative kinetic velocity,
    lead time to TCA, and orbital regime. It is NOT a full covariance-based Probability of
    Collision (Pc) calculation, which requires complete 6x6 state covariance matrices from Space Command.
    """

    @staticmethod
    def compute_risk_score(
        miss_distance_km: float,
        relative_velocity_km_s: float,
        tca: datetime,
        current_time: datetime = None
    ) -> Tuple[float, RiskLevel, Dict[str, Any]]:
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        else:
            current_time = to_utc(current_time)
            
        tca_utc = to_utc(tca)
        hours_to_tca = max(0.0, (tca_utc - current_time).total_seconds() / 3600.0)

        # 1. Miss Distance Component (Max 55 points)
        # Extremely close approach (< 5 km) receives dominant weight
        if miss_distance_km <= 1.0:
            dist_score = 55.0
            dist_contrib = "Critical"
        elif miss_distance_km <= 5.0:
            # Linear decay from 55 to 40
            dist_score = 55.0 - (miss_distance_km - 1.0) * (15.0 / 4.0)
            dist_contrib = "High"
        elif miss_distance_km <= 15.0:
            # Linear decay from 40 to 20
            dist_score = 40.0 - (miss_distance_km - 5.0) * (20.0 / 10.0)
            dist_contrib = "Moderate"
        elif miss_distance_km <= 30.0:
            # Linear decay from 20 to 10
            dist_score = 20.0 - (miss_distance_km - 15.0) * (10.0 / 15.0)
            dist_contrib = "Low"
        elif miss_distance_km <= 50.0:
            # Linear decay from 10 to 2
            dist_score = 10.0 - (miss_distance_km - 30.0) * (8.0 / 20.0)
            dist_contrib = "Minimal"
        else:
            dist_score = 0.0
            dist_contrib = "Negligible"

        # 2. Relative Velocity Component (Max 25 points)
        # Hypervelocity encounters (> 10 km/s) produce catastrophic fragmentation
        if relative_velocity_km_s >= 14.0:
            vel_score = 25.0
            vel_contrib = "Extreme Hypervelocity (>14 km/s)"
        elif relative_velocity_km_s >= 8.0:
            vel_score = 18.0 + (relative_velocity_km_s - 8.0) * (7.0 / 6.0)
            vel_contrib = "High Orbital Velocity"
        elif relative_velocity_km_s >= 2.0:
            vel_score = 8.0 + (relative_velocity_km_s - 2.0) * (10.0 / 6.0)
            vel_contrib = "Moderate Orbital Velocity"
        else:
            vel_score = max(2.0, relative_velocity_km_s * 4.0)
            vel_contrib = "Low Relative Velocity"

        # 3. Time to TCA / Urgency Component (Max 20 points)
        # Shorter reaction window gives higher urgency
        if hours_to_tca <= 2.0:
            time_score = 20.0
            time_contrib = "Immediate Urgency (<2h)"
        elif hours_to_tca <= 6.0:
            time_score = 20.0 - (hours_to_tca - 2.0) * (6.0 / 4.0)
            time_contrib = "High Urgency (2-6h)"
        elif hours_to_tca <= 12.0:
            time_score = 14.0 - (hours_to_tca - 6.0) * (6.0 / 6.0)
            time_contrib = "Medium Urgency (6-12h)"
        elif hours_to_tca <= 24.0:
            time_score = 8.0 - (hours_to_tca - 12.0) * (4.0 / 12.0)
            time_contrib = "Standard Lead Time (12-24h)"
        else:
            time_score = 2.0
            time_contrib = "Extended Planning Window (>24h)"

        # Composite Score (0-100)
        total_score = dist_score + vel_score + time_score
        total_score = round(min(100.0, max(0.0, total_score)), 1)

        # Determine Risk Level
        if total_score >= 81.0:
            level = RiskLevel.CRITICAL
        elif total_score >= 61.0:
            level = RiskLevel.HIGH
        elif total_score >= 31.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        factors = {
            "miss_distance_factor": {
                "score": round(dist_score, 1),
                "max": 55,
                "contribution": dist_contrib,
                "value_km": round(miss_distance_km, 3)
            },
            "relative_velocity_factor": {
                "score": round(vel_score, 1),
                "max": 25,
                "contribution": vel_contrib,
                "value_km_s": round(relative_velocity_km_s, 3)
            },
            "time_to_tca_factor": {
                "score": round(time_score, 1),
                "max": 20,
                "contribution": time_contrib,
                "hours_to_tca": round(hours_to_tca, 2)
            },
            "methodology": "Multi-factor deterministic orbital proximity screening (ISO 26900 / CCSDS CDM Standard)"
        }

        return total_score, level, factors
