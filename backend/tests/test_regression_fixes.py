from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.api.alerts import list_alerts
from backend.app.api.cases import list_cases
from backend.app.api import launches as launches_api
from backend.app.api.space_weather import get_space_weather
from backend.app.services.data_providers.celestrak import CelesTrakProvider
from backend.app.services.data_providers.manager import DataProviderManager
from backend.app.services.tle_service import TLEService
from backend.app.models.alert import Alert
from backend.app.models.base import Base
from backend.app.models.conjunction import Conjunction, RiskLevel
from backend.app.models.conjunction_case import CaseState
from backend.app.models.orbital_object import ObjectType, OrbitalObject
from backend.app.schemas.alert import AlertStatus
from backend.app.schemas.breakup import BreakupSimulateRequest
from backend.app.services.ai_copilot_service import AICopilotService
from backend.app.services.breakup_service import BreakupService
from backend.app.services.cache_service import fast_cache
from backend.app.services.case_service import CaseService
from backend.app.services.compliance_service import ComplianceService
from backend.app.services.conjunction_service import ConjunctionService
from backend.app.services.decay_service import DecayService
from backend.app.services.telemetry_service import TelemetryService


@pytest.fixture
def db_session():
    fast_cache.clear()
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    obj_a = OrbitalObject(
        norad_id=25544,
        name="ISS & TEST <ZARYA>",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="TEST",
        perigee_km=415.0,
        apogee_km=425.0,
        inclination=51.64,
        eccentricity=0.0007,
        period_minutes=92.9,
        tle_epoch=datetime(2026, 2, 19, 12, 0, 0, tzinfo=timezone.utc),
        tle_line1="1 25544U 98067A   24050.50000000  .00016717  00000+0  30000-3 0  9993",
        tle_line2="2 25544  51.6400 208.1000 0005000 130.0000 230.0000 15.50000000440001"
    )
    obj_b = OrbitalObject(
        norad_id=99991,
        name="COSMOS 2251 DEB",
        object_type=ObjectType.DEBRIS,
        source="TEST",
        perigee_km=390.0,
        apogee_km=420.0,
        inclination=74.0,
        eccentricity=0.0022,
        period_minutes=92.6,
        tle_epoch=datetime(2026, 2, 19, 12, 0, 0, tzinfo=timezone.utc),
        tle_line1="1 99991U 93036AAA 24050.50000000  .00001000  00000-0  10000-4 0  9001",
        tle_line2="2 99991  74.0000 120.0000 0015000 110.0000 250.0000 15.49000000123456"
    )
    obj_low = OrbitalObject(
        norad_id=77777,
        name="DECAYING TESTSAT",
        object_type=ObjectType.DEBRIS,
        source="TEST",
        perigee_km=195.0,
        apogee_km=210.0,
        bstar=0.0045,
        inclination=53.0,
        tle_line1="1 77777U 20001A   24050.50000000  .00020000  00000-0  45000-3 0  9991",
        tle_line2="2 77777  53.0000 100.0000 0010000 100.0000 100.0000 16.20000000123456"
    )
    session.add_all([obj_a, obj_b, obj_low])
    session.commit()

    conj = Conjunction(
        object_a_id=obj_a.id,
        object_b_id=obj_b.id,
        tca=datetime.now(timezone.utc) + timedelta(hours=6),
        miss_distance_km=0.95,
        relative_velocity_km_s=14.1,
        altitude_km=418.0,
        latitude_deg=12.4,
        longitude_deg=45.2,
        risk_score=88.0,
        risk_level=RiskLevel.CRITICAL,
        collision_probability=0.015,
        approach_angle_deg=96.0
    )
    session.add(conj)
    session.commit()
    yield session
    session.close()


def test_alerts_filter_respects_status_without_repopulating(db_session):
    conj = db_session.query(Conjunction).first()
    active_alert = Alert(
        conjunction_id=conj.id,
        severity=RiskLevel.CRITICAL,
        title="Test Alert",
        message="Active alert",
        status=AlertStatus.ACTIVE
    )
    db_session.add(active_alert)
    db_session.commit()

    resolved = list_alerts(status=AlertStatus.RESOLVED, severity=None, limit=50, db=db_session)
    assert resolved == []


