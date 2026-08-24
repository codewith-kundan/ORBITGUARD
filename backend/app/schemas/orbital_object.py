from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ObjectType(str, Enum):
    ACTIVE_SATELLITE = "ACTIVE_SATELLITE"
    DEBRIS = "DEBRIS"
    ROCKET_BODY = "ROCKET_BODY"
    UNKNOWN = "UNKNOWN"

class OrbitalObjectBase(BaseModel):
    norad_id: int
    name: str
    object_type: ObjectType = ObjectType.UNKNOWN
    source: str = "CelesTrak"
    source_group: Optional[str] = None
    country: Optional[str] = None
    launch_date: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    tle_line1: str
    tle_line2: str
    tle_epoch: Optional[datetime] = None
    inclination: Optional[float] = None
    eccentricity: Optional[float] = None
    mean_motion: Optional[float] = None
    period_minutes: Optional[float] = None
    semi_major_axis_km: Optional[float] = None
    perigee_km: Optional[float] = None
    apogee_km: Optional[float] = None

class OrbitalObjectCreate(OrbitalObjectBase):
    pass

class OrbitalObjectResponse(OrbitalObjectBase):
    id: int
    last_propagated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TLERecordResponse(BaseModel):
    id: int
    orbital_object_id: int
    line1: str
    line2: str
    epoch: Optional[datetime] = None
    source: str
    fetched_at: datetime
    is_current: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrbitalPosition(BaseModel):
    timestamp: datetime
    id: Optional[int] = None
    norad_id: int
    name: str
    type: ObjectType
    x_km: float = Field(..., description="TEME/ECI X position in km")
    y_km: float = Field(..., description="TEME/ECI Y position in km")
    z_km: float = Field(..., description="TEME/ECI Z position in km")
    vx_km_s: float = Field(..., description="TEME/ECI X velocity in km/s")
    vy_km_s: float = Field(..., description="TEME/ECI Y velocity in km/s")
    vz_km_s: float = Field(..., description="TEME/ECI Z velocity in km/s")
    velocity_km_s: float = Field(..., description="Orbital speed magnitude in km/s")
    lat: float = Field(..., description="Geodetic latitude in degrees [-90, 90]")
    lon: float = Field(..., description="Geodetic longitude in degrees [-180, 180]")
    alt_km: float = Field(..., description="Altitude above WGS84 ellipsoid in km")

class PositionsBatchResponse(BaseModel):
    timestamp: datetime
    total_objects: int
    positions: List[OrbitalPosition]

class TrajectoryPoint(BaseModel):
    timestamp: datetime
    lat: float
    lon: float
    alt_km: float
    x_km: float
    y_km: float
    z_km: float
    velocity_km_s: float

class TrajectoryResponse(BaseModel):
    id: int
    norad_id: int
    name: str
    object_type: ObjectType
    start_time: datetime
    end_time: datetime
    step_minutes: int
    points: List[TrajectoryPoint]

class GroundTrackPoint(BaseModel):
    timestamp: datetime
    lat: float
    lon: float
    alt_km: float

class GroundTrackResponse(BaseModel):
    id: int
    norad_id: int
    name: str
    points: List[GroundTrackPoint]

class PaginatedObjectsResponse(BaseModel):
    items: List[OrbitalObjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class DataStatusResponse(BaseModel):
    mode: str = Field(..., description="'LIVE', 'DEMO', or 'LIVE ERROR'")
    source: str
    database_connected: bool
    last_sync: Optional[datetime] = None
    total_objects: int
    satellites: int
    debris: int
    rocket_bodies: int
    unknown: int
    data_age_minutes: Optional[float] = None
    sync_error: Optional[str] = None
    is_syncing: bool = False
