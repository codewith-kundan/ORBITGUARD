import json
import os
import math
import numpy as np
import pytest
from datetime import datetime

from backend.app.services.conjunction_service import ConjunctionService, FastCandidateObject
from backend.app.services.risk_service import RiskService

def load_conjunction_references():
    ref_path = os.path.join(os.path.dirname(__file__), "..", "reference_cases", "conjunction_reference_cases.json")
    with open(ref_path, "r") as f:
        return json.load(f)["cases"]

@pytest.mark.parametrize("case", load_conjunction_references(), ids=lambda c: c["case_id"])
def test_conjunction_relative_state_and_pc(case):
    """
    Validates relative state vector norms, miss distance, relative velocity,
    and Foster-2D collision probability against reference numbers.
    """
    r_a = np.array(case["r_a_teme_km"])
    r_b = np.array(case["r_b_teme_km"])
    v_a = np.array(case["v_a_teme_km_s"])
    v_b = np.array(case["v_b_teme_km_s"])

    actual_miss_km = float(np.linalg.norm(r_a - r_b))
    actual_rel_vel_km_s = float(np.linalg.norm(v_a - v_b))

    miss_err = abs(actual_miss_km - case["expected_miss_distance_km"])
    vel_err = abs(actual_rel_vel_km_s - case["expected_relative_velocity_km_s"])

    assert miss_err <= case["miss_distance_tolerance_km"], f"Miss distance error {miss_err} km exceeds tolerance"
    assert vel_err <= case["relative_velocity_tolerance_km_s"], f"Relative velocity error {vel_err} km/s exceeds tolerance"

    pc_pct, conf, method = RiskService.calculate_collision_probability(
        miss_distance_km=actual_miss_km,
        combined_radius_m=case["combined_radius_m"],
        pos_uncertainty_km=case["position_uncertainty_km"]
    )

    assert pc_pct is not None
    pc_err = abs(pc_pct - case["expected_foster_pc_percent"])
    assert pc_err <= case["pc_tolerance_percent"], f"Pc percent error {pc_err}% exceeds tolerance"

def test_broad_phase_filter_pruning():
    """
    Validates that the 3-tier broad phase filter eliminates non-overlapping altitude shells.
    """
    obj1 = FastCandidateObject(
        id=1, norad_id=10001, name="LEO_LOW", object_type="PAYLOAD",
        tle_line1="1 10001U", tle_line2="2 10001",
        perigee_km=300.0, apogee_km=350.0, inclination=51.6
    )
    obj2 = FastCandidateObject(
        id=2, norad_id=10002, name="LEO_HIGH", object_type="DEBRIS",
        tle_line1="1 10002U", tle_line2="2 10002",
        perigee_km=800.0, apogee_km=850.0, inclination=51.6
    )
    obj3 = FastCandidateObject(
        id=3, norad_id=10003, name="LEO_CROSSING", object_type="DEBRIS",
        tle_line1="1 10003U", tle_line2="2 10003",
        perigee_km=320.0, apogee_km=360.0, inclination=51.6
    )

    pairs = ConjunctionService.broad_phase_filter([obj1, obj2, obj3], max_pairs=10, altitude_buffer_km=25.0)
    
    pair_ids = [(min(p[0].id, p[1].id), max(p[0].id, p[1].id)) for p in pairs]
    assert (1, 3) in pair_ids, "Overlapping pair (1, 3) must be detected"
    assert (1, 2) not in pair_ids, "Non-overlapping pair (1, 2) must be pruned by broad-phase spatial sieve"
