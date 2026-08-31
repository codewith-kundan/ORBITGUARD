import math
import numpy as np
import pytest
from backend.app.services.risk_service import RiskService

def test_foster_pc_monotonic_decay():
    """
    Validates that Foster-2D collision probability strictly decays monotonically
    as miss distance increases under constant covariance.
    """
    pc_100m, _, _ = RiskService.calculate_collision_probability(miss_distance_km=0.1, combined_radius_m=10.0, pos_uncertainty_km=1.0)
    pc_500m, _, _ = RiskService.calculate_collision_probability(miss_distance_km=0.5, combined_radius_m=10.0, pos_uncertainty_km=1.0)
    pc_2000m, _, _ = RiskService.calculate_collision_probability(miss_distance_km=2.0, combined_radius_m=10.0, pos_uncertainty_km=1.0)
    pc_10000m, _, _ = RiskService.calculate_collision_probability(miss_distance_km=10.0, combined_radius_m=10.0, pos_uncertainty_km=1.0)

    assert pc_100m > pc_500m > pc_2000m > pc_10000m, "Pc must decay monotonically with increasing separation distance"
    assert pc_10000m < 1e-10 or pc_10000m == 0.0, "Pc at 10km under 1km 1-sigma must approach 0.0"

def test_monte_carlo_and_advanced_benchmarks():
    """
    Validates that advanced benchmark calculator outputs Foster-2D, Akella-Alfriend,
    Alfano Max-Pc, and 10,000 Monte Carlo stochastic bounds consistently.
    """
    benchmarks = RiskService.calculate_advanced_benchmarks(
        miss_distance_km=0.85,
        relative_velocity_km_s=14.2,
        combined_radius_m=8.0,
        pos_uncertainty_km=1.2
    )

    assert "foster_2d_pc_pct" in benchmarks
    assert "akella_alfriend_pc_pct" in benchmarks
    assert "alfano_max_pc_pct" in benchmarks
    assert "monte_carlo_pc_pct" in benchmarks
    assert "kinetic_energy_mj" in benchmarks
    assert "tnt_equivalent_kg" in benchmarks

    # Max-Pc must be strictly greater than or equal to nominal Foster-2D Pc
    assert benchmarks["alfano_max_pc_pct"] >= benchmarks["foster_2d_pc_pct"]
    assert benchmarks["kinetic_energy_mj"] > 0.0
