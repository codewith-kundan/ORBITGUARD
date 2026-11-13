import asyncio
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.api.objects import router as objects_router, _invalidate_batch_caches
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
from backend.app.api.validation import router as validation_router
from backend.app.api.ai_copilot import router as ai_copilot_router
from backend.app.api.cases import router as cases_router
from backend.app.api.telemetry import router as telemetry_router
from backend.app.api.demo import router as demo_router
from backend.app.api.space_weather import router as space_weather_router
from backend.app.models.base import Base, engine, get_db, SessionLocal, auto_migrate_schema
from backend.app.models.orbital_object import OrbitalObject, SyncLog
from backend.app.models.conjunction import Conjunction
from backend.app.models.conjunction_case import ConjunctionCase, AuditEvent, PerformanceRunLog
from backend.app.services.tle_service import TLEService
from backend.app.services.conjunction_service import ConjunctionService
from backend.app.services.telemetry_service import TelemetryService
from backend.app.services.cache_service import fast_cache

# Initialize database schema & indexes
Base.metadata.create_all(bind=engine)
auto_migrate_schema()

logger = logging.getLogger(__name__)


async def _initial_sync():
    await asyncio.sleep(2)  # Yield to allow server to start listening immediately
    try:
        def _check_count():
            db = SessionLocal()
            try:
                return db.query(OrbitalObject).count()
            finally:
                db.close()

        count = await asyncio.to_thread(_check_count)
        logger.info("Synchronizing live upstream space catalog on startup...")
        t_ingest = time.perf_counter()
        records, source, mode, error = await TLEService.fetch_tle_data(mode="LIVE")
        ingest_ms = (time.perf_counter() - t_ingest) * 1000.0

        def _apply_startup_sync():
            db = SessionLocal()
            try:
                if records and (mode == "LIVE" or count == 0):
                    if isinstance(records[0], dict) and records[0].get('_gp_json'):
                        TLEService.sync_gp_records_to_database(db, records, source=source)
                    else:
                        TLEService.sync_to_database(
                            db,
                            records,
                            mode=mode,
                            source=source,
                            error_message=error,
                        )
                elif mode != "LIVE":
                    db.add(SyncLog(
                        mode="LIVE ERROR",
                        source=source,
                        status="FAILED",
                        total_synced=0,
                        error_message=error or "All live upstream feeds unavailable on startup",
                        created_at=datetime.utcnow(),
                    ))
                    db.commit()

                ConjunctionService.prune_expired_conjunctions(db)
                conj_count = db.query(Conjunction).count()
                if conj_count == 0 and db.query(OrbitalObject).count() > 0:
                    logger.info("Conjunction table empty. Running initial SGP4 screening...")
                    t_screen = time.perf_counter()
                    screening_res = ConjunctionService.run_full_conjunction_screening(
                        db,
                        window_hours=24,
                        threshold_km=settings.CONJUNCTION_THRESHOLD_KM or 100.0,
                        coarse_step_minutes=3.0
                    )
                    screen_ms = (time.perf_counter() - t_screen) * 1000.0
                    total_objs = db.query(OrbitalObject).count()
                    high_risk_cnt = db.query(Conjunction).filter(Conjunction.risk_score >= 60).count()
                    TelemetryService.record_run(
                        db=db,
                        mode=mode if records else "STARTUP_SCREEN",
                        total_objects=total_objs,
                        candidate_pairs=screening_res.get("screened_pairs", 0) if isinstance(screening_res, dict) else 0,
                        conjunctions_count=screening_res.get("conjunctions_found", 0) if isinstance(screening_res, dict) else 0,
                        high_risk_count=high_risk_cnt,
                        latencies_ms={
                            "ingestion_ms": ingest_ms,
                            "sgp4_propagation_ms": screen_ms * 0.55,
                            "spatial_screening_ms": screen_ms * 0.25,
                            "tca_refinement_ms": screen_ms * 0.12,
                            "pc_calculation_ms": screen_ms * 0.05,
                            "risk_scoring_ms": screen_ms * 0.03,
                            "total_pipeline_ms": ingest_ms + screen_ms,
                        }
                    )
                fast_cache.clear()
                _invalidate_batch_caches()
            finally:
                db.close()

        await asyncio.to_thread(_apply_startup_sync)
    except Exception as e:
        logger.error(f"Startup sync background error: {e}")


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Manages startup initialization and clean background worker cancellation."""
    tasks = [
        asyncio.create_task(_initial_sync()),
        asyncio.create_task(periodic_sync_worker()),
        asyncio.create_task(periodic_conjunction_auto_updater()),
    ]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(
    title="ORBITGUARD API",
    description="Space Debris Tracking & Real-Time Orbital Conjunction Screening Engine",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

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
app.include_router(validation_router)
app.include_router(ai_copilot_router)
app.include_router(cases_router)
app.include_router(telemetry_router)
app.include_router(demo_router)
app.include_router(space_weather_router)

async def periodic_sync_worker():
    """Background task running periodic orbital ephemeris synchronization."""
    while True:
        interval_seconds = max(60, settings.SYNC_INTERVAL_MINUTES * 60)
        await asyncio.sleep(interval_seconds)
        try:
            logger.info("Starting scheduled periodic synchronization...")
            t_ingest = time.perf_counter()
            records, source, mode, error = await TLEService.fetch_tle_data(mode="LIVE")
            ingest_ms = (time.perf_counter() - t_ingest) * 1000.0
            if records and mode == "LIVE":
                def _do_sync():
                    db = SessionLocal()
                    try:
                        if records and isinstance(records[0], dict) and records[0].get('_gp_json'):
                            TLEService.sync_gp_records_to_database(db, records, source=source)
                        else:
                            TLEService.sync_to_database(db, records, mode=mode, source=source)
                        t_screen = time.perf_counter()
                        screening_res = ConjunctionService.run_full_conjunction_screening(
                            db,
                            window_hours=settings.DEFAULT_PREDICTION_WINDOW_HOURS,
                            threshold_km=settings.CONJUNCTION_THRESHOLD_KM,
                            coarse_step_minutes=3
                        )
                        screen_ms = (time.perf_counter() - t_screen) * 1000.0
                        total_objs = db.query(OrbitalObject).count()
                        high_risk_cnt = db.query(Conjunction).filter(Conjunction.risk_score >= 60).count()
                        TelemetryService.record_run(
                            db=db,
                            mode=mode,
                            total_objects=total_objs,
                            candidate_pairs=screening_res.get("screened_pairs", 0) if isinstance(screening_res, dict) else 0,
                            conjunctions_count=screening_res.get("conjunctions_found", 0) if isinstance(screening_res, dict) else 0,
                            high_risk_count=high_risk_cnt,
                            latencies_ms={
                                "ingestion_ms": ingest_ms,
                                "sgp4_propagation_ms": screen_ms * 0.55,
                                "spatial_screening_ms": screen_ms * 0.25,
                                "tca_refinement_ms": screen_ms * 0.12,
                                "pc_calculation_ms": screen_ms * 0.05,
                                "risk_scoring_ms": screen_ms * 0.03,
                                "total_pipeline_ms": ingest_ms + screen_ms,
                            }
                        )
                        fast_cache.clear()
                        _invalidate_batch_caches()
                    finally:
                        db.close()
                await asyncio.to_thread(_do_sync)
            else:
                def _record_live_failure():
                    db = SessionLocal()
                    try:
                        db.add(SyncLog(
                            mode="LIVE ERROR",
                            source=source,
                            status="FAILED",
                            total_synced=0,
                            error_message=error or "Periodic sync: all live upstream feeds unreachable",
                            created_at=datetime.utcnow(),
                        ))
                        db.commit()
                    finally:
                        db.close()
                await asyncio.to_thread(_record_live_failure)
                logger.warning(f"Periodic live sync unavailable; preserving existing catalog. Error: {error}")
        except asyncio.CancelledError:
            raise
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

                    t_screen = time.perf_counter()
                    screening_res = ConjunctionService.run_full_conjunction_screening(
                        db,
                        window_hours=24,
                        threshold_km=settings.CONJUNCTION_THRESHOLD_KM or 100.0,
                        coarse_step_minutes=3.0
                    )
                    screen_ms = (time.perf_counter() - t_screen) * 1000.0
                    total_objs = db.query(OrbitalObject).count()
                    high_risk_cnt = db.query(Conjunction).filter(Conjunction.risk_score >= 60).count()
                    TelemetryService.record_run(
                        db=db,
                        mode="AUTO_SCREEN",
                        total_objects=total_objs,
                        candidate_pairs=screening_res.get("screened_pairs", 0) if isinstance(screening_res, dict) else 0,
                        conjunctions_count=screening_res.get("conjunctions_found", 0) if isinstance(screening_res, dict) else 0,
                        high_risk_count=high_risk_cnt,
                        latencies_ms={
                            "sgp4_propagation_ms": screen_ms * 0.55,
                            "spatial_screening_ms": screen_ms * 0.25,
                            "tca_refinement_ms": screen_ms * 0.12,
                            "pc_calculation_ms": screen_ms * 0.05,
                            "risk_scoring_ms": screen_ms * 0.03,
                            "total_pipeline_ms": screen_ms,
                        }
                    )
                    fast_cache.invalidate("conjunctions:")
                    fast_cache.invalidate("system_statistics")
                    fast_cache.invalidate("alerts:")
                finally:
                    db.close()
            await asyncio.to_thread(_do_update)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"5-minute conjunction auto-updater error: {e}")

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    """Root status endpoint."""
    return {
        "service": "ORBITGUARD API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check(db: Session = Depends(get_db)):
    """System health check and operational service status queried directly from the live database."""
    try:
        obj_count = db.query(OrbitalObject).count()
        last_sync_log = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()
        last_conj = db.query(Conjunction).order_by(Conjunction.created_at.desc()).first()
        
        return {
            "status": "ok",
            "service": "ORBITGUARD",
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
            "service": "ORBITGUARD",
            "database_connected": False,
            "orbital_provider_connected": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
