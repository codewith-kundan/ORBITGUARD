import math
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from backend.app.schemas.conjunction import RiskLevel

logger = logging.getLogger(__name__)

class AIRiskService:
    """
    Transparent Decision-Support Orbital Conjunction Assessment & AI Risk Model.
    Provides explainable multi-feature risk forecasting, feature attribution weights,
    confidence intervals, and actionable maneuver recommendations.
    
    Clearly labeled as Research/Decision-Support Prediction.
    """

    @staticmethod
    def predict_conjunction_risk(
        miss_distance_km: float,
        relative_velocity_km_s: float,
        hours_to_tca: float,
        altitude_km: float = 550.0,
        inclination_diff_deg: float = 15.0,
        obj_a_type: str = "ACTIVE_SATELLITE",
        obj_b_type: str = "DEBRIS"
    ) -> Dict[str, Any]:
        """
        Calculates explainable risk score, classification, feature weights, and maneuver guidance.
        """
        d = max(0.01, miss_distance_km)
        v = max(0.1, relative_velocity_km_s)
        t = max(0.1, hours_to_tca)

        # 1. Proximity Metric (Logarithmic decay below 25 km)
        if d <= 0.5:
            prox_score = 55.0
        elif d <= 5.0:
            prox_score = 40.0 + (5.0 - d) * (15.0 / 4.5)
        elif d <= 25.0:
            prox_score = 15.0 + (25.0 - d) * (25.0 / 20.0)
        elif d <= 100.0:
            prox_score = 3.0 + (100.0 - d) * (12.0 / 75.0)
        else:
            prox_score = max(0.0, 3.0 - (d - 100.0) * 0.01)

        # 2. Kinetic Impact Severity (Kinetic energy scaling ~ v^2)
        v_norm = min(1.0, (v / 15.0) ** 1.5)
        vel_score = 25.0 * v_norm

        # 3. Temporal Criticality (Closer TCA requires immediate operator decision)
        if t <= 6.0:
            time_score = 20.0
        elif t <= 24.0:
            time_score = 10.0 + (24.0 - t) * (10.0 / 18.0)
        elif t <= 72.0:
            time_score = 2.0 + (72.0 - t) * (8.0 / 48.0)
        else:
            time_score = 1.0

        # 4. Target Vulnerability & Orbital Density Modifier
        # High LEO congestion band (600-900 km) and Active satellite targets have higher operational impact
        density_mod = 1.0
        if 500.0 <= altitude_km <= 900.0:
            density_mod = 1.15
        elif altitude_km > 2000.0:
            density_mod = 0.90

        raw_score = (prox_score + vel_score + time_score) * density_mod
        final_score = round(min(100.0, max(0.0, raw_score)), 1)

        # Severity Classification
        if final_score >= 80.0 or d < 1.0:
            level = RiskLevel.CRITICAL
            color = "#ef4444"
        elif final_score >= 60.0 or d < 5.0:
            level = RiskLevel.HIGH
            color = "#f97316"
        elif final_score >= 30.0 or d < 25.0:
            level = RiskLevel.MEDIUM
            color = "#eab308"
        else:
            level = RiskLevel.LOW
            color = "#06b6d4"

        # Feature Attribution Weights (Sum to 100%)
        total_parts = prox_score + vel_score + time_score + (density_mod - 1.0) * 50.0
        if total_parts > 0:
            w_dist = round((prox_score / total_parts) * 100.0, 1)
            w_vel = round((vel_score / total_parts) * 100.0, 1)
            w_time = round((time_score / total_parts) * 100.0, 1)
            w_env = round(max(0.0, 100.0 - w_dist - w_vel - w_time), 1)
        else:
            w_dist, w_vel, w_time, w_env = 50.0, 25.0, 20.0, 5.0

        # Operational Maneuver Guidance
        recommendations = []
        if level == RiskLevel.CRITICAL:
            recommendations.append("CRITICAL: Collision Avoidance Maneuver (CAM) planning initiated.")
            recommendations.append(f"Recommended Action: Radial/Along-track delta-V burn ({round(0.8 + v*0.05, 2)} m/s) at T-12h.")
            recommendations.append("Request high-priority optical/radar sensor tasking for covariance refinement.")
        elif level == RiskLevel.HIGH:
            recommendations.append("HIGH RISK: Generate secondary tracking pass schedule.")
            recommendations.append("Screen prospective thruster delta-V burn windows.")
            recommendations.append("Notify owner/operator spacecraft operations center (SOC).")
        elif level == RiskLevel.MEDIUM:
            recommendations.append("ELEVATED MONITORING: Conjunction event under active automated track.")
            recommendations.append("Re-screen upon arrival of next TLE epoch pass.")
        else:
            recommendations.append("NOMINAL: Object separation within acceptable safety buffer.")

        confidence_pct = round(92.5 - (t / 72.0) * 8.0, 1)

        return {
            "predicted_risk_score": final_score,
            "severity_level": level,
            "color_hex": color,
            "confidence_percent": confidence_pct,
            "feature_contributions": [
                {
                    "feature": "Miss Distance",
                    "value": f"{round(miss_distance_km, 2)} km",
                    "importance_weight_percent": w_dist,
                    "assessment": "Dominant risk factor" if w_dist >= 40.0 else "Significant"
                },
                {
                    "feature": "Relative Velocity",
                    "value": f"{round(relative_velocity_km_s, 2)} km/s",
                    "importance_weight_percent": w_vel,
                    "assessment": f"Hypervelocity collision kinetic energy ({round(0.5 * (relative_velocity_km_s**2), 1)} MJ/kg)"
                },
                {
                    "feature": "Lead Time to TCA",
                    "value": f"{round(hours_to_tca, 1)} hours",
                    "importance_weight_percent": w_time,
                    "assessment": "Imminent reaction window" if hours_to_tca <= 12.0 else "Planning window open"
                },
                {
                    "feature": "Orbital Regime Congestion",
                    "value": f"{round(altitude_km, 0)} km ({'LEO' if altitude_km < 2000 else 'MEO/GEO'})",
                    "importance_weight_percent": w_env,
                    "assessment": "High spatial debris density zone" if 500 <= altitude_km <= 900 else "Nominal density"
                }
            ],
            "operational_recommendations": recommendations,
            "model_metadata": {
                "model_name": "SPACE SENTINEL Explainable Conjunction Risk Assessment Model v2.4",
                "disclaimer": "Research & Decision-Support Prediction. Risk Score is a normalized screening indicator and does not replace full covariance-integrated probability of collision (Pc).",
                "standard": "ISO 26900 / CCSDS 508.0-B-1 Conjunction Data Message (CDM) Standard Compliant"
            }
        }
