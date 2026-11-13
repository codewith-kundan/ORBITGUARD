import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter

from backend.app.services.cache_service import fast_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/space-weather", tags=["Space Weather & Thermospheric Drag"])

NOAA_KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
NOAA_F107_URL = "https://services.swpc.noaa.gov/json/f107_cm_flux.json"
NOAA_PLASMA_URL = "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json"
NOAA_WIND_SUMMARY_URL = "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json"


def _classify_kp(kp: Optional[float]) -> str:
    if kp is None:
        return "UNAVAILABLE"
    if kp >= 7.0:
        return "SEVERE GEOMAGNETIC STORM (G3+)"
    if kp >= 5.0:
        return "GEOMAGNETIC STORM (G1-G2)"
    if kp >= 4.0:
        return "ACTIVE GEOMAGNETIC FIELD"
    return "NOMINAL / QUIET"


def _parse_float(value: Any) -> Optional[float]:
    if value is None or value == "" or str(value).lower() == "null":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


async def _fetch_kp(client: httpx.AsyncClient) -> Dict[str, Any]:
    res = await client.get(NOAA_KP_URL)
    res.raise_for_status()
    raw = res.json()
    history: List[Dict[str, Any]] = []

    if isinstance(raw, list) and raw:
        if isinstance(raw[0], list):
            # Header + rows format: ["time_tag", "Kp", "a_running", "station_count"]
            for row in raw[1:]:
                if not isinstance(row, list) or len(row) < 2:
                    continue
                kp_val = _parse_float(row[1])
                if kp_val is not None:
                    history.append({
                        "time_utc": str(row[0]),
                        "kp": round(kp_val, 2)
                    })
        elif isinstance(raw[0], dict):
            for row in raw:
                kp_val = _parse_float(row.get("Kp") or row.get("kp_index") or row.get("kp"))
                if kp_val is not None:
                    history.append({
                        "time_utc": str(row.get("time_tag") or ""),
                        "kp": round(kp_val, 2)
                    })

    latest = history[-1] if history else None
    return {
        "kp_index": latest["kp"] if latest else None,
        "kp_observed_utc": latest["time_utc"] if latest else None,
        "kp_history": history[-16:]
    }


async def _fetch_f107(client: httpx.AsyncClient) -> Dict[str, Any]:
    res = await client.get(NOAA_F107_URL)
    res.raise_for_status()
    raw = res.json()
    entries: List[Dict[str, Any]] = []

    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            flux = _parse_float(item.get("flux") or item.get("f107") or item.get("adjusted_flux"))
            if flux is not None and flux > 0:
                entries.append({
                    "flux": round(flux, 1),
                    "time_utc": str(item.get("time_tag") or item.get("reporting_schedule") or "")
                })

    if not entries:
        return {"f107_flux": None, "f107_observed_utc": None}

    entries.sort(key=lambda e: e["time_utc"])
    latest = entries[-1]
    return {
        "f107_flux": latest["flux"],
        "f107_observed_utc": latest["time_utc"]
    }


def _extract_solar_wind_from_raw(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, list) or not raw:
        return None

    # RTSW dict list format (e.g., json/rtsw/rtsw_wind_1m.json or solar-wind-speed.json)
    if isinstance(raw[0], dict):
        candidates = [
            row
            for row in raw
            if isinstance(row, dict)
            and (_parse_float(row.get("proton_speed") or row.get("speed")) is not None
                 or _parse_float(row.get("proton_density") or row.get("density")) is not None)
        ]
        if not candidates:
            return None

        # Prefer active primary spacecraft (SOLAR1/DSCOVR) and newest time_tag
        candidates.sort(
            key=lambda r: (1 if r.get("active") is True else 0, str(r.get("time_tag") or "")),
            reverse=True,
        )
        latest = candidates[0]
        speed = _parse_float(latest.get("proton_speed") or latest.get("speed"))
        density = _parse_float(latest.get("proton_density") or latest.get("density"))
        temp = _parse_float(latest.get("proton_temperature") or latest.get("temperature"))
        return {
            "solar_wind_density_p_cm3": round(density, 2) if density is not None else None,
            "solar_wind_speed_km_s": round(speed, 1) if speed is not None else None,
            "solar_wind_temp_k": round(temp, 0) if temp is not None else None,
            "solar_wind_observed_utc": str(latest.get("time_tag") or "") or None,
        }

    # Legacy header + row format: ["time_tag", "density", "speed", "temperature"]
    if len(raw) > 1 and isinstance(raw[0], list):
        for row in reversed(raw[1:]):
            if not isinstance(row, list) or len(row) < 4:
                continue
            density = _parse_float(row[1])
            speed = _parse_float(row[2])
            temp = _parse_float(row[3])
            if speed is not None or density is not None:
                return {
                    "solar_wind_density_p_cm3": round(density, 2) if density is not None else None,
                    "solar_wind_speed_km_s": round(speed, 1) if speed is not None else None,
                    "solar_wind_temp_k": round(temp, 0) if temp is not None else None,
                    "solar_wind_observed_utc": str(row[0]),
                }

    return None


