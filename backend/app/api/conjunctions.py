from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.models.base import get_db
from backend.app.models.conjunction import Conjunction
from backend.app.schemas.conjunction import ConjunctionResponse, RiskLevel, ConjunctionSummary
from backend.app.services.conjunction_service import ConjunctionService
from backend.app.services.alert_service import AlertService

router = APIRouter(prefix="/api/conjunctions", tags=["Conjunctions"])

@router.post("/screen")
def trigger_conjunction_screening(
    window_hours: int = 72,
    threshold_km: float = 150.0,
    coarse_step_minutes: int = 3,
    db: Session = Depends(get_db)
):
    """Executes full multi-object conjunction screening pipeline across current catalog."""
    result = ConjunctionService.run_full_conjunction_screening(
        db,
        window_hours=window_hours,
        threshold_km=threshold_km,
        coarse_step_minutes=coarse_step_minutes
    )
    if not isinstance(result, dict):
        result = {}
    # Sync alerts automatically
    alerts_created = AlertService.sync_alerts_from_conjunctions(db)
    result["alerts_created"] = alerts_created
    return result

from datetime import datetime

@router.get("", response_model=List[ConjunctionResponse])
def list_conjunctions(
    risk_level: Optional[RiskLevel] = None,
    min_risk_score: Optional[float] = None,
    max_miss_distance_km: Optional[float] = None,
    include_passed: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieves active upcoming conjunctions sorted by risk score descending."""
    now = datetime.utcnow()
    query = db.query(Conjunction)

    if not include_passed:
        query = query.filter(Conjunction.tca > now)

    if risk_level:
        query = query.filter(Conjunction.risk_level == risk_level)
    if min_risk_score is not None:
        query = query.filter(Conjunction.risk_score >= min_risk_score)
    if max_miss_distance_km is not None:
        query = query.filter(Conjunction.miss_distance_km <= max_miss_distance_km)

    return query.order_by(Conjunction.risk_score.desc(), Conjunction.tca.asc()).offset(offset).limit(limit).all()

@router.get("/high-risk", response_model=List[ConjunctionResponse])
def list_high_risk_conjunctions(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves active high and critical risk upcoming conjunctions."""
    now = datetime.utcnow()
    return db.query(Conjunction).filter(
        Conjunction.tca > now,
        Conjunction.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
    ).order_by(Conjunction.risk_score.desc()).limit(limit).all()

@router.get("/summary", response_model=ConjunctionSummary)
def get_conjunction_summary(db: Session = Depends(get_db)):
    """Provides high-level aggregate summary of active upcoming conjunction screening results."""
    now = datetime.utcnow()
    conjunctions = db.query(Conjunction).filter(Conjunction.tca > now).all()
    total = len(conjunctions)
    critical_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.CRITICAL)
    high_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.HIGH)
    med_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.MEDIUM)
    low_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.LOW)

    closest_miss = min([c.miss_distance_km for c in conjunctions], default=None)
    earliest_tca = min([c.tca for c in conjunctions], default=None)

    return ConjunctionSummary(
        total_screened=total,
        conjunctions_detected=total,
        critical_count=critical_cnt,
        high_count=high_cnt,
        medium_count=med_cnt,
        low_count=low_cnt,
        closest_miss_km=round(closest_miss, 3) if closest_miss is not None else None,
        earliest_tca=earliest_tca
    )

@router.get("/{id}", response_model=ConjunctionResponse)
def get_conjunction(id: int, db: Session = Depends(get_db)):
    """Retrieves detailed information for a specific conjunction event."""
    conj = db.query(Conjunction).filter(Conjunction.id == id).first()
    if not conj:
        raise HTTPException(status_code=404, detail=f"Conjunction with ID {id} not found")
    return conj
