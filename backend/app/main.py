import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.api.objects import router as objects_router
from backend.app.api.conjunctions import router as conjunctions_router
from backend.app.api.statistics import router as statistics_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.cam import router as cam_router
from backend.app.api.overpass import router as overpass_router
from backend.app.api.breakup import router as breakup_router
from backend.app.api.decay import router as decay_router
from backend.app.api.compliance import router as compliance_router
from backend.app.api.launches import router as launches_router
from backend.app.api.spotter import router as spotter_router
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
app.include_router(overpass_router)
app.include_router(breakup_router)
app.include_router(decay_router)
app.include_router(compliance_router)
app.include_router(launches_router)
app.include_router(spotter_router)

async def periodic_sync_worker():
    """Background task running periodic orbital ephemeris synchronization."""
    while True:
        interval_seconds = max(60, settings.SYNC_INTERVAL_MINUTES * 60)
        await asyncio.sleep(interval_seconds)
        try:
            logger.info("Starting scheduled periodic synchronization...")
            records, source, mode, error = await TLEService.fetch_tle_data(mode="LIVE")
            if records:
                def _do_sync():
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
                await asyncio.to_thread(_do_sync)
            else:
                logger.warning(f"Periodic sync: no data received. Error: {error}")
        except Exception as e:
            logger.error(f"Periodic sync worker error: {e}")


async def periodic_conjunction_auto_updater():
    """
    Background worker running every 5 minutes:
    1. Automatically prunes all expired conjunction events whose TCA has passed.
    2. Runs fresh rolling SGP4 conjunction screening into the future (next 24 hours).
    3. Auto-syncs live collision risk alerts.
    """
    while True:
        await asyncio.sleep(300)  # 5 minutes
        try:
            def _do_update():
                db = SessionLocal()
                try:
                    pruned = ConjunctionService.prune_expired_conjunctions(db)
                    if pruned > 0:
                        logger.info(f"Auto-pruned {pruned} passed conjunctions past TCA")

                    ConjunctionService.run_full_conjunction_screening(
                        db,
                        window_hours=24,
                        threshold_km=settings.CONJUNCTION_THRESHOLD_KM or 100.0,
                        coarse_step_minutes=3.0
                    )
                finally:
                    db.close()
            await asyncio.to_thread(_do_update)
        except Exception as e:
            logger.error(f"5-minute conjunction auto-updater error: {e}")


@app.on_event("startup")
async def startup_event():
    """Ensure database has live space catalog data on startup without blocking HTTP requests."""
    async def initial_sync():
        await asyncio.sleep(2)  # Yield to allow server to start listening immediately
        try:
            def _check_and_init():
                db = SessionLocal()
                try:
                    count = db.query(OrbitalObject).count()
                    return count
                finally:
                    db.close()

            count = await asyncio.to_thread(_check_and_init)
            if count == 0:
                logger.info("Database empty. Fetching space catalog in background...")
                records, source, mode, error = await TLEService.fetch_tle_data(mode="LIVE")
                if records:
                    def _insert_records():
                        db = SessionLocal()
                        try:
                            if isinstance(records[0], dict) and records[0].get('_gp_json'):
                                TLEService.sync_gp_records_to_database(db, records, source=source)
                            else:
                                TLEService.sync_to_database(db, records, mode=mode, source=source)
                            ConjunctionService.prune_expired_conjunctions(db)
                            ConjunctionService.run_full_conjunction_screening(
                                db,
                                window_hours=24,
                                threshold_km=settings.CONJUNCTION_THRESHOLD_KM or 100.0,
                                coarse_step_minutes=3.0
                            )
                        finally:
                            db.close()
                    await asyncio.to_thread(_insert_records)
                else:
                    logger.warning(f"Initial sync failed: {error}")
            else:
                def _quick_prune_and_screen():
                    db = SessionLocal()
                    try:
                        ConjunctionService.prune_expired_conjunctions(db)
                        conj_count = db.query(Conjunction).count()
                        if conj_count == 0:
                            logger.info("Conjunction table empty. Running initial SGP4 screening...")
                            ConjunctionService.run_full_conjunction_screening(
                                db,
                                window_hours=24,
                                threshold_km=settings.CONJUNCTION_THRESHOLD_KM or 100.0,
                                coarse_step_minutes=3.0
                            )
                    finally:
                        db.close()
                await asyncio.to_thread(_quick_prune_and_screen)
        except Exception as e:
            logger.error(f"Startup sync background error: {e}")

    asyncio.create_task(initial_sync())
    asyncio.create_task(periodic_sync_worker())
    asyncio.create_task(periodic_conjunction_auto_updater())

@app.get("/")
async def root():
    """Root status endpoint."""
    return {
        "service": "SPACE SENTINEL API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/health")
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
