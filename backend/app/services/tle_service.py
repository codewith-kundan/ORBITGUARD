import httpx
import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sgp4.api import Satrec, WGS72

from backend.app.config import settings
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.orbital_object import ObjectType

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6378.137  # WGS84 equatorial radius
MU_EARTH = 398600.4418      # Earth gravitational parameter km^3/s^2

def compute_tle_checksum(line: str) -> int:
    """Calculates standard NORAD TLE modulo 10 checksum."""
    line_clean = line[:68]
    checksum = 0
    for char in line_clean:
        if char.isdigit():
            checksum += int(char)
        elif char == '-':
            checksum += 1
    return checksum % 10

def validate_tle(line1: str, line2: str) -> Tuple[bool, str]:
    """Validates TLE format, length, line prefixes, and checksums."""
    line1 = line1.strip()
    line2 = line2.strip()

    if len(line1) != 69 or len(line2) != 69:
        return False, f"Invalid line length (Line 1: {len(line1)}, Line 2: {len(line2)}, expected 69)"

    if not line1.startswith('1 ') or not line2.startswith('2 '):
        return False, "Invalid line starting sequence (Line 1 must start with '1 ', Line 2 with '2 ')"

    # Checksum validation
    expected_c1 = compute_tle_checksum(line1)
    actual_c1 = int(line1[68])
    if expected_c1 != actual_c1:
        # Some TLE sources have minor checksum discrepancies; warn but tolerate if SGP4 can parse
        logger.warning(f"TLE Line 1 checksum mismatch: calculated {expected_c1}, got {actual_c1}")

    expected_c2 = compute_tle_checksum(line2)
    actual_c2 = int(line2[68])
    if expected_c2 != actual_c2:
        logger.warning(f"TLE Line 2 checksum mismatch: calculated {expected_c2}, got {actual_c2}")

    try:
        sat = Satrec.twoline2rv(line1, line2)
        if sat.error != 0:
            return False, f"SGP4 initialization error code: {sat.error}"
    except Exception as e:
        return False, f"SGP4 parsing exception: {str(e)}"

    return True, "Valid TLE"

def classify_object_type(name: str, norad_id: int) -> ObjectType:
    """Classifies orbital object into Satellite, Debris, or Rocket Body."""
    name_upper = name.upper()
    if "DEB" in name_upper or "DEBRIS" in name_upper:
        return ObjectType.DEBRIS
    elif "R/B" in name_upper or "ROCKET" in name_upper or "STAGE" in name_upper:
        return ObjectType.ROCKET_BODY
    else:
        return ObjectType.SATELLITE

def parse_tle_orbital_elements(line1: str, line2: str) -> Dict[str, Any]:
    """Extracts Keplerian elements and physical orbit boundaries from TLE."""
    norad_id = int(line1[2:7].strip())
    
    # Epoch parsing
    epoch_year_2digit = int(line1[18:20])
    epoch_year = 2000 + epoch_year_2digit if epoch_year_2digit < 57 else 1900 + epoch_year_2digit
    epoch_day = float(line1[20:32])
    
    # Inclination in degrees
    inclination_deg = float(line2[8:16])
    
    # Eccentricity (decimal point assumed)
    eccentricity = float("0." + line2[26:33].strip())
    
    # Mean motion (revolutions per day)
    mean_motion_rev_day = float(line2[52:63])
    
    # Period in minutes
    if mean_motion_rev_day > 0:
        period_min = 1440.0 / mean_motion_rev_day
        mean_motion_rad_s = (mean_motion_rev_day * 2.0 * math.pi) / 86400.0
        semi_major_axis_km = (MU_EARTH / (mean_motion_rad_s ** 2)) ** (1.0 / 3.0)
    else:
        period_min = None
        semi_major_axis_km = None

    if semi_major_axis_km:
        perigee_km = semi_major_axis_km * (1.0 - eccentricity) - EARTH_RADIUS_KM
        apogee_km = semi_major_axis_km * (1.0 + eccentricity) - EARTH_RADIUS_KM
    else:
        perigee_km = None
        apogee_km = None

    return {
        "norad_id": norad_id,
        "inclination_deg": round(inclination_deg, 4),
        "eccentricity": round(eccentricity, 7),
        "period_min": round(period_min, 2) if period_min else None,
        "semi_major_axis_km": round(semi_major_axis_km, 2) if semi_major_axis_km else None,
        "perigee_km": round(perigee_km, 2) if perigee_km else None,
        "apogee_km": round(apogee_km, 2) if apogee_km else None,
    }

