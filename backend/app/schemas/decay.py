from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DecayProfilePoint(BaseModel):
    days_from_epoch: float
    timestamp: datetime
    perigee_altitude_km: float
    apogee_altitude_km: float
    semi_major_axis_km: float
    eccentricity: float
    atmospheric_density_kg_m3: float
    decay_rate_km_per_day: float

class ReentryPrediction(BaseModel):
    norad_id: int
    object_name: str
    object_type: str
    country_code: Optional[str] = None
    current_perigee_km: float
    current_apogee_km: float
    current_altitude_km: float
    bstar: float
    estimated_lifetime_days: float
    predicted_reentry_time: datetime
    uncertainty_window_hours: float
    is_decay_imminent: bool  # Lifetime < 30 days
    risk_level: str  # CRITICAL, HIGH, MODERATE, LOW
    reentry_latitude_band: str  # e.g. "51.6°S to 51.6°N"
    estimated_dry_mass_kg: float
    estimated_surviving_mass_kg: float
    casualty_risk_score: str
    decay_profile: List[DecayProfilePoint]

class DecayWatchlistItem(BaseModel):
    norad_id: int
    object_name: str
    object_type: str
    country_code: Optional[str] = None
    perigee_km: float
    apogee_km: float
    bstar: float
    estimated_lifetime_days: float
    predicted_reentry_time: datetime
    risk_level: str

class DecayAssessmentRequest(BaseModel):
    norad_id: Optional[int] = None
    dry_mass_kg: Optional[float] = Field(1000.0, ge=1.0)
    drag_area_m2: Optional[float] = Field(2.5, ge=0.01)
    drag_coefficient_cd: Optional[float] = Field(2.2, ge=1.0, le=4.0)
    solar_flux_f107: Optional[float] = Field(150.0, ge=60.0, le=300.0, description="Solar radio flux F10.7 in SFU")
    geomagnetic_ap: Optional[float] = Field(15.0, ge=0.0, le=400.0, description="Geomagnetic activity Ap index")
