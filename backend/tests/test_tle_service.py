import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.tle_service import (
    validate_tle,
    parse_tle_text,
    classify_object_type,
    ObjectType
)

client = TestClient(app)

SAMPLE_LINE1 = "1 25544U 98067A   26236.48831019  .00016717  00000+0  30000-3 0  9993"
SAMPLE_LINE2 = "2 25544  51.6416 182.2582 0005423  94.3982  22.8423 15.49842105471236"

def test_tle_validation_valid():
    is_valid, msg = validate_tle(SAMPLE_LINE1, SAMPLE_LINE2)
    assert is_valid is True

def test_tle_validation_invalid_length():
    is_valid, msg = validate_tle("1 25544U", SAMPLE_LINE2)
    assert is_valid is False
    assert "Invalid line length" in msg

def test_tle_validation_invalid_prefix():
    bad_line1 = "3 25544U 98067A   26236.48831019  .00016717  00000+0  30000-3 0  9993"
    is_valid, msg = validate_tle(bad_line1, SAMPLE_LINE2)
    assert is_valid is False
    assert "Invalid line starting sequence" in msg

def test_classify_object_type():
    assert classify_object_type("ISS (ZARYA)", 25544) == ObjectType.SATELLITE
    assert classify_object_type("COSMOS 2251 DEBRIS", 33749) == ObjectType.DEBRIS
    assert classify_object_type("CZ-4C R/B (ROCKET BODY)", 25941) == ObjectType.ROCKET_BODY

def test_parse_tle_text():
    tle_data = f"ISS (ZARYA)\n{SAMPLE_LINE1}\n{SAMPLE_LINE2}"
    records = parse_tle_text(tle_data, default_source="Test")
    assert len(records) == 1
    assert records[0]["norad_id"] == 25544
    assert records[0]["name"] == "ISS (ZARYA)"
    assert records[0]["object_type"] == ObjectType.SATELLITE
    assert records[0]["inclination_deg"] == 51.6416
    assert records[0]["perigee_km"] > 350.0  # LEO orbit
    assert records[0]["apogee_km"] < 500.0

def test_api_refresh_and_list_objects():
    # Trigger refresh
    refresh_res = client.post("/api/data/refresh")
    assert refresh_res.status_code == 200
    refresh_data = refresh_res.json()
    assert refresh_data["status"] == "success"
    assert refresh_data["total_objects"] > 0

    # List objects
    list_res = client.get("/api/objects?limit=10")
    assert list_res.status_code == 200
    objects = list_res.json()
    assert len(objects) > 0
    assert any(o["norad_id"] == 25544 for o in objects)

    # Get single object by NORAD ID
    get_res = client.get("/api/objects/25544")
    assert get_res.status_code == 200
    obj = get_res.json()
    assert obj["name"] == "ISS (ZARYA)"
    assert obj["norad_id"] == 25544
