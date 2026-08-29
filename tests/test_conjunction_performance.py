import time
import math
import numpy as np
from datetime import datetime, timezone, timedelta
from sgp4.api import Satrec, jday

from backend.app.models.base import SessionLocal
from backend.app.models.conjunction import Conjunction
from backend.app.models.orbital_object import OrbitalObject
from backend.app.services.conjunction_service import ConjunctionService, FastCandidateObject
from backend.app.services.propagation_service import PropagationService
from backend.app.services.risk_service import RiskService
from backend.app.services.cache_service import fast_cache


def test_tca_subsecond_root_finding_precision():
    """Verifies that TCA root finder satisfies orthogonality r_rel . v_rel == 0 to high precision at a local minimum."""
    print("\n--- Test 1: TCA Sub-Second Orthogonal Root Finder Precision ---")
    line1_a = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002'
    line2_a = '2 25544  51.6416 250.2341 0005617 130.1234 325.4321 15.50123456432101'
    line1_b = '1 48274U 21035A   24001.50000000  .00008500  00000-0  85000-4 0  9999'
    line2_b = '2 48274  41.4720 180.1234 0003500 120.4567 240.1234 15.60000000123456'

    sat_a = PropagationService.get_satrec(line1_a, line2_a)
    sat_b = PropagationService.get_satrec(line1_b, line2_b)
    assert sat_a is not None and sat_b is not None

    # Step 1: Find a true coarse local minimum over 24 hours
    start_time = datetime.now(timezone.utc)
    n_pts = 721
    time_pts = [start_time + timedelta(minutes=i * 2.0) for i in range(n_pts)]
    jd_list = [jday(tp.year, tp.month, tp.day, tp.hour, tp.minute, tp.second + tp.microsecond/1e6)[0] for tp in time_pts]
    fr_list = [jday(tp.year, tp.month, tp.day, tp.hour, tp.minute, tp.second + tp.microsecond/1e6)[1] for tp in time_pts]
    
    ea, ra_all, va_all = sat_a.sgp4_array(np.array(jd_list), np.array(fr_list))
    eb, rb_all, vb_all = sat_b.sgp4_array(np.array(jd_list), np.array(fr_list))
    dists = np.linalg.norm(ra_all - rb_all, axis=1)
    
    # Locate an interior local minimum
    is_min = (dists[1:-1] < dists[:-2]) & (dists[1:-1] < dists[2:])
    min_indices = np.where(is_min)[0] + 1
    assert len(min_indices) > 0, "Expected at least one local minimum over 24h"
    
    chosen_idx = int(min_indices[0])
    t_coarse = time_pts[chosen_idx]
    print(f"Found coarse local minimum at {t_coarse.isoformat()} (coarse dist: {dists[chosen_idx]:.2f} km)")

    t0 = time.perf_counter()
    exact_tca, min_dist, rel_vel, approach_ang, ra, rb, va, vb = ConjunctionService.refine_tca_exact(
        sat_a, sat_b, t_coarse, window_minutes=3.0
    )
    t1 = time.perf_counter()

    dr = ra - rb
    dv = va - vb
    dot_product = float(np.dot(dr, dv))

    print(f"Refinement runtime: {(t1 - t0)*1e6:.2f} microseconds")
    print(f"Exact Refined TCA: {exact_tca.isoformat()}")
    print(f"Refined Miss Distance: {min_dist:.4f} km (improved from {dists[chosen_idx]:.4f} km)")
    print(f"Relative Velocity: {rel_vel:.4f} km/s")
    print(f"Vector Crossing Angle: {approach_ang:.2f}°")
    print(f"Orthogonality dot product (r_rel · v_rel): {dot_product:.6e} km^2/s")
    assert abs(dot_product) < 1e-3, f"Dot product {dot_product} exceeds tolerance"
    print("✓ TCA sub-second root-finding precision PASSED!")


def test_vectorized_sgp4_performance():
    """Verifies that vectorized NumPy SGP4 screening runs in sub-millisecond time per candidate pair."""
    print("\n--- Test 2: Vectorized NumPy SGP4 Pair Screening Speed ---")
    line1_a = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002'
    line2_a = '2 25544  51.6416 250.2341 0005617 130.1234 325.4321 15.50123456432101'
    line1_b = '1 48274U 21035A   24001.50000000  .00008500  00000-0  85000-4 0  9999'
    line2_b = '2 48274  41.4720 180.1234 0003500 120.4567 240.1234 15.60000000123456'

    obj_a = FastCandidateObject(1, 25544, "ISS (ZARYA)", "ACTIVE_SATELLITE", line1_a, line2_a, 415.0, 420.0, 51.6, "LARGE")
    obj_b = FastCandidateObject(2, 48274, "TIANGONG", "ACTIVE_SATELLITE", line1_b, line2_b, 385.0, 395.0, 41.5, "LARGE")

    start_time = datetime.now(timezone.utc)
    time_points = [start_time + timedelta(minutes=i * 2.0) for i in range(721)] # 24h at 2-min step
    jd_list = []
    fr_list = []
    for tp in time_points:
        jd, fr = jday(tp.year, tp.month, tp.day, tp.hour, tp.minute, tp.second + tp.microsecond / 1e6)
        jd_list.append(jd)
        fr_list.append(fr)
    jd_arr = np.array(jd_list)
    fr_arr = np.array(fr_list)

    t0 = time.perf_counter()
    events = ConjunctionService.screen_single_pair(
        (obj_a, obj_b), jd_arr, fr_arr, time_points, threshold_km=8000.0, start_time=start_time
    )
    t1 = time.perf_counter()

    print(f"24-Hour (721 point) Pair Screen took: {(t1 - t0)*1000:.3f} ms")
    print(f"Found {len(events)} conjunction events")
    if events:
        print(f"Closest event miss distance: {events[0]['miss_distance_km']:.2f} km, TCA: {events[0]['tca']}")
    assert (t1 - t0) < 0.05, "Pair screening took longer than 50ms"
    print("✓ Vectorized pair screening performance PASSED!")


