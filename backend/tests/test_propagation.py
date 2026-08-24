import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.propagation_service import PropagationService, teme_to_ecef, ecef_to_geodetic
from backend.app.utils.time_utils import datetime_to_jd, gmst_from_jd

client = TestClient(app)

ISS_LINE1 = "1 25544U 98067A   26236.48831019  .00016717  00000+0  30000-3 0  9993"
ISS_LINE2 = "2 25544  51.6416 182.2582 0005423  94.3982  22.8423 15.49842105471236"

def test_time_and_gmst():
    dt = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    jd = datetime_to_jd(dt)
    assert jd > 2460000.0
    gmst = gmst_from_jd(jd)
    assert 0.0 <= gmst <= 2 * 3.141592653589793

def test_propagate_iss_position():
    target_time = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    pos = PropagationService.propagate_satellite(ISS_LINE1, ISS_LINE2, target_time)
    
    assert pos is not None
    # ISS orbital altitude is in Low Earth Orbit (~415-430 km)
    assert 380.0 <= pos.alt_km <= 460.0
    # ISS orbital velocity is ~7.66 km/s
    assert 7.4 <= pos.velocity_km_s <= 7.9
    # Geodetic range checks
    assert -90.0 <= pos.lat <= 90.0
    assert -180.0 <= pos.lon <= 180.0
    # 3D position vector magnitude sqrt(x^2 + y^2 + z^2) ~ 6790 km (Earth Radius + Alt)
    pos_mag = (pos.x_km**2 + pos.y_km**2 + pos.z_km**2) ** 0.5
    assert 6700.0 <= pos_mag <= 6900.0

def test_get_trajectory_points():
    start = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=2) # 2 hours with 10 min steps = 13 points
    points = PropagationService.get_trajectory(ISS_LINE1, ISS_LINE2, start, end, step_minutes=10)
    
    assert len(points) == 13
    for p in points:
        assert 380.0 <= p.alt_km <= 460.0
        assert 7.4 <= p.velocity_km_s <= 7.9

def test_api_trajectory_endpoint():
    # Sync DB first
    client.post("/api/data/refresh")
    
    # Request trajectory
    res = client.get("/api/objects/25544/trajectory?hours=3&step_minutes=15")
    assert res.status_code == 200
    data = res.json()
    assert data["norad_id"] == 25544
    assert len(data["points"]) == 13 # 3h / 15m = 12 intervals + 1 = 13 points
    assert data["points"][0]["alt_km"] > 350.0
