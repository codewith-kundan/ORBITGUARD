from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.decay import (
    ReentryPrediction,
    DecayWatchlistItem,
    DecayAssessmentRequest
)
from backend.app.services.decay_service import DecayService

router = APIRouter(prefix="/api/decay", tags=["Atmospheric Re-entry & Orbital Lifetime Tracker"])

@router.get("/assess/{norad_id}", response_model=ReentryPrediction)
def assess_satellite_reentry(
    norad_id: int = Path(..., description="NORAD Catalog ID of target satellite"),
    solar_flux_f107: float = Query(150.0, ge=60.0, le=300.0, description="Solar radio flux F10.7 (SFU)"),
    geomagnetic_ap: float = Query(15.0, ge=0.0, le=400.0, description="Geomagnetic activity index Ap"),
    db: Session = Depends(get_db)
):
    """
    Computes thermospheric drag decay profile, King-Hele orbital lifetime,
    re-entry time window with ± uncertainty bounds, surviving mass, and casualty probability.
    """
    obj = db.query(OrbitalObject).filter(OrbitalObject.norad_id == norad_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"Satellite NORAD #{norad_id} not found in catalog")

    return DecayService.assess_decay_lifetime(
        obj=obj,
        solar_flux_f107=solar_flux_f107,
        geomagnetic_ap=geomagnetic_ap
    )

@router.post("/simulate", response_model=ReentryPrediction)
def simulate_custom_reentry(
    payload: DecayAssessmentRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates custom atmospheric decay with user-defined dry mass, ballistic drag area,
    drag coefficient Cd, and space weather activity indices (F10.7 / Ap).
    """
    if payload.norad_id:
        obj = db.query(OrbitalObject).filter(OrbitalObject.norad_id == payload.norad_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail=f"Satellite NORAD #{payload.norad_id} not found")
    else:
        # Default representative low Earth orbit test object
        obj = db.query(OrbitalObject).first()
        if not obj:
            raise HTTPException(status_code=400, detail="No catalog objects available for baseline decay simulation")

    return DecayService.assess_decay_lifetime(
        obj=obj,
        dry_mass_kg=payload.dry_mass_kg,
        drag_area_m2=payload.drag_area_m2,
        solar_flux_f107=payload.solar_flux_f107 or 150.0,
        geomagnetic_ap=payload.geomagnetic_ap or 15.0
    )

@router.get("/watchlist", response_model=List[DecayWatchlistItem])
def get_decay_watchlist(
    max_days: float = Query(90.0, ge=1.0, le=365.0, description="Maximum remaining lifetime in days"),
    db: Session = Depends(get_db)
):
    """
    Returns prioritized watchlist of low Earth orbit objects nearing uncontrolled atmospheric re-entry.
    """
    return DecayService.get_decay_watchlist(db, max_lifetime_days=max_days)