def parse_tle_text(tle_text: str, default_source: str = "CelesTrak") -> List[Dict[str, Any]]:
    """Parses standard 2-line or 3-line TLE blocks."""
    lines = [l.strip() for l in tle_text.strip().split("\n") if l.strip()]
    records = []
    
    i = 0
    while i < len(lines):
        if lines[i].startswith("1 ") and i + 1 < len(lines) and lines[i+1].startswith("2 "):
            # 2-line format without name
            line1 = lines[i]
            line2 = lines[i+1]
            norad_id = int(line1[2:7])
            name = f"OBJECT-{norad_id}"
            i += 2
        elif i + 2 < len(lines) and lines[i+1].startswith("1 ") and lines[i+2].startswith("2 "):
            # 3-line format with name
            name = lines[i]
            line1 = lines[i+1]
            line2 = lines[i+2]
            i += 3
        else:
            i += 1
            continue

        is_valid, reason = validate_tle(line1, line2)
        if not is_valid:
            logger.warning(f"Skipping invalid TLE for {name}: {reason}")
            continue

        elements = parse_tle_orbital_elements(line1, line2)
        obj_type = classify_object_type(name, elements["norad_id"])

        records.append({
            "name": name,
            "norad_id": elements["norad_id"],
            "object_type": obj_type,
            "tle_line1": line1,
            "tle_line2": line2,
            "inclination_deg": elements["inclination_deg"],
            "eccentricity": elements["eccentricity"],
            "period_min": elements["period_min"],
            "semi_major_axis_km": elements["semi_major_axis_km"],
            "perigee_km": elements["perigee_km"],
            "apogee_km": elements["apogee_km"],
            "source": default_source,
            "tle_epoch": datetime.now(timezone.utc),
        })

    return records

class TLEService:
    @staticmethod
    async def fetch_tle_data() -> Tuple[List[Dict[str, Any]], str, str]:
        """
        Attempts to fetch live TLEs from CelesTrak.
        Falls back to local verified cache if offline.
        Returns (records, source_name, status_mode).
        """
        urls = [
            settings.CELESTRAK_STATIONS_URL,
            settings.CELESTRAK_DEBRIS_URL,
        ]
        
        all_tle_text = ""
        fetch_success = False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                for url in urls:
                    try:
                        res = await client.get(url)
                        if res.status_code == 200 and len(res.text) > 100:
                            all_tle_text += res.text + "\n"
                            fetch_success = True
                    except Exception as e:
                        logger.warning(f"Error fetching {url}: {e}")
        except Exception as e:
            logger.warning(f"HTTP client error: {e}")

        if fetch_success and len(all_tle_text.strip()) > 0:
            records = parse_tle_text(all_tle_text, default_source="CelesTrak (Live)")
            if records:
                return records, "CelesTrak", "LIVE"

        # Fallback to local verified cache
        logger.info(f"Using local cached dataset from {settings.LOCAL_TLE_FALLBACK}")
        try:
            with open(settings.LOCAL_TLE_FALLBACK, "r") as f:
                cached_text = f.read()
            records = parse_tle_text(cached_text, default_source="Local Cached Dataset (Demo)")
            return records, "Local Cached Dataset", "DEMO MODE"
        except Exception as e:
            logger.error(f"Failed to read local fallback TLE cache: {e}")
            return [], "None", "OFFLINE"

    @staticmethod
    def sync_to_database(db: Session, records: List[Dict[str, Any]]) -> Dict[str, int]:
        """Upserts TLE records into database."""
        inserted = 0
        updated = 0

        for r in records:
            existing = db.query(OrbitalObject).filter(OrbitalObject.norad_id == r["norad_id"]).first()
            if existing:
                existing.name = r["name"]
                existing.object_type = r["object_type"]
                existing.tle_line1 = r["tle_line1"]
                existing.tle_line2 = r["tle_line2"]
                existing.inclination_deg = r["inclination_deg"]
                existing.eccentricity = r["eccentricity"]
                existing.period_min = r["period_min"]
                existing.semi_major_axis_km = r["semi_major_axis_km"]
                existing.perigee_km = r["perigee_km"]
                existing.apogee_km = r["apogee_km"]
                existing.source = r["source"]
                existing.updated_at = datetime.utcnow()
                updated += 1
            else:
                obj = OrbitalObject(
                    norad_id=r["norad_id"],
                    name=r["name"],
                    object_type=r["object_type"],
                    tle_line1=r["tle_line1"],
                    tle_line2=r["tle_line2"],
                    inclination_deg=r["inclination_deg"],
                    eccentricity=r["eccentricity"],
                    period_min=r["period_min"],
                    semi_major_axis_km=r["semi_major_axis_km"],
                    perigee_km=r["perigee_km"],
                    apogee_km=r["apogee_km"],
                    source=r["source"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(obj)
                inserted += 1

        db.commit()
        return {"inserted": inserted, "updated": updated, "total": inserted + updated}