def test_breakup_is_deterministic_and_conjunction_breakup_works(db_session):
    req = BreakupSimulateRequest(
        event_type="CATASTROPHIC_COLLISION",
        target_name="SAT-A",
        target_mass_kg=1000.0,
        impactor_name="DEB-B",
        impactor_mass_kg=50.0,
        relative_velocity_km_s=11.0,
        altitude_km=750.0,
        inclination_deg=98.0,
        min_fragment_size_m=0.1,
        max_fragments_to_generate=40
    )
    run1 = BreakupService.simulate_breakup(req)
    run2 = BreakupService.simulate_breakup(req)
    assert [f.delta_v_m_s for f in run1.fragments] == [f.delta_v_m_s for f in run2.fragments]
    assert [f.area_to_mass_m2_kg for f in run1.fragments] == [f.area_to_mass_m2_kg for f in run2.fragments]

    conj = db_session.query(Conjunction).first()
    conj_res = BreakupService.simulate_conjunction_breakup(db_session, conj.id)
    assert conj_res is not None
    assert conj_res.sample_fragments_count > 0


def test_cdm_propagates_real_teme_vectors_and_escapes_xml(db_session):
    conj = db_session.query(Conjunction).first()
    cdm = ComplianceService.generate_cdm(conj, db_session)
    assert "REF_FRAME = TEME" in cdm.kvn_content
    assert "EPHEMERIS_NAME = SGP4_TLE_PROPAGATION" in cdm.kvn_content
    # Propagated state vector should not stay at hardcoded (6871.000000, 0.000000, 0.000000)
    assert "X = 6871.000000 [km]" not in cdm.kvn_content
    assert "ISS &amp; TEST &lt;ZARYA&gt;" in cdm.xml_content


def test_ai_copilot_tools_fixed(db_session):
    conj = db_session.query(Conjunction).first()

    tle_res = AICopilotService.execute_tool("get_tle", {"object_id": "COSMOS 2251"}, db_session)
    assert tle_res["status"] == "SUCCESS"
    assert tle_res["result"]["norad_id"] == 99991
    assert tle_res["result"]["epoch"] is not None

    prop_res = AICopilotService.execute_tool("propagate_object", {"object_id": 25544}, db_session)
    assert prop_res["status"] == "SUCCESS"
    assert prop_res["result"]["altitude_km"] > 100.0

    conj_res = AICopilotService.execute_tool(
        "find_conjunctions", {"object_a": "NONEXISTENT_OBJECT"}, db_session
    )
    assert conj_res["result"]["total_screened"] == 0

    tca_res = AICopilotService.execute_tool("calculate_tca", {"conjunction_id": conj.id}, db_session)
    assert tca_res["status"] == "SUCCESS"
    assert tca_res["result"]["time_to_tca_hours"] > 0.0

    # Empty conjunction DB must never return hardcoded fake miss distances
    db_session.query(Conjunction).delete()
    db_session.commit()
    reply = AICopilotService.process_copilot_query("Why is this high risk?", db_session)
    assert "1.42" not in reply["text"]
    assert "14.82" not in reply["text"]


def test_case_service_zero_dv_and_deleted_conjunction_cleanup(db_session):
    conj = db_session.query(Conjunction).first()
    case = CaseService.get_or_create_case(db_session, conj.id)
    updated = CaseService.transition_case_state(
        db_session, case.id, CaseState.INVESTIGATING, strategy_type="HOLD", delta_v_m_s=0.0
    )
    assert updated.selected_delta_v_m_s == 0.0

    # Simulate deleting conjunction via expiry pruning
    conj.tca = datetime.now(timezone.utc) - timedelta(hours=2)
    db_session.commit()
    pruned = ConjunctionService.prune_expired_conjunctions(db_session, grace_period_minutes=15)
    assert pruned == 1
    assert list_cases(db=db_session) == []


def test_decay_orders_lowest_perigee_and_telemetry_honest_empty(db_session):
    watchlist = DecayService.get_decay_watchlist(db_session, max_lifetime_days=36500.0)
    assert len(watchlist) >= 1
    assert watchlist[0].norad_id == 77777

    summary = TelemetryService.get_performance_summary(db_session)
    assert summary["has_runs"] is False
    assert summary["current_run"] is None


