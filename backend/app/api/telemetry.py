from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.models.base import get_db
from backend.app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/api/telemetry", tags=["Performance Telemetry & Profiler"])

@router.get("/summary")
def get_performance_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns fine-grained subsystem latency breakdowns and run history comparisons."""
    return TelemetryService.get_performance_summary(db)
