from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class GabbardPoint(BaseModel):
    fragment_id: int
    characteristic_length_m: float
    mass_kg: float
    area_to_mass_m2_kg: float
    delta_v_m_s: float
    period_minutes: float
    perigee_altitude_km: float
    apogee_altitude_km: float
    semi_major_axis_km: float
    eccentricity: float
    inclination_deg: float
    is_decayed: bool = False

class BreakupFragment(BaseModel):
    id: int
    name: str
    characteristic_length_m: float
    mass_kg: float
    area_to_mass_m2_kg: float
    delta_v_m_s: float
    orbital_elements: Dict[str, float]
    initial_state_vector: Dict[str, float]
    position_at_epoch: Dict[str, float]

class BreakupSimulateRequest(BaseModel):
    event_type: str = Field("CATASTROPHIC_COLLISION", description="CATASTROPHIC_COLLISION, EXPLOSION, or ASAT_INTERCEPT")
    target_name: Optional[str] = "Target Satellite"
    target_mass_kg: float = Field(1000.0, ge=1.0, description="Mass of target object in kg")
    impactor_name: Optional[str] = "Debris Impactor"
    impactor_mass_kg: float = Field(10.0, ge=0.0, description="Mass of projectile/impactor in kg")
    relative_velocity_km_s: float = Field(10.5, ge=0.0, description="Collision velocity magnitude in km/s")
    altitude_km: float = Field(780.0, ge=150.0, le=40000.0, description="Breakup altitude in km")
    inclination_deg: float = Field(74.0, ge=0.0, le=180.0, description="Initial orbit inclination in deg")
    min_fragment_size_m: float = Field(0.05, ge=0.01, le=1.0, description="Minimum fragment characteristic length in meters (default 5 cm / trackable)")
    max_fragments_to_generate: int = Field(250, ge=20, le=2000, description="Cap on simulated fragment sample size")

class BreakupResponse(BaseModel):
    event_id: str
    event_type: str
    event_timestamp: str
    collision_energy_joules: float
    specific_energy_j_per_kg: float
    is_catastrophic: bool
    total_mass_kg: float
    total_predicted_fragments_gt_min_size: int
    sample_fragments_count: int
    parent_orbit: Dict[str, float]
    gabbard_points: List[GabbardPoint]
    fragments: List[BreakupFragment]
    cloud_dispersion_stats: Dict[str, Any]
