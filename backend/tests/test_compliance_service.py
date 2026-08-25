import pytest
from datetime import datetime, timezone
from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.models.conjunction import Conjunction
from backend.app.services.compliance_service import ComplianceService
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.compliance import WebhookDispatchRequest

def test_generate_cdm_kvn_and_xml():
    obj1 = OrbitalObject(
        norad_id=25544,
        name="ISS (ZARYA)",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        international_designator="1998-067A",
        tle_line1="1 25544U 98067A   24050.50000000  .00016717  00000+0  30000-3 0  9993",
        tle_line2="2 25544  51.6400 208.1000 0005000 130.0000 230.0000 15.50000000440001"
    )
    obj2 = OrbitalObject(
        norad_id=33333,
        name="COSMOS-DEBRIS",
        object_type=ObjectType.DEBRIS,
        source="TEST",
        international_designator="1993-036B"
    )

    conj = Conjunction(
        id=42,
        object_a_id=25544,
        object_b_id=33333,
        object_a=obj1,
        object_b=obj2,
        tca=datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc),
        miss_distance_km=0.85,
        relative_velocity_km_s=14.2,
        risk_level=RiskLevel.CRITICAL,
        risk_score=92.5
    )

    class DummyDB:
        def query(self, *args):
            return self
        def filter(self, *args):
            return self
        def first(self):
            return None

    cdm = ComplianceService.generate_cdm(conj, DummyDB())

    assert cdm.conjunction_id == 42
    assert "CCSDS_CDM_VERS = 1.0" in cdm.kvn_content
    assert "ORIGINATOR = ORBITGUARD_SSA_SYSTEM" in cdm.kvn_content
    assert "OBJECT_NAME = ISS (ZARYA)" in cdm.kvn_content
    assert "MISS_DISTANCE = 850.0 [m]" in cdm.kvn_content
    assert "RELATIVE_SPEED = 14200.0 [m/s]" in cdm.kvn_content

    # XML Format assertions
    assert "<cdm xmlns=" in cdm.xml_content
    assert "<MISS_DISTANCE units=\"m\">850.0</MISS_DISTANCE>" in cdm.xml_content
    assert "<OBJECT_NAME>ISS (ZARYA)</OBJECT_NAME>" in cdm.xml_content
    assert "</cdm>" in cdm.xml_content

@pytest.mark.asyncio
async def test_webhook_dispatch_nonexistent():
    class DummyDB:
        def query(self, *args):
            return self
        def filter(self, *args):
            return self
        def first(self):
            return None

    req = WebhookDispatchRequest(
        conjunction_id=99999,
        webhook_url="https://httpbin.org/post"
    )
    res = await ComplianceService.dispatch_webhook(req, DummyDB())
    assert res.success is False
    assert "not found" in res.message
