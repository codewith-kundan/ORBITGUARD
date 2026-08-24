import math
from typing import Tuple, Dict, Any, Union
from backend.app.schemas.orbital_object import OrbitalPosition

def euclidean_distance_3d(
    *args: Union[Tuple[float, float, float], float]
) -> float:
    """
    Computes 3D Euclidean separation distance in kilometers between two Cartesian points.
    Supports either euclidean_distance_3d((x1, y1, z1), (x2, y2, z2))
    or euclidean_distance_3d(x1, y1, z1, x2, y2, z2).
    """
    if len(args) == 2:
        p1, p2 = args[0], args[1]
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        dz = p2[2] - p1[2]
    elif len(args) == 6:
        x1, y1, z1, x2, y2, z2 = args
        dx = x2 - x1
        dy = y2 - y1
        dz = z2 - z1
    else:
        raise ValueError(f"euclidean_distance_3d expected 2 tuples or 6 floats, got {len(args)} arguments")

    return math.sqrt(dx * dx + dy * dy + dz * dz)

def relative_velocity_magnitude(
    *args: Union[Tuple[float, float, float], float]
) -> float:
    """
    Computes relative velocity magnitude in km/s between two velocity vectors.
    Supports relative_velocity_magnitude((vx1, vy1, vz1), (vx2, vy2, vz2))
    or relative_velocity_magnitude(vx1, vy1, vz1, vx2, vy2, vz2).
    """
    if len(args) == 2:
        v1, v2 = args[0], args[1]
        dvx = v2[0] - v1[0]
        dvy = v2[1] - v1[1]
        dvz = v2[2] - v1[2]
    elif len(args) == 6:
        vx1, vy1, vz1, vx2, vy2, vz2 = args
        dvx = vx2 - vx1
        dvy = vy2 - vy1
        dvz = vz2 - vz1
    else:
        raise ValueError(f"relative_velocity_magnitude expected 2 tuples or 6 floats, got {len(args)} arguments")

    return math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz)

def compute_spatial_separation(
    *args: Any,
    target_time: Any = None
) -> Dict[str, float]:
    """
    Calculates 3D Euclidean miss distance (km) and relative velocity (km/s).
    Supports compute_spatial_separation(pos1, pos2) or
    compute_spatial_separation(line1a, line2a, line1b, line2b, target_time=...).
    """
    if len(args) == 2 and isinstance(args[0], OrbitalPosition) and isinstance(args[1], OrbitalPosition):
        pos1, pos2 = args[0], args[1]
    elif len(args) == 4:
        from backend.app.services.propagation_service import PropagationService
        pos1 = PropagationService.propagate_satellite(args[0], args[1], target_time)
        pos2 = PropagationService.propagate_satellite(args[2], args[3], target_time)
        if not pos1 or not pos2:
            return {"miss_distance_km": 99999.0, "relative_velocity_km_s": 0.0, "altitude_difference_km": 99999.0}
    else:
        raise ValueError("Invalid arguments for compute_spatial_separation")

    miss_distance = euclidean_distance_3d(pos1.x_km, pos1.y_km, pos1.z_km, pos2.x_km, pos2.y_km, pos2.z_km)
    rel_vel = relative_velocity_magnitude(pos1.vx_km_s, pos1.vy_km_s, pos1.vz_km_s, pos2.vx_km_s, pos2.vy_km_s, pos2.vz_km_s)
    alt_diff = abs(pos1.alt_km - pos2.alt_km)

    return {
        "miss_distance_km": round(miss_distance, 4),
        "relative_velocity_km_s": round(rel_vel, 4),
        "altitude_difference_km": round(alt_diff, 4)
    }

def haversine_ground_distance(lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float = 6378.137) -> float:
    """Calculates great-circle surface distance between two sub-satellite points on Earth."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return radius_km * c