@pytest.mark.asyncio
async def test_space_weather_honest_degraded_without_fabrication():
    fast_cache.clear()

    async def fake_get(self, url, **kwargs):
        req = httpx.Request("GET", url)
        if "planetary-k-index" in url:
            return httpx.Response(
                200,
                json=[["time_tag", "Kp", "a_running", "station_count"], ["2026-11-13 00:00:00.000", "4.33", "32", "8"]],
                request=req,
            )
        raise httpx.ConnectError("F10.7/Plasma feed offline", request=req)

    with patch.object(httpx.AsyncClient, "get", new=fake_get):
        payload = await get_space_weather()

    assert payload["status"] == "DEGRADED"
    assert payload["kp_index"] == 4.33
    # Must NEVER fabricate F10.7 or solar wind when upstream fails
    assert payload["f107_flux"] is None
    assert payload["solar_wind_speed_km_s"] is None
    assert len(payload["errors"]) == 2


@pytest.mark.asyncio
async def test_space_weather_live_rtsw_solar_wind():
    fast_cache.clear()

    async def fake_get(self, url, **kwargs):
        req = httpx.Request("GET", url)
        if "planetary-k-index" in url:
            return httpx.Response(
                200,
                json=[["time_tag", "Kp", "a_running", "station_count"], ["2026-11-13T03:00:00", "2.00", "7", "8"]],
                request=req,
            )
        if "f107_cm_flux" in url:
            return httpx.Response(
                200,
                json=[{"time_tag": "2026-11-12T22:00:00", "flux": 122.4}],
                request=req,
            )
        if "rtsw_wind_1m" in url:
            return httpx.Response(
                200,
                json=[
                    {
                        "time_tag": "2026-11-13T07:45:00",
                        "active": False,
                        "source": "ACE",
                        "proton_speed": 310.0,
                        "proton_density": 4.0,
                        "proton_temperature": 30000,
                    },
                    {
                        "time_tag": "2026-11-13T07:45:00",
                        "active": True,
                        "source": "SOLAR1",
                        "proton_speed": 412.6,
                        "proton_density": 2.15,
                        "proton_temperature": 48120,
                    },
                ],
                request=req,
            )
        return httpx.Response(404, request=req)

    with patch.object(httpx.AsyncClient, "get", new=fake_get):
        payload = await get_space_weather()

    assert payload["status"] == "LIVE"
    assert payload["kp_index"] == 2.0
    assert payload["f107_flux"] == 122.4
    assert payload["solar_wind_speed_km_s"] == 412.6
    assert payload["solar_wind_density_p_cm3"] == 2.15
    assert payload["solar_wind_temp_k"] == 48120.0
    assert payload["errors"] == []


@pytest.mark.asyncio
async def test_launches_live_and_honest_unavailable_without_fake_fallback():
    launches_api._cached_launches = []
    launches_api._last_fetch_time = 0.0

    async def fail_get(self, url, **kwargs):
        raise httpx.ReadTimeout("timeout", request=httpx.Request("GET", url))

    with patch.object(httpx.AsyncClient, "get", new=fail_get):
        unavail = await launches_api.get_upcoming_launches()

    assert unavail["status"] == "UNAVAILABLE"
    assert unavail["launches"] == []
    assert launches_api._cached_launches == []

    async def ok_get(self, url, **kwargs):
        req = httpx.Request("GET", url)
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "id": "live-1",
                        "name": "Vulcan VC6L | Amazon Leo",
                        "rocket": {"configuration": {"name": "Vulcan VC6L"}},
                        "pad": {"name": "SLC-41", "location": {"name": "Cape Canaveral SFS, FL, USA"}},
                        "net": "2026-11-13T17:54:00Z",
                        "mission": {"orbit": {"name": "Low Earth Orbit"}, "description": "Constellation deployment"},
                        "status": {"name": "Go for Launch"},
                        "image": "https://example.com/rocket.jpg",
                    }
                ]
            },
            request=req,
        )

    with patch.object(httpx.AsyncClient, "get", new=ok_get):
        live = await launches_api.get_upcoming_launches()

    assert live["status"] == "LIVE"
    assert live["cached"] is False
    assert live["count"] == 1
    assert live["launches"][0]["name"] == "Vulcan VC6L | Amazon Leo"

    # Subsequent request while live upstream is healthy must bypass in-memory cache and get newest live payload
    async def ok_get_updated(self, url, **kwargs):
        req = httpx.Request("GET", url)
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "id": "live-2",
                        "name": "Falcon 9 | Live Updated Mission",
                        "rocket": {"configuration": {"name": "Falcon 9 Block 5"}},
                        "pad": {"name": "LC-39A", "location": {"name": "KSC, FL, USA"}},
                        "net": "2026-11-14T10:00:00Z",
                        "mission": {"orbit": {"name": "LEO"}, "description": "Live update"},
                        "status": {"name": "Go for Launch"},
                        "image": None,
                    }
                ]
            },
            request=req,
        )

    with patch.object(httpx.AsyncClient, "get", new=ok_get_updated):
        live2 = await launches_api.get_upcoming_launches()
    assert live2["status"] == "LIVE"
    assert live2["cached"] is False
    assert live2["launches"][0]["name"] == "Falcon 9 | Live Updated Mission"

    # Only when ALL live endpoints fail should cached live snapshot be returned
    with patch.object(httpx.AsyncClient, "get", new=fail_get):
        fallback_cached = await launches_api.get_upcoming_launches()
    assert fallback_cached["status"] == "CACHED"
    assert fallback_cached["cached"] is True
    assert fallback_cached["launches"][0]["name"] == "Falcon 9 | Live Updated Mission"

    launches_api._cached_launches = []
    launches_api._last_fetch_time = 0.0


