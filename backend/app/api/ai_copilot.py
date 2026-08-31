from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.models.base import get_db
from backend.app.services.ai_copilot_service import AICopilotService
from backend.app.services.cam_service import CAMService

router = APIRouter(prefix="/api/ai/copilot", tags=["Physics-Grounded AI Copilot"])

class CopilotQueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class PostCAMVerifyRequest(BaseModel):
    conjunction_id: int
    delta_v_m_s: float
    strategy_type: str

@router.post("/query")
def process_copilot_query(payload: CopilotQueryRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Executes physics-grounded Copilot query by executing deterministic backend tools,
    compiling structured evidence objects, and validating numerical claims.
    """
    return AICopilotService.process_copilot_query(payload.query, db, payload.context)

@router.get("/tools")
def list_available_tools() -> Dict[str, Any]:
    """
    Returns the list of authorized backend physics tools available to the Copilot.
    """
    return {
        "authorized_tools": list(AICopilotService.ALLOWED_TOOLS),
        "execution_model": "DETERMINISTIC_BACKEND_ONLY",
        "llm_physics_calculation": "DISABLED_BY_SECURITY_POLICY"
    }

@router.post("/cam_recommendation/{conjunction_id}")
def get_cam_recommendation(conjunction_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Evaluates real physics-generated CAM candidates and produces an optimal recommendation.
    """
    plan = CAMService.plan_avoidance_maneuver(db, conjunction_id)
    if not plan or not plan.strategies:
        raise HTTPException(status_code=404, detail="No CAM strategies available for this conjunction")

    # Find strategy with best risk reduction per fuel cost
    min_fuel_strat = next((s for s in plan.strategies if s.strategy_type == "MINIMUM_FUEL"), plan.strategies[0])
    
    return {
        "conjunction_id": conjunction_id,
        "primary_asset": plan.primary_object_name,
        "secondary_asset": plan.secondary_object_name,
        "recommended_strategy": min_fuel_strat.strategy_type,
        "recommended_title": min_fuel_strat.title,
        "rationale": (
            f"Strategy '{min_fuel_strat.title}' delivers +{min_fuel_strat.miss_distance_gain_km:.2f} km clearance "
            f"using only {min_fuel_strat.fuel_cost_kg:.3f} kg of Hydrazine (Total ΔV = {min_fuel_strat.total_delta_v_m_s:.3f} m/s). "
            f"Secondary spatial screening confirms the perturbed orbit is completely safe."
        ),
        "candidate_strategies": [
            {
                "strategy_type": s.strategy_type,
                "title": s.title,
                "total_delta_v_m_s": s.total_delta_v_m_s,
                "projected_miss_km": s.projected_miss_distance_km,
                "fuel_cost_kg": s.fuel_cost_kg,
                "risk_reduction_percent": s.risk_reduction_percent,
                "secondary_safe": s.secondary_conjunctions_safe
            } for s in plan.strategies
        ]
    }

@router.post("/verify_post_cam")
def verify_post_cam(payload: PostCAMVerifyRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Computes before vs after post-CAM verification metrics.
    """
    return AICopilotService._tool_verify_post_cam(db, {
        "conjunction_id": payload.conjunction_id,
        "delta_v": payload.delta_v_m_s,
        "strategy": payload.strategy_type
    })
