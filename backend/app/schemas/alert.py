from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum
from backend.app.schemas.conjunction import ConjunctionResponse, RiskLevel

class AlertStatus(str, Enum):
    ACTIVE = "ACTIVE"
    MONITORING = "MONITORING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

class AlertBase(BaseModel):
    conjunction_id: int
    severity: RiskLevel
    title: Optional[str] = "Collision Risk Warning"
    status: AlertStatus = AlertStatus.ACTIVE
    message: str
    description: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    conjunction: Optional[ConjunctionResponse] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
