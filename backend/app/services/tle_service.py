import os
import json
import httpx
import urllib.request
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sgp4.api import Satrec, WGS72

from backend.app.models.orbital_object import OrbitalObject, TLERecord, SyncLog, SyncHistory
from backend.app.schemas.orbital_object import ObjectType, DataStatusResponse
from backend.app.config import settings

def compute_tle_checksum(line: str) -> int:
    """Computes modulo-10 NORAD checksum for a 69-character TLE line."""
    if len(line) < 68:
        return -1
    calculated = 0
    for char in line[:68]:
        if char.isdigit():
            calculated += int(char)
        elif char == "-":
            calculated += 1
    return calculated % 10

def validate_tle(line1: str, line2: str) -> Tuple[bool, str]:
    """Validates TLE line length and SGP4 initialization."""
    if len(line1) < 68 or len(line2) < 68:
        return False, "Invalid line length (must be >= 68 chars)"
    if not line1.startswith("1 ") or not line2.startswith("2 "):
        return False, "Invalid line prefix"
    try:
        sat = Satrec.twoline2rv(line1, line2, WGS72)
        if sat.error != 0:
            return False, f"SGP4 Satrec error code: {sat.error}"
        return True, "Valid TLE"
    except Exception as e:
        return False, f"SGP4 error: {str(e)}"

def classify_object_type(name: str, norad_id: Optional[int] = None) -> ObjectType:
    name_upper = name.upper()
    if "DEB" in name_upper or "DEBRIS" in name_upper or "FRAG" in name_upper or "SHRAPNEL" in name_upper:
        return ObjectType.DEBRIS
    elif "R/B" in name_upper or "ROCKET" in name_upper or "CENTAUR" in name_upper or "DELTA" in name_upper or "STAGE" in name_upper or "BOOSTER" in name_upper:
        return ObjectType.ROCKET_BODY
    elif "ISS" in name_upper or "STARLINK" in name_upper or "TIANGONG" in name_upper or "ONEWEB" in name_upper or "GPS" in name_upper or "NAVSTAR" in name_upper or "BEIDOU" in name_upper or "GALILEO" in name_upper or "NOAA" in name_upper or "LANDSAT" in name_upper or "COSMOS" in name_upper or "FENGYUN" in name_upper:
        return ObjectType.ACTIVE_SATELLITE
    elif norad_id and norad_id > 90000:
        return ObjectType.UNKNOWN
    return ObjectType.ACTIVE_SATELLITE

def parse_tle_orbital_elements(line1: str, line2: str) -> Dict[str, Any]:
    keplerian = TLEService._extract_keplerian_elements(line1, line2)
    norad_id = int(line1[2:7].strip()) if len(line1) >= 7 and line1[2:7].strip().isdigit() else 0
    return {"norad_id": norad_id, **keplerian}

def parse_tle_text(text: str, default_source: str = "Space-Track.org") -> List[Dict[str, Any]]:
    return TLEService.parse_tle_text(text)