@pytest.mark.asyncio
async def test_data_status_is_live_and_non_negative_epoch_age(db_session, tmp_path):
    from backend.app.models.orbital_object import SyncLog

    future_obj = OrbitalObject(
        norad_id=99999,
        name="FUTURE-EPOCH-SAT",
        object_type=ObjectType.ACTIVE_SATELLITE,
        source="CelesTrak",
        tle_epoch=datetime.utcnow() + timedelta(hours=5),
        tle_line1="1 25544U 98067A   24050.50000000  .00016717  00000+0  30000-3 0  9993",
        tle_line2="2 25544  51.6400 208.1000 0005000 130.0000 230.0000 15.50000000440001",
    )
    db_session.add(future_obj)
    db_session.add(SyncLog(mode="LIVE", source="CelesTrak", status="SUCCESS", total_synced=4, created_at=datetime.utcnow()))
    db_session.commit()

    status = TLEService.get_data_status(db_session)
    assert status.is_live is True
    assert status.is_live_error is False
    assert status.last_updated is not None
    assert status.data_age_minutes >= 0.0

    # Mock provider health checks and verify non-negative data_age_hours
    mgr = DataProviderManager()
    for p in mgr.providers.values():
        p.health_check = AsyncMock(return_value={"provider": p.name, "status": "HEALTHY", "latency_ms": 1.0, "is_live": True, "requires_auth": False})
    health = await mgr.get_system_health(db=db_session)
    assert health["data_age_hours"] is not None
    assert health["data_age_hours"] >= 0.0

    # Verify CelesTrak 403 'not updated since' reuses stale disk group snapshot cleanly
    sample_tle = [
        "ISS (ZARYA)",
        "1 25544U 98067A   24050.50000000  .00016717  00000+0  30000-3 0  9993",
        "2 25544  51.6400 208.1000 0005000 130.0000 230.0000 15.50000000440001",
    ]
    provider = CelesTrakProvider()
    with patch("backend.app.services.data_providers.celestrak._cache_dir", return_value=str(tmp_path)):
        from backend.app.services.data_providers.celestrak import _write_group_cache
        import json as _json
        _write_group_cache("stations", sample_tle)
        # Force age > 2h so provider actually sends HTTP request and hits 403 'not updated'
        cache_file = tmp_path / "stations.json"
        data = _json.loads(cache_file.read_text())
        data["fetched_ts"] -= 10000
        cache_file.write_text(_json.dumps(data))

        async def mock_403(self, url, **kwargs):
            req = httpx.Request("GET", url)
            if "GROUP=stations" in url:
                return httpx.Response(403, text="GP data has not updated since your last successful download", request=req)
            return httpx.Response(200, text="\n".join(sample_tle), request=req)

        async def mock_head(self, url, **kwargs):
            return httpx.Response(200, request=httpx.Request("HEAD", url))

        with patch.object(httpx.AsyncClient, "get", new=mock_403), patch.object(httpx.AsyncClient, "head", new=mock_head):
            lines, src, mode, err = await provider.fetch_tle_data()
            assert mode == "LIVE"
            assert src == "CelesTrak"
            assert err is None
            assert len(lines) >= 3


