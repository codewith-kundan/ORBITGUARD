from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from backend.app.models.base import get_db
from backend.app.models.conjunction import Conjunction
from backend.app.schemas.conjunction import ConjunctionResponse, RiskLevel, ConjunctionSummary
from backend.app.services.conjunction_service import ConjunctionService
from backend.app.services.alert_service import AlertService
from backend.app.services.risk_service import RiskService
from backend.app.services.history_service import HistoryService
from backend.app.services.cache_service import fast_cache

router = APIRouter(prefix="/api/conjunctions", tags=["Conjunctions"])

@router.post("/screen")
def trigger_conjunction_screening(
    window_hours: int = 24,
    threshold_km: float = 120.0,
    coarse_step_minutes: float = 2.0,
    db: Session = Depends(get_db)
):
    """Executes ultra-fast vectorized multi-object conjunction screening pipeline across current catalog."""
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
    
    # Invalidate cached conjunction and statistics queries
    fast_cache.invalidate("conjunctions:")
    fast_cache.invalidate("system_statistics")
    fast_cache.invalidate("alerts:")
    
    return result

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
    """Retrieves active upcoming conjunctions sorted by risk score descending with fast caching and single SQL JOIN."""
    cache_key = f"conjunctions:list:{risk_level}:{min_risk_score}:{max_miss_distance_km}:{include_passed}:{limit}:{offset}"
    cached_data = fast_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    now = datetime.utcnow()
    query = db.query(Conjunction).options(
        joinedload(Conjunction.object_a),
        joinedload(Conjunction.object_b)
    )

    if not include_passed:
        query = query.filter(Conjunction.tca > now)

    if risk_level:
        query = query.filter(Conjunction.risk_level == risk_level)
    if min_risk_score is not None:
        query = query.filter(Conjunction.risk_score >= min_risk_score)
    if max_miss_distance_km is not None:
        query = query.filter(Conjunction.miss_distance_km <= max_miss_distance_km)

    results = query.order_by(Conjunction.risk_score.desc(), Conjunction.tca.asc()).offset(offset).limit(limit).all()
    fast_cache.set(cache_key, results, ttl_seconds=15.0)
    return results

@router.get("/high-risk", response_model=List[ConjunctionResponse])
def list_high_risk_conjunctions(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves active high and critical risk upcoming conjunctions with fast caching and eager loaded relationships."""
    cache_key = f"conjunctions:high_risk:{limit}"
    cached_data = fast_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    now = datetime.utcnow()
    results = db.query(Conjunction).options(
        joinedload(Conjunction.object_a),
        joinedload(Conjunction.object_b)
    ).filter(
        Conjunction.tca > now,
        Conjunction.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
    ).order_by(Conjunction.risk_score.desc()).limit(limit).all()
    
    fast_cache.set(cache_key, results, ttl_seconds=15.0)
    return results

@router.get("/summary", response_model=ConjunctionSummary)
def get_conjunction_summary(db: Session = Depends(get_db)):
    """Provides high-level aggregate summary of active upcoming conjunction screening results."""
    cache_key = "conjunctions:summary"
    cached_data = fast_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    now = datetime.utcnow()
    conjunctions = db.query(Conjunction).filter(Conjunction.tca > now).all()
    total = len(conjunctions)
    critical_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.CRITICAL)
    high_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.HIGH)
    med_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.MEDIUM)
    low_cnt = sum(1 for c in conjunctions if c.risk_level == RiskLevel.LOW)

    closest_miss = min([c.miss_distance_km for c in conjunctions], default=None)
    earliest_tca = min([c.tca for c in conjunctions], default=None)

    summary = ConjunctionSummary(
        total_screened=total,
        conjunctions_detected=total,
        critical_count=critical_cnt,
        high_count=high_cnt,
        medium_count=med_cnt,
        low_count=low_cnt,
        closest_miss_km=round(closest_miss, 3) if closest_miss is not None else None,
        earliest_tca=earliest_tca
    )
    fast_cache.set(cache_key, summary, ttl_seconds=15.0)
    return summary

@router.get("/{id}", response_model=ConjunctionResponse)
def get_conjunction(id: int, db: Session = Depends(get_db)):
    """Retrieves detailed information for a specific conjunction event with explainable multi-factor risk and historical prediction confidence."""
    cache_key = f"conjunctions:detail:{id}"
    cached_data = fast_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    conj = db.query(Conjunction).options(
        joinedload(Conjunction.object_a),
        joinedload(Conjunction.object_b)
    ).filter(Conjunction.id == id).first()

    if not conj:
        raise HTTPException(status_code=404, detail=f"Conjunction with ID {id} not found")
    
    # Calculate explainable factors
    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=conj.miss_distance_km,
        relative_velocity_km_s=conj.relative_velocity_km_s,
        tca=conj.tca,
        approach_angle_deg=conj.approach_angle_deg or 45.0,
        combined_size_m=conj.combined_size_m or 5.0
    )

    # Historical prediction pattern
    if conj.object_a and conj.object_b:
        hist_analysis = HistoryService.analyze_historical_pattern(
            db,
            norad_a=conj.object_a.norad_id,
            norad_b=conj.object_b.norad_id,
            current_miss_distance_km=conj.miss_distance_km,
            current_rel_vel_km_s=conj.relative_velocity_km_s
        )
        factors["historical_prediction"] = hist_analysis

    conj.factors = factors
    fast_cache.set(cache_key, conj, ttl_seconds=30.0)
    return conj

