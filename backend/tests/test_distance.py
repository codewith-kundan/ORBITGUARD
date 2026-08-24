import pytest
import math
from datetime import datetime, timezone
from backend.app.utils.distance import (
    euclidean_distance_3d,
    relative_velocity_magnitude,
    compute_spatial_separation,
    haversine_ground_distance
)
from backend.app.schemas.orbital_object import OrbitalPosition, ObjectType

def test_euclidean_distance_3d():
    p1 = (0.0, 0.0, 0.0)
    p2 = (3.0, 4.0, 0.0)
    assert euclidean_distance_3d(p1, p2) == 5.0

    p3 = (1.0, 2.0, 2.0)
    p4 = (4.0, 6.0, 2.0)
    assert euclidean_distance_3d(p3, p4) == 5.0

def test_relative_velocity_magnitude():
    v1 = (7.0, 0.0, 0.0)
    v2 = (0.0, 7.0, 0.0)
    expected = math.sqrt(49.0 + 49.0)
    assert abs(relative_velocity_magnitude(v1, v2) - expected) < 1e-6

    # Parallel velocities (same direction)
    v3 = (7.5, 1.2, -0.5)
    v4 = (7.5, 1.2, -0.5)
    assert relative_velocity_magnitude(v3, v4) == 0.0

def test_compute_spatial_separation():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    pos1 = OrbitalPosition(
        norad_id=25544,
        name="ISS",
        type=ObjectType.ACTIVE_SATELLITE,
        timestamp=now, lat=0.0, lon=0.0, alt_km=400.0,
        x_km=6778.0, y_km=0.0, z_km=0.0,
        vx_km_s=0.0, vy_km_s=7.6, vz_km_s=0.0, velocity_km_s=7.6
    )
    pos2 = OrbitalPosition(
        norad_id=99991,
        name="DEBRIS",
        type=ObjectType.DEBRIS,
        timestamp=now, lat=0.0, lon=0.0, alt_km=410.0,
        x_km=6788.0, y_km=0.0, z_km=0.0,
        vx_km_s=0.0, vy_km_s=7.6, vz_km_s=1.0, velocity_km_s=7.665
    )

    sep = compute_spatial_separation(pos1, pos2)
    assert sep["miss_distance_km"] == 10.0
    assert sep["relative_velocity_km_s"] == 1.0
    assert sep["altitude_difference_km"] == 10.0

def test_haversine_ground_distance():
    # Equator 1 degree longitude separation ~ 111.32 km
    dist = haversine_ground_distance(0.0, 0.0, 0.0, 1.0)
    assert 110.0 < dist < 112.0
