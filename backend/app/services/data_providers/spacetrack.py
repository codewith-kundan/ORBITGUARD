import os
import httpx
import logging
import time
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from backend.app.services.data_providers.base import BaseDataProvider

logger = logging.getLogger(__name__)


class SpaceTrackProvider(BaseDataProvider):
    """Production data provider using Space-Track.org REST API (18th Space Defense Squadron)."""
    name = "Space-Track"
    is_live = True
    requires_auth = True

    LOGIN_URL = "https://www.space-track.org/ajaxauth/login"
    GP_JSON_URL = (
        "https://www.space-track.org/basicspacedata/query/class/gp"
        "/decay_date/null-val"
        "/epoch/>now-30"
        "/orderby/NORAD_CAT_ID asc"
        "/format/json"
    )
    GP_3LE_URL = (
        "https://www.space-track.org/basicspacedata/query/class/gp"
        "/decay_date/null-val"
        "/epoch/>now-30"
        "/orderby/NORAD_CAT_ID asc"
        "/format/3le"
    )

    def __init__(self):
        self.username = os.getenv("SPACE_TRACK_USERNAME", "") or os.getenv("SPACETRACK_USER", "")
        self.password = os.getenv("SPACE_TRACK_PASSWORD", "") or os.getenv("SPACETRACK_PASSWORD", "")

    async def _authenticate(self, client: httpx.AsyncClient) -> bool:
        """Authenticates with Space-Track.org and stores session cookie."""
        try:
            resp = await client.post(
                self.LOGIN_URL,
                data={"identity": self.username, "password": self.password},
                timeout=30.0
            )
            if resp.status_code == 200:
                logger.info("Space-Track: Authentication successful")
                return True
            logger.error(f"Space-Track: Auth failed HTTP {resp.status_code}")
            return False
        except Exception as e:
            logger.error(f"Space-Track: Auth exception: {e}")
            return False

    async def fetch_gp_json_data(self) -> Tuple[List[Dict[str, Any]], str, str, Optional[str]]:
        """
        Fetches full GP catalog as JSON with all metadata fields.
        Returns (records, source_name, mode, error_msg).
        Each record contains: NORAD_CAT_ID, OBJECT_NAME, OBJECT_ID, OBJECT_TYPE,
        COUNTRY_CODE, LAUNCH_DATE, SITE, DECAY_DATE, RCS_SIZE, TLE_LINE1, TLE_LINE2,
        EPOCH, MEAN_MOTION, ECCENTRICITY, INCLINATION, RA_OF_ASC_NODE,
        ARG_OF_PERICENTER, MEAN_ANOMALY, BSTAR, SEMIMAJOR_AXIS, PERIOD, APOAPSIS, PERIAPSIS, GP_ID
        """
        if not self.username or not self.password:
            return [], self.name, "AUTH REQUIRED", (
                "Space-Track credentials not configured. "
                "Set SPACE_TRACK_USERNAME and SPACE_TRACK_PASSWORD in .env"
            )

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, read=120.0),
                follow_redirects=True
            ) as client:
                if not await self._authenticate(client):
                    return [], self.name, "LIVE ERROR", "Space-Track authentication failed"

                logger.info("Space-Track: Fetching full GP catalog (JSON format)...")
                resp = await client.get(self.GP_JSON_URL)

                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0:
                        logger.info(f"Space-Track: Retrieved {len(data)} GP records")
                        return data, self.name, "LIVE", None
                    return [], self.name, "LIVE ERROR", "Space-Track returned empty dataset"

                return [], self.name, "LIVE ERROR", f"Space-Track GP query failed: HTTP {resp.status_code}"

        except httpx.TimeoutException:
            return [], self.name, "LIVE ERROR", "Space-Track request timed out (bulk catalog)"
        except Exception as e:
            logger.error(f"Space-Track provider error: {e}")
            return [], self.name, "LIVE ERROR", f"Space-Track error: {str(e)}"

    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """
        Fetches TLE data in 3LE format (backward-compatible interface).
        Used as fallback when GP JSON is not needed.
        """
        if not self.username or not self.password:
            return [], self.name, "AUTH REQUIRED", (
                "Space-Track credentials not configured. "
                "Set SPACE_TRACK_USERNAME and SPACE_TRACK_PASSWORD in .env"
            )

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, read=120.0),
                follow_redirects=True
            ) as client:
                if not await self._authenticate(client):
                    return [], self.name, "LIVE ERROR", "Space-Track authentication failed"

                logger.info("Space-Track: Fetching TLE catalog (3LE format)...")
                resp = await client.get(self.GP_3LE_URL)

                if resp.status_code == 200 and len(resp.text.strip()) > 0:
                    lines = [l.strip() for l in resp.text.strip().split("\n") if l.strip()]
                    logger.info(f"Space-Track: Fetched {len(lines)} TLE lines")
                    return lines, self.name, "LIVE", None

                return [], self.name, "LIVE ERROR", f"Space-Track 3LE query failed: HTTP {resp.status_code}"

        except httpx.TimeoutException:
            return [], self.name, "LIVE ERROR", "Space-Track request timed out"
        except Exception as e:
            logger.error(f"Space-Track provider error: {e}")
            return [], self.name, "LIVE ERROR", f"Space-Track error: {str(e)}"

    async def health_check(self) -> Dict[str, Any]:
        """Checks if Space-Track credentials are present and API is reachable."""
        has_credentials = bool(self.username and self.password)
        if not has_credentials:
            return {
                "provider": self.name,
                "status": "UNCONFIGURED",
                "latency_ms": 0,
                "is_live": True,
                "requires_auth": True,
                "message": (
                    "Space-Track credentials missing. "
                    "Set SPACE_TRACK_USERNAME and SPACE_TRACK_PASSWORD in .env"
                ),
                "last_checked": datetime.utcnow().isoformat()
            }

        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                if await self._authenticate(client):
                    latency_ms = round((time.time() - start) * 1000, 1)
                    return {
                        "provider": self.name,
                        "status": "HEALTHY",
                        "latency_ms": latency_ms,
                        "is_live": True,
                        "requires_auth": True,
                        "message": "Space-Track authenticated and operational (18th SDS)",
                        "last_checked": datetime.utcnow().isoformat()
                    }
                latency_ms = round((time.time() - start) * 1000, 1)
                return {
                    "provider": self.name,
                    "status": "AUTH_FAILED",
                    "latency_ms": latency_ms,
                    "is_live": True,
                    "requires_auth": True,
                    "message": "Credentials configured but authentication failed",
                    "last_checked": datetime.utcnow().isoformat()
                }
        except Exception as e:
            latency_ms = round((time.time() - start) * 1000, 1)
            return {
                "provider": self.name,
                "status": "OFFLINE",
                "latency_ms": latency_ms,
                "is_live": True,
                "requires_auth": True,
                "message": f"Endpoint unreachable: {str(e)}",
                "last_checked": datetime.utcnow().isoformat()
            }
