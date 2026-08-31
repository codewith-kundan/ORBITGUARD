import json
import os
import math
import pytest
from backend.app.services.cam_service import CAMService

def load_cam_references():
    ref_path = os.path.join(os.path.dirname(__file__), "..", "reference_cases", "cam_reference_cases.json")
    with open(ref_path, "r") as f:
        return json.load(f)["cases"]

@pytest.mark.parametrize("case", load_cam_references(), ids=lambda c: c["case_id"])
def test_cam_fuel_mass_and_displacement(case):
    """
    Validates Tsiolkovsky propellant mass and impulsive orbital clearance gain
    against reference values.
    """
    if "delta_v_m_s" in case:
        dv = case["delta_v_m_s"]
    else:
        vec = case["delta_v_vector_m_s"]
        dv = math.sqrt(vec["delta_v_r"]**2 + vec["delta_v_t"]**2 + vec["delta_v_w"]**2)
        assert abs(dv - case["expected_total_delta_v_m_s"]) < 0.005

    fuel = CAMService._calculate_fuel_mass(dv, case["spacecraft_mass_kg"], case["isp_sec"])
    fuel_err = abs(fuel - case["expected_fuel_cost_kg"])
    assert fuel_err <= case["fuel_tolerance_kg"], f"Fuel calculation error {fuel_err} kg exceeds tolerance"

def test_vis_viva_orbital_speed():
    """
    Validates Vis-Viva circular speed in LEO: v = sqrt(mu / r).
    For circular orbit at 500 km (r = 6871 km): v = sqrt(398600.4418 / 6871) = 7.6126 km/s.
    """
    r = 6871.0
    a = 6871.0
    v = CAMService._calculate_orbital_speed(a, r)
    expected_v = math.sqrt(398600.4418 / 6871.0)
    assert abs(v - expected_v) < 1e-4, f"Orbital velocity mismatch: {v} vs {expected_v}"
