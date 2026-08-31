import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.models.orbital_object import OrbitalObject, ObjectType, SyncLog
from backend.app.models.conjunction import Conjunction, RiskLevel
from backend.app.models.conjunction_case import ConjunctionCase, AuditEvent, PerformanceRunLog, CaseState, CasePriority, AuditEventType
from backend.app.services.case_service import CaseService
from backend.app.services.telemetry_service import TelemetryService
from backend.app.services.demo_scenario_service import DemoScenarioService
from backend.app.services.cam_service import CAMService
from backend.app.services.ai_copilot_service import AICopilotService
from backend.app.services.compliance_service import ComplianceService

@pytest.fixture(scope="function")
def db_session():
    """In-memory SQLite database session fixture."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed Sample Assets
    obj_a = OrbitalObject(
        norad_id=25544,
        name="ISS (ZARYA)",
        object_type=ObjectType.ACTIVE_SATELLITE,
        perigee_km=415.0,
        apogee_km=425.0,
        inclination=51.64,
        tle_line1="1 25544U 98067A   26243.50000000  .00016717  00000-0  10270-3 0  9002",
        tle_line2="2 25544  51.6400 208.5000 0007000  70.0000 290.0000 15.49500000123456"
    )
    obj_b = OrbitalObject(
        norad_id=99991,
        name="COSMOS 2251 DEBRIS",
        object_type=ObjectType.DEBRIS,
        perigee_km=410.0,
        apogee_km=430.0,
        inclination=74.0,
        tle_line1="1 99991U 93036AAA 26243.50000000  .00001000  00000-0  10000-4 0  9001",
        tle_line2="2 99991  74.0000 120.0000 0015000 110.0000 250.0000 15.49000000123456"
    )
    session.add_all([obj_a, obj_b])
    session.commit()

    # Seed High-Risk Conjunction
    conj = Conjunction(
        object_a_id=obj_a.id,
        object_b_id=obj_b.id,
        tca=datetime(2026, 9, 1, 14, 0, 0, tzinfo=timezone.utc),
        miss_distance_km=1.08,
        relative_velocity_km_s=14.94,
        collision_probability=0.00034,
        risk_score=87.0,
        risk_level=RiskLevel.CRITICAL
    )
    session.add(conj)
    session.commit()

    yield session
    session.close()

def test_p1_conjunction_case_state_machine(db_session):
    """Verifies Case creation and valid state machine transitions."""
    conj = db_session.query(Conjunction).first()
    case = CaseService.get_or_create_case(db_session, conj.id)
    assert case.state == CaseState.NEW
    assert case.priority == CasePriority.CRITICAL

    # Transition: NEW -> INVESTIGATING
    case = CaseService.transition_case_state(db_session, case.id, CaseState.INVESTIGATING, operator="FDO_ALPHA", rationale="Investigating critical close approach")
    assert case.state == CaseState.INVESTIGATING

    # Transition: INVESTIGATING -> CAM_ANALYSIS
    case = CaseService.transition_case_state(db_session, case.id, CaseState.CAM_ANALYSIS, operator="FDO_ALPHA")
    assert case.state == CaseState.CAM_ANALYSIS

    # Transition: CAM_ANALYSIS -> AWAITING_APPROVAL
    case = CaseService.transition_case_state(db_session, case.id, CaseState.AWAITING_APPROVAL, operator="FDO_ALPHA")
    assert case.state == CaseState.AWAITING_APPROVAL

    # Transition: AWAITING_APPROVAL -> APPROVED
    case = CaseService.transition_case_state(db_session, case.id, CaseState.APPROVED, operator="FLIGHT_DIRECTOR", strategy_type="MINIMUM_FUEL", delta_v_m_s=0.505)
    assert case.state == CaseState.APPROVED
    assert case.selected_strategy_type == "MINIMUM_FUEL"
    assert case.selected_delta_v_m_s == 0.505

    # Transition: APPROVED -> VERIFIED
    case = CaseService.transition_case_state(db_session, case.id, CaseState.VERIFIED, operator="VERIFICATION_OFFICER")
    assert case.state == CaseState.VERIFIED

    # Check Timeline audit events
    timeline = CaseService.get_case_timeline(db_session, case.id)
    assert len(timeline) >= 6
    assert any(e["event_type"] == AuditEventType.OPERATOR_APPROVED.value for e in timeline)
    assert any(e["event_type"] == AuditEventType.POST_CAM_VERIFIED.value for e in timeline)

def test_p1_invalid_state_transition_rejected(db_session):
    """Verifies illegal state machine transitions are strictly blocked."""
    conj = db_session.query(Conjunction).first()
    case = CaseService.get_or_create_case(db_session, conj.id)
    
    # NEW directly to VERIFIED is invalid
    with pytest.raises(ValueError) as exc:
        CaseService.transition_case_state(db_session, case.id, CaseState.VERIFIED)
    assert "Invalid state transition" in str(exc.value)

def test_p1_cam_multi_candidate_comparison(db_session):
    """Verifies multi-candidate CAM generation and evaluation metrics."""
    conj = db_session.query(Conjunction).first()
    plan = CAMService.plan_avoidance_maneuver(db_session, conj.id)
    
    assert plan is not None
    assert len(plan.strategies) >= 3
    
    # Verify strategies have valid physics properties
    for strat in plan.strategies:
        assert strat.total_delta_v_m_s > 0
        assert strat.fuel_cost_kg > 0
        assert strat.projected_miss_distance_km > conj.miss_distance_km
        assert strat.risk_reduction_percent > 0

def test_p1_deterministic_demo_scenarios(db_session):
    """Verifies all 5 deterministic demo scenarios load accurately."""
    scenarios = DemoScenarioService.list_scenarios()
    assert len(scenarios) == 5

    # Test loading Scenario 03 (High Risk)
    res3 = DemoScenarioService.load_scenario(db_session, "SCENARIO_03_HIGH_RISK")
    assert res3["status"] == "SUCCESS"
    assert res3["scenario"]["miss_distance_km"] == 1.08

    # Test loading Scenario 04 (Post-CAM)
    res4 = DemoScenarioService.load_scenario(db_session, "SCENARIO_04_SUCCESSFUL_CAM")
    assert res4["status"] == "SUCCESS"
    assert res4["scenario"]["miss_distance_km"] == 28.0

    # Test Reset
    reset_res = DemoScenarioService.reset_demo(db_session)
    assert reset_res["status"] == "SUCCESS"

def test_p1_performance_telemetry_profiling(db_session):
    """Verifies microsecond telemetry profiling and run history comparison."""
    latencies = {
        "ingestion_ms": 11.2,
        "parsing_checksum_ms": 7.8,
        "sgp4_propagation_ms": 42.1,
        "spatial_screening_ms": 16.5,
        "tca_refinement_ms": 8.9,
        "pc_calculation_ms": 3.7,
        "risk_scoring_ms": 2.9,
        "total_pipeline_ms": 93.1
    }
    log = TelemetryService.record_run(
        db=db_session,
        mode="LIVE",
        total_objects=3427,
        candidate_pairs=420,
        conjunctions_count=14,
        high_risk_count=2,
        latencies_ms=latencies
    )
    assert log.id is not None
    assert log.total_pipeline_ms == 93.1

    summary = TelemetryService.get_performance_summary(db_session)
    assert summary["current_run"]["total_pipeline_ms"] == 93.1
    assert len(summary["run_history"]) >= 1

def test_p2_sitrep_and_cdm_export(db_session):
    """Verifies SITREP and CCSDS CDM export compliance."""
    conj = db_session.query(Conjunction).first()
    cdm = ComplianceService.generate_cdm(conj, db_session)
    assert cdm.conjunction_id == conj.id
    assert "CCSDS_CDM_VERS = 1.0" in cdm.kvn_content
    assert "<cdm" in cdm.xml_content
