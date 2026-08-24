from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.orbital_object import ObjectType
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus

router = APIRouter(prefix="/api/statistics", tags=["Statistics & Analytics"])

@router.get("")
def get_system_statistics(db: Session = Depends(get_db)):
    """Computes comprehensive situational awareness statistics."""
    total_objects = db.query(OrbitalObject).count()
    satellites_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.SATELLITE).count()
    debris_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.DEBRIS).count()
    rocket_bodies_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ROCKET_BODY).count()

    total_conjunctions = db.query(Conjunction).count()
    critical_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.CRITICAL).count()
    high_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.HIGH).count()
    medium_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.MEDIUM).count()
    low_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.LOW).count()

    active_alerts = db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).count()

    # Altitude distribution: LEO (<2000 km), MEO (2000-35786 km), GEO (>35786 km)
    objects = db.query(OrbitalObject.perigee_km, OrbitalObject.apogee_km).all()
    leo_count = 0
    meo_count = 0
    geo_count = 0

    for perigee, apogee in objects:
        avg_alt = ((perigee or 0) + (apogee or 0)) / 2.0
        if avg_alt <= 2000:
            leo_count += 1
        elif avg_alt <= 35000:
            meo_count += 1
        else:
            geo_count += 1

    # Check active data source mode
    sample_obj = db.query(OrbitalObject).first()
    data_source = sample_obj.source if sample_obj else "CelesTrak"
    status_mode = "LIVE" if "Live" in data_source or "CelesTrak" in data_source else "DEMO MODE"

    return {
        "tracked_objects": total_objects,
        "active_satellites": satellites_count,
        "space_debris": debris_count,
        "rocket_bodies": rocket_bodies_count,
        "total_conjunctions": total_conjunctions,
        "high_risk_events": critical_conjunctions + high_conjunctions,
        "active_alerts": active_alerts,
        "risk_breakdown": {
            "critical": critical_conjunctions,
            "high": high_conjunctions,
            "medium": medium_conjunctions,
            "low": low_conjunctions
        },
        "altitude_distribution": {
            "leo": leo_count,
            "meo": meo_count,
            "geo": geo_count
        },
        "data_source": data_source,
        "status_mode": status_mode
    }
