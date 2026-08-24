import pytest
from datetime import datetime, timezone, timedelta
from backend.app.services.risk_service import RiskService, RiskLevel

def test_risk_scoring_critical():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    tca = now + timedelta(hours=1) # 1 hour to TCA -> high urgency
    # 0.8 km miss distance (<1km) + 14.5 km/s relative velocity
    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=0.8,
        relative_velocity_km_s=14.5,
        tca=tca,
        current_time=now
    )
    assert score >= 81.0
    assert level == RiskLevel.CRITICAL
    assert factors["miss_distance_factor"]["contribution"] == "Critical"
    assert factors["relative_velocity_factor"]["contribution"] == "Extreme Hypervelocity (>14 km/s)"
    assert factors["time_to_tca_factor"]["contribution"] == "Immediate Urgency (<2h)"

def test_risk_scoring_high():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    tca = now + timedelta(hours=4)
    # 4.2 km miss distance, 9.5 km/s rel vel
    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=4.2,
        relative_velocity_km_s=9.5,
        tca=tca,
        current_time=now
    )
    assert 61.0 <= score <= 80.0
    assert level == RiskLevel.HIGH

def test_risk_scoring_medium():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    tca = now + timedelta(hours=8)
    # 12.0 km miss distance, 7.5 km/s rel vel
    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=12.0,
        relative_velocity_km_s=7.5,
        tca=tca,
        current_time=now
    )
    assert 31.0 <= score <= 60.0
    assert level == RiskLevel.MEDIUM

def test_risk_scoring_low():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    tca = now + timedelta(hours=22)
    # 45.0 km miss distance, 2.0 km/s rel vel
    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=45.0,
        relative_velocity_km_s=2.0,
        tca=tca,
        current_time=now
    )
    assert score <= 30.0
    assert level == RiskLevel.LOW

def test_risk_score_bounds():
    now = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    tca = now + timedelta(hours=1)
    score_huge, _, _ = RiskService.compute_risk_score(0.01, 18.0, tca, now)
    assert score_huge <= 100.0
    score_far, _, _ = RiskService.compute_risk_score(500.0, 0.1, tca + timedelta(days=10), now)
    assert score_far >= 0.0
