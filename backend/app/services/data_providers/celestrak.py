import httpx
import logging
import time
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from backend.app.services.data_providers.base import BaseDataProvider

logger = logging.getLogger(__name__)

CELESTRAK_GROUPS = [
    ("stations", "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"),
    ("active", "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"),
    ("starlink", "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"),
    ("oneweb", "https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle"),
    ("gnss", "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=tle"),
    ("visual", "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle"),
    ("weather", "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle"),
    ("noaa", "https://celestrak.org/NORAD/elements/gp.php?GROUP=noaa&FORMAT=tle"),
    ("goes", "https://celestrak.org/NORAD/elements/gp.php?GROUP=goes&FORMAT=tle"),
    ("resource", "https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle"),
    ("geo", "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle"),
    ("science", "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle"),
    ("engineering", "https://celestrak.org/NORAD/elements/gp.php?GROUP=engineering&FORMAT=tle"),
    ("military", "https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle"),
    ("cubesat", "https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=tle"),
    ("last-30-days", "https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=tle"),
    ("1982-092", "https://celestrak.org/NORAD/elements/gp.php?GROUP=1982-092&FORMAT=tle"),  # Cosmos 1408 Debris
    ("1999-025", "https://celestrak.org/NORAD/elements/gp.php?GROUP=1999-025&FORMAT=tle"),  # Fengyun 1C Debris
    ("cosmos-2251-debris", "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle"),
    ("iridium-33-debris", "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle"),
    ("2019-006", "https://celestrak.org/NORAD/elements/gp.php?GROUP=2019-006&FORMAT=tle")
]

class CelesTrakProvider(BaseDataProvider):
    name = "CelesTrak"
    is_live = True
    requires_auth = False

    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """Fetches live TLE data from CelesTrak across operational groups and debris clouds."""
        all_lines: List[str] = []
        errors: List[str] = []

        async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "SpaceSentinel-SSA/2.0"}) as client:
            for group_name, url in CELESTRAK_GROUPS:
                try:
                    res = await client.get(url)
                    if res.status_code == 200 and len(res.text.strip()) > 0:
                        lines = [line.strip() for line in res.text.strip().split("\n") if line.strip()]
                        all_lines.extend(lines)
                        logger.info(f"CelesTrak: Fetched {len(lines)} lines from group '{group_name}'")
                    else:
                        errors.append(f"{group_name}: HTTP {res.status_code}")
                except Exception as e:
                    logger.warning(f"CelesTrak: Failed to fetch group '{group_name}': {e}")
                    errors.append(f"{group_name}: {str(e)}")

        if all_lines:
            return all_lines, self.name, "LIVE", None
        
        error_msg = f"CelesTrak unreachable ({'; '.join(errors[:3])})"
        return [], self.name, "LIVE ERROR", error_msg

    async def health_check(self) -> Dict[str, Any]:
        """Performs a lightweight ping check to CelesTrak stations endpoint."""
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=5.0, headers={"User-Agent": "SpaceSentinel-SSA/2.0"}) as client:
                res = await client.get("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle")
                latency_ms = round((time.time() - start) * 1000, 1)
                is_healthy = res.status_code == 200 and len(res.text) > 100
                return {
                    "provider": self.name,
                    "status": "HEALTHY" if is_healthy else "DEGRADED",
                    "latency_ms": latency_ms,
                    "is_live": True,
                    "requires_auth": False,
                    "message": "Connected to CelesTrak General Perturbations (GP) API" if is_healthy else f"HTTP {res.status_code}",
                    "last_checked": datetime.utcnow().isoformat()
                }
        except Exception as e:
            latency_ms = round((time.time() - start) * 1000, 1)
            return {
                "provider": self.name,
                "status": "OFFLINE",
                "latency_ms": latency_ms,
                "is_live": True,
                "requires_auth": False,
                "message": f"Connection failed: {str(e)}",
                "last_checked": datetime.utcnow().isoformat()
            }
