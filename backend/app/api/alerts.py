from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.models.base import get_db
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertResponse, AlertStatus
from backend.app.schemas.conjunction import RiskLevel
from backend.app.services.alert_service import AlertService

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    status: Optional[AlertStatus] = None,
    severity: Optional[RiskLevel] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lists system collision alerts with severity and status filters."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    else:
        query = query.filter(Alert.severity.in_([RiskLevel.HIGH, RiskLevel.CRITICAL]))
    return query.order_by(Alert.created_at.desc()).limit(limit).all()

@router.post("/{id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(id: int, db: Session = Depends(get_db)):
    """Acknowledges an active alert."""
    alert = AlertService.acknowledge_alert(db, id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID {id} not found")
    return alert
