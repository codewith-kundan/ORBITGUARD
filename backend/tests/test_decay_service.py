import pytest
from datetime import datetime, timezone
from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.services.decay_service import DecayService

def test_atmospheric_density_scale_heights():
    # 200 km density should be ~ 1e-10 to 1e-9 kg/m^3
    rho_200 = DecayService.get_atmospheric_density(200.0, 150.0, 15.0)
    assert 1e-11 < rho_200 < 1e-9, f"200 km density unexpected: {rho_200}"

    # 400 km density should be ~ 1e-12 kg/m^3
    rho_400 = DecayService.get_atmospheric_density(400.0, 150.0, 15.0)
    assert 1e-13 < rho_400 < 1e-11, f"400 km density unexpected: {rho_400}"

    # Density at 200 km must be strictly greater than at 400 km
    assert rho_200 > rho_400 * 10.0

def test_low_perigee_decay_lifetime():
    # Very low LEO satellite at 220 km perigee, 240 km apogee
    decaying_sat = OrbitalObject(
        norad_id=99001,
        name="DECAYING-LEO-TEST",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        perigee_km=220.0,
        apogee_km=240.0,
        inclination=51.6,
        bstar=0.005  # High drag
    )

    pred = DecayService.assess_decay_lifetime(decaying_sat)
    assert pred.norad_id == 99001
    assert pred.estimated_lifetime_days > 0.0
    assert pred.estimated_lifetime_days < 90.0, "Satellite at 220km with high drag should re-enter in <90 days"
    assert pred.is_decay_imminent is True
    assert pred.uncertainty_window_hours > 0.0
    assert len(pred.decay_profile) > 0
    assert pred.estimated_surviving_mass_kg > 0.0

def test_high_leo_lifetime_stability():
    # Higher LEO satellite at 600 km perigee
    stable_sat = OrbitalObject(
        norad_id=99002,
        name="STABLE-LEO-TEST",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        perigee_km=600.0,
        apogee_km=620.0,
        inclination=97.5,
        bstar=0.0001
    )

    pred = DecayService.assess_decay_lifetime(stable_sat)
    assert pred.estimated_lifetime_days > 365.0, "Satellite at 600km should survive > 1 year"
    assert pred.risk_level in ["LOW", "MODERATE"]
