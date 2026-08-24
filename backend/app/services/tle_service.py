import httpx
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sgp4.api import Satrec, WGS72

from backend.app.config import settings
from backend.app.models.orbital_object import OrbitalObject, TLERecord, SyncLog
from backend.app.schemas.orbital_object import ObjectType, DataStatusResponse

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6378.137  # WGS84 equatorial radius
MU_EARTH = 398600.4418      # Earth gravitational parameter km^3/s^2

# Standard CelesTrak Groups for comprehensive Space Situational Awareness
CELESTRAK_GROUPS = [
    {"name": "stations", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"},
    {"name": "active", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"},
    {"name": "debris", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=1982-092&FORMAT=tle"},
]

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

    # SGP4 verification
    try:
        sat = Satrec.twoline2rv(line1, line2)
        if sat.error != 0:
            return False, f"SGP4 initialization error code: {sat.error}"
    except Exception as e:
        return False, f"SGP4 parsing exception: {str(e)}"

    return True, "Valid TLE"

def classify_object_type(name: str, norad_id: int) -> ObjectType:
    """Classifies orbital object into Active Satellite, Debris, Rocket Body, or Unknown."""
    name_upper = name.upper()
    if "DEB" in name_upper or "DEBRIS" in name_upper:
        return ObjectType.DEBRIS
    elif "R/B" in name_upper or "ROCKET" in name_upper or "STAGE" in name_upper or "CENTAUR" in name_upper or "FALCON 9 R/B" in name_upper:
        return ObjectType.ROCKET_BODY
    elif "UNKNOWN" in name_upper:
        return ObjectType.UNKNOWN
    else:
        return ObjectType.ACTIVE_SATELLITE

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
        "inclination": round(inclination_deg, 4),
        "eccentricity": round(eccentricity, 7),
        "mean_motion": round(mean_motion_rev_day, 8),
        "period_minutes": round(period_min, 2) if period_min else None,
        "semi_major_axis_km": round(semi_major_axis_km, 2) if semi_major_axis_km else None,
        "perigee_km": round(perigee_km, 2) if perigee_km else None,
        "apogee_km": round(apogee_km, 2) if apogee_km else None,
    }

def parse_tle_text(tle_text: str, default_source: str = "CelesTrak", source_group: Optional[str] = None) -> List[Dict[str, Any]]:
    """Parses standard 2-line or 3-line TLE blocks."""
    lines = [l.strip() for l in tle_text.strip().split("\n") if l.strip()]
    records = []
    
    i = 0
    while i < len(lines):
        if lines[i].startswith("1 ") and i + 1 < len(lines) and lines[i+1].startswith("2 "):
            line1 = lines[i]
            line2 = lines[i+1]
            norad_id = int(line1[2:7])
            name = f"OBJECT-{norad_id}"
            i += 2
        elif i + 2 < len(lines) and lines[i+1].startswith("1 ") and lines[i+2].startswith("2 "):
            name = lines[i]
            line1 = lines[i+1]
            line2 = lines[i+2]
            i += 3
        else:
            i += 1
            continue

        is_valid, reason = validate_tle(line1, line2)
        if not is_valid:
            logger.debug(f"Skipping invalid TLE for {name}: {reason}")
            continue

        elements = parse_tle_orbital_elements(line1, line2)
        obj_type = classify_object_type(name, elements["norad_id"])

        records.append({
            "name": name,
            "norad_id": elements["norad_id"],
            "object_type": obj_type,
            "tle_line1": line1,
            "tle_line2": line2,
            "inclination": elements["inclination"],
            "eccentricity": elements["eccentricity"],
            "mean_motion": elements["mean_motion"],
            "period_minutes": elements["period_minutes"],
            "semi_major_axis_km": elements["semi_major_axis_km"],
            "perigee_km": elements["perigee_km"],
            "apogee_km": elements["apogee_km"],
            "source": default_source,
            "source_group": source_group,
            "tle_epoch": datetime.now(timezone.utc),
        })

    return records

class TLEService:
    @staticmethod
    async def fetch_tle_data(mode: Optional[str] = "LIVE", limit_per_group: int = 150) -> Tuple[List[Dict[str, Any]], str, str, Optional[str]]:
        """
        Fetches TLE records.
        - If mode == 'DEMO': explicitly loads verified local cached dataset.
        - If mode == 'LIVE': attempts CelesTrak HTTP endpoints. If network fails, returns error status.
        Returns (records, source_name, status_mode, error_message).
        """
        if mode and mode.upper() == "DEMO":
            logger.info("Explicit DEMO mode requested: Loading verified local cached dataset")
            try:
                with open(settings.LOCAL_TLE_FALLBACK, "r") as f:
                    cached_text = f.read()
                records = parse_tle_text(cached_text, default_source="Local Cached Dataset (Demo)", source_group="demo_cache")
                return records, "Local Cached Dataset", "DEMO", None
            except Exception as e:
                err_msg = f"Failed to read local fallback TLE cache: {str(e)}"
                logger.error(err_msg)
                return [], "Local Cached Dataset", "DEMO", err_msg

        # Live Mode: Fetch from external provider (CelesTrak)
        all_records = []
        fetch_error = None
        successful_fetches = 0

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                for group in CELESTRAK_GROUPS:
                    try:
                        res = await client.get(group["url"])
                        if res.status_code == 200 and len(res.text) > 100:
                            recs = parse_tle_text(res.text, default_source="CelesTrak", source_group=group["name"])
                            all_records.extend(recs[:limit_per_group])
                            successful_fetches += 1
                    except Exception as e:
                        fetch_error = str(e)
                        logger.warning(f"Failed to fetch {group['name']} from {group['url']}: {e}")
        except Exception as e:
            fetch_error = str(e)

        if successful_fetches > 0 and len(all_records) > 0:
            return all_records, "CelesTrak", "LIVE", None
        else:
            # Report Live error explicitly — DO NOT SILENTLY FAKE IT
            err_detail = fetch_error or "Unable to establish connection to CelesTrak public endpoints"
            logger.error(f"Live synchronization failed: {err_detail}")
            return [], "CelesTrak", "LIVE ERROR", err_detail

    @staticmethod
    def sync_to_database(db: Session, records: List[Dict[str, Any]], mode: str, source: str) -> Dict[str, int]:
        """
        Upserts TLE records into database and maintains historical tle_records table.
        """
        inserted = 0
        updated = 0
        now = datetime.utcnow()

        for r in records:
            existing = db.query(OrbitalObject).filter(OrbitalObject.norad_id == r["norad_id"]).first()
            if existing:
                existing.name = r["name"]
                existing.object_type = r["object_type"]
                existing.source = r["source"]
                existing.source_group = r.get("source_group")
                existing.tle_line1 = r["tle_line1"]
                existing.tle_line2 = r["tle_line2"]
                existing.inclination = r["inclination"]
                existing.eccentricity = r["eccentricity"]
                existing.mean_motion = r["mean_motion"]
                existing.period_minutes = r["period_minutes"]
                existing.semi_major_axis_km = r["semi_major_axis_km"]
                existing.perigee_km = r["perigee_km"]
                existing.apogee_km = r["apogee_km"]
                existing.updated_at = now

                # Mark older historical records as not current
                db.query(TLERecord).filter(
                    TLERecord.orbital_object_id == existing.id,
                    TLERecord.is_current == True
                ).update({"is_current": False})

                # Insert new TLE record
                tle_rec = TLERecord(
                    orbital_object_id=existing.id,
                    line1=r["tle_line1"],
                    line2=r["tle_line2"],
                    epoch=r["tle_epoch"].replace(tzinfo=None) if r.get("tle_epoch") else now,
                    source=source,
                    fetched_at=now,
                    is_current=True,
                    created_at=now
                )
                db.add(tle_rec)
                updated += 1
            else:
                obj = OrbitalObject(
                    norad_id=r["norad_id"],
                    name=r["name"],
                    object_type=r["object_type"],
                    source=r["source"],
                    source_group=r.get("source_group"),
                    tle_line1=r["tle_line1"],
                    tle_line2=r["tle_line2"],
                    inclination=r["inclination"],
                    eccentricity=r["eccentricity"],
                    mean_motion=r["mean_motion"],
                    period_minutes=r["period_minutes"],
                    semi_major_axis_km=r["semi_major_axis_km"],
                    perigee_km=r["perigee_km"],
                    apogee_km=r["apogee_km"],
                    created_at=now,
                    updated_at=now
                )
                db.add(obj)
                db.flush() # obtain obj.id

                tle_rec = TLERecord(
                    orbital_object_id=obj.id,
                    line1=r["tle_line1"],
                    line2=r["tle_line2"],
                    epoch=r["tle_epoch"].replace(tzinfo=None) if r.get("tle_epoch") else now,
                    source=source,
                    fetched_at=now,
                    is_current=True,
                    created_at=now
                )
                db.add(tle_rec)
                inserted += 1

        # Record Sync Log
        log = SyncLog(
            mode=mode,
            source=source,
            status="SUCCESS",
            total_synced=inserted + updated,
            created_at=now
        )
        db.add(log)
        db.commit()

        return {"inserted": inserted, "updated": updated, "total": inserted + updated}

    @staticmethod
    def get_data_status(db: Session) -> DataStatusResponse:
        """
        Retrieves real live synchronization status and object counts.
        """
        total_objects = db.query(OrbitalObject).count()
        satellites = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ACTIVE_SATELLITE).count()
        debris = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.DEBRIS).count()
        rocket_bodies = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ROCKET_BODY).count()
        unknown = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.UNKNOWN).count()

        latest_log = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()

        mode = latest_log.mode if latest_log else "LIVE"
        source = latest_log.source if latest_log else "CelesTrak"
        last_sync = latest_log.created_at if latest_log else None
        sync_error = latest_log.error_message if (latest_log and latest_log.status == "FAILED") else None

        data_age_min = None
        if last_sync:
            data_age_min = round((datetime.utcnow() - last_sync).total_seconds() / 60.0, 1)

        return DataStatusResponse(
            mode=mode,
            source=source,
            database_connected=True,
            last_sync=last_sync,
            total_objects=total_objects,
            satellites=satellites,
            debris=debris,
            rocket_bodies=rocket_bodies,
            unknown=unknown,
            data_age_minutes=data_age_min,
            sync_error=sync_error,
            is_syncing=False
        )
