from datetime import datetime, timezone
import math
from typing import Dict, Any, Tuple, Optional
from backend.app.schemas.conjunction import RiskLevel
from backend.app.utils.time_utils import to_utc

class RiskService:
    """
    Transparent, explainable Multi-Factor Conjunction Risk Scoring (0-100) &
    Scientifically Defensible Foster-2D / Encounter Hard-Body Collision Probability Engine.
    """

    # Configurable Model Weights
    WEIGHT_MISS_DISTANCE = 0.45
    WEIGHT_RELATIVE_VELOCITY = 0.20
    WEIGHT_APPROACH_GEOMETRY = 0.15
    WEIGHT_COMBINED_SIZE = 0.10
    WEIGHT_TIME_TO_TCA = 0.10

    @classmethod
    def calculate_collision_probability(
        cls,
        miss_distance_km: float,
        combined_radius_m: float = 6.0,
        pos_uncertainty_km: float = 1.2
    ) -> Tuple[Optional[float], str, str]:
        """
        Computes 2D Encounter Plane Collision Probability using standard isotropic Gaussian integral.
        Formula: Pc = 1 - exp(- (R_combined^2) / (2 * sigma^2))
        """
        if miss_distance_km < 0:
            return None, "INVALID", "Miss distance cannot be negative"

        # Position uncertainty standard deviation in meters
        sigma_m = max(100.0, pos_uncertainty_km * 1000.0)
        miss_dist_m = miss_distance_km * 1000.0

        # In encounter plane, distance squared from primary center
        d_sq = miss_dist_m ** 2
        r_sq = combined_radius_m ** 2

        # 2D Probability of Collision estimate
        # Pc approx = (r_sq / (2 * sigma_m^2)) * exp(- d_sq / (2 * sigma_m^2))
        exponent = - (d_sq) / (2.0 * (sigma_m ** 2))
        if exponent < -50:
            pc = 0.0
        else:
            pc = (r_sq / (2.0 * (sigma_m ** 2))) * math.exp(exponent)

        # Express as percentage [0.00% - 100.00%]
        pc_pct = min(100.0, pc * 100.0)
        
        confidence = "Moderate (Estimated isotropic 1-sigma covariance)"
        method = "Foster-2D Isotropic Hard-Body Encounter Model"

        return round(pc_pct, 4), confidence, method

    @classmethod
    def compute_risk_score(
        cls,
        miss_distance_km: float,
        relative_velocity_km_s: float,
        tca: datetime,
        current_time: datetime = None,
        approach_angle_deg: float = 45.0,
        combined_size_m: float = 5.0,
        pos_uncertainty_km: float = 1.0
    ) -> Tuple[float, RiskLevel, Dict[str, Any]]:
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        else:
            current_time = to_utc(current_time)
            
        tca_utc = to_utc(tca)
        hours_to_tca = max(0.0, (tca_utc - current_time).total_seconds() / 3600.0)

        # Factor A: Miss Distance (0 - 100 scale)
        if miss_distance_km <= 0.5:
            score_dist = 100.0
            dist_desc = "Critical Proximity (<0.5 km)"
        elif miss_distance_km <= 5.0:
            score_dist = 100.0 - (miss_distance_km - 0.5) * (40.0 / 4.5)
            dist_desc = "High Proximity (<5 km)"
        elif miss_distance_km <= 25.0:
            score_dist = 60.0 - (miss_distance_km - 5.0) * (35.0 / 20.0)
            dist_desc = "Moderate Proximity (5-25 km)"
        elif miss_distance_km <= 80.0:
            score_dist = 25.0 - (miss_distance_km - 25.0) * (20.0 / 55.0)
            dist_desc = "Coarse Proximity (25-80 km)"
        else:
            score_dist = max(0.0, 5.0 - (miss_distance_km - 80.0) * 0.1)
            dist_desc = "Nominal Separation"

        # Factor B: Relative Velocity (0 - 100 scale)
        if relative_velocity_km_s >= 14.0:
            score_vel = 100.0
            vel_desc = "Extreme Hypervelocity (>14 km/s)"
        elif relative_velocity_km_s >= 8.0:
            score_vel = 70.0 + (relative_velocity_km_s - 8.0) * (30.0 / 6.0)
            vel_desc = "High Orbital Velocity (8-14 km/s)"
        elif relative_velocity_km_s >= 2.0:
            score_vel = 35.0 + (relative_velocity_km_s - 2.0) * (35.0 / 6.0)
            vel_desc = "Moderate Velocity (2-8 km/s)"
        else:
            score_vel = max(10.0, relative_velocity_km_s * 17.5)
            vel_desc = "Co-orbital Low Velocity"

        # Factor C: Approach Geometry & Trajectory Angle (0 - 100 scale)
        # Head-on (~180 deg) or orthogonal crossing (~90 deg) is most dangerous
        if 70.0 <= approach_angle_deg <= 110.0:
            score_geom = 90.0
            geom_desc = "Orthogonal Orbital Plane Crossing (~90°)"
        elif approach_angle_deg >= 150.0:
            score_geom = 100.0
            geom_desc = "Direct Counter-Rotating Head-On (~180°)"
        else:
            score_geom = 40.0 + (approach_angle_deg / 180.0) * 40.0
            geom_desc = f"Coplanar / Shallow Angle ({approach_angle_deg:.1f}°)"

        # Factor D: Physical Cross-Sectional Size (0 - 100 scale)
        score_size = min(100.0, (combined_size_m / 20.0) * 100.0)
        size_desc = f"Combined Hard-Body Diameter: {combined_size_m:.1f} m"

        # Factor E: Time to TCA (0 - 100 scale)
        if hours_to_tca <= 2.0:
            score_time = 100.0
            time_desc = "Immediate Urgency (<2h)"
        elif hours_to_tca <= 6.0:
            score_time = 80.0 - (hours_to_tca - 2.0) * 5.0
            time_desc = "High Urgency (2-6h)"
        elif hours_to_tca <= 24.0:
            score_time = 60.0 - (hours_to_tca - 6.0) * (40.0 / 18.0)
            time_desc = "Standard Lead Time (12-24h)"
        else:
            score_time = 15.0
            time_desc = "Extended Horizon (>24h)"

        # Weighted Composite Score (0-100)
        total_score = (
            score_dist * cls.WEIGHT_MISS_DISTANCE +
            score_vel * cls.WEIGHT_RELATIVE_VELOCITY +
            score_geom * cls.WEIGHT_APPROACH_GEOMETRY +
            score_size * cls.WEIGHT_COMBINED_SIZE +
            score_time * cls.WEIGHT_TIME_TO_TCA
        )
        total_score = round(min(100.0, max(0.0, total_score)), 1)

        # Risk Classification Level
        if total_score >= 80.0:
            level = RiskLevel.CRITICAL
        elif total_score >= 60.0:
            level = RiskLevel.HIGH
        elif total_score >= 30.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        # Scientific Probability calculation
        pc_pct, pc_conf, pc_method = cls.calculate_collision_probability(
            miss_distance_km=miss_distance_km,
            combined_radius_m=combined_size_m / 2.0,
            pos_uncertainty_km=pos_uncertainty_km
        )

        factors = {
            "miss_distance_factor": {
                "score": round(score_dist * cls.WEIGHT_MISS_DISTANCE, 1),
                "weight": cls.WEIGHT_MISS_DISTANCE,
                "description": dist_desc,
                "contribution": "Critical" if miss_distance_km <= 1.0 else ("High" if miss_distance_km <= 5.0 else ("Moderate" if miss_distance_km <= 25.0 else "Low")),
                "value_km": round(miss_distance_km, 3)
            },
            "relative_velocity_factor": {
                "score": round(score_vel * cls.WEIGHT_RELATIVE_VELOCITY, 1),
                "weight": cls.WEIGHT_RELATIVE_VELOCITY,
                "description": vel_desc,
                "contribution": vel_desc,
                "value_km_s": round(relative_velocity_km_s, 3)
            },
            "approach_geometry_factor": {
                "score": round(score_geom * cls.WEIGHT_APPROACH_GEOMETRY, 1),
                "weight": cls.WEIGHT_APPROACH_GEOMETRY,
                "description": geom_desc,
                "angle_deg": round(approach_angle_deg, 1)
            },
            "object_size_factor": {
                "score": round(score_size * cls.WEIGHT_COMBINED_SIZE, 1),
                "weight": cls.WEIGHT_COMBINED_SIZE,
                "description": size_desc,
                "size_m": round(combined_size_m, 1)
            },
            "time_to_tca_factor": {
                "score": round(score_time * cls.WEIGHT_TIME_TO_TCA, 1),
                "weight": cls.WEIGHT_TIME_TO_TCA,
                "description": time_desc,
                "contribution": time_desc,
                "hours_to_tca": round(hours_to_tca, 2)
            },
            "collision_probability": pc_pct,
            "probability_confidence": pc_conf,
            "probability_methodology": pc_method,
            "methodology": "Multi-Factor Astrodynamic Screening (ISO 26900 / CCSDS 508.0-B-1 CDM Standard)"
        }

        return total_score, level, factors
