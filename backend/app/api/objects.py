from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import math

from backend.app.models.base import get_db, Base, engine
from backend.app.models.orbital_object import OrbitalObject, TLERecord, SyncLog, SyncHistory
from backend.app.models.conjunction import Conjunction
from backend.app.schemas.orbital_object import (
    OrbitalObjectResponse,
    ObjectType,
    TrajectoryResponse,
    GroundTrackResponse,
    OrbitalPosition,
    PositionsBatchResponse,
    PaginatedObjectsResponse,
    DataStatusResponse,
    DensityResponse,
    DensityBin
)
from backend.app.schemas.conjunction import ConjunctionResponse
from backend.app.services.tle_service import TLEService
from backend.app.services.propagation_service import PropagationService
from backend.app.utils.time_utils import to_utc

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api", tags=["Orbital Objects & Telemetry"])

def _find_object(db: Session, obj_id: int) -> Optional[OrbitalObject]:
    """Finds object by NORAD ID first, then by internal DB ID."""
    obj = db.query(OrbitalObject).filter(OrbitalObject.norad_id == obj_id).first()
    if not obj:
        obj = db.query(OrbitalObject).filter(OrbitalObject.id == obj_id).first()
    return obj

@router.post("/data/sync")
@router.post("/data/refresh")
async def sync_orbital_data(
    mode: Optional[str] = Query("LIVE", description="Synchronization mode: 'LIVE' or 'DEMO'"),
    db: Session = Depends(get_db)
):
    """
    Synchronizes the orbital catalog from live Space-Track / SatNOGS / CelesTrak feeds.
    Never silently fakes live data.
    """
    records, source_name, status_mode, error_msg = await TLEService.fetch_tle_data(mode=mode)
    
    if status_mode == "LIVE ERROR":
        log = SyncLog(
            mode="LIVE",
            source=source_name,
            status="FAILED",
            total_synced=0,
            error_message=error_msg or "Failed to connect to live providers",
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        return {
            "status": "error",
            "data_source": source_name,
            "mode": "LIVE ERROR",
            "error_detail": error_msg or "Live endpoints unreachable. You may retry or choose DEMO MODE.",
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

@router.post("/data/upload-tle")
async def upload_custom_tle_file(
    content: str = Query(..., description="Raw TLE text string or multi-line payload"),
    source_name: str = Query("Custom Upload", description="Source provider label"),
    db: Session = Depends(get_db)
):
    """
    Upload and parse custom TLE datasets directly into the database catalog.
    Supports arbitrarily large batches from Space-Track, ISRO, NASA, or research datasets.
    """
    records = TLEService.parse_tle_text(content, source_group="custom_upload")
    if not records:
        raise HTTPException(status_code=400, detail="No valid TLE pairs found in payload")

    sync_result = TLEService.sync_to_database(db, records, mode="LIVE", source=source_name)
    return {
        "status": "success",
        "data_source": source_name,
        "mode": "LIVE",
        "inserted": sync_result["inserted"],
        "updated": sync_result["updated"],
        "total_objects": db.query(OrbitalObject).count(),
    }

@router.get("/data/status", response_model=DataStatusResponse)
def get_data_status(db: Session = Depends(get_db)):
    """Retrieves live data synchronization, mode, catalog counts, and data freshness."""
    return TLEService.get_data_status(db)

@router.get("/objects/positions", response_model=PositionsBatchResponse)
def get_batch_positions(
    timestamp: Optional[datetime] = None,
    limit: int = Query(600, ge=1, le=3000),
    db: Session = Depends(get_db)
):
    """
    High-performance real-time batch propagation endpoint for the 3D space environment and 2D map.
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
    obj = _find_object(db, id)
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
    obj = _find_object(db, id)
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
    obj = _find_object(db, id)
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
    obj = _find_object(db, id)
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

@router.get("/density", response_model=DensityResponse)
def get_orbital_density(db: Session = Depends(get_db)):
    """Computes real spatial object density distribution across orbital altitude shells."""
    objects = db.query(OrbitalObject.object_type, OrbitalObject.perigee_km, OrbitalObject.apogee_km).all()
    
    bins_def = [
        ("200-400 km (VLEO/LEO)", 200.0, 400.0),
        ("400-600 km (ISS/Starlink)", 400.0, 600.0),
        ("600-800 km (Sun-Sync LEO)", 600.0, 800.0),
        ("800-1200 km (High LEO)", 800.0, 1200.0),
        ("1200-2000 km (Upper LEO)", 1200.0, 2000.0),
        ("2000-20000 km (MEO / Navigation)", 2000.0, 20000.0),
        ("20000-35786 km (GEO Transfer)", 20000.0, 35786.0),
        (">35786 km (Geostationary / Deep Space)", 35786.0, 100000.0)
    ]

    density_bins = []
    for label, min_alt, max_alt in bins_def:
        b_count = 0
        b_sat = 0
        b_deb = 0
        b_rb = 0
        for obj_type, p, a in objects:
            avg = ((p or 0) + (a or 0)) / 2.0
            if min_alt <= avg < max_alt:
                b_count += 1
                if obj_type == ObjectType.ACTIVE_SATELLITE:
                    b_sat += 1
                elif obj_type == ObjectType.DEBRIS:
                    b_deb += 1
                elif obj_type == ObjectType.ROCKET_BODY:
                    b_rb += 1

        density_bins.append(DensityBin(
            altitude_range_km=label,
            min_alt_km=min_alt,
            max_alt_km=max_alt,
            count=b_count,
            satellites=b_sat,
            debris=b_deb,
            rocket_bodies=b_rb
        ))

    return DensityResponse(
        total_catalog_objects=len(objects),
        bins=density_bins
    )

@router.get("/events", response_model=List[ConjunctionResponse])
def get_conjunction_event_timeline(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves chronologically ordered upcoming conjunction events."""
    return db.query(Conjunction).order_by(asc(Conjunction.tca)).limit(limit).all()
