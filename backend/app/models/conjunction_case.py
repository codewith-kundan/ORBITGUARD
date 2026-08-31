import enum
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from backend.app.models.base import Base

class CaseState(str, enum.Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    CAM_ANALYSIS = "CAM_ANALYSIS"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    OVERRIDDEN = "OVERRIDDEN"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"

class CasePriority(str, enum.Enum):
    ROUTINE = "ROUTINE"
    ELEVATED = "ELEVATED"
    CRITICAL = "CRITICAL"

class AuditEventType(str, enum.Enum):
    CONJUNCTION_DETECTED = "CONJUNCTION_DETECTED"
    TCA_REFINED = "TCA_REFINED"
    PC_EVALUATED = "PC_EVALUATED"
    AI_INVESTIGATED = "AI_INVESTIGATED"
    CAM_GENERATED = "CAM_GENERATED"
    AI_RECOMMENDED = "AI_RECOMMENDED"
    OPERATOR_APPROVED = "OPERATOR_APPROVED"
    OPERATOR_REJECTED = "OPERATOR_REJECTED"
    OPERATOR_OVERRIDDEN = "OPERATOR_OVERRIDDEN"
    POST_CAM_VERIFIED = "POST_CAM_VERIFIED"
    CDM_EXPORTED = "CDM_EXPORTED"
    SITREP_GENERATED = "SITREP_GENERATED"
    CASE_CLOSED = "CASE_CLOSED"

class ConjunctionCase(Base):
    __tablename__ = "conjunction_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conjunction_id = Column(Integer, ForeignKey("conjunctions.id"), unique=True, nullable=False, index=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    state = Column(SQLEnum(CaseState), default=CaseState.NEW, nullable=False, index=True)
    priority = Column(SQLEnum(CasePriority), default=CasePriority.ROUTINE, nullable=False, index=True)
    assigned_operator = Column(String(100), default="FLIGHT_DYNAMICS_OFFICER", nullable=False)
    
    # Decision Metadata
    selected_strategy_type = Column(String(50), nullable=True)
    selected_delta_v_m_s = Column(Float, nullable=True)
    decision_rationale = Column(Text, nullable=True)
    decision_timestamp_utc = Column(DateTime, nullable=True)
    
    # Verification Metadata
    post_cam_miss_distance_km = Column(Float, nullable=True)
    post_cam_pc = Column(Float, nullable=True)
    post_cam_risk_score = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    conjunction = relationship("Conjunction")
    audit_events = relationship("AuditEvent", back_populates="case", cascade="all, delete-orphan", order_by="AuditEvent.timestamp_utc.asc()")

    __table_args__ = (
        Index("ix_conjunction_cases_state_priority", "state", "priority"),
    )

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("conjunction_cases.id"), nullable=False, index=True)
    conjunction_id = Column(Integer, nullable=False, index=True)
    event_type = Column(SQLEnum(AuditEventType), nullable=False, index=True)
    actor = Column(String(50), default="SYSTEM", nullable=False) # SYSTEM, PHYSICS_ENGINE, AI_COPILOT, OPERATOR
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    payload = Column(JSON, nullable=True)
    engine_version = Column(String(20), default="2.1.0-PROD", nullable=False)
    timestamp_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    case = relationship("ConjunctionCase", back_populates="audit_events")

class PerformanceRunLog(Base):
    __tablename__ = "performance_run_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_timestamp_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    mode = Column(String(20), default="LIVE", nullable=False) # LIVE, DEMO
    total_objects = Column(Integer, default=0, nullable=False)
    candidate_pairs_screened = Column(Integer, default=0, nullable=False)
    conjunctions_detected = Column(Integer, default=0, nullable=False)
    high_risk_events = Column(Integer, default=0, nullable=False)
    
    # Subsystem execution latencies in milliseconds
    ingestion_ms = Column(Float, default=0.0, nullable=False)
    parsing_checksum_ms = Column(Float, default=0.0, nullable=False)
    sgp4_propagation_ms = Column(Float, default=0.0, nullable=False)
    spatial_screening_ms = Column(Float, default=0.0, nullable=False)
    tca_refinement_ms = Column(Float, default=0.0, nullable=False)
    pc_calculation_ms = Column(Float, default=0.0, nullable=False)
    risk_scoring_ms = Column(Float, default=0.0, nullable=False)
    total_pipeline_ms = Column(Float, default=0.0, nullable=False)