def test_batch_positions_supports_all_and_cache_transitions():
    from backend.app.api.objects import _invalidate_batch_caches, get_batch_positions

    _invalidate_batch_caches()
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        iss_l1 = "1 25544U 98067A   26236.50000000  .00016717  00000-0  10270-3 0  9005"
        iss_l2 = "2 25544  51.6400 200.0000 0005000  45.0000  45.0000 15.49000000400001"
        samples = [
            ("ISS (ZARYA)", 25544, ObjectType.ACTIVE_SATELLITE),
            ("TIANGONG", 48274, ObjectType.ACTIVE_SATELLITE),
            ("STARLINK-1001", 44713, ObjectType.ACTIVE_SATELLITE),
            ("ONEWEB-0010", 45131, ObjectType.ACTIVE_SATELLITE),
            ("GPS BIIR-2", 24876, ObjectType.ACTIVE_SATELLITE),
            ("COSMOS 2251 DEB", 34454, ObjectType.DEBRIS),
            ("SL-16 R/B", 22566, ObjectType.ROCKET_BODY),
            ("PAYLOAD-ALPHA", 50001, ObjectType.ACTIVE_SATELLITE),
            ("OBJECT-UNKNOWN", 50002, ObjectType.UNKNOWN),
        ]
        for idx, (name, norad, obj_type) in enumerate(samples):
            session.add(
                OrbitalObject(
                    norad_id=norad,
                    name=name,
                    object_type=obj_type,
                    source="CelesTrak",
                    tle_line1=iss_l1,
                    tle_line2=iss_l2,
                    tle_epoch=datetime.now(timezone.utc) - timedelta(hours=idx + 1),
                )
            )
        session.commit()

        expected_total = len(samples)
        ts = datetime.now(timezone.utc)

        # Start small (3), then expand to 6, then request full catalog via limit=0 and all=True
        r3 = get_batch_positions(timestamp=ts, limit=3, all=False, db=session)
        assert r3.total_objects == expected_total
        assert len(r3.positions) == 3
        assert any(p.norad_id in (25544, 48274) for p in r3.positions)

        r6 = get_batch_positions(timestamp=ts, limit=6, all=False, db=session)
        assert len(r6.positions) == 6

        r_all_zero = get_batch_positions(timestamp=ts, limit=0, all=False, db=session)
        assert len(r_all_zero.positions) == expected_total

        r_all_flag = get_batch_positions(timestamp=ts, limit=3000, all=True, db=session)
        assert len(r_all_flag.positions) == expected_total

        # Downgrade within 4s cache window must immediately shrink returned slice
        r_down = get_batch_positions(timestamp=ts, limit=2, all=False, db=session)
        assert len(r_down.positions) == 2

        # Direct live DB insert must appear immediately on next query without manual cache invalidation
        session.add(
            OrbitalObject(
                norad_id=59999,
                name="LIVE-DB-INSERTED-SAT",
                object_type=ObjectType.ACTIVE_SATELLITE,
                source="CelesTrak",
                tle_line1=iss_l1,
                tle_line2=iss_l2,
                tle_epoch=datetime.now(timezone.utc),
            )
        )
        session.commit()

        r_live_added = get_batch_positions(timestamp=ts, limit=0, all=True, db=session)
        assert r_live_added.total_objects == expected_total + 1
        assert len(r_live_added.positions) == expected_total + 1
        assert any(p.norad_id == 59999 for p in r_live_added.positions)

        from backend.app.api.objects import get_data_status, list_orbital_objects
        from backend.app.api.statistics import get_system_statistics

        assert get_data_status(db=session).total_objects == expected_total + 1
        assert get_system_statistics(db=session)["tracked_objects"] == expected_total + 1
        assert (
            list_orbital_objects(page=1, page_size=50, sort_by="norad_id", order="asc", db=session).total
            == expected_total + 1
        )
    finally:
        session.close()
        _invalidate_batch_caches()


