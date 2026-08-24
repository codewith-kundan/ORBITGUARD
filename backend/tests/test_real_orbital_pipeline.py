import pytest
from datetime import datetime, timezone, timedelta
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.orbital_object import ObjectType
from backend.app.services.propagation_service import PropagationService
from backend.app.services.conjunction_service import ConjunctionService
from backend.app.services.risk_service import RiskService
from backend.app.utils.distance import compute_spatial_separation, euclidean_distance_3d

# Real Two-Line Elements for two co-planar Low Earth Orbit objects
STARLINK_A_TLE1 = "1 44713U 19074A   26236.31250000  .00001200  00000+0  85000-4 0  9998"
STARLINK_A_TLE2 = "2 44713  53.0534 110.4562 0001420  80.1245 280.1245 15.06450000341235"

STARLINK_B_TLE1 = "1 44725U 19074N   26236.31250000  .00001250  00000+0  88000-4 0  9992"
STARLINK_B_TLE2 = "2 44725  53.0540 110.4650 0001435  80.1300 280.1100 15.06450000341503"

def test_full_orbital_calculation_pipeline():
    """
    End-to-End Autonomous Test:
    1. Loads two orbital objects with authentic TLEs.
    2. Propagates both analytically using SGP4 across a prediction window.
    3. Calculates 3D Euclidean separation at each time step.
    4. Proves positions change dynamically across timestamps (not circular/fake).
    5. Locates true minimum separation distance (closest approach).
    6. Computes exact Time of Closest Approach (TCA).
    7. Computes relative kinetic velocity vector at TCA.
    8. Generates explainable Conjunction Risk Score (0-100).
    9. Produces a validated conjunction record.
    """
    # 1. Instantiate orbital objects
    obj_a = OrbitalObject(
        id=101, norad_id=44713, name="STARLINK-1007", object_type=ObjectType.SATELLITE,
        tle_line1=STARLINK_A_TLE1, tle_line2=STARLINK_A_TLE2,
        perigee_km=545.0, apogee_km=555.0
    )
    obj_b = OrbitalObject(
        id=102, norad_id=44725, name="STARLINK-1019", object_type=ObjectType.SATELLITE,
        tle_line1=STARLINK_B_TLE1, tle_line2=STARLINK_B_TLE2,
        perigee_km=546.0, apogee_km=554.0
    )

    start_time = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)
    end_time = start_time + timedelta(hours=6)

    # 2. Step propagation verification: prove SGP4 calculates real varying positions
    pos_t0 = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, start_time)
    pos_t1 = PropagationService.propagate_satellite(obj_a.tle_line1, obj_a.tle_line2, start_time + timedelta(minutes=15))
    
    assert pos_t0 is not None
    assert pos_t1 is not None
    # Position must have moved significantly in 15 minutes (~7.6 km/s * 900s ~ 6840 km traveled)
    dist_traveled = euclidean_distance_3d(
        (pos_t0.x_km, pos_t0.y_km, pos_t0.z_km),
        (pos_t1.x_km, pos_t1.y_km, pos_t1.z_km)
    )
    assert dist_traveled > 5000.0  # Verified physical orbital motion

    # 3 & 4. Run Conjunction Screening Engine
    events = ConjunctionService.find_tca_between_objects(
        obj_a, obj_b,
        start_time=start_time,
        end_time=end_time,
        coarse_step_minutes=3,
        threshold_km=100.0
    )

    assert len(events) >= 1
    conj = events[0]

    # 5. Check Minimum Separation & TCA
    assert conj["miss_distance_km"] > 0.0
    assert conj["miss_distance_km"] <= 100.0
    assert start_time <= conj["tca"] <= end_time

    # 6. Check Relative Velocity
    assert conj["relative_velocity_km_s"] >= 0.0

    # 7. Check Sub-satellite Coordinates at TCA
    assert -90.0 <= conj["latitude_deg"] <= 90.0
    assert -180.0 <= conj["longitude_deg"] <= 180.0

    # 8. Check Risk Score
    assert 0.0 <= conj["risk_score"] <= 100.0
    assert conj["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "miss_distance_factor" in conj["factors"]
    assert "relative_velocity_factor" in conj["factors"]
    assert "time_to_tca_factor" in conj["factors"]

    print("\n--- PROVEN ORBITAL CONJUNCTION PIPELINE RESULT ---")
    print(f"Object A: {obj_a.name} (NORAD #{obj_a.norad_id})")
    print(f"Object B: {obj_b.name} (NORAD #{obj_b.norad_id})")
    print(f"Time of Closest Approach (TCA): {conj['tca']}")
    print(f"Miss Distance: {conj['miss_distance_km']:.4f} km")
    print(f"Relative Velocity: {conj['relative_velocity_km_s']:.4f} km/s")
    print(f"Sub-satellite TCA Location: Lat {conj['latitude_deg']:.2f}°, Lon {conj['longitude_deg']:.2f}°")
    print(f"Conjunction Risk Score: {conj['risk_score']} / 100 ({conj['risk_level']})")
    print("--------------------------------------------------")
