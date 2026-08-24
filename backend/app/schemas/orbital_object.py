from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ObjectType(str, Enum):
    SATELLITE = "satellite"
    DEBRIS = "debris"
    ROCKET_BODY = "rocket_body"
    UNKNOWN = "unknown"

class OrbitalObjectBase(BaseModel):
    name: str
    norad_id: int
    object_type: ObjectType
    tle_line1: str
    tle_line2: str
    tle_epoch: Optional[datetime] = None
    source: str = "CelesTrak"

class OrbitalObjectCreate(OrbitalObjectBase):
    pass

class OrbitalObjectResponse(OrbitalObjectBase):
    id: int
    inclination_deg: Optional[float] = None
    eccentricity: Optional[float] = None
    period_min: Optional[float] = None
    semi_major_axis_km: Optional[float] = None
    perigee_km: Optional[float] = None
    apogee_km: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrbitalPosition(BaseModel):
    timestamp: datetime
    lat: float = Field(..., description="Geodetic latitude in degrees [-90, 90]")
    lon: float = Field(..., description="Geodetic longitude in degrees [-180, 180]")
    alt_km: float = Field(..., description="Altitude above WGS84 ellipsoid in km")
    x_km: float = Field(..., description="TEME/ECI X position in km")
    y_km: float = Field(..., description="TEME/ECI Y position in km")
    z_km: float = Field(..., description="TEME/ECI Z position in km")
    vx_km_s: float = Field(..., description="TEME/ECI X velocity in km/s")
    vy_km_s: float = Field(..., description="TEME/ECI Y velocity in km/s")
    vz_km_s: float = Field(..., description="TEME/ECI Z velocity in km/s")
    velocity_km_s: float = Field(..., description="Orbital speed magnitude in km/s")

class TrajectoryResponse(BaseModel):
    norad_id: int
    name: str
    object_type: ObjectType
    points: List[OrbitalPosition]
    start_time: datetime
    end_time: datetime
    step_minutes: int