@pytest.mark.asyncio
async def test_live_providers_prioritized_over_disk_cache_with_cache_fallback_only_on_total_outage(tmp_path):
    old_cached_tle = [
        "OLD-CACHED-SAT",
        "1 25544U 98067A   24050.50000000  .00016717  00000-0  30000-3 0  9993",
        "2 25544  51.6400 208.1000 0005000 130.0000 230.0000 15.50000000440001",
    ]
    fresh_live_tle = [
        "FRESH-LIVE-SAT",
        "1 25544U 98067A   26236.50000000  .00016717  00000-0  10270-3 0  9005",
        "2 25544  51.6400 200.0000 0005000  45.0000  45.0000 15.49000000400001",
    ]

    with patch("backend.app.services.data_providers.celestrak._cache_dir", return_value=str(tmp_path)):
        from backend.app.services.data_providers.celestrak import _write_group_cache

        _write_group_cache("stations", old_cached_tle)
        _write_group_cache("active", old_cached_tle)

        # 1. CelesTrak MUST hit live HTTP and return FRESH-LIVE-SAT even though fresh disk cache exists
        async def mock_live_ok(self, url, **kwargs):
            req = httpx.Request("GET", url)
            return httpx.Response(200, text="\n".join(fresh_live_tle), request=req)

        provider = CelesTrakProvider()
        with patch.object(httpx.AsyncClient, "get", new=mock_live_ok):
            lines, src, mode, err = await provider.fetch_tle_data()
        assert mode == "LIVE"
        assert src == "CelesTrak"
        assert "FRESH-LIVE-SAT" in "\n".join(lines)

        # 2. Write a sentinel disk snapshot; when CelesTrak + Space-Track fail, manager must try SatNOGS live FIRST
        _write_group_cache("stations", old_cached_tle)
        mgr = DataProviderManager()
        mgr.providers["spacetrack"].fetch_tle_data = AsyncMock(return_value=([], "Space-Track", "AUTH REQUIRED", "no creds"))
        mgr.providers["celestrak"].fetch_tle_data = AsyncMock(return_value=([], "CelesTrak", "LIVE ERROR", "403 throttled"))
        mgr.providers["satnogs"].fetch_tle_data = AsyncMock(
            return_value=(fresh_live_tle, "SatNOGS", "LIVE", None)
        )
        lines2, src2, mode2, _ = await mgr.fetch_data("LIVE")
        assert mode2 == "LIVE"
        assert src2 == "SatNOGS"
        assert "FRESH-LIVE-SAT" in "\n".join(lines2)

        # 3. ONLY when ALL live providers fail does manager fall back to offline cache
        mgr.providers["satnogs"].fetch_tle_data = AsyncMock(return_value=([], "SatNOGS", "LIVE ERROR", "timeout"))
        lines3, src3, mode3, err3 = await mgr.fetch_data("LIVE")
        assert mode3 == "LIVE ERROR"
        assert "Cache" in src3
        assert "OLD-CACHED-SAT" in "\n".join(lines3)
        assert err3 is not None


@pytest.mark.asyncio
async def test_space_weather_runs_live_first_and_caches_only_on_outage():
    from backend.app.api import space_weather as sw_api

    fast_cache.clear()
    try:
        call_idx = {"n": 0}

        async def mock_swpc_get(self, url, **kwargs):
            req = httpx.Request("GET", url)
            n = call_idx["n"]
            if "planetary-k-index" in url:
                kp = "2.00" if n == 1 else "4.33"
                return httpx.Response(
                    200,
                    json=[["time_tag", "Kp", "a_running", "station_count"], ["2026-11-13 06:00:00.000", kp, "7", "8"]],
                    request=req,
                )
            if "f107_cm_flux" in url:
                return httpx.Response(200, json=[{"time_tag": "2026-11-13T06:00:00Z", "flux": 145.0}], request=req)
            return httpx.Response(
                200,
                json=[{"time_tag": "2026-11-13T06:00:00", "proton_speed": 420.0, "proton_density": 4.5, "proton_temperature": 50000.0, "active": True}],
                request=req,
            )

        with patch.object(httpx.AsyncClient, "get", new=mock_swpc_get):
            call_idx["n"] = 1
            first = await sw_api.get_space_weather()
            assert first["status"] == "LIVE"
            assert first["kp_index"] == 2.0

            call_idx["n"] = 2
            second = await sw_api.get_space_weather()
            assert second["status"] == "LIVE"
            assert second["kp_index"] == 4.33  # Bypassed cache on live call

        async def fail_swpc_get(self, url, **kwargs):
            raise httpx.ConnectError("offline", request=httpx.Request("GET", url))

        with patch.object(httpx.AsyncClient, "get", new=fail_swpc_get):
            outage = await sw_api.get_space_weather()
        assert outage["status"] == "CACHED"
        assert outage["cached"] is True
        assert outage["kp_index"] == 4.33
    finally:
        fast_cache.clear()



