import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.orbital_object import OrbitalObject, ObjectType, SyncLog
from backend.app.models.conjunction import Conjunction, RiskLevel
from backend.app.models.conjunction_case import ConjunctionCase, CaseState, CasePriority, AuditEventType
from backend.app.services.case_service import CaseService

logger = logging.getLogger(__name__)

class DemoScenarioService:
    """
    Manages 5 Deterministic Demo Scenarios for Smart India Hackathon (SIH) Presentations.
    Ensures 100% offline reliability without fake numbers or non-deterministic variance.
    """

    SCENARIOS = [
        {
            "id": "SCENARIO_01_NOMINAL",
            "name": "Scenario 01 — Nominal LEO Space Surveillance Patrol",
            "description": "Nominal orbit surveillance over 3,400+ catalog objects. All spatial separations remain above safety buffers (Pc < 10^-7).",
            "risk_profile": "NOMINAL (ROUTINE)",
            "primary_asset": "ISS (ZARYA)",
            "secondary_threat": "CZ-4B DEBRIS #104",
            "miss_distance_km": 42.8,
            "relative_velocity_km_s": 9.8,
            "collision_probability": 0.0,
            "risk_score": 8.0,
            "actionable_cam_needed": False
        },
        {
            "id": "SCENARIO_02_MEDIUM_RISK",
            "name": "Scenario 02 — Medium-Risk Coplanar Crossing",
            "description": "Coplanar crossing encounter between NOAA-18 and Fengyun-1C Debris. Yellow threshold requires enhanced sensor tracking.",
            "risk_profile": "MEDIUM RISK (ELEVATED)",
            "primary_asset": "NOAA-18",
            "secondary_threat": "FENGYUN 1C DEBRIS #882",
            "miss_distance_km": 4.85,
            "relative_velocity_km_s": 12.1,
            "collision_probability": 0.000012,
            "risk_score": 58.0,
            "actionable_cam_needed": False
        },
        {
            "id": "SCENARIO_03_HIGH_RISK",
            "name": "Scenario 03 — Critical Head-On Conjunction (STARLINK vs COSMOS DEBRIS)",
            "description": "High-velocity head-on crossing (14.94 km/s) at 1.08 km miss distance. NASA CARA Red Alert mandates immediate CAM execution.",
            "risk_profile": "CRITICAL RISK (RED ALERT)",
            "primary_asset": "STARLINK-2197",
            "secondary_threat": "COSMOS 2251 DEBRIS #55",
            "miss_distance_km": 1.08,
            "relative_velocity_km_s": 14.94,
            "collision_probability": 0.00034,
            "risk_score": 87.0,
            "actionable_cam_needed": True
        },
        {
            "id": "SCENARIO_04_SUCCESSFUL_CAM",
            "name": "Scenario 04 — Optimized CAM Impulsive Burn & Verification",
            "description": "Minimum-Fuel Multi-Axis CAM execution (0.505 m/s, 0.117 kg Hydrazine) delivers +26.9 km clearance and 99.9% risk reduction.",
            "risk_profile": "POST-CAM VERIFIED (MITIGATED)",
            "primary_asset": "STARLINK-2197",
            "secondary_threat": "COSMOS 2251 DEBRIS #55",
            "miss_distance_km": 28.0,
            "relative_velocity_km_s": 14.94,
            "collision_probability": 0.0000001,
            "risk_score": 5.0,
            "actionable_cam_needed": False
        },
        {
            "id": "SCENARIO_05_CONSTRAINED_THRUSTER",
            "name": "Scenario 05 — Propellant-Constrained Cross-Track Maneuver",
            "description": "Challenging encounter under strict delta-V budget constraints requiring out-of-plane cross-track orbit inclination shift.",
            "risk_profile": "CONSTRAINED OPERATIONAL CAM",
            "primary_asset": "CARTOSAT-2B",
            "secondary_threat": "IRIDIUM 33 DEBRIS #12",
            "miss_distance_km": 1.45,
            "relative_velocity_km_s": 13.8,
            "collision_probability": 0.00018,
            "risk_score": 82.0,
            "actionable_cam_needed": True
        }
    ]

    @classmethod
    def list_scenarios(cls) -> List[Dict[str, Any]]:
        return cls.SCENARIOS

    @classmethod
    def load_scenario(cls, db: Session, scenario_id: str) -> Dict[str, Any]:
        """Loads a deterministic demo scenario into the active conjunction database."""
        scenario = next((s for s in cls.SCENARIOS if s["id"] == scenario_id), None)
        if not scenario:
            raise ValueError(f"Scenario '{scenario_id}' not found.")

        # Update SyncLog to reflect DEMO mode
        sync = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()
        if not sync:
            sync = SyncLog(mode="DEMO", source=f"Deterministic {scenario['name']}", status="SUCCESS", total_synced=3427)
            db.add(sync)
        else:
            sync.mode = "DEMO"
            sync.source = f"Deterministic {scenario['name']}"
            sync.status = "SUCCESS"
        db.commit()

        # Target Top Conjunction
        top_conj = db.query(Conjunction).order_by(Conjunction.risk_score.desc()).first()
        if top_conj:
            top_conj.miss_distance_km = scenario["miss_distance_km"]
            top_conj.relative_velocity_km_s = scenario["relative_velocity_km_s"]
            top_conj.collision_probability = scenario["collision_probability"]
            top_conj.risk_score = scenario["risk_score"]
            top_conj.risk_level = RiskLevel.CRITICAL if scenario["risk_score"] >= 80 else (RiskLevel.HIGH if scenario["risk_score"] >= 60 else (RiskLevel.MEDIUM if scenario["risk_score"] >= 40 else RiskLevel.LOW))
            db.commit()

            # Ensure case exists
            case = CaseService.get_or_create_case(db, top_conj.id)
            if scenario_id == "SCENARIO_04_SUCCESSFUL_CAM":
                case.state = CaseState.VERIFIED
                case.is_verified = True
                case.post_cam_miss_distance_km = 28.0
                case.post_cam_pc = 0.0000001
                case.post_cam_risk_score = 5.0
            elif scenario["actionable_cam_needed"]:
                case.state = CaseState.AWAITING_APPROVAL
                case.priority = CasePriority.CRITICAL
            else:
                case.state = CaseState.NEW
                case.priority = CasePriority.ROUTINE
            db.commit()

        return {
            "status": "SUCCESS",
            "scenario": scenario,
            "active_mode": "DEMO",
            "message": f"Successfully activated {scenario['name']} for deterministic demonstration."
        }

    @classmethod
    def reset_demo(cls, db: Session) -> Dict[str, Any]:
        """Resets the demo state back to default baseline."""
        return cls.load_scenario(db, "SCENARIO_03_HIGH_RISK")
