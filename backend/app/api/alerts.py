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
    """Lists system collision alerts directly from the live database."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()

    # Only auto-sync active alerts from conjunctions when active alerts are requested
    # and none currently exist (do not override RESOLVED/DISMISSED or severity filters).
    if not alerts and (status is None or status == AlertStatus.ACTIVE) and not severity:
        any_active = db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).first()
        if not any_active:
            AlertService.sync_alerts_from_conjunctions(db, include_all_levels=True)
            retry_query = db.query(Alert)
            if status:
                retry_query = retry_query.filter(Alert.status == status)
            if severity:
                retry_query = retry_query.filter(Alert.severity == severity)
            alerts = retry_query.order_by(Alert.created_at.desc()).limit(limit).all()

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

