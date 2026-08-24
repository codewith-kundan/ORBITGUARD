from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.models.base import Base
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conjunction_id = Column(Integer, ForeignKey("conjunctions.id"), nullable=False, index=True)
    severity = Column(SQLEnum(RiskLevel), nullable=False, index=True)
    title = Column(String(100), default="Collision Risk Warning", nullable=False)
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.ACTIVE, nullable=False, index=True)
    message = Column(String(255), nullable=False)
    acknowledged = Column(Boolean, default=False, index=True, nullable=False)
    resolved = Column(Boolean, default=False, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)

    conjunction = relationship("Conjunction")

    __table_args__ = (
        Index("ix_alerts_status_severity", "status", "severity"),
        Index("ix_alerts_ack_res", "acknowledged", "resolved"),
    )
