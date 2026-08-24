from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.models.base import Base
from backend.app.schemas.conjunction import RiskLevel

class Conjunction(Base):
    __tablename__ = "conjunctions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    object_a_id = Column(Integer, ForeignKey("orbital_objects.id"), nullable=False, index=True)
    object_b_id = Column(Integer, ForeignKey("orbital_objects.id"), nullable=False, index=True)
    tca = Column(DateTime, nullable=False, index=True)
    miss_distance_km = Column(Float, nullable=False, index=True)
    relative_velocity_km_s = Column(Float, nullable=False)
    altitude_km = Column(Float, nullable=True)
    latitude_deg = Column(Float, nullable=True)
    longitude_deg = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=False, index=True)
    risk_level = Column(SQLEnum(RiskLevel), nullable=False, index=True)
    status = Column(String(50), default="ACTIVE", index=True, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    object_a = relationship("OrbitalObject", foreign_keys=[object_a_id])
    object_b = relationship("OrbitalObject", foreign_keys=[object_b_id])

    __table_args__ = (
        Index("ix_conjunctions_tca_risk", "tca", "risk_score"),
        Index("ix_conjunctions_status_tca", "status", "tca"),
    )
