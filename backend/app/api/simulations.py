from fastapi import APIRouter, Query
from typing import Optional
from backend.app.services.simulation_service import SimulationService

router = APIRouter(prefix="/api/simulations", tags=["Space Simulations"])

@router.get("/what-if")
def simulate_what_if_breakup(
    target_name: str = Query("SAT-1023", description="Target space object name"),
    norad_id: int = Query(44713, description="NORAD Catalog ID"),
    altitude_km: float = Query(550.0, ge=150.0, le=36000.0, description="Breakup altitude in km"),
    mass_kg: float = Query(800.0, ge=1.0, le=50000.0, description="Spacecraft dry mass in kg"),
    fragment_count: int = Query(150, ge=10, le=500, description="Fragments to model (>10cm)"),
    scenario: str = Query("EXPLOSION", description="Breakup scenario: EXPLOSION, COLLISION, SOLAR_MAX")
):
    """Simulates What-If fragmentation, Gabbard dispersion, and multi-year atmospheric decay."""
    return SimulationService.simulate_what_if_fragmentation(
        target_name=target_name,
        norad_id=norad_id,
        altitude_km=altitude_km,
        mass_kg=mass_kg,
        fragment_count=fragment_count,
        scenario_type=scenario
    )

@router.get("/kessler")
def simulate_kessler_cascade(
    initial_objects: int = Query(19578, ge=5000, le=100000, description="Initial tracked catalog population"),
    annual_launches: int = Query(1500, ge=100, le=10000, description="Annual new satellites launched"),
    collision_rate: float = Query(1.0, ge=0.1, le=5.0, description="Collision probability multiplier"),
    fragments_per_collision: int = Query(400, ge=50, le=2000, description="Average fragments generated per collision"),
    years: int = Query(30, ge=5, le=100, description="Simulation duration in years"),
    pmd_compliance: float = Query(85.0, ge=0.0, le=100.0, description="Post-mission disposal compliance %")
):
    """Simulates long-term Kessler Syndrome cascade dynamics, runaway tipping points, and population growth."""
    return SimulationService.simulate_kessler_syndrome(
        initial_objects=initial_objects,
        annual_launches=annual_launches,
        collision_rate_multiplier=collision_rate,
        fragments_per_collision=fragments_per_collision,
        simulation_years=years,
        mitigation_compliance_pct=pmd_compliance
    )

@router.get("/adr")
def simulate_active_debris_removal(
    method: str = Query("ROBOTIC_CAPTURE", description="Mitigation method: ROBOTIC_CAPTURE, DRAG_SAIL, LASER_ABLATION"),
    annual_removals: int = Query(15, ge=1, le=100, description="Derelict bodies removed per year"),
    target_altitude: float = Query(800.0, ge=300.0, le=2000.0, description="Target altitude regime in km"),
    years: int = Query(20, ge=5, le=50, description="Forecast timeline in years")
):
    """Simulates risk reduction and collision avoidance impact of Active Debris Removal (ADR) programs."""
    return SimulationService.simulate_debris_removal(
        removal_method=method,
        annual_removal_count=annual_removals,
        target_altitude_km=target_altitude,
        forecast_years=years
    )
