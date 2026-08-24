from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.models.base import get_db
from backend.app.models.conjunction import Conjunction
from backend.app.services.ai_risk_service import AIRiskService

router = APIRouter(prefix="/api/ai", tags=["AI Risk & Decision Support"])

@router.get("/predict-risk")
def predict_risk_from_parameters(
    miss_distance_km: float = Query(..., ge=0.01, le=5000.0, description="Predicted miss distance in km"),
    relative_velocity_km_s: float = Query(..., ge=0.01, le=30.0, description="Relative kinetic velocity in km/s"),
    hours_to_tca: float = Query(..., ge=0.01, le=720.0, description="Hours remaining until TCA"),
    altitude_km: float = Query(550.0, ge=100.0, le=45000.0, description="Orbital altitude in km"),
    inclination_diff_deg: float = Query(15.0, ge=0.0, le=180.0, description="Orbital inclination delta in degrees")
):
    """
    Computes explainable AI risk prediction, confidence percentage, feature importance weights,
    and operational collision avoidance maneuver recommendations.
    """
    return AIRiskService.predict_conjunction_risk(
        miss_distance_km=miss_distance_km,
        relative_velocity_km_s=relative_velocity_km_s,
        hours_to_tca=hours_to_tca,
        altitude_km=altitude_km,
        inclination_diff_deg=inclination_diff_deg
    )

@router.get("/conjunction/{conjunction_id}/ai-analysis")
def analyze_conjunction_ai(conjunction_id: int, db: Session = Depends(get_db)):
    """
    Runs multi-feature AI risk and maneuver guidance analysis for a specific active conjunction in the database.
    """
    conj = db.query(Conjunction).filter(Conjunction.id == conjunction_id).first()
    if not conj:
        raise HTTPException(status_code=404, detail=f"Conjunction event #{conjunction_id} not found")

    from datetime import datetime, timezone
    hours_left = max(0.1, (conj.tca - datetime.now(timezone.utc)).total_seconds() / 3600.0)

    return AIRiskService.predict_conjunction_risk(
        miss_distance_km=conj.miss_distance_km,
        relative_velocity_km_s=conj.relative_velocity_km_s,
        hours_to_tca=hours_left,
        altitude_km=conj.altitude_km or 550.0
    )
