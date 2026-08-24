import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_data_health_endpoint():
    res = client.get("/api/data/health")
    assert res.status_code == 200
    data = res.json()
    assert "overall_status" in data
    assert "providers" in data
    assert len(data["providers"]) >= 4

def test_ai_predict_risk_endpoint():
    res = client.get("/api/ai/predict-risk?miss_distance_km=2.5&relative_velocity_km_s=12.0&hours_to_tca=6.0&altitude_km=550.0")
    assert res.status_code == 200
    data = res.json()
    assert "predicted_risk_score" in data
    assert "severity_level" in data
    assert "feature_contributions" in data
    assert "operational_recommendations" in data
    assert data["predicted_risk_score"] > 50.0

def test_simulations_what_if_endpoint():
    res = client.get("/api/simulations/what-if?target_name=TEST-SAT&norad_id=25544&altitude_km=500.0&mass_kg=1000.0&fragment_count=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total_fragments_generated"] == 50
    assert "fragments_sample" in data
    assert len(data["fragments_sample"]) > 0

def test_simulations_kessler_endpoint():
    res = client.get("/api/simulations/kessler?years=10&annual_launches=1000")
    assert res.status_code == 200
    data = res.json()
    assert "timeline" in data
    assert len(data["timeline"]) == 10
    assert "cascade_tipping_point_year" in data["summary"]

def test_simulations_adr_endpoint():
    res = client.get("/api/simulations/adr?method=ROBOTIC_CAPTURE&annual_removals=10&years=15")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "timeline" in data
    assert data["summary"]["total_derelicts_removed"] == 150

def test_export_objects_json_and_csv():
    # JSON
    res_json = client.get("/api/export/objects?format=json&limit=10")
    assert res_json.status_code == 200
    assert res_json.headers["content-type"] == "application/json"
    
    # CSV
    res_csv = client.get("/api/export/objects?format=csv&limit=10")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "ID,NORAD_ID,NAME" in res_csv.text

def test_visibility_passes_endpoint():
    # Search for ISS or first object
    res_objs = client.get("/api/objects?page=1&page_size=1")
    norad_id = res_objs.json()["items"][0]["norad_id"]
    
    res = client.get(f"/api/visibility/passes?norad_id={norad_id}&lat=0.0&lon=0.0&hours=48.0&min_elevation=5.0")
    assert res.status_code == 200
    data = res.json()
    assert "satellite" in data
    assert "observer" in data
    assert "passes" in data
