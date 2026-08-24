import pytest
from datetime import datetime, timezone, timedelta
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.orbital_object import ObjectType
from backend.app.services.conjunction_service import ConjunctionService
from backend.app.models.base import SessionLocal, Base, engine
from backend.app.services.tle_service import TLEService

# Sample test objects
STARLINK_1 = OrbitalObject(
    id=1, norad_id=44713, name="STARLINK-1007", object_type=ObjectType.ACTIVE_SATELLITE,
    tle_line1="1 44713U 19074A   26236.31250000  .00001200  00000+0  85000-4 0  9998",
    tle_line2="2 44713  53.0534 110.4562 0001420  80.1245 280.1245 15.06450000341235",
    perigee_km=545.0, apogee_km=555.0, inclination=53.0534
)

STARLINK_2 = OrbitalObject(
    id=2, norad_id=44725, name="STARLINK-1019", object_type=ObjectType.ACTIVE_SATELLITE,
    tle_line1="1 44725U 19074N   26236.31250000  .00001250  00000+0  88000-4 0  9992",
    tle_line2="2 44725  53.0540 110.4650 0001435  80.1300 280.1100 15.06450000341503",
    perigee_km=546.0, apogee_km=554.0, inclination=53.054
)

GEO_SAT = OrbitalObject(
    id=3, norad_id=99999, name="GEO-TEST", object_type=ObjectType.ACTIVE_SATELLITE,
    tle_line1="1 99999U 00001A   26236.00000000  .00000000  00000+0  00000-0 0  9999",
    tle_line2="2 99999   0.0000   0.0000 0000000   0.0000   0.0000  1.00270000000000",
    perigee_km=35786.0, apogee_km=35786.0, inclination=0.0
)

def test_broad_phase_filtering():
    objects = [STARLINK_1, STARLINK_2, GEO_SAT]
    pairs = ConjunctionService.broad_phase_filter(objects, altitude_buffer_km=50.0)
    
    # STARLINK_1 and STARLINK_2 should be paired (both ~550km LEO)
    # GEO_SAT (~35,786 km) should NEVER be paired with Starlink objects
    assert len(pairs) == 1
    p1, p2 = pairs[0]
    assert {p1.norad_id, p2.norad_id} == {44713, 44725}

def test_conjunction_detection_and_tca():
    start = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=6)
    
    events = ConjunctionService.find_tca_between_objects(
        STARLINK_1, STARLINK_2, start, end, coarse_step_minutes=3, threshold_km=50.0
    )
    
    assert isinstance(events, list)
    assert len(events) >= 1
    for ev in events:
        assert ev["miss_distance_km"] <= 50.0
        assert ev["risk_score"] >= 0.0
        assert "miss_distance_factor" in ev["factors"]
