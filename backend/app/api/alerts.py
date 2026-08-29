from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.models.base import get_db
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertResponse, AlertStatus
from backend.app.schemas.conjunction import RiskLevel
from backend.app.services.alert_service import AlertService
from backend.app.services.cache_service import fast_cache

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    status: Optional[AlertStatus] = None,
    severity: Optional[RiskLevel] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lists system collision alerts with severity and status filters."""
    cache_key = f"alerts:list:{status}:{severity}:{limit}"
    cached_data = fast_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    
    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    
    # If no high/critical alerts exist in DB, auto-sync from all active conjunctions
    if not alerts:
        AlertService.sync_alerts_from_conjunctions(db, include_all_levels=True)
        alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
        
    fast_cache.set(cache_key, alerts, ttl_seconds=15.0)
    return alerts

@router.post("/{id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(id: int, db: Session = Depends(get_db)):
    """Acknowledges an active alert."""
    alert = AlertService.acknowledge_alert(db, id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID {id} not found")
    fast_cache.invalidate("alerts:")
    fast_cache.invalidate("system_statistics")
    return alert

