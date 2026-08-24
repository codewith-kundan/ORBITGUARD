import os
import httpx
import logging
import time
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from backend.app.services.data_providers.base import BaseDataProvider

logger = logging.getLogger(__name__)

class SpaceTrackProvider(BaseDataProvider):
    name = "Space-Track"
    is_live = True
    requires_auth = True

    def __init__(self):
        self.username = os.getenv("SPACETRACK_USERNAME", "")
        self.password = os.getenv("SPACETRACK_PASSWORD", "")

    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """
        Fetches official USSPACECOM 18th Space Defense Squadron TLEs from Space-Track.org.
        Uses credentials configured via SPACETRACK_USERNAME and SPACETRACK_PASSWORD.
        """
        if not self.username or not self.password:
            return [], self.name, "AUTH REQUIRED", "Space-Track credentials not configured in environment variables (SPACETRACK_USERNAME, SPACETRACK_PASSWORD)"

        login_url = "https://www.space-track.org/ajaxauth/login"
        query_url = "https://www.space-track.org/basicspacedata/query/class/gp/decay_date/null-val/EPOCH/%3Enow-30/orderby/NORAD_CAT_ID/format/tle/limit/2500"

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                login_payload = {
                    "identity": self.username,
                    "password": self.password
                }
                login_res = await client.post(login_url, data=login_payload)
                if login_res.status_code != 200:
                    return [], self.name, "LIVE ERROR", f"Space-Track authentication failed: HTTP {login_res.status_code}"

                data_res = await client.get(query_url)
                if data_res.status_code == 200 and len(data_res.text.strip()) > 0:
                    lines = [l.strip() for l in data_res.text.strip().split("\n") if l.strip()]
                    logger.info(f"Space-Track: Fetched {len(lines)} TLE lines")
                    return lines, self.name, "LIVE", None
                else:
                    return [], self.name, "LIVE ERROR", f"Space-Track data query failed: HTTP {data_res.status_code}"
        except Exception as e:
            logger.error(f"Space-Track provider error: {e}")
            return [], self.name, "LIVE ERROR", f"Space-Track error: {str(e)}"

    async def health_check(self) -> Dict[str, Any]:
        """Checks if Space-Track credentials are present and API endpoint is reachable."""
        has_credentials = bool(self.username and self.password)
        if not has_credentials:
            return {
                "provider": self.name,
                "status": "UNCONFIGURED",
                "latency_ms": 0,
                "is_live": True,
                "requires_auth": True,
                "message": "API credentials missing. Configure SPACETRACK_USERNAME and SPACETRACK_PASSWORD in .env for official USSPACECOM feeds.",
                "last_checked": datetime.utcnow().isoformat()
            }

        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get("https://www.space-track.org/ajaxauth/login")
                latency_ms = round((time.time() - start) * 1000, 1)
                return {
                    "provider": self.name,
                    "status": "CONFIGURED",
                    "latency_ms": latency_ms,
                    "is_live": True,
                    "requires_auth": True,
                    "message": "Space-Track credentials configured and endpoint reachable.",
                    "last_checked": datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                "provider": self.name,
                "status": "OFFLINE",
                "latency_ms": round((time.time() - start) * 1000, 1),
                "is_live": True,
                "requires_auth": True,
                "message": f"Endpoint unreachable: {str(e)}",
                "last_checked": datetime.utcnow().isoformat()
            }
