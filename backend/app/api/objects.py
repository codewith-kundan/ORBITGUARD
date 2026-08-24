from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from backend.app.models.base import get_db, Base, engine
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.orbital_object import OrbitalObjectResponse, ObjectType, TrajectoryResponse, OrbitalPosition
from backend.app.services.tle_service import TLEService
from backend.app.services.propagation_service import PropagationService

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api", tags=["Orbital Objects"])

@router.post("/data/refresh")
async def refresh_tle_data(
    mode: Optional[str] = Query("LIVE", description="Ingestion mode: 'LIVE' or 'DEMO'"),
    db: Session = Depends(get_db)
):
    """Fetches TLE data from CelesTrak (or local demo cache if offline/requested) and syncs to DB."""
    records, source_name, status_mode = await TLEService.fetch_tle_data(mode=mode)
    if not records:
        raise HTTPException(status_code=500, detail="Failed to fetch or parse TLE data from sources")

    sync_result = TLEService.sync_to_database(db, records)
    return {
        "status": "success",
        "data_source": source_name,
        "mode": status_mode,
        "inserted": sync_result["inserted"],
        "updated": sync_result["updated"],
        "total_objects": sync_result["total"],
    }

@router.get("/objects", response_model=List[OrbitalObjectResponse])
def list_orbital_objects(
    object_type: Optional[ObjectType] = None,
    search: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieves tracked orbital objects with filtering and pagination."""
    query = db.query(OrbitalObject)
    
    if object_type:
        query = query.filter(OrbitalObject.object_type == object_type)
    if search:
        query = query.filter(OrbitalObject.name.ilike(f"%{search}%") | (OrbitalObject.norad_id.cast(OrbitalObject.name.type).ilike(f"%{search}%")))
    
    return query.offset(offset).limit(limit).all()

@router.get("/objects/{id}", response_model=OrbitalObjectResponse)
def get_orbital_object(id: int, db: Session = Depends(get_db)):
    """Retrieves an orbital object by internal ID or NORAD ID."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID or NORAD {id} not found")
    return obj

@router.get("/objects/{id}/position", response_model=OrbitalPosition)
def get_object_current_position(id: int, db: Session = Depends(get_db)):
    """Computes real-time 3D and geodetic orbital position using SGP4 propagation."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID or NORAD {id} not found")

    now = datetime.now(timezone.utc)
    pos = PropagationService.propagate_satellite(obj.tle_line1, obj.tle_line2, now)
    if not pos:
        raise HTTPException(status_code=500, detail="Failed to propagate orbital position via SGP4")
    return pos

@router.get("/objects/{id}/trajectory", response_model=TrajectoryResponse)
def get_object_trajectory(
    id: int,
    hours: int = Query(24, ge=1, le=72),
    step_minutes: int = Query(5, ge=1, le=60),
    db: Session = Depends(get_db)
):
    """Computes projected future orbital trajectory over time."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID or NORAD {id} not found")

    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(hours=hours)

    points = PropagationService.get_trajectory(
        obj.tle_line1,
        obj.tle_line2,
        start_time=start_time,
        end_time=end_time,
        step_minutes=step_minutes
    )

    return TrajectoryResponse(
        norad_id=obj.norad_id,
        name=obj.name,
        object_type=obj.object_type,
        points=points,
        start_time=start_time,
        end_time=end_time,
        step_minutes=step_minutes
    )
