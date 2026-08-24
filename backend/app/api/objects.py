from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.models.base import get_db, Base, engine
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.orbital_object import OrbitalObjectResponse, ObjectType
from backend.app.services.tle_service import TLEService

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api", tags=["Orbital Objects"])

@router.post("/data/refresh")
async def refresh_tle_data(db: Session = Depends(get_db)):
    """Fetches TLE data from CelesTrak (or local demo cache if offline) and syncs to DB."""
    records, source_name, status_mode = await TLEService.fetch_tle_data()
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
