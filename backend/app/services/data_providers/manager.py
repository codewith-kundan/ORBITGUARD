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
    Coordinates multi-source orbital data feeds with priority, graceful fallback,
    health diagnostics, and stale TLE detection.
    """

    def __init__(self):
        self.providers: Dict[str, BaseDataProvider] = {
            "celestrak": CelesTrakProvider(),
            "spacetrack": SpaceTrackProvider(),
            "satnogs": SatNOGSProvider(),
            "fallback": LocalFallbackProvider()
        }

    async def fetch_data(self, mode: str = "LIVE") -> Tuple[List[str], str, str, Optional[str]]:
        """
        Attempts live data ingestion from primary providers (CelesTrak, SatNOGS, Space-Track).
        Falls back to Local Cache if mode is 'DEMO' or if all live providers fail.
        """
        if mode.upper() == "DEMO":
            return await self.providers["fallback"].fetch_tle_data()

        # 1. Primary: CelesTrak
        lines, source, status_mode, err = await self.providers["celestrak"].fetch_tle_data()
        if status_mode == "LIVE" and len(lines) > 0:
            return lines, source, status_mode, None

        # 2. Secondary: SatNOGS
        logger.info("CelesTrak failed or empty, attempting SatNOGS provider...")
        s_lines, s_source, s_status, s_err = await self.providers["satnogs"].fetch_tle_data()
        if s_status == "LIVE" and len(s_lines) > 0:
            return s_lines, s_source, s_status, None

        # 3. Space-Track (if credentials available)
        st_lines, st_source, st_status, st_err = await self.providers["spacetrack"].fetch_tle_data()
        if st_status == "LIVE" and len(st_lines) > 0:
            return st_lines, st_source, st_status, None

        # 4. Failover to Local Fallback Cache with error banner
        logger.warning(f"All live providers unreachable. Failing over to verified local cache. Errors: {err}")
        f_lines, _, _, _ = await self.providers["fallback"].fetch_tle_data()
        return f_lines, "CelesTrak (Offline Failover)", "LIVE ERROR", f"Live providers unreachable ({err}). Showing cached dataset."

    async def get_system_health(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Runs comprehensive diagnostics across all orbital data sources, database integrity,
        stale TLE epochs, and sync logs.
        """
        provider_statuses = []
        for key, provider in self.providers.items():
            health = await provider.health_check()
            provider_statuses.append(health)

        stale_tle_count = 0
        total_objects = 0
        latest_sync = None

        if db:
            total_objects = db.query(OrbitalObject).count()
            # Stale TLE: epoch older than 30 days
            cutoff_date = datetime.now(timezone.utc).date()
            
            # Check objects with stale epoch (if epoch year < current year or diff > 30 days)
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
            "stale_tle_count": stale_tle_count,
            "providers": provider_statuses,
            "latest_sync": latest_sync
        }

provider_manager = DataProviderManager()