def _safe_float(val) -> Optional[float]:
    """Safely converts a value to float, returns None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

class TLEService:
    """
    Multi-Provider Live Ephemeris Ingestion Engine.
    Integrates Official Space-Track.org REST API (18th Space Defense Squadron), SatNOGS, and CelesTrak.
    """

    SATNOGS_URL = "https://db.satnogs.org/api/tle/"
    
    CELESTRAK_GROUPS = [
        ("stations", "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle", ObjectType.ACTIVE_SATELLITE),
        ("active", "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle", ObjectType.ACTIVE_SATELLITE),
    ]

    @classmethod
    async def fetch_tle_data(cls, mode: str = "LIVE") -> Tuple[List[Dict[str, Any]], str, str, Optional[str]]:
        """
        Fetches orbital data. Returns (records, source, mode, error).
        For Space-Track GP JSON, records will have a '_gp_json' key set to True.
        For TLE-based providers, records are parsed TLE dicts.
        """
        from backend.app.services.data_providers.manager import provider_manager

        # First try Space-Track GP JSON for rich metadata
        gp_records, source, status, error = await provider_manager.fetch_gp_data(mode=mode)
        if gp_records and status == "LIVE":
            # Mark these as GP JSON records for the sync handler
            for r in gp_records:
                r['_gp_json'] = True
            return gp_records, source, status, error

        # Fall back to TLE-based providers
        raw_lines, source_name, status_mode, error_msg = await provider_manager.fetch_data(mode=mode)
        if raw_lines:
            raw_text = "\n".join(raw_lines)
            records = cls.parse_tle_text(raw_text, source_group=source_name)
            if records:
                return records, source_name, status_mode, error_msg

        # Final fallback to local cache
        records = cls._load_local_fallback()
        return records, "Local Verified Cache", "DEMO", error_msg or "All providers failed"

    @classmethod
    async def _fetch_spacetrack(cls, username: str, password: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Fetches bulk 3LE data directly from Space-Track.org via authenticated session."""
        login_url = "https://www.space-track.org/ajaxauth/login"
        # Query up to 15,000 live objects with official names (format=3le)
        query_url = "https://www.space-track.org/basicspacedata/query/class/gp/decay_date/null-val/orderby/norad_cat_id/limit/15000/format/3le"

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                login_res = await client.post(login_url, data={"identity": username, "password": password})
                if login_res.status_code != 200:
                    return [], f"Space-Track login error: HTTP {login_res.status_code}"

                query_res = await client.get(query_url)
                if query_res.status_code == 200:
                    records = cls.parse_tle_text(query_res.text, source_group="spacetrack_live")
                    return records, None
                return [], f"Space-Track query error: HTTP {query_res.status_code}"
        except Exception as e:
            return [], str(e)

    @classmethod
    def _parse_satnogs_json(cls, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parses live SatNOGS / Space-Track API JSON objects."""
        records = []
        for item in data:
            try:
                line1 = item.get("tle1", "").strip()
                line2 = item.get("tle2", "").strip()
                tle0 = item.get("tle0", "").strip()
                
                if not line1 or not line2:
                    continue
                
                name = tle0[2:].strip() if tle0.startswith("0 ") else (tle0 or f"NORAD-{item.get('norad_cat_id', 'UNKNOWN')}")
                norad_id = int(item.get("norad_cat_id") or line1[2:7].strip())

                if not cls.validate_tle_bool(line1, line2):
                    continue

                obj_type = classify_object_type(name, norad_id)
                keplerian = cls._extract_keplerian_elements(line1, line2)

                records.append({
                    "norad_id": norad_id,
                    "name": name,
                    "object_type": obj_type,
                    "source_group": "satnogs_live",
                    "tle_line1": line1,
                    "tle_line2": line2,
                    **keplerian
                })
            except Exception:
                continue
        return records

    @classmethod
    def _load_local_fallback(cls) -> List[Dict[str, Any]]:
        """Loads curated offline sample TLE dataset."""
        fallback_path = os.path.join(settings.BASE_DIR, "data", "cache", "celestrak_sample.tle")
        if os.path.exists(fallback_path):
            with open(fallback_path, "r", encoding="utf-8") as f:
                return cls.parse_tle_text(f.read(), source_group="local_cache")
        return []

    @classmethod
    def parse_tle_text(
        cls,
        text: str,
        default_type: ObjectType = ObjectType.UNKNOWN,
        source_group: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Parses multi-line TLE blocks with checksum and Keplerian element validation."""
        lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
        records = []
        i = 0

        while i < len(lines):
            # Check 3-line format (Name, Line 1, Line 2)
            if (lines[i].startswith("0 ") or not lines[i].startswith("1 ")) and i + 2 < len(lines) and lines[i+1].startswith("1 ") and lines[i+2].startswith("2 "):
                name = lines[i][2:].strip() if lines[i].startswith("0 ") else lines[i].strip()
                line1 = lines[i+1]
                line2 = lines[i+2]
                i += 3
            # Check 2-line format
            elif lines[i].startswith("1 ") and i + 1 < len(lines) and lines[i+1].startswith("2 "):
                line1 = lines[i]
                line2 = lines[i+1]
                name = f"NORAD-{line1[2:7].strip()}"
                i += 2
            else:
                i += 1
                continue

            if not cls.validate_tle_bool(line1, line2):
                continue

            try:
                norad_id = int(line1[2:7].strip())
            except ValueError:
                continue

            obj_type = default_type
            if obj_type == ObjectType.UNKNOWN:
                obj_type = classify_object_type(name, norad_id)

            keplerian = cls._extract_keplerian_elements(line1, line2)

            records.append({
                "norad_id": norad_id,
                "name": name,
                "object_type": obj_type,
                "source_group": source_group,
                "tle_line1": line1,
                "tle_line2": line2,
                **keplerian
            })

        return records

    @classmethod
    def _extract_keplerian_elements(cls, line1: str, line2: str) -> Dict[str, Any]:
        """Extracts orbital parameters and epoch from TLE."""
        try:
            inc = float(line2[8:16].strip())
            ecc = float("0." + line2[26:33].strip())
            mm = float(line2[52:63].strip())
            period_min = (1440.0 / mm) if mm > 0 else 0.0

            # Calculate semi-major axis in km
            mu = 398600.4418
            n_rad_s = (mm * 2 * 3.141592653589793) / 86400.0
            a_km = (mu / (n_rad_s ** 2)) ** (1.0 / 3.0) if n_rad_s > 0 else 0.0
            r_earth = 6378.137
            perigee_km = max(0.0, a_km * (1.0 - ecc) - r_earth)
            apogee_km = max(0.0, a_km * (1.0 + ecc) - r_earth)

            # Epoch datetime extraction
            epoch_year_str = line1[18:20]
            epoch_days_str = line1[20:32]
            year = int(epoch_year_str)
            year += 2000 if year < 57 else 1900
            days = float(epoch_days_str)
            epoch_dt = datetime(year, 1, 1, tzinfo=timezone.utc)
            import datetime as dt_mod
            epoch_dt += dt_mod.timedelta(days=days - 1.0)

            return {
                "tle_epoch": epoch_dt,
                "inclination": inc,
                "eccentricity": ecc,
                "mean_motion": mm,
                "period_minutes": period_min,
                "semi_major_axis_km": a_km,
                "perigee_km": perigee_km,
                "apogee_km": apogee_km
            }
        except Exception:
            return {
                "tle_epoch": None,
                "inclination": None,
                "eccentricity": None,
                "mean_motion": None,
                "period_minutes": None,
                "semi_major_axis_km": None,
                "perigee_km": None,
                "apogee_km": None
            }

    @staticmethod
    def validate_tle_bool(line1: str, line2: str) -> bool:
        """Validates TLE line length and SGP4 initialization."""
        if len(line1) < 68 or len(line2) < 68:
            return False
        if not line1.startswith("1 ") or not line2.startswith("2 "):
            return False
        try:
            sat = Satrec.twoline2rv(line1, line2, WGS72)
            return sat.error == 0
        except Exception:
            return False

    @classmethod
    def sync_gp_records_to_database(
        cls,
        db: Session,
        gp_records: List[Dict[str, Any]],
        source: str = "Space-Track"
    ) -> Dict[str, int]:
        """Ingests Space-Track GP JSON records directly with all metadata fields."""
        started_at = datetime.utcnow()
        inserted = 0
        updated = 0
        failed = 0

        # Map Space-Track OBJECT_TYPE to internal enum
        type_map = {
            "PAYLOAD": ObjectType.ACTIVE_SATELLITE,
            "ROCKET BODY": ObjectType.ROCKET_BODY,
            "DEBRIS": ObjectType.DEBRIS,
            "UNKNOWN": ObjectType.UNKNOWN,
            "TBA": ObjectType.UNKNOWN,
        }

        existing_objs = {obj.norad_id: obj for obj in db.query(OrbitalObject).all()}

        for gp in gp_records:
            try:
                norad_id = int(gp.get("NORAD_CAT_ID", 0))
                if norad_id == 0:
                    failed += 1
                    continue

                name = (gp.get("OBJECT_NAME") or f"NORAD-{norad_id}").strip()
                tle_line1 = (gp.get("TLE_LINE1") or "").strip()
                tle_line2 = (gp.get("TLE_LINE2") or "").strip()

                if not tle_line1 or not tle_line2:
                    failed += 1
                    continue

                # Validate TLE with SGP4
                if not cls.validate_tle_bool(tle_line1, tle_line2):
                    failed += 1
                    continue

                obj_type_str = (gp.get("OBJECT_TYPE") or "UNKNOWN").strip().upper()
                obj_type = type_map.get(obj_type_str, ObjectType.UNKNOWN)

                # Parse epoch
                epoch_str = gp.get("EPOCH")
                tle_epoch = None
                if epoch_str:
                    try:
                        tle_epoch = datetime.fromisoformat(epoch_str.replace("Z", "+00:00"))
                    except Exception:
                        pass

                # Use Space-Track pre-computed Keplerian elements
                inclination = _safe_float(gp.get("INCLINATION"))
                eccentricity = _safe_float(gp.get("ECCENTRICITY"))
                mean_motion = _safe_float(gp.get("MEAN_MOTION"))
                period_minutes = _safe_float(gp.get("PERIOD"))
                semi_major_axis_km = _safe_float(gp.get("SEMIMAJOR_AXIS"))
                perigee_km = _safe_float(gp.get("PERIAPSIS"))
                apogee_km = _safe_float(gp.get("APOAPSIS"))
                bstar_val = _safe_float(gp.get("BSTAR"))
                raan = _safe_float(gp.get("RA_OF_ASC_NODE"))
                arg_peri = _safe_float(gp.get("ARG_OF_PERICENTER"))
                mean_anom = _safe_float(gp.get("MEAN_ANOMALY"))

                # Metadata
                country_code = (gp.get("COUNTRY_CODE") or "").strip() or None
                launch_date = (gp.get("LAUNCH_DATE") or "").strip() or None
                launch_site = (gp.get("SITE") or "").strip() or None
                intl_des = (gp.get("OBJECT_ID") or "").strip() or None
                decay_date = (gp.get("DECAY_DATE") or "").strip() or None
                rcs_size = (gp.get("RCS_SIZE") or "").strip() or None
                gp_id = int(gp.get("GP_ID", 0)) or None

                if norad_id in existing_objs:
                    obj = existing_objs[norad_id]
                    obj.name = name
                    obj.object_type = obj_type
                    obj.source = source
                    obj.tle_line1 = tle_line1
                    obj.tle_line2 = tle_line2
                    obj.tle_epoch = tle_epoch
                    obj.inclination = inclination
                    obj.eccentricity = eccentricity
                    obj.mean_motion = mean_motion
                    obj.period_minutes = period_minutes
                    obj.semi_major_axis_km = semi_major_axis_km
                    obj.perigee_km = perigee_km
                    obj.apogee_km = apogee_km
                    obj.international_designator = intl_des
                    obj.country_code = country_code
                    obj.country = country_code
                    obj.launch_date = launch_date
                    obj.launch_site = launch_site
                    obj.decay_date = decay_date
                    obj.rcs_size = rcs_size
                    obj.bstar = bstar_val
                    obj.raan_deg = raan
                    obj.arg_pericenter_deg = arg_peri
                    obj.mean_anomaly_deg = mean_anom
                    obj.gp_id = gp_id
                    obj.updated_at = datetime.utcnow()
                    updated += 1
                else:
                    obj = OrbitalObject(
                        norad_id=norad_id,
                        name=name,
                        object_type=obj_type,
                        source=source,
                        tle_line1=tle_line1,
                        tle_line2=tle_line2,
                        tle_epoch=tle_epoch,
                        inclination=inclination,
                        eccentricity=eccentricity,
                        mean_motion=mean_motion,
                        period_minutes=period_minutes,
                        semi_major_axis_km=semi_major_axis_km,
                        perigee_km=perigee_km,
                        apogee_km=apogee_km,
                        international_designator=intl_des,
                        country_code=country_code,
                        country=country_code,
                        launch_date=launch_date,
                        launch_site=launch_site,
                        decay_date=decay_date,
                        rcs_size=rcs_size,
                        bstar=bstar_val,
                        raan_deg=raan,
                        arg_pericenter_deg=arg_peri,
                        mean_anomaly_deg=mean_anom,
                        gp_id=gp_id,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(obj)
                    existing_objs[norad_id] = obj
                    inserted += 1
            except Exception as e:
                import logging
                logging.getLogger(__name__).debug(f"Failed to process GP record: {e}")
                failed += 1

        db.flush()

        # Record Sync Log
        log = SyncLog(
            mode="LIVE",
            source=source,
            status="SUCCESS",
            total_synced=inserted + updated,
            created_at=datetime.utcnow()
        )
        db.add(log)

        hist = SyncHistory(
            source=source,
            started_at=started_at,
            completed_at=datetime.utcnow(),
            records_fetched=len(gp_records),
            records_inserted=inserted,
            records_updated=updated,
            records_failed=failed,
            status="SUCCESS"
        )
        db.add(hist)

        db.commit()
        import logging
        logging.getLogger(__name__).info(f"GP sync complete: {inserted} inserted, {updated} updated, {failed} failed")
        return {"inserted": inserted, "updated": updated, "failed": failed}

    @classmethod
    def sync_to_database(
        cls,
        db: Session,
        records: List[Dict[str, Any]],
        mode: str = "LIVE",
        source: str = "Space-Track.org"
    ) -> Dict[str, int]:
        """Inserts and updates catalog records and records sync history."""
        started_at = datetime.utcnow()
        inserted = 0
        updated = 0
        failed = 0

        # Pre-load existing objects into a dictionary for O(1) in-memory lookup
        existing_objs = {obj.norad_id: obj for obj in db.query(OrbitalObject).all()}

        for r in records:
            try:
                norad_id = r["norad_id"]
                if norad_id in existing_objs:
                    obj = existing_objs[norad_id]
                    obj.name = r["name"]
                    obj.object_type = r["object_type"]
                    obj.source = source
                    obj.source_group = r.get("source_group")
                    obj.tle_line1 = r["tle_line1"]
                    obj.tle_line2 = r["tle_line2"]
                    obj.tle_epoch = r.get("tle_epoch")
                    obj.inclination = r.get("inclination")
                    obj.eccentricity = r.get("eccentricity")
                    obj.mean_motion = r.get("mean_motion")
                    obj.period_minutes = r.get("period_minutes")
                    obj.semi_major_axis_km = r.get("semi_major_axis_km")
                    obj.perigee_km = r.get("perigee_km")
                    obj.apogee_km = r.get("apogee_km")
                    obj.updated_at = datetime.utcnow()
                    updated += 1
                else:
                    obj = OrbitalObject(
                        norad_id=norad_id,
                        name=r["name"],
                        object_type=r["object_type"],
                        source=source,
                        source_group=r.get("source_group"),
                        tle_line1=r["tle_line1"],
                        tle_line2=r["tle_line2"],
                        tle_epoch=r.get("tle_epoch"),
                        inclination=r.get("inclination"),
                        eccentricity=r.get("eccentricity"),
                        mean_motion=r.get("mean_motion"),
                        period_minutes=r.get("period_minutes"),
                        semi_major_axis_km=r.get("semi_major_axis_km"),
                        perigee_km=r.get("perigee_km"),
                        apogee_km=r.get("apogee_km"),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(obj)
                    existing_objs[norad_id] = obj
                    inserted += 1
            except Exception:
                failed += 1

        # Flush once for inserted IDs
        db.flush()

        # Archive TLE records in bulk
        tle_records = []
        for r in records:
            norad_id = r["norad_id"]
            if norad_id in existing_objs:
                obj = existing_objs[norad_id]
                tle_records.append(TLERecord(
                    orbital_object_id=obj.id,
                    line1=r["tle_line1"],
                    line2=r["tle_line2"],
                    epoch=r.get("tle_epoch"),
                    source=source,
                    fetched_at=datetime.utcnow(),
                    is_current=True
                ))
        if tle_records:
            db.add_all(tle_records)

        # Record Sync Log & History
        log = SyncLog(
            mode=mode,
            source=source,
            status="SUCCESS",
            total_synced=inserted + updated,
            created_at=datetime.utcnow()
        )
        db.add(log)

        hist = SyncHistory(
            source=source,
            started_at=started_at,
            completed_at=datetime.utcnow(),
            records_fetched=len(records),
            records_inserted=inserted,
            records_updated=updated,
            records_failed=failed,
            status="SUCCESS"
        )
        db.add(hist)

        db.commit()
        return {"inserted": inserted, "updated": updated, "failed": failed}

    @classmethod
    def get_data_status(cls, db: Session) -> DataStatusResponse:
        """Retrieves real-time data status and catalog composition."""
        last_log = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()
        total_objects = db.query(OrbitalObject).count()
        satellites = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ACTIVE_SATELLITE).count()
        debris = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.DEBRIS).count()
        rocket_bodies = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ROCKET_BODY).count()
        unknown = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.UNKNOWN).count()

        mode = last_log.mode if last_log else "LIVE"
        source = last_log.source if last_log else "Space-Track.org"
        last_sync = last_log.created_at if last_log else None
        sync_error = last_log.error_message if last_log and last_log.status == "FAILED" else None

        data_age = None
        if last_sync:
            data_age = round((datetime.utcnow() - last_sync).total_seconds() / 60.0, 1)

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
            data_age_minutes=data_age,
            sync_error=sync_error,
            is_syncing=False
        )
