from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus

class AlertService:
    @staticmethod
    def sync_alerts_from_conjunctions(db: Session) -> int:
        """
        Scans all conjunctions and creates alerts for HIGH and CRITICAL severity events.
        """
        high_risk_conjunctions = db.query(Conjunction).filter(
            Conjunction.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
        ).all()

        created_count = 0
        for conj in high_risk_conjunctions:
            # Check if alert already exists for this conjunction
            existing = db.query(Alert).filter(Alert.conjunction_id == conj.id).first()
            if not existing:
                name_a = conj.object_a.name if conj.object_a else f"ID-{conj.object_a_id}"
                name_b = conj.object_b.name if conj.object_b else f"ID-{conj.object_b_id}"
                msg = (
                    f"Close conjunction warning: {name_a} ↔ {name_b} | "
                    f"Miss distance: {conj.miss_distance_km} km | Risk Score: {conj.risk_score}/100"
                )
                alert = Alert(
                    conjunction_id=conj.id,
                    severity=conj.risk_level,
                    status=AlertStatus.ACTIVE,
                    message=msg,
                    created_at=datetime.utcnow()
                )
                db.add(alert)
                created_count += 1

        db.commit()
        return created_count

    @staticmethod
    def acknowledge_alert(db: Session, alert_id: int) -> Optional[Alert]:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if alert:
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_at = datetime.utcnow()
            db.commit()
            db.refresh(alert)
        return alert
