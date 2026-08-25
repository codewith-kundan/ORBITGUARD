from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class CAMStrategy(BaseModel):
    strategy_type: str = Field(..., description="PROGRADE, RETROGRADE, CROSS_TRACK, RADIAL, MINIMUM_FUEL")
    title: str
    description: str
    burn_time: datetime
    lead_time_hours: float
    delta_v_vector: Dict[str, float] = Field(..., description="delta_v_r, delta_v_t, delta_v_w in m/s")
    total_delta_v_m_s: float
    initial_miss_distance_km: float
    projected_miss_distance_km: float
    miss_distance_gain_km: float
    fuel_cost_kg: float
    propellant_fraction_percent: float
    isp_seconds: float
    new_perigee_km: float
    new_apogee_km: float
    new_period_minutes: float
    new_inclination_deg: float
    secondary_conjunctions_count: int
    secondary_conjunctions_safe: bool
    risk_reduction_percent: float

class CAMPlanResponse(BaseModel):
    conjunction_id: int
    primary_object_name: str
    primary_norad_id: int
    secondary_object_name: str
    secondary_norad_id: int
    tca: datetime
    initial_miss_distance_km: float
    initial_risk_score: float
    initial_risk_level: str
    strategies: List[CAMStrategy]
    trajectory_comparison: Optional[Dict[str, Any]] = None

class CAMSimulateRequest(BaseModel):
    conjunction_id: int
    delta_v_radial_m_s: float = 0.0
    delta_v_in_track_m_s: float = 1.0
    delta_v_cross_track_m_s: float = 0.0
    lead_time_hours: float = 12.0
    spacecraft_mass_kg: float = 500.0
    isp_seconds: float = 220.0

class CAMSimulateResponse(BaseModel):
    conjunction_id: int
    burn_time: datetime
    total_delta_v_m_s: float
    projected_miss_distance_km: float
    miss_distance_gain_km: float
    fuel_cost_kg: float
    new_perigee_km: float
    new_apogee_km: float
    new_period_minutes: float
    secondary_conjunctions_count: int
    secondary_conjunctions_safe: bool
    post_burn_trajectory: Optional[List[Dict[str, float]]] = None
