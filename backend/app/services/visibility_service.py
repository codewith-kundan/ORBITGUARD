import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple

from backend.app.services.propagation_service import PropagationService, WGS84_A, WGS84_B, WGS84_E2
from backend.app.utils.time_utils import to_utc, datetime_to_jd, gmst_from_jd

logger = logging.getLogger(__name__)

def geodetic_to_ecef(lat_deg: float, lon_deg: float, alt_km: float) -> Tuple[float, float, float]:
    """Converts WGS84 geodetic coordinates to ECEF Cartesian (km)."""
    lat_rad = math.radians(lat_deg)
    lon_rad = math.radians(lon_deg)
    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    sin_lon = math.sin(lon_rad)
    cos_lon = math.cos(lon_rad)

    N = WGS84_A / math.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
    x = (N + alt_km) * cos_lat * cos_lon
    y = (N + alt_km) * cos_lat * sin_lon
    z = (N * (1.0 - WGS84_E2) + alt_km) * sin_lat
    return x, y, z

def ecef_to_topocentric_enu(
    sat_x: float, sat_y: float, sat_z: float,
    obs_x: float, obs_y: float, obs_z: float,
    obs_lat_deg: float, obs_lon_deg: float
) -> Tuple[float, float, float]:
    """
    Transforms satellite ECEF position relative to observer into local East-North-Up (ENU) coordinates.
    """
    dx = sat_x - obs_x
    dy = sat_y - obs_y
    dz = sat_z - obs_z

    lat_rad = math.radians(obs_lat_deg)
    lon_rad = math.radians(obs_lon_deg)

    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    sin_lon = math.sin(lon_rad)
    cos_lon = math.cos(lon_rad)

    east = -sin_lon * dx + cos_lon * dy
    north = -sin_lat * cos_lon * dx - sin_lat * sin_lon * dy + cos_lat * dz
    up = cos_lat * cos_lon * dx + cos_lat * sin_lon * dy + sin_lat * dz

    return east, north, up

def enu_to_az_el_range(east: float, north: float, up: float) -> Tuple[float, float, float]:
    """Calculates Azimuth (deg [0, 360]), Elevation (deg [-90, 90]), and Range (km) from ENU vector."""
    r_horiz = math.sqrt(east * east + north * north)
    rng = math.sqrt(east * east + north * north + up * up)

    if rng < 1e-6:
        return 0.0, 90.0, 0.0

    el_rad = math.atan2(up, r_horiz)
    el_deg = math.degrees(el_rad)

    az_rad = math.atan2(east, north)
    az_deg = math.degrees(az_rad) % 360.0

    return round(az_deg, 2), round(el_deg, 2), round(rng, 2)

class VisibilityService:
    @staticmethod
    def calculate_passes(
        tle_line1: str,
        tle_line2: str,
        obs_lat: float,
        obs_lon: float,
        obs_alt_km: float = 0.0,
        start_time: Optional[datetime] = None,
        duration_hours: float = 24.0,
        min_elevation_deg: float = 10.0,
        step_seconds: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Calculates all overhead satellite passes and look angles visible from observer's ground station.
        """
        start = to_utc(start_time) if start_time else datetime.now(timezone.utc)
        end = start + timedelta(hours=duration_hours)
        step = timedelta(seconds=max(10, step_seconds))

        obs_x, obs_y, obs_z = geodetic_to_ecef(obs_lat, obs_lon, obs_alt_km)

        passes: List[Dict[str, Any]] = []
        current_pass: Optional[Dict[str, Any]] = None
        curr_time = start

        while curr_time <= end:
            pos = PropagationService.propagate_satellite(tle_line1, tle_line2, curr_time)
            if pos:
                east, north, up = ecef_to_topocentric_enu(
                    pos.x_km, pos.y_km, pos.z_km,
                    obs_x, obs_y, obs_z,
                    obs_lat, obs_lon
                )
                az, el, rng = enu_to_az_el_range(east, north, up)

                if el >= min_elevation_deg:
                    # Satellite is above observer's horizon
                    sample_point = {
                        "timestamp": curr_time.isoformat(),
                        "azimuth_deg": az,
                        "elevation_deg": el,
                        "range_km": rng,
                        "sat_lat": pos.lat,
                        "sat_lon": pos.lon,
                        "sat_alt_km": pos.alt_km
                    }

                    if current_pass is None:
                        # Acquisition of Signal (AOS) - Rise
                        current_pass = {
                            "aos_time": curr_time,
                            "aos_azimuth": az,
                            "max_elevation_time": curr_time,
                            "max_elevation_deg": el,
                            "max_elevation_azimuth": az,
                            "min_range_km": rng,
                            "los_time": curr_time,
                            "los_azimuth": az,
                            "track_points": [sample_point]
                        }
                    else:
                        # In-progress pass - track max elevation
                        current_pass["track_points"].append(sample_point)
                        if el > current_pass["max_elevation_deg"]:
                            current_pass["max_elevation_deg"] = el
                            current_pass["max_elevation_time"] = curr_time
                            current_pass["max_elevation_azimuth"] = az
                            current_pass["min_range_km"] = rng
                        current_pass["los_time"] = curr_time
                        current_pass["los_azimuth"] = az
                else:
                    # Satellite is below horizon
                    if current_pass is not None:
                        # Loss of Signal (LOS) - Pass Completed
                        duration_sec = (current_pass["los_time"] - current_pass["aos_time"]).total_seconds()
                        if duration_sec >= 60.0:  # Minimum 1-minute visible pass
                            passes.append({
                                "aos_time": current_pass["aos_time"].isoformat(),
                                "aos_azimuth_deg": current_pass["aos_azimuth"],
                                "max_elevation_time": current_pass["max_elevation_time"].isoformat(),
                                "max_elevation_deg": round(current_pass["max_elevation_deg"], 1),
                                "max_elevation_azimuth_deg": current_pass["max_elevation_azimuth"],
                                "min_range_km": round(current_pass["min_range_km"], 1),
                                "los_time": current_pass["los_time"].isoformat(),
                                "los_azimuth_deg": current_pass["los_azimuth"],
                                "duration_minutes": round(duration_sec / 60.0, 1),
                                "track_points": current_pass["track_points"]
                            })
                        current_pass = None

            curr_time += step

        # If pass still active at end of window
        if current_pass is not None:
            duration_sec = (current_pass["los_time"] - current_pass["aos_time"]).total_seconds()
            if duration_sec >= 60.0:
                passes.append({
                    "aos_time": current_pass["aos_time"].isoformat(),
                    "aos_azimuth_deg": current_pass["aos_azimuth"],
                    "max_elevation_time": current_pass["max_elevation_time"].isoformat(),
                    "max_elevation_deg": round(current_pass["max_elevation_deg"], 1),
                    "max_elevation_azimuth_deg": current_pass["max_elevation_azimuth"],
                    "min_range_km": round(current_pass["min_range_km"], 1),
                    "los_time": current_pass["los_time"].isoformat(),
                    "los_azimuth_deg": current_pass["los_azimuth"],
                    "duration_minutes": round(duration_sec / 60.0, 1),
                    "track_points": current_pass["track_points"]
                })

        return passes
