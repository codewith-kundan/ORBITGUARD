import httpx
import logging
import time
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from backend.app.services.data_providers.base import BaseDataProvider

logger = logging.getLogger(__name__)

class SatNOGSProvider(BaseDataProvider):
    name = "SatNOGS"
    is_live = True
    requires_auth = False

    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """Fetches active satellite transmitter TLEs from open-source SatNOGS network database."""
        url = "https://db.satnogs.org/api/tle/"
        try:
            async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "SpaceSentinel-SSA/2.0"}) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    lines: List[str] = []
                    for item in data:
                        tle0 = item.get("tle0", "")
                        tle1 = item.get("tle1", "")
                        tle2 = item.get("tle2", "")
                        if tle1 and tle2:
                            if tle0:
                                lines.append(tle0)
                            lines.append(tle1)
                            lines.append(tle2)
                    logger.info(f"SatNOGS: Ingested {len(data)} transmitter TLE sets ({len(lines)} lines)")
                    return lines, self.name, "LIVE", None
                return [], self.name, "LIVE ERROR", f"SatNOGS API error: HTTP {res.status_code}"
        except Exception as e:
            logger.warning(f"SatNOGS fetch exception: {e}")
            return [], self.name, "LIVE ERROR", f"SatNOGS error: {str(e)}"

    async def health_check(self) -> Dict[str, Any]:
        """Checks SatNOGS database API availability."""
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get("https://db.satnogs.org/api/status/")
                latency_ms = round((time.time() - start) * 1000, 1)
                is_healthy = res.status_code == 200
                return {
                    "provider": self.name,
                    "status": "HEALTHY" if is_healthy else "DEGRADED",
                    "latency_ms": latency_ms,
                    "is_live": True,
                    "requires_auth": False,
                    "message": "SatNOGS Open Ground Station Network API Online" if is_healthy else f"HTTP {res.status_code}",
                    "last_checked": datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                "provider": self.name,
                "status": "OFFLINE",
                "latency_ms": round((time.time() - start) * 1000, 1),
                "is_live": True,
                "requires_auth": False,
                "message": f"Connection failed: {str(e)}",
                "last_checked": datetime.utcnow().isoformat()
            }
