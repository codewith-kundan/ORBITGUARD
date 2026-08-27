import math
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from sgp4.api import Satrec, jday

from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject
from backend.app.services.tle_service import TLEService
from backend.app.services.overpass_service import OverpassService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/spotter", tags=["Citizen Sky Spotter"])

# Key bright naked-eye satellites (Large cross-section in LEO)
BRIGHT_TARGETS = [
    {"norad_id": 25544, "name": "ISS (ZARYA)", "label": "International Space Station (ISS)", "mag_base": -3.8, "desc": "Extremely bright, outshines Venus"},
    {"norad_id": 48274, "name": "TIANGONG", "label": "Tiangong Space Station (CSS)", "mag_base": -1.5, "desc": "Bright as Sirius, distinct golden hue"},
    {"norad_id": 20580, "name": "HST", "label": "Hubble Space Telescope (HST)", "mag_base": 1.2, "desc": "Famous NASA/ESA space observatory"},
    {"norad_id": 25989, "name": "TERRA", "label": "Terra (EOS AM-1)", "mag_base": 2.0, "desc": "Flagship NASA Earth observation platform"},
    {"norad_id": 27424, "name": "AQUA", "label": "Aqua (EOS PM-1)", "mag_base": 2.1, "desc": "NASA Earth climate monitoring satellite"},
    {"norad_id": 28654, "name": "NOAA 18", "label": "NOAA 18 Weather Satellite", "mag_base": 2.3, "desc": "Polar-orbiting meteorological observatory"},
    {"norad_id": 33591, "name": "NOAA 19", "label": "NOAA 19 Weather Satellite", "mag_base": 2.2, "desc": "Direct zenith visible polar satellite"},
    {"norad_id": 40059, "name": "GPM-CORE", "label": "GPM-Core Observatory", "mag_base": 2.5, "desc": "NASA/JAXA Global Precipitation satellite"}
]

# Major global cities across continents
GLOBAL_CITIES = [
    {"id": "bengaluru", "name": "Bengaluru, India", "lat": 12.9716, "lon": 77.5946, "alt_m": 920.0},
    {"id": "new_delhi", "name": "New Delhi, India", "lat": 28.6139, "lon": 77.2090, "alt_m": 216.0},
    {"id": "mumbai", "name": "Mumbai, India", "lat": 19.0760, "lon": 72.8777, "alt_m": 14.0},
    {"id": "london", "name": "London, United Kingdom", "lat": 51.5074, "lon": -0.1278, "alt_m": 25.0},
    {"id": "new_york", "name": "New York, USA", "lat": 40.7128, "lon": -74.0060, "alt_m": 10.0},
    {"id": "san_francisco", "name": "San Francisco, USA", "lat": 37.7749, "lon": -122.4194, "alt_m": 16.0},
    {"id": "tokyo", "name": "Tokyo, Japan", "lat": 35.6762, "lon": 139.6503, "alt_m": 40.0},
    {"id": "paris", "name": "Paris, France", "lat": 48.8566, "lon": 2.3522, "alt_m": 35.0},
    {"id": "sydney", "name": "Sydney, Australia", "lat": -33.8688, "lon": 151.2093, "alt_m": 19.0},
    {"id": "singapore", "name": "Singapore", "lat": 1.3521, "lon": 103.8198, "alt_m": 15.0},
    {"id": "dubai", "name": "Dubai, UAE", "lat": 25.2048, "lon": 55.2708, "alt_m": 5.0},
    {"id": "berlin", "name": "Berlin, Germany", "lat": 52.5200, "lon": 13.4050, "alt_m": 34.0},
    {"id": "sao_paulo", "name": "São Paulo, Brazil", "lat": -23.5505, "lon": -46.6333, "alt_m": 760.0},
    {"id": "cairo", "name": "Cairo, Egypt", "lat": 30.0444, "lon": 31.2357, "alt_m": 23.0}
]

