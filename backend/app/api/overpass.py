from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.overpass import (
    GroundStation,
    OverpassRequest,
    OverpassResponse,
    GroundTrackResponse
)
from backend.app.services.overpass_service import OverpassService

router = APIRouter(prefix="/api/overpass", tags=["Ground Station Overpass & 2D Ground Track"])

@router.get("/stations", response_model=List[GroundStation])
def get_predefined_ground_stations():
    """Returns list of global tracking ground stations (ISRO, NASA, ESA, KSAT, DSN, JAXA)."""
    return OverpassService.get_predefined_stations()

from backend.app.services.tle_service import TLEService

@router.post("/predict", response_model=OverpassResponse)
def predict_satellite_overpasses(
    payload: OverpassRequest,
    db: Session = Depends(get_db)
):
    """
    Scans orbital passes for a target satellite over a given ground station.
    Calculates AOS, TCA/Peak Elevation, LOS, topocentric Azimuth/Elevation angles,
    range rate, and optical telescope visibility conditions (sunlit in dark sky).
    """
    obj = None
    if payload.tle_line1 and payload.tle_line2:
        obj = OrbitalObject(
            norad_id=payload.norad_id,
            name=payload.object_name or f"NORAD-{payload.norad_id}",
            object_type="ACTIVE_SATELLITE",
            tle_line1=payload.tle_line1,
            tle_line2=payload.tle_line2,
            source="Direct TLE"
        )
    else:
        obj = db.query(OrbitalObject).filter(OrbitalObject.norad_id == payload.norad_id).first()
    
    # Fallback to local verified catalog if not in database
    if not obj:
        records = TLEService._load_local_fallback()
        for rec in records:
            if rec.get("norad_id") == payload.norad_id:
                obj = OrbitalObject(
                    norad_id=rec["norad_id"],
                    name=rec["name"],
                    object_type=rec.get("object_type", "ACTIVE_SATELLITE"),
                    tle_line1=rec["tle_line1"],
                    tle_line2=rec["tle_line2"],
                    source="Verified Cache"
                )
                break

    if not obj:
        # Create a dynamic satellite object if TLE lines were passed or search first available matching orbital asset
        raise HTTPException(status_code=404, detail=f"Satellite NORAD #{payload.norad_id} not found in catalog")

    return OverpassService.predict_overpasses(
        obj=obj,
        station_lat=payload.station_latitude,
        station_lon=payload.station_longitude,
        station_alt_m=payload.station_altitude_m,
        station_name=payload.station_name or "Custom Station",
        min_elevation_deg=payload.min_elevation_deg,
        prediction_hours=payload.prediction_hours
    )

@router.get("/ground-track/{norad_id}", response_model=GroundTrackResponse)
def get_satellite_ground_track(
    norad_id: int = Path(..., description="NORAD Catalog ID of the satellite"),
    db: Session = Depends(get_db)
):
    """
    Generates high-resolution 2D sub-satellite ground track ribbons (past 1 orbit + future 2 orbits),
    instantaneous sensor coverage footprint radius (km), and real-time sub-solar coordinates.
    """
    obj = db.query(OrbitalObject).filter(OrbitalObject.norad_id == norad_id).first()
    if not obj:
        records = TLEService._load_local_fallback()
        for rec in records:
            if rec.get("norad_id") == norad_id:
                obj = OrbitalObject(
                    norad_id=rec["norad_id"],
                    name=rec["name"],
                    object_type=rec.get("object_type", "ACTIVE_SATELLITE"),
                    tle_line1=rec["tle_line1"],
                    tle_line2=rec["tle_line2"],
                    source="Verified Cache"
                )
                break

    if not obj:
        raise HTTPException(status_code=404, detail=f"Satellite NORAD #{norad_id} not found in catalog")

    track = OverpassService.get_ground_track_ribbon(obj)
    if not track:
        raise HTTPException(status_code=400, detail=f"Unable to generate ground track for NORAD #{norad_id}")

    return track
