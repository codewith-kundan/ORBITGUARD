import logging
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.services.data_providers.base import BaseDataProvider
from backend.app.services.data_providers.celestrak import CelesTrakProvider
from backend.app.services.data_providers.spacetrack import SpaceTrackProvider
from backend.app.services.data_providers.satnogs import SatNOGSProvider
from backend.app.services.data_providers.fallback import LocalFallbackProvider
from backend.app.models.orbital_object import OrbitalObject, TLERecord, SyncLog, SyncHistory
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus
from backend.app.config import settings

logger = logging.getLogger(__name__)


class DataProviderManager:
    """
    Coordinates multi-source orbital data feeds.
    Priority: Space-Track (primary) → CelesTrak → SatNOGS → Local Cache.
    """

    def __init__(self):
        self.providers: Dict[str, BaseDataProvider] = {
            "spacetrack": SpaceTrackProvider(),
            "celestrak": CelesTrakProvider(),
            "satnogs": SatNOGSProvider(),
            "fallback": LocalFallbackProvider()
        }

    async def fetch_gp_data(self, mode: str = "LIVE") -> Tuple[Optional[List[Dict[str, Any]]], str, str, Optional[str]]:
        """
        Attempts to fetch GP JSON data from Space-Track (preferred).
        Returns (gp_records_or_None, source, mode, error).
        If Space-Track GP JSON succeeds, returns structured GP records.
        If it fails, returns None (caller should fall back to fetch_data for TLE).
        """
        if mode.upper() == "DEMO":
            return None, "Local Verified Cache", "DEMO", None

        # Try Space-Track GP JSON first
        st_provider = self.providers["spacetrack"]
        if hasattr(st_provider, 'fetch_gp_json_data'):
            gp_records, source, status, err = await st_provider.fetch_gp_json_data()
            if status == "LIVE" and gp_records:
                return gp_records, source, status, None
            logger.warning(f"Space-Track GP JSON failed: {err}")

        return None, "Space-Track", "LIVE ERROR", "GP JSON fetch failed"

    async def fetch_data(self, mode: str = "LIVE") -> Tuple[List[str], str, str, Optional[str]]:
        """
        TLE-based fallback data fetch.
        Priority: Space-Track 3LE → CelesTrak → SatNOGS → Local Cache.
        """
        if mode.upper() == "DEMO":
            return await self.providers["fallback"].fetch_tle_data()

        # 1. Space-Track (TLE format)
        st_lines, st_source, st_status, st_err = await self.providers["spacetrack"].fetch_tle_data()
        if st_status == "LIVE" and len(st_lines) > 0:
            return st_lines, st_source, st_status, None

        # 2. CelesTrak (secondary)
        logger.info("Space-Track unavailable, attempting CelesTrak...")
        lines, source, status_mode, err = await self.providers["celestrak"].fetch_tle_data()
        if status_mode == "LIVE" and len(lines) > 0:
            return lines, source, status_mode, None

        # 3. SatNOGS
        logger.info("CelesTrak failed, attempting SatNOGS...")
        s_lines, s_source, s_status, s_err = await self.providers["satnogs"].fetch_tle_data()
        if s_status == "LIVE" and len(s_lines) > 0:
            return s_lines, s_source, s_status, None

        # 4. Local Fallback Cache
        logger.warning("All live providers unreachable. Using local cache.")
        f_lines, _, _, _ = await self.providers["fallback"].fetch_tle_data()
        combined_err = f"Space-Track: {st_err}; CelesTrak: {err}"
        return f_lines, "Verified Cache (Offline)", "LIVE ERROR", f"All live providers unreachable ({combined_err}). Using cached dataset."

    async def get_system_health(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """Runs diagnostics across all data sources, database tables, and engines."""
        provider_statuses = []
        for key, provider in self.providers.items():
            health = await provider.health_check()
            provider_statuses.append(health)

        total_objects = 0
        total_tles = 0
        total_conjunctions = 0
        total_alerts = 0
        latest_sync = None
        sync_history_list = []
        data_age_hours = None

        if db:
            total_objects = db.query(OrbitalObject).count()
            total_tles = db.query(TLERecord).count()
            total_conjunctions = db.query(Conjunction).count()
            total_alerts = db.query(Alert).filter(
                Alert.status == AlertStatus.ACTIVE,
                Alert.severity.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
            ).count()

            recent_history = db.query(SyncHistory).order_by(SyncHistory.started_at.desc()).limit(8).all()
            for h in recent_history:
                sync_history_list.append({
                    "id": h.id,
                    "source": h.source,
                    "started_at": h.started_at.isoformat() if h.started_at else None,
                    "completed_at": h.completed_at.isoformat() if h.completed_at else None,
                    "records_fetched": h.records_fetched,
                    "records_inserted": h.records_inserted,
                    "records_updated": h.records_updated,
                    "records_failed": h.records_failed,
                    "status": h.status,
                    "error_message": h.error_message
                })

            recent_logs = db.query(SyncLog).order_by(SyncLog.created_at.desc()).limit(5).all()
            if recent_logs:
                latest = recent_logs[0]
                latest_sync = {
                    "source": latest.source,
                    "mode": latest.mode,
                    "status": latest.status,
                    "total_synced": latest.total_synced,
                    "timestamp": latest.created_at.isoformat() if latest.created_at else None,
                    "error_message": latest.error_message
                }

            latest_obj = db.query(OrbitalObject).filter(OrbitalObject.tle_epoch.isnot(None)).order_by(OrbitalObject.tle_epoch.desc()).first()
            if latest_obj and latest_obj.tle_epoch:
                data_age_hours = round((datetime.utcnow() - latest_obj.tle_epoch).total_seconds() / 3600.0, 1)

        return {
            "overall_status": "OPERATIONAL",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "connected": True,
                "engine": "SQLite / SQLAlchemy ORM",
                "tables": {
                    "orbital_objects": total_objects,
                    "tle_records": total_tles,
                    "conjunctions": total_conjunctions,
                    "active_alerts": total_alerts
                }
            },
            "total_tracked_objects": total_objects,
            "data_age_hours": data_age_hours,
            "providers": provider_statuses,
            "latest_sync": latest_sync,
            "sync_history": sync_history_list,
            "astrodynamics": {
                "propagation_engine": "SGP4 (Spacetrack Report #3)",
                "ellipsoid_model": "WGS84 (Earth Radius: 6,371 km)",
                "conjunction_screening": {
                    "status": "ONLINE",
                    "window_hours": settings.DEFAULT_PREDICTION_WINDOW_HOURS,
                    "threshold_km": settings.CONJUNCTION_THRESHOLD_KM,
                    "critical_threshold_km": settings.CRITICAL_THRESHOLD_KM,
                    "high_threshold_km": settings.HIGH_THRESHOLD_KM,
                    "coarse_step_minutes": settings.PROPAGATION_STEP_MINUTES
                }
            }
        }


provider_manager = DataProviderManager()
