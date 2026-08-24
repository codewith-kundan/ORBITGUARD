from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum
from backend.app.schemas.orbital_object import OrbitalObjectResponse, ObjectType

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ConjunctionBase(BaseModel):
    object_a_id: int
    object_b_id: int
    tca: datetime = Field(..., description="Time of Closest Approach (UTC)")
    miss_distance_km: float = Field(..., description="Minimum 3D separation at TCA in km")
    relative_velocity_km_s: float = Field(..., description="Relative velocity at TCA in km/s")
    altitude_km: Optional[float] = Field(None, description="Average orbital altitude at TCA in km")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Screening Conjunction Risk Score (0-100)")
    risk_level: RiskLevel

class ConjunctionCreate(ConjunctionBase):
    pass

class ConjunctionResponse(ConjunctionBase):
    id: int
    object_a: Optional[OrbitalObjectResponse] = None
    object_b: Optional[OrbitalObjectResponse] = None
    factors: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConjunctionSummary(BaseModel):
    total_screened: int
    conjunctions_detected: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    closest_miss_km: Optional[float] = None
    earliest_tca: Optional[datetime] = None
