from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from backend.app.models.base import get_db
from backend.app.schemas.cam import CAMPlanResponse, CAMSimulateRequest, CAMSimulateResponse
from backend.app.services.cam_service import CAMService

router = APIRouter(prefix="/api/cam", tags=["Collision Avoidance Maneuver (CAM)"])

@router.get("/plan/{conjunction_id}", response_model=CAMPlanResponse)
def get_avoidance_plan(
    conjunction_id: int = Path(..., description="ID of the conjunction event to mitigate"),
    db: Session = Depends(get_db)
):
    """
    Computes 4 aerospace-grade Collision Avoidance Maneuver (CAM) strategies:
    Prograde (+ΔVt), Retrograde (-ΔVt), Cross-Track (ΔVw), and Minimum Fuel Optimum.
    Calculates required velocity impulse (m/s), projected miss distance gain (km),
    fuel consumption (kg), and screens for secondary conjunction hazards.
    """
    plan = CAMService.plan_avoidance_maneuver(db, conjunction_id)
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"Conjunction event #{conjunction_id} not found or missing orbital ephemeris"
        )
    return plan

@router.post("/simulate", response_model=CAMSimulateResponse)
def simulate_custom_maneuver(
    payload: CAMSimulateRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates custom operator-defined impulsive thrust vectors [ΔVr, ΔVt, ΔVw]
    applied at a specified lead time prior to TCA, computing resulting spatial
    separation, updated orbital elements, fuel consumption, and secondary hazard counts.
    """
    result = CAMService.simulate_custom_burn(
        db=db,
        conjunction_id=payload.conjunction_id,
        delta_v_r_m_s=payload.delta_v_radial_m_s,
        delta_v_t_m_s=payload.delta_v_in_track_m_s,
        delta_v_w_m_s=payload.delta_v_cross_track_m_s,
        lead_time_hours=payload.lead_time_hours,
        spacecraft_mass_kg=payload.spacecraft_mass_kg,
        isp_seconds=payload.isp_seconds
    )
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Conjunction event #{payload.conjunction_id} not found"
        )
    return result
