import pytest
from backend.app.services.tle_service import (
    validate_tle,
    compute_tle_checksum,
    classify_object_type,
    parse_tle_orbital_elements,
    parse_tle_text
)
from backend.app.schemas.orbital_object import ObjectType
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

SAMPLE_LINE1 = "1 25544U 98067A   26236.48831019  .00016717  00000+0  30000-3 0  9993"
SAMPLE_LINE2 = "2 25544  51.6416 182.2582 0005423  94.3982  22.8423 15.49842105471236"

def test_tle_checksum_calculation():
    c1 = compute_tle_checksum(SAMPLE_LINE1)
    assert c1 == 0
    c2 = compute_tle_checksum(SAMPLE_LINE2)
    assert c2 == 9

def test_tle_validation_valid():
    is_valid, reason = validate_tle(SAMPLE_LINE1, SAMPLE_LINE2)
    assert is_valid is True
    assert reason == "Valid TLE"

def test_tle_validation_invalid_length():
    is_valid, reason = validate_tle(SAMPLE_LINE1[:60], SAMPLE_LINE2)
    assert is_valid is False
    assert "Invalid line length" in reason

def test_classify_object_type():
    assert classify_object_type("ISS (ZARYA)", 25544) == ObjectType.ACTIVE_SATELLITE
    assert classify_object_type("COSMOS 2251 DEBRIS", 33749) == ObjectType.DEBRIS
    assert classify_object_type("CZ-4C R/B", 25941) == ObjectType.ROCKET_BODY
    assert classify_object_type("FALCON 9 R/B", 40000) == ObjectType.ROCKET_BODY
    assert classify_object_type("UNKNOWN OBJECT", 99999) == ObjectType.UNKNOWN

def test_parse_tle_text():
    tle_data = f"ISS (ZARYA)\n{SAMPLE_LINE1}\n{SAMPLE_LINE2}"
    records = parse_tle_text(tle_data, default_source="Test")
    assert len(records) == 1
    assert records[0]["norad_id"] == 25544
    assert records[0]["name"] == "ISS (ZARYA)"
    assert records[0]["object_type"] == ObjectType.ACTIVE_SATELLITE
    assert records[0]["inclination"] == 51.6416

def test_parse_tle_orbital_elements():
    elements = parse_tle_orbital_elements(SAMPLE_LINE1, SAMPLE_LINE2)
    assert elements["norad_id"] == 25544
    assert elements["inclination"] == 51.6416
    assert elements["eccentricity"] == 0.0005423
    assert 90.0 < elements["period_minutes"] < 95.0
    assert 400.0 < elements["perigee_km"] < 430.0
    assert 400.0 < elements["apogee_km"] < 430.0

def test_api_sync_and_list_objects():
    # Trigger DEMO sync for unit test determinism
    refresh_res = client.post("/api/data/sync?mode=DEMO")
    assert refresh_res.status_code == 200
    refresh_data = refresh_res.json()
    assert refresh_data["status"] == "success"
    assert refresh_data["total_objects"] > 0

    # Verify listing
    objs_res = client.get("/api/objects")
    assert objs_res.status_code == 200
    objs = objs_res.json()
    assert len(objs["items"]) > 0
