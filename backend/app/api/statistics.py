from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject, SyncLog
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert
from backend.app.schemas.orbital_object import ObjectType
from backend.app.schemas.conjunction import RiskLevel
from backend.app.schemas.alert import AlertStatus
from backend.app.services.cache_service import fast_cache

router = APIRouter(prefix="/api/statistics", tags=["Statistics & Analytics"])

@router.get("")
def get_system_statistics(db: Session = Depends(get_db)):
    """Computes comprehensive situational awareness statistics directly from live database with in-memory caching."""
    cached_stats = fast_cache.get("system_statistics")
    if cached_stats is not None:
        return cached_stats

    total_objects = db.query(OrbitalObject).count()
    satellites_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ACTIVE_SATELLITE).count()
    debris_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.DEBRIS).count()
    rocket_bodies_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ROCKET_BODY).count()
    unknown_count = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.UNKNOWN).count()

    total_conjunctions = db.query(Conjunction).count()
    critical_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.CRITICAL).count()
    high_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.HIGH).count()
    medium_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.MEDIUM).count()
    low_conjunctions = db.query(Conjunction).filter(Conjunction.risk_level == RiskLevel.LOW).count()

    active_alerts = db.query(Alert).filter(
        Alert.status == AlertStatus.ACTIVE,
        Alert.severity.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
    ).count()

    # Altitude distribution: LEO (<=2000 km), MEO (2000-35000 km), GEO (>35000 km)
    leo_count = db.query(OrbitalObject).filter(OrbitalObject.apogee_km <= 2000).count()
    meo_count = db.query(OrbitalObject).filter(OrbitalObject.apogee_km > 2000, OrbitalObject.apogee_km <= 35000).count()
    geo_count = db.query(OrbitalObject).filter(OrbitalObject.apogee_km > 35000).count()

    # Fetch last synchronization information
    latest_sync = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()
    data_source = latest_sync.source if latest_sync else "Space-Track (18th SDS)"
    status_mode = latest_sync.mode if latest_sync else "LIVE"
    last_sync_time = latest_sync.created_at if latest_sync else None

    data_age_min = None
    if last_sync_time:
        data_age_min = round((datetime.utcnow() - last_sync_time).total_seconds() / 60.0, 1)

    # Detailed Fleet & Constellation Counts from DB
    starlink_count = db.query(OrbitalObject).filter(OrbitalObject.name.ilike('%STARLINK%')).count()
    oneweb_count = db.query(OrbitalObject).filter(OrbitalObject.name.ilike('%ONEWEB%')).count()
    gps_count = db.query(OrbitalObject).filter(
        OrbitalObject.name.ilike('%GPS%') | 
        OrbitalObject.name.ilike('%NAVSTAR%') | 
        OrbitalObject.name.ilike('%GLONASS%') | 
        OrbitalObject.name.ilike('%GALILEO%') | 
        OrbitalObject.name.ilike('%BEIDOU%') |
        OrbitalObject.name.ilike('%QZSS%') |
        OrbitalObject.name.ilike('%IRNSS%') |
        OrbitalObject.name.ilike('%NAVIC%')
    ).count()
    iss_count = db.query(OrbitalObject).filter(
        OrbitalObject.name.ilike('%ISS%') | 
        OrbitalObject.name.ilike('%ZARYA%') | 
        OrbitalObject.name.ilike('%TIANGONG%') | 
        OrbitalObject.name.ilike('%CSS%') |
        OrbitalObject.norad_id.in_([25544, 48274])
    ).count()

    result = {
        "tracked_objects": total_objects,
        "active_satellites": satellites_count,
        "space_debris": debris_count,
        "rocket_bodies": rocket_bodies_count,
        "unknown": unknown_count,
        "total_conjunctions": total_conjunctions,
        "high_risk_events": critical_conjunctions + high_conjunctions,
        "active_alerts": active_alerts,
        "fleet_breakdown": {
            "all": total_objects,
            "operational": satellites_count,
            "starlink": starlink_count,
            "oneweb": oneweb_count,
            "gps": gps_count,
            "debris": debris_count,
            "rocket": rocket_bodies_count,
            "iss": iss_count,
            "leo": leo_count,
            "meo": meo_count,
            "geo": geo_count
        },
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
        "status_mode": status_mode,
        "last_sync": last_sync_time,
        "data_age_minutes": data_age_min
    }
    
    fast_cache.set("system_statistics", result, ttl_seconds=20.0)
    return result

