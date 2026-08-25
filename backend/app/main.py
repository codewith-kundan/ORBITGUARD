import asyncio
import logging
from datetime import datetime
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.api.objects import router as objects_router
from backend.app.api.conjunctions import router as conjunctions_router
from backend.app.api.statistics import router as statistics_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.cam import router as cam_router
from backend.app.models.base import Base, engine, get_db, SessionLocal
from backend.app.models.orbital_object import OrbitalObject, SyncLog
from backend.app.models.conjunction import Conjunction
from backend.app.services.tle_service import TLEService
from backend.app.services.conjunction_service import ConjunctionService

# Initialize database schema & indexes
Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SPACE SENTINEL API",
    description="Space Debris Tracking & Real-Time Orbital Conjunction Screening Engine",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Core Endpoints
app.include_router(objects_router)
app.include_router(conjunctions_router)
app.include_router(statistics_router)
app.include_router(alerts_router)
app.include_router(cam_router)

async def periodic_sync_worker():
    """Background task running periodic orbital ephemeris synchronization."""
    while True:
        interval_seconds = max(60, settings.SYNC_INTERVAL_MINUTES * 60)
        await asyncio.sleep(interval_seconds)
        try:
            logger.info("Starting scheduled periodic synchronization...")
            records, source, mode, error = await TLEService.fetch_tle_data(mode="LIVE")
            if records:
                db = SessionLocal()
                try:
                    if records and isinstance(records[0], dict) and records[0].get('_gp_json'):
                        TLEService.sync_gp_records_to_database(db, records, source=source)
                    else:
                        TLEService.sync_to_database(db, records, mode=mode, source=source)
                    ConjunctionService.run_full_conjunction_screening(
                        db,
                        window_hours=settings.DEFAULT_PREDICTION_WINDOW_HOURS,
                        threshold_km=settings.CONJUNCTION_THRESHOLD_KM,
                        coarse_step_minutes=3
                    )
                finally:
                    db.close()
            else:
                logger.warning(f"Periodic sync: no data received. Error: {error}")
        except Exception as e:
            logger.error(f"Periodic sync worker error: {e}")


@app.on_event("startup")
async def startup_event():
    """Ensure database has live space catalog data on startup."""
    async def initial_sync():
        db = SessionLocal()
        try:
            count = db.query(OrbitalObject).count()
            if count == 0:
                logger.info("Database empty. Fetching space catalog...")
                records, source, mode, error = await TLEService.fetch_tle_data(mode="LIVE")
                if records:
                    if isinstance(records[0], dict) and records[0].get('_gp_json'):
                        TLEService.sync_gp_records_to_database(db, records, source=source)
                    else:
                        TLEService.sync_to_database(db, records, mode=mode, source=source)
                else:
                    logger.warning(f"Initial sync failed: {error}")

            conj_count = db.query(Conjunction).count()
            if conj_count == 0:
                logger.info("Running initial conjunction screening...")
                ConjunctionService.run_full_conjunction_screening(
                    db,
                    window_hours=settings.DEFAULT_PREDICTION_WINDOW_HOURS,
                    threshold_km=settings.CONJUNCTION_THRESHOLD_KM,
                    coarse_step_minutes=3
                )
        except Exception as e:
            logger.error(f"Startup sync error: {e}")
        finally:
            db.close()

    asyncio.create_task(initial_sync())
    asyncio.create_task(periodic_sync_worker())

@app.get("/")
async def root():
    """Root status endpoint."""
    return {
        "service": "SPACE SENTINEL API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """System health check and operational service status."""
    try:
        obj_count = db.query(OrbitalObject).count()
        last_sync_log = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()
        last_conj = db.query(Conjunction).order_by(Conjunction.created_at.desc()).first()
        
        return {
            "status": "ok",
            "service": "SPACE SENTINEL",
            "database_connected": True,
            "orbital_provider_connected": True,
            "last_sync": last_sync_log.created_at.isoformat() if last_sync_log else None,
            "object_count": obj_count,
            "last_conjunction_scan": last_conj.created_at.isoformat() if last_conj else None,
            "propagation_status": "ONLINE (SGP4/WGS84)"
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "SPACE SENTINEL",
            "database_connected": False,
            "orbital_provider_connected": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
