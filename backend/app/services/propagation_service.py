import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sgp4.api import Satrec, jday

from backend.app.utils.time_utils import to_utc, datetime_to_jd, gmst_from_jd
from backend.app.schemas.orbital_object import OrbitalPosition, TrajectoryPoint, GroundTrackPoint, ObjectType

logger = logging.getLogger(__name__)

# WGS84 Constants
WGS84_A = 6378.137          # Equatorial radius in km
WGS84_F = 1.0 / 298.257223563 # Flattening
WGS84_E2 = WGS84_F * (2.0 - WGS84_F) # First eccentricity squared
WGS84_B = WGS84_A * (1.0 - WGS84_F)  # Polar semi-minor axis

def teme_to_ecef(x: float, y: float, z: float, gmst_rad: float) -> Tuple[float, float, float]:
    """Rotates TEME coordinate vector to ECEF frame via Greenwich Mean Sidereal Time."""
    cos_g = math.cos(gmst_rad)
    sin_g = math.sin(gmst_rad)
    x_ecef = cos_g * x + sin_g * y
    y_ecef = -sin_g * x + cos_g * y
    z_ecef = z
    return x_ecef, y_ecef, z_ecef

def ecef_to_geodetic(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    Converts ECEF Cartesian coordinates (km) to Geodetic coordinates:
    Latitude (deg [-90, 90]), Longitude (deg [-180, 180]), Altitude (km) using Bowring's method.
    """
    p = math.sqrt(x * x + y * y)
    if p < 1e-6:
        lat = 90.0 if z > 0 else -90.0
        lon = 0.0
        alt = abs(z) - WGS84_B
        return lat, lon, alt

    lon_rad = math.atan2(y, x)
    lon_deg = math.degrees(lon_rad)

    # Bowring's closed-form approximation
    theta = math.atan2(z * WGS84_A, p * WGS84_B)
    e_prime_sq = (WGS84_A**2 - WGS84_B**2) / (WGS84_B**2)
    
    lat_rad = math.atan2(
        z + e_prime_sq * WGS84_B * (math.sin(theta)**3),
        p - WGS84_E2 * WGS84_A * (math.cos(theta)**3)
    )
    lat_deg = math.degrees(lat_rad)

    # Prime vertical radius of curvature
    sin_lat = math.sin(lat_rad)
    N = WGS84_A / math.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
    alt_km = p / math.cos(lat_rad) - N

    return lat_deg, lon_deg, alt_km

class PropagationService:
    @staticmethod
    def propagate_satellite(
        line1: str,
        line2: str,
        target_time: datetime,
        norad_id: int = 0,
        name: str = "",
        object_type: ObjectType = ObjectType.UNKNOWN,
        internal_id: Optional[int] = None
    ) -> Optional[OrbitalPosition]:
        """
        Propagates satellite to target_time using analytical SGP4.
        Returns position in TEME Cartesian and WGS84 geodetic coordinates.
        """
        target_utc = to_utc(target_time)
        try:
            sat = Satrec.twoline2rv(line1, line2)
            jd, fr = jday(
                target_utc.year, target_utc.month, target_utc.day,
                target_utc.hour, target_utc.minute, target_utc.second + target_utc.microsecond / 1e6
            )
            
            error_code, r, v = sat.sgp4(jd, fr)
            if error_code != 0:
                logger.debug(f"SGP4 error code {error_code} at {target_utc.isoformat()}")
                return None

            rx, ry, rz = r
            vx, vy, vz = v
            speed = math.sqrt(vx * vx + vy * vy + vz * vz)

            # Convert to Geodetic
            full_jd = jd + fr
            gmst = gmst_from_jd(full_jd)
            xe, ye, ze = teme_to_ecef(rx, ry, rz, gmst)
            lat, lon, alt = ecef_to_geodetic(xe, ye, ze)

            return OrbitalPosition(
                timestamp=target_utc,
                id=internal_id,
                norad_id=norad_id,
                name=name,
                type=object_type,
                lat=round(lat, 4),
                lon=round(lon, 4),
                alt_km=round(alt, 2),
                x_km=round(xe, 3),
                y_km=round(ye, 3),
                z_km=round(ze, 3),
                vx_km_s=round(vx, 4),
                vy_km_s=round(vy, 4),
                vz_km_s=round(vz, 4),
                velocity_km_s=round(speed, 4)
            )
        except Exception as e:
            logger.debug(f"Propagation exception: {e}")
            return None

    @staticmethod
    def get_trajectory(
        line1: str,
        line2: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        step_minutes: int = 5
    ) -> List[TrajectoryPoint]:
        """
        Generates an array of future orbital positions (3D and geodetic) over a time window.
        """
        if start_time is None:
            start_time = datetime.now(timezone.utc)
        else:
            start_time = to_utc(start_time)

        if end_time is None:
            end_time = start_time + timedelta(hours=24)
        else:
            end_time = to_utc(end_time)

        step_delta = timedelta(minutes=max(1, step_minutes))
        points: List[TrajectoryPoint] = []

        curr_time = start_time
        while curr_time <= end_time:
            pos = PropagationService.propagate_satellite(line1, line2, curr_time)
            if pos:
                points.append(TrajectoryPoint(
                    timestamp=pos.timestamp,
                    lat=pos.lat,
                    lon=pos.lon,
                    alt_km=pos.alt_km,
                    x_km=pos.x_km,
                    y_km=pos.y_km,
                    z_km=pos.z_km,
                    velocity_km_s=pos.velocity_km_s
                ))
            curr_time += step_delta

        return points

    @staticmethod
    def get_ground_track(
        line1: str,
        line2: str,
        start_time: Optional[datetime] = None,
        duration_minutes: int = 180,
        step_minutes: int = 2
    ) -> List[GroundTrackPoint]:
        """
        Generates projected sub-satellite ground track points (lat, lon, alt) over time.
        """
        if start_time is None:
            start_time = datetime.now(timezone.utc)
        else:
            start_time = to_utc(start_time)

        end_time = start_time + timedelta(minutes=duration_minutes)
        step_delta = timedelta(minutes=max(1, step_minutes))
        track_points: List[GroundTrackPoint] = []

        curr_time = start_time
        while curr_time <= end_time:
            pos = PropagationService.propagate_satellite(line1, line2, curr_time)
            if pos:
                track_points.append(GroundTrackPoint(
                    timestamp=pos.timestamp,
                    lat=pos.lat,
                    lon=pos.lon,
                    alt_km=pos.alt_km
                ))
            curr_time += step_delta

        return track_points
