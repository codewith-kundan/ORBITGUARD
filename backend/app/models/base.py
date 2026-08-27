from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine, text
from backend.app.config import settings
import os
import logging

logger = logging.getLogger(__name__)

os.makedirs("./data", exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate_schema():
    """Dynamically adds missing columns to existing SQLite / Postgres tables without data loss."""
    try:
        with engine.connect() as conn:
            # Check orbital_objects table for new Space-Track GP columns
            columns_to_ensure = [
                ("international_designator", "VARCHAR(20)"),
                ("country_code", "VARCHAR(10)"),
                ("launch_site", "VARCHAR(20)"),
                ("decay_date", "VARCHAR(20)"),
                ("rcs_size", "VARCHAR(10)"),
                ("bstar", "FLOAT"),
                ("raan_deg", "FLOAT"),
                ("arg_pericenter_deg", "FLOAT"),
                ("mean_anomaly_deg", "FLOAT"),
                ("gp_id", "INTEGER")
            ]
            
            for col_name, col_type in columns_to_ensure:
                try:
                    conn.execute(text(f"ALTER TABLE orbital_objects ADD COLUMN {col_name} {col_type};"))
                    conn.commit()
                    logger.info(f"Auto-migrated column {col_name} into orbital_objects table.")
                except Exception:
                    # Column already exists
                    pass
    except Exception as e:
        logger.debug(f"Schema auto-migration notice: {e}")
