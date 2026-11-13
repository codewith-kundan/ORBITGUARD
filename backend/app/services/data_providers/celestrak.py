import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.app.config import settings
from backend.app.services.data_providers.base import BaseDataProvider

logger = logging.getLogger(__name__)

# Official verified non-redundant CelesTrak GP groups (checked against celestrak.org/NORAD/elements/)
CELESTRAK_GROUPS = [
    ("stations", "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"),
    ("active", "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"),
    ("fengyun-1c-debris", "https://celestrak.org/NORAD/elements/gp.php?GROUP=fengyun-1c-debris&FORMAT=tle"),
    ("cosmos-2251-debris", "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle"),
    ("iridium-33-debris", "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle"),
    ("analyst", "https://celestrak.org/NORAD/elements/gp.php?GROUP=analyst&FORMAT=tle"),
]

# Supplementary fallback subgroups if 'active' hits CelesTrak's 2-hour download lock before cache warmup
CELESTRAK_ACTIVE_FALLBACK_GROUPS = [
    ("starlink", "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"),
    ("oneweb", "https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle"),
    ("kuiper", "https://celestrak.org/NORAD/elements/gp.php?GROUP=kuiper&FORMAT=tle"),
    ("qianfan", "https://celestrak.org/NORAD/elements/gp.php?GROUP=qianfan&FORMAT=tle"),
    ("gnss", "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=tle"),
    ("geo", "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle"),
    ("weather", "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle"),
    ("science", "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle"),
    ("resource", "https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle"),
    ("visual", "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle"),
]

CELESTRAK_CACHE_TTL_SECONDS = 7200  # Retention window for emergency offline snapshots


def _cache_dir() -> str:
    return os.path.join(settings.BASE_DIR, "data", "cache", "celestrak_groups")


def _read_group_cache(group_name: str, max_age_seconds: Optional[int] = CELESTRAK_CACHE_TTL_SECONDS) -> Optional[List[str]]:
    path = os.path.join(_cache_dir(), f"{group_name}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        fetched_ts = float(payload.get("fetched_ts", 0))
        lines = payload.get("lines") or []
        if len(lines) >= 2 and (max_age_seconds is None or (time.time() - fetched_ts) < max_age_seconds):
            return lines
    except Exception:
        return None
    return None


def _write_group_cache(group_name: str, lines: List[str]) -> None:
    try:
        cache_path = _cache_dir()
        os.makedirs(cache_path, exist_ok=True)
        path = os.path.join(cache_path, f"{group_name}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"group": group_name, "fetched_ts": time.time(), "lines": lines}, f)
    except Exception as exc:
        logger.debug(f"CelesTrak: Failed to cache group '{group_name}': {exc}")


CELESTRAK_HEADERS = {"User-Agent": "OrbitGuard-SSA/2.1"}


def _create_celestrak_client(timeout: httpx.Timeout) -> httpx.AsyncClient:
    """Create an IPv4-bound HTTPX AsyncClient to avoid dual-stack IPv6 stalls on CelesTrak."""
    transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0", retries=1)
    return httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=CELESTRAK_HEADERS,
        transport=transport,
    )


class CelesTrakProvider(BaseDataProvider):
    name = "CelesTrak"
    is_live = True
    requires_auth = False

    @classmethod
    def read_cached_snapshot(cls) -> List[str]:
        """Reads previously persisted CelesTrak group snapshots strictly for offline fallback."""
        snapshot_lines: List[str] = []
        ordered_groups = [g for g, _ in CELESTRAK_GROUPS] + [g for g, _ in CELESTRAK_ACTIVE_FALLBACK_GROUPS]
        for group_name in ordered_groups:
            cached = _read_group_cache(group_name, max_age_seconds=None)
            if cached:
                snapshot_lines.extend(cached)
        return snapshot_lines

    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """
        Fetches live TLE data directly from CelesTrak GP endpoints over HTTPS.
        Never serves disk cache ahead of live upstream HTTP requests.
        """
        all_lines: List[str] = []
        errors: List[str] = []
        throttled_groups: List[str] = []
        semaphore = asyncio.Semaphore(2)
        timeout = httpx.Timeout(connect=15.0, read=60.0, write=10.0, pool=20.0)

        async def _fetch_group(
            client: httpx.AsyncClient, group_name: str, url: str
        ) -> Tuple[str, List[str], Optional[str]]:
            async with semaphore:
                try:
                    res = await client.get(url)
                    body = res.text.strip()
                    if res.status_code == 200 and body and not body.startswith("Invalid query"):
                        lines = [line.strip() for line in body.splitlines() if line.strip()]
                        if any(line.startswith("1 ") for line in lines):
                            _write_group_cache(group_name, lines)
                            logger.info(f"CelesTrak: Fetched {len(lines)} lines from group '{group_name}'")
                            return group_name, lines, None
                        return group_name, [], f"{group_name}: non-TLE response"

                    if res.status_code == 403 and "not updated since" in body.lower():
                        throttled_groups.append(group_name)
                        logger.info(f"CelesTrak: Group '{group_name}' rate-limited (2h window).")
                        return group_name, [], f"{group_name}: HTTP 403 (2h cadence limit)"

                    return group_name, [], f"{group_name}: HTTP {res.status_code}"
                except Exception as e:
                    err_detail = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
                    logger.warning(f"CelesTrak: Failed to fetch group '{group_name}': {err_detail}")
                    return group_name, [], f"{group_name}: {err_detail}"

        async with _create_celestrak_client(timeout) as client:
            results = await asyncio.gather(
                *[_fetch_group(client, g_name, url) for g_name, url in CELESTRAK_GROUPS]
            )

            for g_name, lines, err in results:
                if lines:
                    all_lines.extend(lines)
                if err:
                    errors.append(err)

            # If 'active' hit 2h HTTP 403, try non-throttled live subgroups over HTTPS
            active_missing = not any(g == "active" and lines for g, lines, _ in results)
            if active_missing and "active" in throttled_groups:
                sub_results = await asyncio.gather(
                    *[_fetch_group(client, g_name, url) for g_name, url in CELESTRAK_ACTIVE_FALLBACK_GROUPS]
                )
                for _, lines, err in sub_results:
                    if lines:
                        all_lines.extend(lines)
                    if err:
                        errors.append(err)

        if all_lines:
            return all_lines, self.name, "LIVE", None

        error_msg = f"CelesTrak unreachable ({'; '.join(errors[:3]) or 'no active TLE groups returned'})"
        return [], self.name, "LIVE ERROR", error_msg

    async def health_check(self) -> Dict[str, Any]:
        """Performs a lightweight ping check to CelesTrak stations endpoint."""
        start = time.time()
        try:
            timeout = httpx.Timeout(connect=12.0, read=18.0, write=10.0, pool=15.0)
            async with _create_celestrak_client(timeout) as client:
                res = await client.get("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle")
                latency_ms = round((time.time() - start) * 1000, 1)
                is_healthy = res.status_code == 200 and len(res.text) > 100
                if res.status_code == 403 and "not updated since" in res.text.lower():
                    is_healthy = True
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
            err_detail = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
            return {
                "provider": self.name,
                "status": "OFFLINE",
                "latency_ms": latency_ms,
                "is_live": True,
                "requires_auth": False,
                "message": f"Connection failed: {err_detail}",
                "last_checked": datetime.utcnow().isoformat()
            }
