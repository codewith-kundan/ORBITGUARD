from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.api.objects import router as objects_router
from backend.app.api.conjunctions import router as conjunctions_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.statistics import router as statistics_router
from backend.app.models.base import Base, engine

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
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(objects_router)
app.include_router(conjunctions_router)
app.include_router(alerts_router)
app.include_router(statistics_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ORBITGUARD"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
