import math
import pytest
from backend.app.services.propagation_service import teme_to_ecef, ecef_to_geodetic

def test_teme_to_ecef_rotation():
    """
    Validates TEME to ECEF frame rotation matrix properties.
    Preserves norm (distance from center of mass) and rotates by GMST.
    """
    x, y, z = 4000.0, 3000.0, 5000.0
    r_initial = math.sqrt(x**2 + y**2 + z**2)
    
    gmst_rad = math.pi / 4.0  # 45 degrees
    x_ecef, y_ecef, z_ecef = teme_to_ecef(x, y, z, gmst_rad)
    r_ecef = math.sqrt(x_ecef**2 + y_ecef**2 + z_ecef**2)
    
    assert abs(r_initial - r_ecef) < 1e-9, "Rotation must strictly preserve vector magnitude"
    assert abs(z - z_ecef) < 1e-9, "Z-axis coordinate must be invariant under equatorial GMST rotation"

def test_ecef_to_geodetic_equator_and_poles():
    """
    Validates Bowring's method against known WGS84 ellipsoid anchor points.
    """
    # 1. Point at equator, 0 deg lon, 500 km altitude (WGS84_A = 6378.137 km)
    lat, lon, alt = ecef_to_geodetic(6378.137 + 500.0, 0.0, 0.0)
    assert abs(lat - 0.0) < 1e-5, f"Equatorial latitude error: {lat}"
    assert abs(lon - 0.0) < 1e-5, f"Equatorial longitude error: {lon}"
    assert abs(alt - 500.0) < 1e-4, f"Equatorial altitude error: {alt}"

    # 2. Point at North Pole, 400 km altitude (WGS84_B = 6356.7523142 km)
    lat_p, lon_p, alt_p = ecef_to_geodetic(0.0, 0.0, 6356.7523142 + 400.0)
    assert abs(lat_p - 90.0) < 1e-5, f"Polar latitude error: {lat_p}"
    assert abs(alt_p - 400.0) < 1e-4, f"Polar altitude error: {alt_p}"
