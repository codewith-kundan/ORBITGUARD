from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.models.base import get_db
from backend.app.models.conjunction_case import ConjunctionCase, CaseState, CasePriority
from backend.app.models.conjunction import Conjunction
from backend.app.services.case_service import CaseService

router = APIRouter(prefix="/api/cases", tags=["Conjunction Case Management & Workflow"])

class StateTransitionRequest(BaseModel):
    target_state: str
    operator: Optional[str] = "FLIGHT_DYNAMICS_OFFICER"
    rationale: Optional[str] = None
    strategy_type: Optional[str] = None
    delta_v_m_s: Optional[float] = None

@router.get("")
def list_cases(
    state: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Lists active conjunction cases with optional state and priority filters."""
    # Ensure cases exist for top conjunctions
    conjs = db.query(Conjunction).order_by(Conjunction.risk_score.desc()).limit(15).all()
    for c in conjs:
        CaseService.get_or_create_case(db, c.id)

    query = db.query(ConjunctionCase)
    if state:
        query = query.filter(ConjunctionCase.state == state.upper())
    if priority:
        query = query.filter(ConjunctionCase.priority == priority.upper())

    cases = query.order_by(ConjunctionCase.created_at.desc()).all()
    results: List[Dict[str, Any]] = []
    for c in cases:
        if not c.conjunction:
            continue
        conj = c.conjunction
        results.append({
            "case_id": c.id,
            "conjunction_id": c.conjunction_id,
            "case_number": c.case_number,
            "state": c.state.value,
            "priority": c.priority.value,
            "assigned_operator": c.assigned_operator,
            "primary_asset": conj.object_a.name if conj.object_a else f"Object #{conj.object_a_id}",
            "secondary_threat": conj.object_b.name if conj.object_b else f"Object #{conj.object_b_id}",
            "miss_distance_km": conj.miss_distance_km,
            "tca_utc": conj.tca.isoformat() if conj.tca else "",
            "risk_score": conj.risk_score,
            "is_verified": c.is_verified,
            "created_at_utc": c.created_at.isoformat(),
            "updated_at_utc": c.updated_at.isoformat()
        })
    return results

@router.get("/{case_id}")
def get_case_detail(case_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns the full 13-section operational case payload."""
    try:
        return CaseService.get_case_full_detail(db, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/by-conjunction/{conjunction_id}")
def get_case_by_conjunction(conjunction_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Retrieves or creates a case by conjunction ID."""
    case = CaseService.get_or_create_case(db, conjunction_id)
    return CaseService.get_case_full_detail(db, case.id)

@router.post("/{case_id}/transition")
def transition_case(
    case_id: int,
    payload: StateTransitionRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Executes a state transition with automated audit logging."""
    try:
        target_state_enum = CaseState(payload.target_state.upper())
        updated = CaseService.transition_case_state(
            db=db,
            case_id=case_id,
            target_state=target_state_enum,
            operator=payload.operator or "FLIGHT_DYNAMICS_OFFICER",
            rationale=payload.rationale,
            strategy_type=payload.strategy_type,
            delta_v_m_s=payload.delta_v_m_s
        )
        return {
            "status": "SUCCESS",
            "case_id": updated.id,
            "new_state": updated.state.value,
            "message": f"Case #{case_id} transitioned to {updated.state.value}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns ordered chronological audit events for a case."""
    return CaseService.get_case_timeline(db, case_id)
