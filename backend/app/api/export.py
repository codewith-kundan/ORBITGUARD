import io
import csv
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from backend.app.models.base import get_db
from backend.app.models.orbital_object import OrbitalObject
from backend.app.models.conjunction import Conjunction
from backend.app.models.alert import Alert

router = APIRouter(prefix="/api/export", tags=["Data Export"])

@router.get("/objects")
def export_objects(
    format: str = Query("json", description="Export format: 'json' or 'csv'"),
    object_type: Optional[str] = None,
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """Exports orbital catalog records in JSON or CSV format."""
    query = db.query(OrbitalObject)
    if object_type:
        query = query.filter(OrbitalObject.object_type == object_type)
    objects = query.limit(limit).all()

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "NORAD_ID", "NAME", "TYPE", "INCLINATION_DEG", "PERIGEE_KM", "APOGEE_KM", "PERIOD_MIN", "MEAN_MOTION", "TLE_LINE1", "TLE_LINE2"])
        for o in objects:
            writer.writerow([o.id, o.norad_id, o.name, o.object_type, o.inclination, o.perigee_km, o.apogee_km, o.period_minutes, o.mean_motion, o.tle_line1, o.tle_line2])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=space_sentinel_objects_{datetime.now().strftime('%Y%m%d')}.csv"}
        )

    # JSON export
    data = [{
        "id": o.id,
        "norad_id": o.norad_id,
        "name": o.name,
        "type": o.object_type,
        "inclination_deg": o.inclination,
        "perigee_km": o.perigee_km,
        "apogee_km": o.apogee_km,
        "period_minutes": o.period_minutes,
        "mean_motion": o.mean_motion,
        "tle_line1": o.tle_line1,
        "tle_line2": o.tle_line2
    } for o in objects]
    
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=space_sentinel_objects_{datetime.now().strftime('%Y%m%d')}.json"}
    )

@router.get("/conjunctions")
def export_conjunctions(
    format: str = Query("json", description="Export format: 'json' or 'csv'"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Exports detected orbital conjunction assessment events in JSON or CSV format."""
    conjunctions = db.query(Conjunction).order_by(Conjunction.risk_score.desc()).limit(limit).all()

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "OBJECT_A", "OBJECT_B", "TCA_UTC", "MISS_DISTANCE_KM", "REL_VELOCITY_KM_S", "ALTITUDE_KM", "RISK_SCORE", "RISK_LEVEL", "STATUS"])
        for c in conjunctions:
            writer.writerow([
                c.id,
                c.object_a.name if c.object_a else c.object_a_id,
                c.object_b.name if c.object_b else c.object_b_id,
                c.tca.isoformat() if c.tca else "",
                c.miss_distance_km,
                c.relative_velocity_km_s,
                c.altitude_km,
                c.risk_score,
                c.risk_level,
                c.status
            ])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=space_sentinel_conjunctions_{datetime.now().strftime('%Y%m%d')}.csv"}
        )

    # JSON export
    data = [{
        "id": c.id,
        "object_a": {
            "id": c.object_a.id,
            "norad_id": c.object_a.norad_id,
            "name": c.object_a.name,
            "type": c.object_a.object_type
        } if c.object_a else None,
        "object_b": {
            "id": c.object_b.id,
            "norad_id": c.object_b.norad_id,
            "name": c.object_b.name,
            "type": c.object_b.object_type
        } if c.object_b else None,
        "tca_utc": c.tca.isoformat() if c.tca else None,
        "miss_distance_km": c.miss_distance_km,
        "relative_velocity_km_s": c.relative_velocity_km_s,
        "altitude_km": c.altitude_km,
        "latitude_deg": c.latitude_deg,
        "longitude_deg": c.longitude_deg,
        "risk_score": c.risk_score,
        "risk_level": c.risk_level,
        "status": c.status
    } for c in conjunctions]

    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=space_sentinel_conjunctions_{datetime.now().strftime('%Y%m%d')}.json"}
    )
