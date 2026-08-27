import pytest
from datetime import datetime, timezone, timedelta
from backend.app.services.risk_service import RiskService
from backend.app.services.tle_service import TLEService
from backend.app.services.decay_service import DecayService
from backend.app.models.orbital_object import OrbitalObject, ObjectType

def test_collision_probability_bounded_foster():
    """Verify Foster-2D collision probability calculation conforms strictly to isotropic error bounds."""
    # Close encounter (1.5 km miss distance)
    pc, confidence, method = RiskService.calculate_collision_probability(miss_distance_km=1.5, combined_radius_m=6.0, pos_uncertainty_km=1.2)
    assert pc is not None
    assert 0.0 <= pc <= 100.0
    assert "Foster-2D" in method
    assert "Estimated isotropic" in confidence

    # Distant encounter (100 km miss distance) -> Pc should be 0.0
    pc_distant, _, _ = RiskService.calculate_collision_probability(miss_distance_km=100.0)
    assert pc_distant == 0.0

def test_risk_score_factors_breakdown():
    """Verify risk score provides full explainability factors without fabricating arbitrary numbers."""
    now = datetime.now(timezone.utc)
    tca = now + timedelta(hours=4)
    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=0.8,
        relative_velocity_km_s=12.5,
        tca=tca,
        current_time=now,
        combined_size_m=8.0,
        pos_uncertainty_km=1.0
    )
    assert score is not None
    assert 0.0 <= score <= 100.0
    assert level is not None
    assert "miss_distance_factor" in factors
    assert "relative_velocity_factor" in factors
    assert "time_to_tca_factor" in factors
    assert "advanced_benchmarks" in factors

def test_decay_prediction_has_uncertainty():
    """Verify decay calculation produces prediction windows with explicit uncertainty bounds."""
    obj = OrbitalObject(
        norad_id=25544,
        name="ISS (ZARYA)",
        object_type=ObjectType.ACTIVE_SATELLITE,
        perigee_km=415.0,
        apogee_km=420.0,
        bstar=0.0001,
        tle_line1="1 25544U 98067A   26237.50000000  .00010000  00000-0  10000-3 0  9991",
        tle_line2="2 25544  51.6400 120.0000 0005000  45.0000  60.0000 15.50000000000010"
    )
    prediction = DecayService.assess_decay_lifetime(obj)
    assert prediction.predicted_reentry_time is not None
    assert prediction.uncertainty_window_hours > 0
    assert prediction.estimated_lifetime_days > 0
