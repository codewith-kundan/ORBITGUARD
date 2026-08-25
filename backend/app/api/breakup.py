from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from backend.app.models.base import get_db
from backend.app.schemas.breakup import (
    BreakupSimulateRequest,
    BreakupResponse
)
from backend.app.services.breakup_service import BreakupService

router = APIRouter(prefix="/api/breakup", tags=["NASA Satellite Breakup & Fragmentation Simulator"])

@router.post("/simulate", response_model=BreakupResponse)
def simulate_breakup_event(payload: BreakupSimulateRequest):
    """
    Simulates hypervelocity kinetic collisions, pressure vessel explosions, or ASAT kinetic intercepts
    using the NASA Standard Satellite Breakup Model (SSBM / NASA EVOLVE 4.0).
    Computes fragment count power-law scaling, A/m log-normal distribution,
    ejection Delta-V impulse kicks, Keplerian orbital elements, and full Gabbard diagram data.
    """
    return BreakupService.simulate_breakup(payload)

@router.get("/conjunction/{conjunction_id}", response_model=BreakupResponse)
def simulate_conjunction_collision(
    conjunction_id: int = Path(..., description="Database ID of the active conjunction"),
    db: Session = Depends(get_db)
):
    """
    Simulates worst-case catastrophic fragmentation collision between the two space objects
    in an active conjunction, computing debris dispersal and Gabbard diagram.
    """
    result = BreakupService.simulate_conjunction_breakup(db, conjunction_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Conjunction #{conjunction_id} not found")
    return result
