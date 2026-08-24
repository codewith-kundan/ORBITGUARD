import math
from typing import Tuple, Dict, Any
from backend.app.schemas.orbital_object import OrbitalPosition

def euclidean_distance_3d(
    p1: Tuple[float, float, float],
    p2: Tuple[float, float, float]
) -> float:
    """
    Computes 3D Euclidean separation distance in kilometers between two Cartesian points (x, y, z).
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    dz = p2[2] - p1[2]
    return math.sqrt(dx * dx + dy * dy + dz * dz)

def relative_velocity_magnitude(
    v1: Tuple[float, float, float],
    v2: Tuple[float, float, float]
) -> float:
    """
    Computes relative velocity magnitude in km/s between two velocity vectors (vx, vy, vz).
    """
    dvx = v2[0] - v1[0]
    dvy = v2[1] - v1[1]
    dvz = v2[2] - v1[2]
    return math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz)

def compute_spatial_separation(pos1: OrbitalPosition, pos2: OrbitalPosition) -> Dict[str, float]:
    """
    Calculates 3D Euclidean miss distance (km) and relative velocity (km/s) from two OrbitalPosition objects.
    """
    p1 = (pos1.x_km, pos1.y_km, pos1.z_km)
    p2 = (pos2.x_km, pos2.y_km, pos2.z_km)
    miss_distance = euclidean_distance_3d(p1, p2)

    v1 = (pos1.vx_km_s, pos1.vy_km_s, pos1.vz_km_s)
    v2 = (pos2.vx_km_s, pos2.vy_km_s, pos2.vz_km_s)
    rel_vel = relative_velocity_magnitude(v1, v2)

    alt_diff = abs(pos1.alt_km - pos2.alt_km)

    return {
        "miss_distance_km": round(miss_distance, 4),
        "relative_velocity_km_s": round(rel_vel, 4),
        "altitude_difference_km": round(alt_diff, 4)
    }

def haversine_ground_distance(lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float = 6378.137) -> float:
    """
    Calculates great-circle surface distance between two sub-satellite points on Earth.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return radius_km * c
