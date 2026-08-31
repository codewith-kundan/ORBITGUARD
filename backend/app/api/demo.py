from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.models.base import get_db
from backend.app.services.demo_scenario_service import DemoScenarioService

router = APIRouter(prefix="/api/demo", tags=["Deterministic Demo Scenarios"])

@router.get("/scenarios")
def list_demo_scenarios() -> List[Dict[str, Any]]:
    """Returns the 5 pre-configured deterministic demo scenarios."""
    return DemoScenarioService.list_scenarios()

@router.post("/load/{scenario_id}")
def load_demo_scenario(scenario_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Loads a deterministic demo scenario into the active state."""
    try:
        return DemoScenarioService.load_scenario(db, scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/reset")
def reset_demo_state(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Resets the demo state back to default baseline."""
    return DemoScenarioService.reset_demo(db)
