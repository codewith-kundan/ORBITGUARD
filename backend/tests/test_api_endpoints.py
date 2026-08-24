import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_api_pipeline():
    # 1. Health Endpoint
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"
    assert res_health.json()["service"] in ["SPACE SENTINEL", "ORBITGUARD"]

    # 2. Data Status Endpoint
    res_status = client.get("/api/data/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "mode" in status_data
    assert "source" in status_data
    assert status_data["database_connected"] is True

    # 3. Data Sync / Refresh Endpoint
    res_refresh = client.post("/api/data/sync?mode=DEMO")
    assert res_refresh.status_code == 200
    refresh_data = res_refresh.json()
    assert refresh_data["total_objects"] > 0
    assert refresh_data["data_source"] in ["CelesTrak", "Local Cached Dataset", "Local Verified Cache"]

    # 4. Paginated Objects Catalog
    res_objs = client.get("/api/objects?page=1&page_size=10")
    assert res_objs.status_code == 200
    paginated = res_objs.json()
    assert "items" in paginated
    assert "total" in paginated
    assert len(paginated["items"]) > 0
    test_obj = paginated["items"][0]
    test_norad = test_obj["norad_id"]

    # 5. Object Details
    res_obj = client.get(f"/api/objects/{test_norad}/details")
    assert res_obj.status_code == 200
    assert res_obj.json()["norad_id"] == test_norad

    # 6. Batch Positions for 3D Globe
    res_batch = client.get("/api/objects/positions?limit=50")
    assert res_batch.status_code == 200
    batch_data = res_batch.json()
    assert len(batch_data["positions"]) > 0
    sample_pos = batch_data["positions"][0]
    assert "x_km" in sample_pos
    assert "y_km" in sample_pos
    assert "z_km" in sample_pos
    assert "lat" in sample_pos
    assert "lon" in sample_pos
    assert "alt_km" in sample_pos

    # 7. Single Object Real-time Position
    res_pos = client.get(f"/api/objects/{test_norad}/position")
    assert res_pos.status_code == 200
    pos = res_pos.json()
    assert -90.0 <= pos["lat"] <= 90.0
    assert -180.0 <= pos["lon"] <= 180.0
    assert pos["velocity_km_s"] > 0

    # 8. Trajectory & Ground Track
    res_traj = client.get(f"/api/objects/{test_norad}/trajectory?hours=2&step_minutes=30")
    assert res_traj.status_code == 200
    traj = res_traj.json()
    assert len(traj["points"]) >= 4

    res_track = client.get(f"/api/objects/{test_norad}/ground-track?duration_minutes=120&step_minutes=10")
    assert res_track.status_code == 200
    track = res_track.json()
    assert len(track["points"]) >= 4

    # 9. Conjunction Screening Engine
    res_screen = client.post("/api/conjunctions/screen?window_hours=24&threshold_km=50.0&coarse_step_minutes=3")
    assert res_screen.status_code == 200
    screen_data = res_screen.json()
    assert "screened_pairs" in screen_data

    # 10. Conjunctions List & High Risk
    res_conjs = client.get("/api/conjunctions?limit=10")
    assert res_conjs.status_code == 200

    res_high = client.get("/api/conjunctions/high-risk")
    assert res_high.status_code == 200

    res_summary = client.get("/api/conjunctions/summary")
    assert res_summary.status_code == 200

    # 11. System Statistics
    res_stats = client.get("/api/statistics")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["tracked_objects"] > 0
    assert "risk_breakdown" in stats
    assert "altitude_distribution" in stats
    assert stats["status_mode"] in ["LIVE", "DEMO", "DEMO MODE", "LIVE ERROR"]
