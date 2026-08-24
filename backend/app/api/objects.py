from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import math

from backend.app.models.base import get_db, Base, engine
from backend.app.models.orbital_object import OrbitalObject, TLERecord, SyncLog
from backend.app.schemas.orbital_object import (
    OrbitalObjectResponse,
    ObjectType,
    TrajectoryResponse,
    GroundTrackResponse,
    OrbitalPosition,
    PositionsBatchResponse,
    PaginatedObjectsResponse,
    DataStatusResponse
)
from backend.app.services.tle_service import TLEService
from backend.app.services.propagation_service import PropagationService
from backend.app.utils.time_utils import to_utc

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api", tags=["Orbital Objects & Data Ingestion"])

@router.post("/data/sync")
@router.post("/data/refresh")
async def sync_orbital_data(
    mode: Optional[str] = Query("LIVE", description="Synchronization mode: 'LIVE' or 'DEMO'"),
    db: Session = Depends(get_db)
):
    """
    Synchronizes the orbital catalog from the configured provider (CelesTrak) or Demo Cache.
    Reports real errors if live data is unreachable. Never silently fakes data.
    """
    records, source_name, status_mode, error_msg = await TLEService.fetch_tle_data(mode=mode)
    
    if status_mode == "LIVE ERROR":
        # Log failure
        log = SyncLog(
            mode="LIVE",
            source=source_name,
            status="FAILED",
            total_synced=0,
            error_message=error_msg or "Failed to connect to CelesTrak",
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        return {
            "status": "error",
            "data_source": source_name,
            "mode": "LIVE ERROR",
            "error_detail": error_msg or "CelesTrak endpoints unreachable. You may retry or explicitly choose DEMO MODE.",
            "total_objects": db.query(OrbitalObject).count()
        }

    sync_result = TLEService.sync_to_database(db, records, mode=status_mode, source=source_name)
    return {
        "status": "success",
        "data_source": source_name,
        "mode": status_mode,
        "inserted": sync_result["inserted"],
        "updated": sync_result["updated"],
        "total_objects": db.query(OrbitalObject).count(),
    }

@router.get("/data/status", response_model=DataStatusResponse)
def get_data_status(db: Session = Depends(get_db)):
    """Retrieves dynamic live data synchronization and catalog statistics."""
    return TLEService.get_data_status(db)

@router.get("/objects/positions", response_model=PositionsBatchResponse)
def get_batch_positions(
    timestamp: Optional[datetime] = None,
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db)
):
    """
    High-performance real-time batch propagation endpoint for the 3D globe and 2D map.
    Returns 3D ECI/TEME (x, y, z) and geodetic (lat, lon, alt) coordinates.
    """
    target_time = to_utc(timestamp) if timestamp else datetime.now(timezone.utc)
    objects = db.query(OrbitalObject).limit(limit).all()

    positions: List[OrbitalPosition] = []
    for obj in objects:
        pos = PropagationService.propagate_satellite(
            line1=obj.tle_line1,
            line2=obj.tle_line2,
            target_time=target_time,
            norad_id=obj.norad_id,
            name=obj.name,
            object_type=obj.object_type,
            internal_id=obj.id
        )
        if pos:
            positions.append(pos)

    return PositionsBatchResponse(
        timestamp=target_time,
        total_objects=len(positions),
        positions=positions
    )

@router.get("/objects", response_model=PaginatedObjectsResponse)
def list_orbital_objects(
    object_type: Optional[ObjectType] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: Optional[str] = Query("norad_id"),
    order: Optional[str] = Query("asc"),
    db: Session = Depends(get_db)
):
    """Retrieves paginated, searchable, and sortable orbital objects catalog."""
    query = db.query(OrbitalObject)
    
    if object_type:
        query = query.filter(OrbitalObject.object_type == object_type)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            OrbitalObject.name.ilike(search_pattern) | 
            OrbitalObject.norad_id.cast(OrbitalObject.name.type).ilike(search_pattern)
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Sorting
    sort_column = getattr(OrbitalObject, sort_by, OrbitalObject.norad_id)
    if order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return PaginatedObjectsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/objects/{id}", response_model=OrbitalObjectResponse)
@router.get("/objects/{id}/details", response_model=OrbitalObjectResponse)
def get_orbital_object_details(id: int, db: Session = Depends(get_db)):
    """Retrieves full telemetry, orbital parameters, and Keplerian elements by ID or NORAD."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID/NORAD {id} not found")
    return obj

@router.get("/objects/{id}/position", response_model=OrbitalPosition)
def get_object_current_position(
    id: int,
    timestamp: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Computes real-time 3D and geodetic orbital position using SGP4 analytical propagation."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID/NORAD {id} not found")

    target_time = to_utc(timestamp) if timestamp else datetime.now(timezone.utc)
    pos = PropagationService.propagate_satellite(
        line1=obj.tle_line1,
        line2=obj.tle_line2,
        target_time=target_time,
        norad_id=obj.norad_id,
        name=obj.name,
        object_type=obj.object_type,
        internal_id=obj.id
    )
    if not pos:
        raise HTTPException(status_code=500, detail="Failed to propagate orbital position via SGP4")
    return pos

@router.get("/objects/{id}/trajectory", response_model=TrajectoryResponse)
def get_object_trajectory(
    id: int,
    hours: float = Query(24.0, ge=0.25, le=72.0),
    step_minutes: int = Query(5, ge=1, le=60),
    timestamp: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Computes real SGP4 future orbital trajectory points over a selectable time window."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID/NORAD {id} not found")

    start_time = to_utc(timestamp) if timestamp else datetime.now(timezone.utc)
    end_time = start_time + timedelta(hours=hours)

    points = PropagationService.get_trajectory(
        obj.tle_line1,
        obj.tle_line2,
        start_time=start_time,
        end_time=end_time,
        step_minutes=step_minutes
    )

    return TrajectoryResponse(
        id=obj.id,
        norad_id=obj.norad_id,
        name=obj.name,
        object_type=obj.object_type,
        start_time=start_time,
        end_time=end_time,
        step_minutes=step_minutes,
        points=points
    )

@router.get("/objects/{id}/ground-track", response_model=GroundTrackResponse)
def get_object_ground_track(
    id: int,
    duration_minutes: int = Query(180, ge=30, le=1440),
    step_minutes: int = Query(2, ge=1, le=15),
    timestamp: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Computes projected sub-satellite ground track path over Earth's surface."""
    obj = db.query(OrbitalObject).filter(
        (OrbitalObject.id == id) | (OrbitalObject.norad_id == id)
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object with ID/NORAD {id} not found")

    start_time = to_utc(timestamp) if timestamp else datetime.now(timezone.utc)
    track = PropagationService.get_ground_track(
        obj.tle_line1,
        obj.tle_line2,
        start_time=start_time,
        duration_minutes=duration_minutes,
        step_minutes=step_minutes
    )

    return GroundTrackResponse(
        id=obj.id,
        norad_id=obj.norad_id,
        name=obj.name,
        points=track
    )
