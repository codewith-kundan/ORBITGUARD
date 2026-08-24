from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum, Index
from datetime import datetime
from backend.app.models.base import Base
from backend.app.schemas.orbital_object import ObjectType

class OrbitalObject(Base):
    __tablename__ = "orbital_objects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    norad_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False, index=True)
    object_type = Column(SQLEnum(ObjectType), default=ObjectType.UNKNOWN, nullable=False, index=True)
    tle_line1 = Column(String(80), nullable=False)
    tle_line2 = Column(String(80), nullable=False)
    tle_epoch = Column(DateTime, nullable=True, index=True)
    inclination_deg = Column(Float, nullable=True)
    eccentricity = Column(Float, nullable=True)
    period_min = Column(Float, nullable=True)
    semi_major_axis_km = Column(Float, nullable=True)
    perigee_km = Column(Float, nullable=True)
    apogee_km = Column(Float, nullable=True)
    source = Column(String(50), default="CelesTrak")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_orbital_objects_perigee_apogee", "perigee_km", "apogee_km"),
    )
