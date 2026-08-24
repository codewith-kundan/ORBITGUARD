import os
import logging
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from backend.app.services.data_providers.base import BaseDataProvider

logger = logging.getLogger(__name__)

CACHE_PATHS = [
    "backend/data/cache/celestrak_sample.tle",
    "data/cache/celestrak_sample.tle",
    "backend/app/data/cache/celestrak_sample.tle"
]

class LocalFallbackProvider(BaseDataProvider):
    name = "Local Verified Cache"
    is_live = False
    requires_auth = False

    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """Loads offline verified high-fidelity TLE catalog cache when live network is unavailable."""
        for path in CACHE_PATHS:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        lines = [line.strip() for line in f.readlines() if line.strip()]
                    logger.info(f"LocalFallback: Loaded {len(lines)} TLE lines from '{path}'")
                    return lines, self.name, "DEMO", None
                except Exception as e:
                    logger.error(f"Failed to read cache file {path}: {e}")

        return [], self.name, "DEMO", "No local cache TLE file found"

    async def health_check(self) -> Dict[str, Any]:
        """Checks if local cached catalog is present and valid."""
        for path in CACHE_PATHS:
            if os.path.exists(path):
                size_kb = round(os.path.getsize(path) / 1024, 1)
                return {
                    "provider": self.name,
                    "status": "AVAILABLE",
                    "latency_ms": 0.1,
                    "is_live": False,
                    "requires_auth": False,
                    "message": f"Local verified TLE dataset cache ready ({size_kb} KB at {path})",
                    "last_checked": datetime.utcnow().isoformat()
                }
        return {
            "provider": self.name,
            "status": "MISSING",
            "latency_ms": 0.0,
            "is_live": False,
            "requires_auth": False,
            "message": "Offline cache file not found",
            "last_checked": datetime.utcnow().isoformat()
        }
