import httpx
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/launches", tags=["Launch & Reentry Manifest"])

# In-memory emergency fallback snapshot (only used if all live Launch Library 2 endpoints fail)
_cache_lock = asyncio.Lock()
_cached_launches: List[Dict[str, Any]] = []
_last_fetch_time: float = 0.0

LL2_UPCOMING_URLS = [
    "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=15",
    "https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=15",
]


def _extract_image_url(raw_image: Any) -> Any:
    if isinstance(raw_image, dict):
        return raw_image.get("image_url") or raw_image.get("thumbnail_url")
    return raw_image


@router.get("")
async def get_upcoming_launches():
    """
    Fetches real-time upcoming space missions and rocket launches worldwide.
    Always queries live Launch Library 2 endpoints first; falls back to cached
    snapshot only if all live upstream endpoints are unavailable.
    """
    global _cached_launches, _last_fetch_time

    now_ts = datetime.now(timezone.utc).timestamp()

    async with _cache_lock:
        last_error = None
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=6.0, read=12.0, write=6.0, pool=6.0),
            follow_redirects=True,
            headers={"User-Agent": "OrbitGuard-SSA/2.1"},
        ) as client:
            for endpoint in LL2_UPCOMING_URLS:
                try:
                    resp = await client.get(endpoint)
                    if resp.status_code != 200:
                        last_error = f"HTTP {resp.status_code} from {endpoint}"
                        continue

                    data = resp.json()
                    results = data.get("results", [])
                    parsed = []
                    for item in results:
                        mission = item.get("mission") or {}
                        pad = item.get("pad") or {}
                        location = pad.get("location") or {}
                        rocket_conf = (item.get("rocket") or {}).get("configuration") or {}
                        status_obj = item.get("status") or {}

                        site_name = location.get("name") or pad.get("name") or "Global Spaceport"
                        if pad.get("name") and pad.get("name") not in site_name:
                            site_name = f"{site_name}, {pad.get('name')}"

                        parsed.append({
                            "id": item.get("id") or str(len(parsed) + 1),
                            "name": item.get("name") or "Orbital Launch Mission",
                            "vehicle": rocket_conf.get("name") or "Launch Vehicle",
                            "site": site_name,
                            "launchTimeUtc": item.get("net") or item.get("window_start") or datetime.now(timezone.utc).isoformat(),
                            "targetOrbit": (mission.get("orbit") or {}).get("name") or "Low Earth Orbit (LEO)",
                            "status": (status_obj.get("name") or "SCHEDULED").upper(),
                            "missionDescription": mission.get("description") or "Orbital payload deployment and constellation insertion mission.",
                            "image": _extract_image_url(item.get("image")),
                        })

                    if parsed:
                        _cached_launches = parsed
                        _last_fetch_time = now_ts
                        logger.info(f"Successfully fetched {len(parsed)} live space launches from Launch Library 2")
                        return {
                            "source": "Launch Library 2 (The Space Devs)",
                            "status": "LIVE",
                            "cached": False,
                            "count": len(_cached_launches),
                            "launches": _cached_launches,
                        }
                except Exception as e:
                    last_error = f"{type(e).__name__}: {e or 'timeout/connection failure'}"
                    logger.warning(f"Live launch fetch failed on {endpoint}: {last_error}")

        # Fall back to last genuine live manifest only when ALL live endpoints fail
        if _cached_launches:
            return {
                "source": "Launch Library 2 (Cached Live)",
                "status": "CACHED",
                "cached": True,
                "count": len(_cached_launches),
                "launches": _cached_launches,
                "error": last_error,
            }

        return {
            "source": "Launch Library 2 (Unavailable)",
            "status": "UNAVAILABLE",
            "cached": False,
            "count": 0,
            "launches": [],
            "error": last_error or "Launch Library 2 upstream feed is currently unreachable.",
        }
