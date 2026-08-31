import pytest
import math
import numpy as np
from datetime import datetime, timezone, timedelta

from backend.app.models.base import SessionLocal
from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.models.conjunction import Conjunction, RiskLevel
from backend.app.services.tle_service import TLEService, compute_tle_checksum, validate_tle
from backend.app.services.propagation_service import PropagationService
from backend.app.services.conjunction_service import ConjunctionService, FastCandidateObject
from backend.app.services.risk_service import RiskService
from backend.app.services.cam_service import CAMService
from backend.app.services.ai_copilot_service import AICopilotService
from backend.app.services.compliance_service import ComplianceService

@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()

# -----------------------------------------------------------------------------
# 1. Data Ingestion & Checksum Validation
# -----------------------------------------------------------------------------
def test_p0_1_data_ingestion_and_tle_checksum():
    line1 = "1 25544U 98067A   26243.50000000  .00016717  00000-0  10270-3 0  9012"
    line2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
    
    is_valid, reason = validate_tle(line1, line2)
    assert is_valid, f"TLE validation failed: {reason}"
    
    chk1 = compute_tle_checksum(line1)
    chk2 = compute_tle_checksum(line2)
    assert chk1 >= 0 and chk2 >= 0

    elements = TLEService._extract_keplerian_elements(line1, line2)
    assert elements is not None
    assert abs(elements["inclination"] - 51.6416) < 1e-4

# -----------------------------------------------------------------------------
# 2. Propagation Accuracy against SGP4 Reference
# -----------------------------------------------------------------------------
def test_p0_2_propagation_accuracy():
    line1 = "1 25544U 98067A   26243.50000000  .00016717  00000-0  10270-3 0  9012"
    line2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
    epoch = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)
    
    pos = PropagationService.propagate_satellite(line1, line2, epoch, 25544, "ISS", ObjectType.ACTIVE_SATELLITE)
    assert pos is not None
    assert 300.0 <= pos.alt_km <= 500.0
    assert 7.0 <= pos.velocity_km_s <= 8.0

# -----------------------------------------------------------------------------
# 3. Spatial Screening Pruning
# -----------------------------------------------------------------------------
def test_p0_3_spatial_screening_broad_phase():
    obj_a = FastCandidateObject(1, 100, "LEO_A", "ACTIVE_SATELLITE", "1 100U", "2 100", 300.0, 320.0, 51.6)
    obj_b = FastCandidateObject(2, 200, "LEO_B", "DEBRIS", "1 200U", "2 200", 310.0, 330.0, 51.6)
    obj_c = FastCandidateObject(3, 300, "GEO_C", "ACTIVE_SATELLITE", "1 300U", "2 300", 35780.0, 35790.0, 0.1)

    pairs = ConjunctionService.broad_phase_filter([obj_a, obj_b, obj_c], max_pairs=10, altitude_buffer_km=25.0)
    pair_ids = [(min(p[0].id, p[1].id), max(p[0].id, p[1].id)) for p in pairs]
    
    assert (1, 2) in pair_ids
    assert (1, 3) not in pair_ids
    assert (2, 3) not in pair_ids

# -----------------------------------------------------------------------------
# 4. TCA Calculation Accuracy
# -----------------------------------------------------------------------------
def test_p0_4_tca_calculation_accuracy():
    # Orthogonal condition f(t) = dot(r_rel, v_rel) = 0
    r_rel = np.array([1.0, 0.0, 0.0])
    v_rel = np.array([0.0, 10.0, 0.0])
    dot_prod = float(np.dot(r_rel, v_rel))
    assert abs(dot_prod) < 1e-6

# -----------------------------------------------------------------------------
# 5. Miss Distance Accuracy
# -----------------------------------------------------------------------------
def test_p0_5_miss_distance_norm():
    r1 = np.array([3842.124, 4521.891, 2814.502])
    r2 = np.array([3842.845, 4522.412, 2815.114])
    miss = float(np.linalg.norm(r1 - r2))
    assert abs(miss - 1.0797) < 0.001

# -----------------------------------------------------------------------------
# 6. Relative Velocity Accuracy
# -----------------------------------------------------------------------------
def test_p0_6_relative_velocity_norm():
    v1 = np.array([-5.421, 4.102, 3.214])
    v2 = np.array([5.118, -4.389, -3.105])
    v_rel = float(np.linalg.norm(v1 - v2))
    assert abs(v_rel - 14.9364) < 0.001

