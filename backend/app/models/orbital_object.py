from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.models.base import Base
from backend.app.schemas.orbital_object import ObjectType

class OrbitalObject(Base):
    __tablename__ = "orbital_objects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    norad_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False, index=True)
    object_type = Column(SQLEnum(ObjectType), default=ObjectType.UNKNOWN, nullable=False, index=True)
    source = Column(String(50), default="CelesTrak", nullable=False)
    source_group = Column(String(50), nullable=True, index=True)
    country = Column(String(50), nullable=True)
    launch_date = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=True)
    
    # Current active TLE
    tle_line1 = Column(String(80), nullable=False)
    tle_line2 = Column(String(80), nullable=False)
    tle_epoch = Column(DateTime, nullable=True, index=True)
    
    # Keplerian orbital elements
    inclination = Column(Float, nullable=True)
    eccentricity = Column(Float, nullable=True)
    mean_motion = Column(Float, nullable=True)
    period_minutes = Column(Float, nullable=True)
    semi_major_axis_km = Column(Float, nullable=True)
    perigee_km = Column(Float, nullable=True)
    apogee_km = Column(Float, nullable=True)
    
    # Space-Track GP metadata
    international_designator = Column(String(20), nullable=True)  # COSPAR ID e.g. 1998-067A
    country_code = Column(String(10), nullable=True, index=True)  # e.g. US, PRC, CIS
    launch_site = Column(String(20), nullable=True)  # e.g. AFETR, TYMSC
    decay_date = Column(String(20), nullable=True)  # YYYY-MM-DD if decayed
    rcs_size = Column(String(10), nullable=True)  # SMALL, MEDIUM, LARGE
    bstar = Column(Float, nullable=True)  # SGP4 drag coefficient
    raan_deg = Column(Float, nullable=True)  # Right Ascension of Ascending Node
    arg_pericenter_deg = Column(Float, nullable=True)  # Argument of Pericenter
    mean_anomaly_deg = Column(Float, nullable=True)  # Mean Anomaly
    gp_id = Column(Integer, nullable=True)  # Space-Track GP record ID
    
    last_position_update = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)

    tle_history = relationship("TLERecord", back_populates="orbital_object", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_orbital_objects_perigee_apogee", "perigee_km", "apogee_km"),
        Index("ix_orbital_objects_type_source", "object_type", "source"),
    )

class TLERecord(Base):
    __tablename__ = "tle_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    orbital_object_id = Column(Integer, ForeignKey("orbital_objects.id"), nullable=False, index=True)
    line1 = Column(String(80), nullable=False)
    line2 = Column(String(80), nullable=False)
    epoch = Column(DateTime, nullable=True, index=True)
    source = Column(String(50), default="CelesTrak", nullable=False)
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_current = Column(Boolean, default=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    orbital_object = relationship("OrbitalObject", back_populates="tle_history")

class SyncHistory(Base):
    __tablename__ = "sync_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source = Column(String(50), default="CelesTrak", nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    records_fetched = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    status = Column(String(20), default="SUCCESS", nullable=False) # SUCCESS, FAILED
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    mode = Column(String(20), nullable=False) # 'LIVE' or 'DEMO'
    source = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False) # 'SUCCESS' or 'FAILED'
    total_synced = Column(Integer, default=0)
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
