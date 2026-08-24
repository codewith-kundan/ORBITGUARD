from datetime import datetime, timezone
import math

def to_utc(dt: datetime) -> datetime:
    """Ensures datetime object is UTC timezone-aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def datetime_to_jd(dt: datetime) -> float:
    """Converts a UTC datetime object to Julian Date (JD)."""
    dt = to_utc(dt)
    year = dt.year
    month = dt.month
    day = dt.day + (dt.hour + (dt.minute + (dt.second + dt.microsecond / 1e6) / 60.0) / 60.0) / 24.0

    if month <= 2:
        year -= 1
        month += 12

    A = math.floor(year / 100)
    B = 2 - A + math.floor(A / 4)

    jd = math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + B - 1524.5
    return jd

def gmst_from_jd(jd: float) -> float:
    """
    Computes Greenwich Mean Sidereal Time (GMST) in radians for a given Julian Date.
    Formula based on IAU-82 / Astronomical Almanac.
    """
    T = (jd - 2451545.0) / 36525.0
    # GMST in seconds of time
    gmst_sec = 24110.54841 + 8640184.812866 * T + 0.093104 * (T ** 2) - 6.2e-6 * (T ** 3)
    # Convert seconds to revolutions, get fractional part, then radians
    gmst_rad = ((gmst_sec / 86400.0) % 1.0) * 2.0 * math.pi
    if gmst_rad < 0:
        gmst_rad += 2.0 * math.pi
    return gmst_rad
