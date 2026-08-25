from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus

class AlertService:
    @staticmethod
    def sync_alerts_from_conjunctions(db: Session, include_all_levels: bool = False) -> int:
        """
        Scans all conjunctions and creates alerts for active events.
        """
        if include_all_levels:
            conjunctions_to_alert = db.query(Conjunction).all()
        else:
            conjunctions_to_alert = db.query(Conjunction).filter(
                Conjunction.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
            ).all()

        created_count = 0
        for conj in conjunctions_to_alert:
            # Check if alert already exists for this conjunction
            existing = db.query(Alert).filter(Alert.conjunction_id == conj.id).first()
            if not existing:
                name_a = conj.object_a.name if conj.object_a else f"ID-{conj.object_a_id}"
                name_b = conj.object_b.name if conj.object_b else f"ID-{conj.object_b_id}"
                title = f"{conj.risk_level.value if hasattr(conj.risk_level, 'value') else conj.risk_level} RISK: {name_a} ↔ {name_b}"
                msg = (
                    f"Predicted miss distance of {conj.miss_distance_km:.2f} km. "
                    f"Relative velocity: {conj.relative_velocity_km_s:.2f} km/s. TCA: {conj.tca.strftime('%Y-%m-%d %H:%M:%S')} UTC."
                )
                alert = Alert(
                    conjunction_id=conj.id,
                    severity=conj.risk_level,
                    title=title,
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
