from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR_PATH = str(Path(__file__).resolve().parent.parent.parent)

class Settings(BaseSettings):
    BASE_DIR: str = BASE_DIR_PATH
    APP_NAME: str = "ORBITGUARD"
    APP_ENV: str = "production"
    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "*"

    DATABASE_URL: str = "sqlite:///./data/orbitguard.db"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    SPACE_TRACK_USERNAME: Optional[str] = None
    SPACE_TRACK_PASSWORD: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    ORBITAL_DATA_PROVIDER: str = "Space-Track"
    SYNC_INTERVAL_MINUTES: int = 60
    DEFAULT_PREDICTION_WINDOW_HOURS: int = 24
    PROPAGATION_STEP_MINUTES: int = 5
    CONJUNCTION_SCREENING_DISTANCE_KM: float = 50.0
    CONJUNCTION_THRESHOLD_KM: float = 500.0
    CRITICAL_THRESHOLD_KM: float = 5.0
    HIGH_THRESHOLD_KM: float = 15.0
    MEDIUM_THRESHOLD_KM: float = 30.0

    CELESTRAK_ACTIVE_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
    CELESTRAK_STATIONS_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    CELESTRAK_DEBRIS_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=1982-092&FORMAT=tle"
    LOCAL_TLE_FALLBACK: str = "./data/cache/celestrak_sample.tle"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