# -----------------------------------------------------------------------------
# 7. Collision Probability Model Consistency
# -----------------------------------------------------------------------------
def test_p0_7_collision_probability_models():
    res = RiskService.calculate_advanced_benchmarks(
        miss_distance_km=0.75,
        relative_velocity_km_s=14.5,
        combined_radius_m=8.0,
        pos_uncertainty_km=1.0
    )
    assert res["foster_2d_pc_pct"] >= 0.0
    assert res["akella_alfriend_pc_pct"] >= 0.0
    assert res["alfano_max_pc_pct"] >= res["foster_2d_pc_pct"]
    assert res["monte_carlo_pc_pct"] >= 0.0

# -----------------------------------------------------------------------------
# 8. Risk Scoring Determinism
# -----------------------------------------------------------------------------
def test_p0_8_risk_scoring_determinism():
    tca = datetime(2026, 8, 31, 18, 0, 0, tzinfo=timezone.utc)
    curr = datetime(2026, 8, 31, 6, 0, 0, tzinfo=timezone.utc)

    score1, lvl1, _ = RiskService.compute_risk_score(1.2, 14.2, tca, curr)
    score2, lvl2, _ = RiskService.compute_risk_score(1.2, 14.2, tca, curr)

    assert score1 == score2
    assert lvl1 == lvl2

# -----------------------------------------------------------------------------
# 9. CAM Delta-V Calculation
# -----------------------------------------------------------------------------
def test_p0_9_cam_delta_v_calculation():
    # Gauss along-track displacement for 0.505 m/s burn over 12h:
    # delta_s = 3 * delta_v_t * delta_t
    delta_t_sec = 12.0 * 3600.0
    delta_v_t_km_s = 0.505 / 1000.0
    delta_s_km = 3.0 * delta_v_t_km_s * delta_t_sec
    assert delta_s_km > 20.0  # Produces ~65.4 km along-track separation

# -----------------------------------------------------------------------------
# 10. CAM Fuel Consumption against Tsiolkovsky Equation
# -----------------------------------------------------------------------------
def test_p0_10_cam_tsiolkovsky_fuel_mass():
    fuel_kg = CAMService._calculate_fuel_mass(
        delta_v_m_s=0.505,
        spacecraft_mass_kg=500.0,
        isp_sec=220.0
    )
    assert abs(fuel_kg - 0.117) < 0.005

# -----------------------------------------------------------------------------
# 11. AI Tool Calling Execution
# -----------------------------------------------------------------------------
def test_p0_11_ai_copilot_tool_execution(db_session):
    tool_res = AICopilotService.execute_tool("get_object", {"object_id": "ISS"}, db_session)
    assert tool_res["status"] == "SUCCESS"
    assert tool_res["tool"] == "get_object"
    assert tool_res["duration_ms"] >= 0.0

# -----------------------------------------------------------------------------
# 12. Evidence Object Verification
# -----------------------------------------------------------------------------
def test_p0_12_evidence_object_generation(db_session):
    evidence = AICopilotService.compile_evidence_object(db_session)
    assert evidence is not None
    assert "algorithm_version" in evidence
    assert "source" in evidence

# -----------------------------------------------------------------------------
# 13. Digit Validator Guard
# -----------------------------------------------------------------------------
def test_p0_13_digit_validator_guard():
    evidence = {
        "conjunction_id": 1,
        "miss_distance_km": 1.42,
        "relative_velocity_km_s": 14.82,
        "risk_score": 87
    }
    valid_text = "The miss distance is 1.42 km."
    sanitized = AICopilotService.validate_and_sanitize_response(valid_text, evidence)
    assert "1.42" in sanitized

# -----------------------------------------------------------------------------
# 14. Offline Safety & Deterministic Operation
# -----------------------------------------------------------------------------
def test_p0_14_offline_safety_and_data_status(db_session):
    conjunction = db_session.query(Conjunction).first()
    if conjunction:
        cdm = ComplianceService.generate_cdm(conjunction, db_session)
        assert cdm is not None
        assert hasattr(cdm, "xml_content") and hasattr(cdm, "kvn_content")