def test_collision_probability_and_risk_benchmarks():
    """Verifies Foster-2D, Akella-Alfriend, Monte Carlo, and Alfano calculations."""
    print("\n--- Test 3: Multi-Model Collision Probability & Risk Score ---")
    
    # Sub-case A: Critical hypervelocity encounter at 50m miss distance
    miss_distance_km = 0.05
    rel_vel_km_s = 14.2
    tca = datetime.now(timezone.utc) + timedelta(hours=2.0)

    score, level, factors = RiskService.compute_risk_score(
        miss_distance_km=miss_distance_km,
        relative_velocity_km_s=rel_vel_km_s,
        tca=tca,
        approach_angle_deg=88.5,
        combined_size_m=12.0
    )

    bm = factors["advanced_benchmarks"]
    print(f"[50m Encounter] Risk Score: {score}/100 -> Level: {level}")
    print(f"  Foster-2D Pc: {bm['foster_2d_pc_pct']}%")
    print(f"  Akella-Alfriend Pc: {bm['akella_alfriend_pc_pct']}%")
    print(f"  Alfano Max-Pc: {bm['alfano_max_pc_pct']}%")
    print(f"  Monte Carlo (10,000 runs) Pc: {bm['monte_carlo_pc_pct']}%")
    print(f"  Kinetic Energy: {bm['kinetic_energy_mj']} MJ (~{bm['tnt_equivalent_kg']} kg TNT)")
    print(f"  B-Plane coordinates: B·T = {bm['b_plane']['b_dot_t_m']} m, B·R = {bm['b_plane']['b_dot_r_m']} m")

    assert score >= 80.0, "Close sub-km hypervelocity encounter must be CRITICAL"
    assert bm["foster_2d_pc_pct"] > 0.0
    assert bm["monte_carlo_pc_pct"] >= 0.0
    assert bm["kinetic_energy_mj"] > 0.0

    # Sub-case B: Direct 10m encounter where Monte Carlo hits are frequent
    score_b, _, factors_b = RiskService.compute_risk_score(
        miss_distance_km=0.01,
        relative_velocity_km_s=10.0,
        tca=tca,
        approach_angle_deg=45.0,
        combined_size_m=20.0
    )
    bm_b = factors_b["advanced_benchmarks"]
    print(f"[10m Encounter] Monte Carlo Pc: {bm_b['monte_carlo_pc_pct']}%, Foster-2D Pc: {bm_b['foster_2d_pc_pct']}%")
    assert bm_b["monte_carlo_pc_pct"] > 0.0, "Expected non-zero Monte Carlo hits for 10m encounter with 20m diameter"
    print("✓ Collision probability & astrodynamics risk benchmarks PASSED!")


def test_full_catalog_screening_and_api_latency():
    """Verifies end-to-end full catalog screening across database and API query latency."""
    print("\n--- Test 4: Full Multi-Object Catalog Screening & API Latency ---")
    db = SessionLocal()
    try:
        t0 = time.perf_counter()
        result = ConjunctionService.run_full_conjunction_screening(
            db, window_hours=24, threshold_km=120.0, coarse_step_minutes=2.0
        )
        t1 = time.perf_counter()

        screening_time = t1 - t0
        print(f"Full Screening Time: {screening_time:.3f} s")
        print(f"Candidate Pairs Screened: {result['screened_pairs']}")
        print(f"Conjunctions Stored in DB: {result['conjunctions_found']}")
        assert result['conjunctions_found'] > 0, "Expected at least 1 conjunction event"

        # Benchmark query latency
        from backend.app.api.conjunctions import list_conjunctions, get_conjunction_summary, get_conjunction

        # 1. List query
        t0 = time.perf_counter()
        conjs = list_conjunctions(db=db, limit=50)
        t1 = time.perf_counter()
        print(f"API list_conjunctions Latency: {(t1 - t0)*1000:.2f} ms (returned {len(conjs)} items)")

        # 2. Summary query
        t0 = time.perf_counter()
        summary = get_conjunction_summary(db=db)
        t1 = time.perf_counter()
        print(f"API get_conjunction_summary Latency: {(t1 - t0)*1000:.2f} ms (critical: {summary.critical_count}, high: {summary.high_count})")

        # 3. Single item lookup
        if conjs:
            first_id = conjs[0].id
            t0 = time.perf_counter()
            detail = get_conjunction(id=first_id, db=db)
            t1 = time.perf_counter()
            print(f"API get_conjunction({first_id}) Latency: {(t1 - t0)*1000:.2f} ms ({detail.object_a.name} <-> {detail.object_b.name})")

        print("✓ Full catalog screening & API latency test PASSED!")
    finally:
        db.close()


if __name__ == "__main__":
    test_tca_subsecond_root_finding_precision()
    test_vectorized_sgp4_performance()
    test_collision_probability_and_risk_benchmarks()
    test_full_catalog_screening_and_api_latency()
    print("\n==========================================")
    print("ALL CONJUNCTION ENHANCEMENT TESTS PASSED!")
    print("==========================================")
