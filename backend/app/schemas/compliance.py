from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, List
from datetime import datetime

class CDMPreviewResponse(BaseModel):
    conjunction_id: int
    message_id: str
    creation_date: datetime
    originator: str
    tca: datetime
    miss_distance_m: float
    relative_speed_m_s: float
    collision_probability: float
    object1_name: str
    object1_norad_id: int
    object2_name: str
    object2_norad_id: int
    kvn_content: str
    xml_content: str

class WebhookDispatchRequest(BaseModel):
    conjunction_id: int
    webhook_url: str = Field(..., description="Target destination URL for webhook dispatch")
    secret_token: Optional[str] = Field(None, description="Optional bearer token or HMAC secret")
    include_cdm_attachment: bool = Field(True, description="Whether to include full CCSDS CDM KVN text in payload")
    custom_notes: Optional[str] = None

class WebhookDispatchResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    dispatched_at: datetime
    destination_url: str
    message: str
    latency_ms: float
