from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject
from backend.app.services.visibility_service import VisibilityService

router = APIRouter(prefix="/api/visibility", tags=["Satellite Pass & Visibility"])

@router.get("/passes")
def get_satellite_passes(
    norad_id: int = Query(..., description="NORAD Catalog ID of the target satellite (e.g. 25544 for ISS)"),
    lat: float = Query(..., ge=-90.0, le=90.0, description="Observer latitude in degrees (-90 to +90)"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Observer longitude in degrees (-180 to +180)"),
    alt_m: float = Query(0.0, ge=-500.0, le=9000.0, description="Observer ground elevation in meters"),
    hours: float = Query(24.0, ge=1.0, le=72.0, description="Prediction lookahead window in hours"),
    min_elevation: float = Query(10.0, ge=0.0, le=80.0, description="Minimum elevation threshold in degrees"),
    db: Session = Depends(get_db)
):
    """
    Computes upcoming visible satellite passes, Azimuth/Elevation angles, rise/set times,
    and culmination for an observer on Earth.
    """
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.norad_id == norad_id) | (OrbitalObject.id == norad_id)
    ).first()

    if not obj:
        raise HTTPException(status_code=404, detail=f"Satellite with NORAD ID {norad_id} not found in catalog")

    if not obj.tle_line1 or not obj.tle_line2:
        raise HTTPException(status_code=400, detail=f"Satellite {obj.name} lacks valid TLE orbital elements")

    passes = VisibilityService.calculate_passes(
        tle_line1=obj.tle_line1,
        tle_line2=obj.tle_line2,
        obs_lat=lat,
        obs_lon=lon,
        obs_alt_km=alt_m / 1000.0,
        start_time=datetime.now(timezone.utc),
        duration_hours=hours,
        min_elevation_deg=min_elevation,
        step_seconds=30
    )

    return {
        "satellite": {
            "id": obj.id,
            "norad_id": obj.norad_id,
            "name": obj.name,
            "type": obj.object_type,
            "perigee_km": obj.perigee_km,
            "apogee_km": obj.apogee_km,
            "inclination": obj.inclination
        },
        "observer": {
            "latitude": lat,
            "longitude": lon,
            "altitude_m": alt_m
        },
        "prediction_window_hours": hours,
        "min_elevation_deg": min_elevation,
        "total_passes": len(passes),
        "passes": passes
    }
