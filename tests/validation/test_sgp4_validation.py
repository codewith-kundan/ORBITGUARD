import json
import os
import math
from datetime import datetime
import numpy as np
import pytest
from sgp4.api import Satrec, jday

from backend.app.services.propagation_service import PropagationService

def load_sgp4_references():
    ref_path = os.path.join(os.path.dirname(__file__), "..", "reference_cases", "sgp4_reference_cases.json")
    with open(ref_path, "r") as f:
        return json.load(f)["cases"]

@pytest.mark.parametrize("case", load_sgp4_references(), ids=lambda c: c["case_id"])
def test_sgp4_propagation_precision(case):
    """
    Validates that SGP4 propagation matches analytical TEME Cartesian vectors
    within strict published tolerances.
    """
    sat = Satrec.twoline2rv(case["line1"], case["line2"])
    epoch = datetime.fromisoformat(case["target_epoch_utc"].replace("Z", "+00:00"))
    
    jd, fr = jday(
        epoch.year, epoch.month, epoch.day,
        epoch.hour, epoch.minute, epoch.second + epoch.microsecond / 1e6
    )
    
    err, r, v = sat.sgp4(jd, fr)
    assert err == 0, f"SGP4 propagation error code: {err}"
    
    r_actual = np.array(r)
    v_actual = np.array(v)
    
    r_expected = np.array(case["expected_position_teme_km"])
    v_expected = np.array(case["expected_velocity_teme_km_s"])
    
    pos_error_km = float(np.linalg.norm(r_actual - r_expected))
    vel_error_km_s = float(np.linalg.norm(v_actual - v_expected))
    
    assert pos_error_km <= case["position_tolerance_km"], (
        f"Position error {pos_error_km:.5f} km exceeds tolerance {case['position_tolerance_km']} km"
    )
    assert vel_error_km_s <= case["velocity_tolerance_km_s"], (
        f"Velocity error {vel_error_km_s:.6f} km/s exceeds tolerance {case['velocity_tolerance_km_s']} km/s"
    )
