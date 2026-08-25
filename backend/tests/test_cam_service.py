import pytest
from datetime import datetime, timedelta
from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.models.conjunction import Conjunction
from backend.app.schemas.conjunction import RiskLevel
from backend.app.services.cam_service import CAMService
from backend.app.models.base import SessionLocal

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_orbital_speed_calculation():
    # LEO orbit at 500 km: a = 6371 + 500 = 6871 km
    speed = CAMService._calculate_orbital_speed(6871.0, 6871.0)
    assert 7.4 < speed < 7.8, f"LEO orbital speed should be ~7.6 km/s, got {speed}"

def test_fuel_mass_tsiolkovsky():
    # 500 kg satellite, 2 m/s delta-v, Isp = 220s
    fuel = CAMService._calculate_fuel_mass(2.0, 500.0, 220.0)
    assert fuel > 0.0, "Fuel cost must be positive"
    assert fuel < 2.0, f"2 m/s burn on 500kg sat should consume < 1 kg of fuel, got {fuel}"

def test_cam_plan_generation(db):
    # Create test primary and secondary objects
    primary = OrbitalObject(
        norad_id=99001,
        name="SAT-PRIME-TEST",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        tle_line1="1 99001U 20001A   24001.00000000  .00001000  00000-0  10000-4 0  9991",
        tle_line2="2 99001  53.0000 120.0000 0010000  45.0000 315.0000 15.12000000  1001",
        perigee_km=520.0,
        apogee_km=540.0,
        semi_major_axis_km=6901.0,
        inclination=53.0,
        period_minutes=95.2
    )
    secondary = OrbitalObject(
        norad_id=99002,
        name="DEBRIS-THREAT-TEST",
        object_type=ObjectType.DEBRIS,
        source="TEST",
        tle_line1="1 99002U 20001B   24001.00000000  .00001000  00000-0  10000-4 0  9992",
        tle_line2="2 99002  53.0000 120.0000 0010000  45.0000 315.0000 15.12000000  1002",
        perigee_km=515.0,
        apogee_km=545.0,
        semi_major_axis_km=6901.0,
        inclination=53.0,
        period_minutes=95.2
    )
    db.add(primary)
    db.add(secondary)
    db.commit()
    db.refresh(primary)
    db.refresh(secondary)

    conjunction = Conjunction(
        object_a_id=primary.id,
        object_b_id=secondary.id,
        tca=datetime.utcnow() + timedelta(hours=18),
        miss_distance_km=0.85,
        relative_velocity_km_s=11.2,
        altitude_km=530.0,
        risk_score=94.5,
        risk_level=RiskLevel.CRITICAL,
        status="ACTIVE"
    )
    db.add(conjunction)
    db.commit()
    db.refresh(conjunction)

    plan = CAMService.plan_avoidance_maneuver(db, conjunction.id)
    assert plan is not None, "CAM Plan must not be None"
    assert len(plan.strategies) == 4, "Should provide 4 strategies (Prograde, Retrograde, Cross-Track, Min Fuel)"
    
    for s in plan.strategies:
        assert s.total_delta_v_m_s > 0.0, "Delta-V must be positive"
        assert s.projected_miss_distance_km > plan.initial_miss_distance_km, "Projected miss distance must increase"
        assert s.miss_distance_gain_km > 0.0, "Miss distance gain must be positive"
        assert s.fuel_cost_kg > 0.0, "Fuel consumption must be positive"
        assert s.risk_reduction_percent > 80.0, "Risk reduction must be high"

    # Test custom simulation
    sim = CAMService.simulate_custom_burn(
        db,
        conjunction.id,
        delta_v_r_m_s=0.0,
        delta_v_t_m_s=1.5,
        delta_v_w_m_s=0.5,
        lead_time_hours=12.0
    )
    assert sim is not None
    assert sim.projected_miss_distance_km > 0.85
    assert sim.fuel_cost_kg > 0.0

    # Cleanup
    db.delete(conjunction)
    db.delete(primary)
    db.delete(secondary)
    db.commit()
