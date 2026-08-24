from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.api.objects import router as objects_router
from backend.app.api.conjunctions import router as conjunctions_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.statistics import router as statistics_router
from backend.app.models.base import Base, engine, get_db
from backend.app.models.orbital_object import OrbitalObject, SyncLog
from backend.app.models.conjunction import Conjunction

# Ensure all database tables and indexes are initialized
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ORBITGUARD API",
    description="Space Situational Awareness & Satellite Collision Risk Prediction Engine",
    version="1.0.0",
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

app.include_router(objects_router)
app.include_router(conjunctions_router)
app.include_router(alerts_router)
app.include_router(statistics_router)

@app.on_event("startup")
async def startup_event():
    """Ensure database has live space catalog data and active conjunction screening on startup."""
    import asyncio
    from backend.app.models.base import SessionLocal
    from backend.app.models.orbital_object import OrbitalObject
    from backend.app.models.conjunction import Conjunction
    from backend.app.services.tle_service import TLEService
    from backend.app.services.conjunction_service import ConjunctionService

    def check_and_sync():
        db = SessionLocal()
        try:
            count = db.query(OrbitalObject).count()
            if count == 0:
                print("Initial database is empty. Triggering automated space catalog sync...")
                TLEService.sync_to_database(db, mode="LIVE")
            
            conj_count = db.query(Conjunction).count()
            if conj_count == 0:
                print("Running initial automated conjunction screening...")
                ConjunctionService.run_full_conjunction_screening(db)
        except Exception as e:
            print(f"Startup sync check: {e}")
        finally:
            db.close()

    asyncio.get_event_loop().run_in_executor(None, check_and_sync)

@app.get("/")
async def root():
    """Root status endpoint."""
    return {
        "service": "ORBITGUARD API",
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
