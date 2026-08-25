from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class GroundStation(BaseModel):
    id: str
    name: str
    country: str
    latitude_deg: float
    longitude_deg: float
    altitude_m: float = 0.0
    min_elevation_deg: float = 10.0

class SkyPoint(BaseModel):
    timestamp: datetime
    azimuth_deg: float
    elevation_deg: float
    range_km: float
    range_rate_km_s: float
    is_sunlit: bool

class OverpassEvent(BaseModel):
    norad_id: int
    object_name: str
    station_id: str
    station_name: str
    aos_time: datetime
    peak_time: datetime
    los_time: datetime
    duration_seconds: float
    max_elevation_deg: float
    aos_azimuth_deg: float
    peak_azimuth_deg: float
    los_azimuth_deg: float
    min_range_km: float
    visibility_type: str = Field(..., description="OPTICAL_VISIBLE, SUNLIT_DAYLIGHT, ECLIPSED_NIGHT")
    visibility_label: str
    sky_trajectory: List[SkyPoint]

class OverpassRequest(BaseModel):
    norad_id: int
    station_latitude: float
    station_longitude: float
    station_altitude_m: float = 0.0
    station_name: Optional[str] = "Custom Station"
    min_elevation_deg: float = 10.0
    prediction_hours: float = 48.0

class OverpassResponse(BaseModel):
    norad_id: int
    object_name: str
    station_name: str
    station_latitude: float
    station_longitude: float
    total_passes_found: int
    passes: List[OverpassEvent]

class GroundTrackRibbonPoint(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    altitude_km: float
    footprint_radius_km: float
    is_sunlit: bool

class GroundTrackResponse(BaseModel):
    norad_id: int
    object_name: str
    period_minutes: float
    current_position: GroundTrackRibbonPoint
    past_track: List[GroundTrackRibbonPoint]
    future_track: List[GroundTrackRibbonPoint]
    footprint_radius_km: float
    sub_solar_point: Dict[str, float]