async def _fetch_solar_wind(client: httpx.AsyncClient) -> Dict[str, Any]:
    try:
        res = await client.get(NOAA_PLASMA_URL)
        res.raise_for_status()
        parsed = _extract_solar_wind_from_raw(res.json())
        if parsed is not None:
            return parsed
    except httpx.HTTPStatusError:
        # Fallback to summary wind speed endpoint if full plasma table path changes or 404s
        res = await client.get(NOAA_WIND_SUMMARY_URL)
        res.raise_for_status()
        parsed = _extract_solar_wind_from_raw(res.json())
        if parsed is not None:
            return parsed

    return {
        "solar_wind_density_p_cm3": None,
        "solar_wind_speed_km_s": None,
        "solar_wind_temp_k": None,
        "solar_wind_observed_utc": None
    }


@router.get("")
async def get_space_weather() -> Dict[str, Any]:
    """
    Retrieves observed planetary geomagnetic Kp index, solar 10.7 cm radio flux (F10.7),
    and DSCOVR L1 solar wind plasma parameters directly from live NOAA SWPC feeds.
    Falls back to cached NOAA snapshot only if all live NOAA feeds are unavailable.
    """
    fallback_cache_key = "space_weather:noaa_swpc:fallback"

    errors: List[str] = []
    kp_data: Dict[str, Any] = {"kp_index": None, "kp_observed_utc": None, "kp_history": []}
    f107_data: Dict[str, Any] = {"f107_flux": None, "f107_observed_utc": None}
    wind_data: Dict[str, Any] = {
        "solar_wind_density_p_cm3": None,
        "solar_wind_speed_km_s": None,
        "solar_wind_temp_k": None,
        "solar_wind_observed_utc": None
    }

    success_count = 0
    async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "OrbitGuard-SSA/2.1"}) as client:
        results = await asyncio.gather(
            _fetch_kp(client),
            _fetch_f107(client),
            _fetch_solar_wind(client),
            return_exceptions=True
        )

    if isinstance(results[0], Exception):
        errors.append(f"Kp feed unavailable: {results[0]}")
    else:
        kp_data = results[0]
        if kp_data.get("kp_index") is not None:
            success_count += 1
        else:
            errors.append("Kp feed returned no numeric samples")

    if isinstance(results[1], Exception):
        errors.append(f"F10.7 feed unavailable: {results[1]}")
    else:
        f107_data = results[1]
        if f107_data.get("f107_flux") is not None:
            success_count += 1
        else:
            errors.append("F10.7 feed returned no numeric samples")

    if isinstance(results[2], Exception):
        errors.append(f"Solar wind plasma feed unavailable: {results[2]}")
    else:
        wind_data = results[2]
        if wind_data.get("solar_wind_speed_km_s") is not None:
            success_count += 1
        else:
            errors.append("Solar wind plasma feed returned no numeric samples")

    kp_val = kp_data.get("kp_index")
    f107_val = f107_data.get("f107_flux")
    drag_multiplier: Optional[float] = None
    if kp_val is not None or f107_val is not None:
        kp_term = max(0.0, ((kp_val if kp_val is not None else 2.0) - 2.0) * 0.18)
        f107_term = max(0.0, ((f107_val if f107_val is not None else 110.0) - 110.0) / 100.0 * 0.25)
        drag_multiplier = round(1.0 + kp_term + f107_term, 2)

    if success_count == 3:
        status = "LIVE"
    elif success_count > 0:
        status = "DEGRADED"
    else:
        cached_fallback = fast_cache.get(fallback_cache_key)
        if cached_fallback is not None:
            return {
                **cached_fallback,
                "status": "CACHED",
                "cached": True,
                "source": "NOAA Space Weather Prediction Center (Cached Fallback)",
                "errors": errors,
            }
        status = "UNAVAILABLE"

    payload: Dict[str, Any] = {
        "status": status,
        "cached": False,
        "source": "NOAA Space Weather Prediction Center (SWPC)",
        "fetched_utc": datetime.now(timezone.utc).isoformat(),
        "kp_index": kp_val,
        "kp_status": _classify_kp(kp_val),
        "kp_observed_utc": kp_data.get("kp_observed_utc"),
        "kp_history": kp_data.get("kp_history", []),
        "f107_flux": f107_val,
        "f107_observed_utc": f107_data.get("f107_observed_utc"),
        "solar_wind_speed_km_s": wind_data.get("solar_wind_speed_km_s"),
        "solar_wind_density_p_cm3": wind_data.get("solar_wind_density_p_cm3"),
        "solar_wind_temp_k": wind_data.get("solar_wind_temp_k"),
        "solar_wind_observed_utc": wind_data.get("solar_wind_observed_utc"),
        "drag_multiplier": drag_multiplier,
        "errors": errors
    }

    if success_count > 0:
        fast_cache.set(fallback_cache_key, payload, ttl_seconds=3600.0)
    return payload

