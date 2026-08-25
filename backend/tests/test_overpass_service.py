import pytest
from datetime import datetime, timezone
from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.services.overpass_service import OverpassService

def test_observer_to_ecef():
    # Equator, 0 deg longitude, sea level: x = WGS84_A (~6378.137 km), y = 0, z = 0
    x, y, z = OverpassService._observer_to_ecef(0.0, 0.0, 0.0)
    assert abs(x - 6378.137) < 0.1
    assert abs(y) < 0.01
    assert abs(z) < 0.01

def test_topocentric_az_el_overhead():
    # Satellite directly overhead observer (station at equator, sat directly above at 500 km alt)
    obs_ecef = OverpassService._observer_to_ecef(0.0, 0.0, 0.0)
    sat_ecef = (obs_ecef[0] + 500.0, obs_ecef[1], obs_ecef[2])
    
    az, el, rng = OverpassService._calculate_topocentric_az_el(sat_ecef, obs_ecef, 0.0, 0.0)
    assert abs(el - 90.0) < 0.1, f"Overhead sat elevation should be 90 deg, got {el}"
    assert abs(rng - 500.0) < 0.1, f"Overhead sat range should be 500 km, got {rng}"

def test_footprint_radius():
    # LEO orbit at 500 km, 10 deg elevation: footprint radius is ~1563 km
    r_footprint = OverpassService._calculate_footprint_radius_km(500.0, 10.0)
    assert 1400.0 < r_footprint < 1800.0, f"LEO footprint should be ~1563 km, got {r_footprint}"

def test_overpass_prediction_iss():
    # ISS TLE
    iss = OrbitalObject(
        norad_id=25544,
        name="ISS (ZARYA)",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        tle_line1="1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9001",
        tle_line2="2 25544  51.6400 208.5000 0005000 130.0000 230.0000 15.50000000  1001",
        perigee_km=415.0,
        apogee_km=425.0,
        period_minutes=92.8
    )

    # Bengaluru station
    resp = OverpassService.predict_overpasses(
        obj=iss,
        station_lat=13.034,
        station_lon=77.512,
        station_alt_m=920.0,
        station_name="ISRO ISTRAC",
        min_elevation_deg=10.0,
        prediction_hours=48.0
    )

    assert resp.norad_id == 25544
    assert resp.station_name == "ISRO ISTRAC"
    assert resp.total_passes_found >= 1, "ISS must pass over mid-latitudes within 48 hours"
    
    for p in resp.passes:
        assert p.max_elevation_deg >= 10.0
        assert p.duration_seconds > 0
        assert len(p.sky_trajectory) > 0

def test_ground_track_ribbon():
    iss = OrbitalObject(
        norad_id=25544,
        name="ISS (ZARYA)",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        tle_line1="1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9001",
        tle_line2="2 25544  51.6400 208.5000 0005000 130.0000 230.0000 15.50000000  1001",
        perigee_km=415.0,
        apogee_km=425.0,
        period_minutes=92.8
    )

    track = OverpassService.get_ground_track_ribbon(iss)
    assert track is not None
    assert len(track.past_track) > 10
    assert len(track.future_track) > 10
    assert track.footprint_radius_km > 1000.0
    assert -90.0 <= track.current_position.latitude <= 90.0
    assert -180.0 <= track.current_position.longitude <= 180.0
