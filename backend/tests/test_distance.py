import pytest
import math
from datetime import datetime, timezone
from backend.app.utils.distance import (
    euclidean_distance_3d,
    relative_velocity_magnitude,
    compute_spatial_separation,
    haversine_ground_distance
)
from backend.app.schemas.orbital_object import OrbitalPosition

def test_identical_positions():
    p1 = (1000.0, 2000.0, 3000.0)
    p2 = (1000.0, 2000.0, 3000.0)
    assert euclidean_distance_3d(p1, p2) == 0.0

def test_known_separated_positions():
    # 3-4-0 Pythagorean distance = 5.0 km
    p1 = (0.0, 0.0, 0.0)
    p2 = (3.0, 4.0, 0.0)
    assert math.isclose(euclidean_distance_3d(p1, p2), 5.0, rel_tol=1e-6)

    # 3D: (1, 2, 2) from origin -> sqrt(1+4+4) = 3.0 km
    p3 = (1.0, 2.0, 2.0)
    assert math.isclose(euclidean_distance_3d(p1, p3), 3.0, rel_tol=1e-6)

def test_relative_velocity():
    # Two satellites moving perpendicular at 7 km/s each -> sqrt(7^2 + 7^2) = 9.899 km/s
    v1 = (7.0, 0.0, 0.0)
    v2 = (0.0, 7.0, 0.0)
    expected = math.sqrt(49.0 + 49.0)
    assert math.isclose(relative_velocity_magnitude(v1, v2), expected, rel_tol=1e-4)

    # Head-on collision trajectory: +7.5 km/s vs -7.5 km/s -> 15.0 km/s relative
    v3 = (7.5, 0.0, 0.0)
    v4 = (-7.5, 0.0, 0.0)
    assert math.isclose(relative_velocity_magnitude(v3, v4), 15.0, rel_tol=1e-6)

def test_compute_spatial_separation():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    pos1 = OrbitalPosition(
        timestamp=now, lat=0.0, lon=0.0, alt_km=400.0,
        x_km=6778.0, y_km=0.0, z_km=0.0,
        vx_km_s=0.0, vy_km_s=7.6, vz_km_s=0.0, velocity_km_s=7.6
    )
    pos2 = OrbitalPosition(
        timestamp=now, lat=0.0, lon=0.0, alt_km=403.0,
        x_km=6781.0, y_km=4.0, z_km=0.0,
        vx_km_s=0.0, vy_km_s=7.6, vz_km_s=0.0, velocity_km_s=7.6
    )
    res = compute_spatial_separation(pos1, pos2)
    # dx = 3.0 km, dy = 4.0 km -> miss distance = 5.0 km
    assert math.isclose(res["miss_distance_km"], 5.0, rel_tol=1e-4)
    assert res["altitude_difference_km"] == 3.0
    assert res["relative_velocity_km_s"] == 0.0

def test_haversine_ground_distance():
    # Equator 1 degree lon difference ~ 111.32 km
    dist = haversine_ground_distance(0.0, 0.0, 0.0, 1.0)
    assert 111.0 <= dist <= 112.0
