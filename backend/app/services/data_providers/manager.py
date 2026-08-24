import logging
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.services.data_providers.base import BaseDataProvider
from backend.app.services.data_providers.celestrak import CelesTrakProvider
from backend.app.services.data_providers.spacetrack import SpaceTrackProvider
from backend.app.services.data_providers.satnogs import SatNOGSProvider
from backend.app.services.data_providers.fallback import LocalFallbackProvider
from backend.app.models.orbital_object import OrbitalObject, SyncLog

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
        """Runs diagnostics across all data sources."""
        provider_statuses = []
        for key, provider in self.providers.items():
            health = await provider.health_check()
            provider_statuses.append(health)

        total_objects = 0
        latest_sync = None

        if db:
            total_objects = db.query(OrbitalObject).count()
            recent_logs = db.query(SyncLog).order_by(SyncLog.created_at.desc()).limit(10).all()
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

        return {
            "overall_status": "OPERATIONAL",
            "timestamp": datetime.utcnow().isoformat(),
            "total_tracked_objects": total_objects,
            "providers": provider_statuses,
            "latest_sync": latest_sync
        }


provider_manager = DataProviderManager()
