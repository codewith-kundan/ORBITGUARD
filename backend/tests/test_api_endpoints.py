import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_api_pipeline():
    # 1. Health
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"

    # 2. Data Refresh
    res_refresh = client.post("/api/data/refresh")
    assert res_refresh.status_code == 200
    refresh_data = res_refresh.json()
    assert refresh_data["total_objects"] > 0
    assert refresh_data["data_source"] in ["CelesTrak", "Local Cached Dataset"]

    # 3. Object listing and detail
    res_objs = client.get("/api/objects?limit=5")
    assert res_objs.status_code == 200
    objects = res_objs.json()
    assert len(objects) > 0
    test_norad = objects[0]["norad_id"]

    res_obj = client.get(f"/api/objects/{test_norad}")
    assert res_obj.status_code == 200
    assert res_obj.json()["norad_id"] == test_norad

    # 4. Position and Trajectory
    res_pos = client.get(f"/api/objects/{test_norad}/position")
    assert res_pos.status_code == 200
    pos = res_pos.json()
    assert -90 <= pos["lat"] <= 90
    assert -180 <= pos["lon"] <= 180
    assert pos["velocity_km_s"] > 0

    res_traj = client.get(f"/api/objects/{test_norad}/trajectory?hours=2&step_minutes=30")
    assert res_traj.status_code == 200
    traj = res_traj.json()
    assert len(traj["points"]) >= 4

    # 5. Conjunction screening
    res_screen = client.post("/api/conjunctions/screen?window_hours=12&threshold_km=100.0&coarse_step_minutes=10")
    assert res_screen.status_code == 200
    screen_data = res_screen.json()
    assert "screened_pairs" in screen_data

    # 6. Conjunctions list & summary
    res_conjs = client.get("/api/conjunctions?limit=10")
    assert res_conjs.status_code == 200

    res_summary = client.get("/api/conjunctions/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert "total_screened" in summary

    # 7. Alerts listing
    res_alerts = client.get("/api/alerts")
    assert res_alerts.status_code == 200

    # 8. Statistics
    res_stats = client.get("/api/statistics")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["tracked_objects"] > 0
    assert "risk_breakdown" in stats
    assert "altitude_distribution" in stats
    assert stats["status_mode"] in ["LIVE", "DEMO MODE"]
