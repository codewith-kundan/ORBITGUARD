import pytest
from backend.app.schemas.breakup import BreakupSimulateRequest
from backend.app.services.breakup_service import BreakupService

def test_catastrophic_collision_simulation():
    # Cosmos 2251 - Iridium 33 style catastrophic collision (1000 kg + 560 kg at 11.6 km/s)
    req = BreakupSimulateRequest(
        event_type="CATASTROPHIC_COLLISION",
        target_name="Iridium 33",
        target_mass_kg=560.0,
        impactor_name="Cosmos 2251",
        impactor_mass_kg=900.0,
        relative_velocity_km_s=11.6,
        altitude_km=780.0,
        inclination_deg=86.4,
        min_fragment_size_m=0.05,
        max_fragments_to_generate=150
    )

    resp = BreakupService.simulate_breakup(req)
    assert resp.is_catastrophic is True
    assert resp.total_predicted_fragments_gt_min_size > 1000, "Catastrophic collision must yield >1000 fragments >5cm"
    assert resp.sample_fragments_count == 150
    assert len(resp.gabbard_points) == 150
    assert len(resp.fragments) == 150

    # Gabbard diagram verification: apogee must be >= perigee for all non-hyperbolic fragments
    for gp in resp.gabbard_points:
        if not gp.is_decayed:
            assert gp.apogee_altitude_km >= gp.perigee_altitude_km
        assert gp.delta_v_m_s > 0
        assert gp.characteristic_length_m >= 0.05

def test_explosion_breakup_simulation():
    # Upper stage pressure vessel explosion (mass 1500 kg)
    req = BreakupSimulateRequest(
        event_type="EXPLOSION",
        target_name="Upper Stage Booster",
        target_mass_kg=1500.0,
        impactor_mass_kg=0.0,
        relative_velocity_km_s=0.0,
        altitude_km=600.0,
        inclination_deg=51.6,
        min_fragment_size_m=0.10,
        max_fragments_to_generate=100
    )

    resp = BreakupService.simulate_breakup(req)
    assert resp.event_type == "EXPLOSION"
    assert resp.total_predicted_fragments_gt_min_size > 100
    assert len(resp.gabbard_points) == 100
    assert resp.cloud_dispersion_stats["parent_period_minutes"] > 90.0

def test_area_to_mass_sampling():
    # Area-to-mass must be positive and follow realistic bounds (0.001 to 100 m^2/kg)
    for _ in range(50):
        am = BreakupService._sample_area_to_mass(log_lc=-1.0)
        assert 0.001 <= am <= 100.0