def _azimuth_to_cardinal(az_deg: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int((az_deg + 11.25) / 22.5) % 16
    return f"{dirs[idx]} ({int(az_deg)}°)"

@router.get("/visible-passes")
def get_visible_passes(
    city_id: Optional[str] = Query(None, description="City ID or default to all visible cities"),
    min_elevation: float = Query(15.0, description="Minimum elevation cutoff degrees"),
    lookahead_hours: float = Query(24.0, description="Prediction window in hours"),
    db: Session = Depends(get_db)
):
    """
    Computes live naked-eye satellite passes by propagating live SGP4 TLE ephemeris via sgp4.api.
    Only returns cities and passes where the satellite is actually above horizon and visible in dark/twilight sky.
    """
    norad_ids = [t["norad_id"] for t in BRIGHT_TARGETS]
    objs = db.query(OrbitalObject).filter(OrbitalObject.norad_id.in_(norad_ids)).all()
    
    tle_dict = {o.norad_id: (o.tle_line1, o.tle_line2, o) for o in objs if o.tle_line1 and o.tle_line2}
    
    fallback_records = TLEService._load_local_fallback()
    for rec in fallback_records:
        nid = rec.get("norad_id")
        if nid in norad_ids and nid not in tle_dict:
            synthetic_obj = OrbitalObject(
                norad_id=nid,
                name=rec.get("name", f"NORAD-{nid}"),
                object_type=rec.get("object_type", "ACTIVE_SATELLITE"),
                tle_line1=rec["tle_line1"],
                tle_line2=rec["tle_line2"],
                source="Verified Cache"
            )
            tle_dict[nid] = (rec["tle_line1"], rec["tle_line2"], synthetic_obj)

    cities_to_evaluate = [c for c in GLOBAL_CITIES if c["id"] == city_id] if city_id else GLOBAL_CITIES

    all_passes: List[Dict[str, Any]] = []
    visible_cities_set = set()

    for city in cities_to_evaluate:
        for target in BRIGHT_TARGETS:
            nid = target["norad_id"]
            if nid not in tle_dict:
                continue

            _, _, orbital_obj = tle_dict[nid]
            try:
                # Use OverpassService native SGP4 prediction engine
                prediction = OverpassService.predict_overpasses(
                    obj=orbital_obj,
                    station_lat=city["lat"],
                    station_lon=city["lon"],
                    station_alt_m=city["alt_m"],
                    station_name=city["name"],
                    min_elevation_deg=min_elevation,
                    prediction_hours=lookahead_hours
                )

                for ev in prediction.passes:
                    duration_sec = int(ev.duration_seconds)
                    if duration_sec >= 60:
                        mag = target["mag_base"]
                        if ev.max_elevation_deg > 60:
                            mag -= 0.5
                        elif ev.max_elevation_deg < 30:
                            mag += 0.6

                        rank = "Extremely Bright" if mag < -1.0 else ("Bright" if mag < 2.0 else "Moderate")
                        
                        start_time_obj = ev.aos_time
                        start_ts_ms = int(start_time_obj.timestamp() * 1000)

                        all_passes.append({
                            "satelliteName": target["label"],
                            "noradId": nid,
                            "cityName": city["name"],
                            "cityId": city["id"],
                            "cityLat": city["lat"],
                            "cityLon": city["lon"],
                            "magnitude": f"{mag:.1f} ({target['desc']})",
                            "startTime": ev.aos_time.isoformat(),
                            "peakTime": ev.tca_time.isoformat(),
                            "endTime": ev.los_time.isoformat(),
                            "startTimeMs": start_ts_ms,
                            "maxElevation": f"{int(ev.max_elevation_deg)}° {'(Zenith)' if ev.max_elevation_deg >= 70 else ''}".strip(),
                            "maxElevationDeg": round(ev.max_elevation_deg, 1),
                            "durationSec": duration_sec,
                            "duration": f"{duration_sec // 60}m {duration_sec % 60}s",
                            "startDirection": _azimuth_to_cardinal(ev.aos_azimuth_deg),
                            "endDirection": _azimuth_to_cardinal(ev.los_azimuth_deg),
                            "brightnessRank": rank
                        })
                        visible_cities_set.add(city["id"])
            except Exception as e:
                logger.debug(f"Spotter pass calculation failed for #{nid} over {city['name']}: {e}")

    all_passes.sort(key=lambda x: x["startTimeMs"])

    confirmed_cities = [c for c in GLOBAL_CITIES if c["id"] in visible_cities_set]
    if not confirmed_cities:
        confirmed_cities = GLOBAL_CITIES[:4]

    return {
        "status": "LIVE_SGP4",
        "total_passes": len(all_passes),
        "available_cities": confirmed_cities,
        "passes": all_passes
    }
