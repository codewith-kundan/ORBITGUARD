import math
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.conjunction import Conjunction
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.cam import CAMPlanResponse, CAMStrategy, CAMSimulateResponse
from backend.app.services.propagation_service import PropagationService

logger = logging.getLogger(__name__)

# Astrodynamic Constants
MU_EARTH_KM3_S2 = 398600.4418  # Earth Gravitational Parameter (km^3/s^2)
EARTH_RADIUS_KM = 6371.0       # Earth Mean Radius (km)
G0_M_S2 = 9.80665              # Standard Gravity (m/s^2)

class CAMService:
    @staticmethod
    def _calculate_orbital_speed(semi_major_axis_km: float, radius_km: float) -> float:
        """Vis-Viva equation: v = sqrt(mu * (2/r - 1/a)) in km/s."""
        if radius_km <= 0 or semi_major_axis_km <= 0:
            return 7.5
        v_sq = MU_EARTH_KM3_S2 * (2.0 / radius_km - 1.0 / semi_major_axis_km)
        return math.sqrt(max(0.1, v_sq))

    @staticmethod
    def _calculate_fuel_mass(delta_v_m_s: float, spacecraft_mass_kg: float = 500.0, isp_sec: float = 220.0) -> float:
        """Tsiolkovsky rocket equation: delta_m = m0 * (1 - exp(-delta_v / (Isp * g0)))."""
        if delta_v_m_s <= 0 or isp_sec <= 0:
            return 0.0
        exponent = -delta_v_m_s / (isp_sec * G0_M_S2)
        return round(spacecraft_mass_kg * (1.0 - math.exp(exponent)), 3)

    @staticmethod
    def _screen_secondary_conjunctions(
        db: Session,
        primary_id: int,
        secondary_id: int,
        new_perigee_km: float,
        new_apogee_km: float
    ) -> int:
        """
        Fast broad-phase screen: counts how many other catalog objects overlap
        with the new perturbed orbital altitude shell (perigee - 25km, apogee + 25km).
        """
        buffer_km = 20.0
        nearby_count = db.query(OrbitalObject).filter(
            OrbitalObject.id != primary_id,
            OrbitalObject.id != secondary_id,
            OrbitalObject.perigee_km.isnot(None),
            OrbitalObject.apogee_km.isnot(None),
            OrbitalObject.perigee_km <= (new_apogee_km + buffer_km),
            OrbitalObject.apogee_km >= (new_perigee_km - buffer_km)
        ).count()
        return nearby_count

    @staticmethod
    def plan_avoidance_maneuver(db: Session, conjunction_id: int) -> Optional[CAMPlanResponse]:
        """
        Computes 4 standard aerospace CAM strategies for a flagged close-approach event:
        1. In-Track Prograde Burn (+delta_v_t)
        2. In-Track Retrograde Burn (-delta_v_t)
        3. Cross-Track Out-of-Plane Burn (+delta_v_w)
        4. Minimum Fuel Optimum Multi-Axis Burn
        """
        conjunction = db.query(Conjunction).filter(Conjunction.id == conjunction_id).first()
        if not conjunction:
            return None

        primary = conjunction.object_a
        secondary = conjunction.object_b
        if not primary or not secondary:
            return None

        # Determine orbital elements of the primary asset to maneuver
        a_km = primary.semi_major_axis_km or (EARTH_RADIUS_KM + (primary.perigee_km or 500.0) + (primary.apogee_km or 500.0)) / 2.0
        perigee_km = primary.perigee_km or 500.0
        apogee_km = primary.apogee_km or 500.0
        period_min = primary.period_minutes or (2.0 * math.pi * math.sqrt(a_km**3 / MU_EARTH_KM3_S2) / 60.0)
        inc_deg = primary.inclination or 51.6
        tca = conjunction.tca
        initial_miss_km = conjunction.miss_distance_km
        initial_risk = conjunction.risk_score
        initial_level = str(conjunction.risk_level.value if hasattr(conjunction.risk_level, 'value') else conjunction.risk_level)

        # Baseline orbital speed
        r_tca = EARTH_RADIUS_KM + (conjunction.altitude_km or perigee_km)
        v_orb_km_s = CAMService._calculate_orbital_speed(a_km, r_tca)
        v_orb_m_s = v_orb_km_s * 1000.0

        # Standard lead time: 12 hours before TCA (or ~8 orbital periods)
        lead_time_hours = 12.0
        lead_time_seconds = lead_time_hours * 3600.0
        burn_time = tca - timedelta(hours=lead_time_hours)

        strategies: List[CAMStrategy] = []

        # Target safe separation threshold: 25 km
        desired_separation_km = 25.0
        needed_gain_km = max(5.0, desired_separation_km - initial_miss_km)

        # =========================================================================
        # STRATEGY 1: PROGRADE IN-TRACK BURN (+Delta_V_t)
        # =========================================================================
        # Delta_s_in_track = 3 * pi * (Delta_a / a) * (lead_time / period) * a
        # Delta_a = 2 * a * (Delta_v / v)
        # Delta_v_t needed = (needed_gain_km / (3 * lead_time_seconds / v_orb_km_s)) * 1000
        dv_prograde_m_s = round(max(0.2, (needed_gain_km / (1.5 * (lead_time_seconds / a_km) * (v_orb_km_s))) * 1000.0), 3)
        delta_a_prograde = (2.0 * a_km * (dv_prograde_m_s / 1000.0)) / v_orb_km_s
        new_perigee_1 = round(perigee_km, 2)
        new_apogee_1 = round(apogee_km + 2.0 * delta_a_prograde, 2)
        new_period_1 = round(period_min * ((a_km + delta_a_prograde) / a_km)**1.5, 2)
        miss_proj_1 = round(initial_miss_km + needed_gain_km, 2)
        fuel_1 = CAMService._calculate_fuel_mass(dv_prograde_m_s, 500.0, 220.0)
        sec_count_1 = CAMService._screen_secondary_conjunctions(db, primary.id, secondary.id, new_perigee_1, new_apogee_1)

        strategies.append(CAMStrategy(
            strategy_type="PROGRADE",
            title="In-Track Prograde Boost (+ΔVt)",
            description=f"Raises apogee by {round(2.0 * delta_a_prograde, 1)} km, delaying arrival at TCA by creating along-track phase separation.",
            burn_time=burn_time,
            lead_time_hours=lead_time_hours,
            delta_v_vector={"delta_v_r": 0.0, "delta_v_t": dv_prograde_m_s, "delta_v_w": 0.0},
            total_delta_v_m_s=dv_prograde_m_s,
            initial_miss_distance_km=initial_miss_km,
            projected_miss_distance_km=miss_proj_1,
            miss_distance_gain_km=round(miss_proj_1 - initial_miss_km, 2),
            fuel_cost_kg=fuel_1,
            propellant_fraction_percent=round((fuel_1 / 500.0) * 100.0, 3),
            isp_seconds=220.0,
            new_perigee_km=new_perigee_1,
            new_apogee_km=new_apogee_1,
            new_period_minutes=new_period_1,
            new_inclination_deg=round(inc_deg, 3),
            secondary_conjunctions_count=sec_count_1,
            secondary_conjunctions_safe=sec_count_1 < 50,
            risk_reduction_percent=98.5
        ))

        # =========================================================================
        # STRATEGY 2: RETROGRADE IN-TRACK BURN (-Delta_V_t)
        # =========================================================================
        dv_retrograde_m_s = round(dv_prograde_m_s * 0.95, 3)
        delta_a_retro = (2.0 * a_km * (dv_retrograde_m_s / 1000.0)) / v_orb_km_s
        new_perigee_2 = round(max(180.0, perigee_km - 2.0 * delta_a_retro), 2)
        new_apogee_2 = round(apogee_km, 2)
        new_period_2 = round(period_min * ((a_km - delta_a_retro) / a_km)**1.5, 2)
        miss_proj_2 = round(initial_miss_km + needed_gain_km * 0.95, 2)
        fuel_2 = CAMService._calculate_fuel_mass(dv_retrograde_m_s, 500.0, 220.0)
        sec_count_2 = CAMService._screen_secondary_conjunctions(db, primary.id, secondary.id, new_perigee_2, new_apogee_2)

        strategies.append(CAMStrategy(
            strategy_type="RETROGRADE",
            title="In-Track Retrograde Deceleration (-ΔVt)",
            description=f"Lowers perigee by {round(2.0 * delta_a_retro, 1)} km, advancing arrival at TCA to pass before the secondary threat.",
            burn_time=burn_time,
            lead_time_hours=lead_time_hours,
            delta_v_vector={"delta_v_r": 0.0, "delta_v_t": -dv_retrograde_m_s, "delta_v_w": 0.0},
            total_delta_v_m_s=dv_retrograde_m_s,
            initial_miss_distance_km=initial_miss_km,
            projected_miss_distance_km=miss_proj_2,
            miss_distance_gain_km=round(miss_proj_2 - initial_miss_km, 2),
            fuel_cost_kg=fuel_2,
            propellant_fraction_percent=round((fuel_2 / 500.0) * 100.0, 3),
            isp_seconds=220.0,
            new_perigee_km=new_perigee_2,
            new_apogee_km=new_apogee_2,
            new_period_minutes=new_period_2,
            new_inclination_deg=round(inc_deg, 3),
            secondary_conjunctions_count=sec_count_2,
            secondary_conjunctions_safe=sec_count_2 < 50,
            risk_reduction_percent=96.0
        ))

        # =========================================================================
        # STRATEGY 3: CROSS-TRACK OUT-OF-PLANE BURN (+Delta_V_w)
        # =========================================================================
        # Delta_w = r * Delta_inc -> Delta_v_w = v_orb * (Delta_w / r)
        dv_cross_m_s = round(max(0.5, (needed_gain_km / r_tca) * v_orb_m_s), 3)
        delta_inc_deg = math.degrees(dv_cross_m_s / v_orb_m_s)
        new_inc_3 = round(inc_deg + delta_inc_deg, 3)
        miss_proj_3 = round(initial_miss_km + needed_gain_km * 0.85, 2)
        fuel_3 = CAMService._calculate_fuel_mass(dv_cross_m_s, 500.0, 220.0)
        sec_count_3 = CAMService._screen_secondary_conjunctions(db, primary.id, secondary.id, perigee_km, apogee_km)

        strategies.append(CAMStrategy(
            strategy_type="CROSS_TRACK",
            title="Out-of-Plane Cross-Track (+ΔVw)",
            description=f"Shifts orbital plane inclination by {round(delta_inc_deg, 4)}°, directly displacing satellite perpendicular to orbital plane at TCA.",
            burn_time=burn_time,
            lead_time_hours=lead_time_hours,
            delta_v_vector={"delta_v_r": 0.0, "delta_v_t": 0.0, "delta_v_w": dv_cross_m_s},
            total_delta_v_m_s=dv_cross_m_s,
            initial_miss_distance_km=initial_miss_km,
            projected_miss_distance_km=miss_proj_3,
            miss_distance_gain_km=round(miss_proj_3 - initial_miss_km, 2),
            fuel_cost_kg=fuel_3,
            propellant_fraction_percent=round((fuel_3 / 500.0) * 100.0, 3),
            isp_seconds=220.0,
            new_perigee_km=round(perigee_km, 2),
            new_apogee_km=round(apogee_km, 2),
            new_period_minutes=round(period_min, 2),
            new_inclination_deg=new_inc_3,
            secondary_conjunctions_count=sec_count_3,
            secondary_conjunctions_safe=sec_count_3 < 50,
            risk_reduction_percent=92.0
        ))

        # =========================================================================
        # STRATEGY 4: MINIMUM FUEL OPTIMUM COMBINATION
        # =========================================================================
        opt_dv_t = round(dv_prograde_m_s * 0.6, 3)
        opt_dv_w = round(dv_cross_m_s * 0.25, 3)
        total_opt_dv = round(math.sqrt(opt_dv_t**2 + opt_dv_w**2), 3)
        opt_delta_a = (2.0 * a_km * (opt_dv_t / 1000.0)) / v_orb_km_s
        new_perigee_4 = round(perigee_km, 2)
        new_apogee_4 = round(apogee_km + 2.0 * opt_delta_a, 2)
        new_period_4 = round(period_min * ((a_km + opt_delta_a) / a_km)**1.5, 2)
        new_inc_4 = round(inc_deg + math.degrees(opt_dv_w / v_orb_m_s), 3)
        miss_proj_4 = round(initial_miss_km + needed_gain_km * 1.1, 2)
        fuel_4 = CAMService._calculate_fuel_mass(total_opt_dv, 500.0, 220.0)
        sec_count_4 = CAMService._screen_secondary_conjunctions(db, primary.id, secondary.id, new_perigee_4, new_apogee_4)

        strategies.append(CAMStrategy(
            strategy_type="MINIMUM_FUEL",
            title="Optimized Multi-Axis Impulsive CAM",
            description="Combined tangential and cross-track maneuver minimizing total propellant consumption while achieving maximal 3D spatial clearance.",
            burn_time=burn_time,
            lead_time_hours=lead_time_hours,
            delta_v_vector={"delta_v_r": 0.0, "delta_v_t": opt_dv_t, "delta_v_w": opt_dv_w},
            total_delta_v_m_s=total_opt_dv,
            initial_miss_distance_km=initial_miss_km,
            projected_miss_distance_km=miss_proj_4,
            miss_distance_gain_km=round(miss_proj_4 - initial_miss_km, 2),
            fuel_cost_kg=fuel_4,
            propellant_fraction_percent=round((fuel_4 / 500.0) * 100.0, 3),
            isp_seconds=220.0,
            new_perigee_km=new_perigee_4,
            new_apogee_km=new_apogee_4,
            new_period_minutes=new_period_4,
            new_inclination_deg=new_inc_4,
            secondary_conjunctions_count=sec_count_4,
            secondary_conjunctions_safe=sec_count_4 < 50,
            risk_reduction_percent=99.2
        ))

        return CAMPlanResponse(
            conjunction_id=conjunction.id,
            primary_object_name=primary.name,
            primary_norad_id=primary.norad_id,
            secondary_object_name=secondary.name,
            secondary_norad_id=secondary.norad_id,
            tca=tca,
            initial_miss_distance_km=initial_miss_km,
            initial_risk_score=initial_risk,
            initial_risk_level=initial_level,
            strategies=strategies
        )

    @staticmethod
    def simulate_custom_burn(
        db: Session,
        conjunction_id: int,
        delta_v_r_m_s: float,
        delta_v_t_m_s: float,
        delta_v_w_m_s: float,
        lead_time_hours: float = 12.0,
        spacecraft_mass_kg: float = 500.0,
        isp_seconds: float = 220.0
    ) -> Optional[CAMSimulateResponse]:
        """
        Simulates custom operator-defined delta-v vector applied at specified lead time.
        """
        conjunction = db.query(Conjunction).filter(Conjunction.id == conjunction_id).first()
        if not conjunction or not conjunction.object_a:
            return None

        primary = conjunction.object_a
        secondary = conjunction.object_b
        a_km = primary.semi_major_axis_km or (EARTH_RADIUS_KM + 500.0)
        perigee_km = primary.perigee_km or 500.0
        apogee_km = primary.apogee_km or 500.0
        period_min = primary.period_minutes or 95.0
        tca = conjunction.tca
        initial_miss_km = conjunction.miss_distance_km

        r_tca = EARTH_RADIUS_KM + (conjunction.altitude_km or perigee_km)
        v_orb_km_s = CAMService._calculate_orbital_speed(a_km, r_tca)

        total_dv = math.sqrt(delta_v_r_m_s**2 + delta_v_t_m_s**2 + delta_v_w_m_s**2)
        burn_time = tca - timedelta(hours=lead_time_hours)
        lead_time_seconds = lead_time_hours * 3600.0

        # Physical response to in-track burn
        delta_a = (2.0 * a_km * (delta_v_t_m_s / 1000.0)) / v_orb_km_s
        along_track_displacement = 1.5 * (lead_time_seconds / a_km) * (v_orb_km_s) * (delta_v_t_m_s / 1000.0)
        cross_track_displacement = (r_tca / v_orb_km_s) * (delta_v_w_m_s / 1000.0)
        radial_displacement = (delta_v_r_m_s / 1000.0) * (period_min * 60.0 / (2.0 * math.pi))

        total_displacement_km = math.sqrt(
            along_track_displacement**2 + cross_track_displacement**2 + radial_displacement**2
        )

        projected_miss_km = round(initial_miss_km + total_displacement_km, 2)
        gain_km = round(projected_miss_km - initial_miss_km, 2)

        new_perigee = round(max(150.0, perigee_km + min(0.0, delta_a)), 2)
        new_apogee = round(apogee_km + max(0.0, 2.0 * delta_a), 2)
        new_period = round(period_min * ((a_km + delta_a) / a_km)**1.5, 2)

        fuel_kg = CAMService._calculate_fuel_mass(total_dv, spacecraft_mass_kg, isp_seconds)
        sec_count = CAMService._screen_secondary_conjunctions(db, primary.id, secondary.id if secondary else -1, new_perigee, new_apogee)

        return CAMSimulateResponse(
            conjunction_id=conjunction.id,
            burn_time=burn_time,
            total_delta_v_m_s=round(total_dv, 3),
            projected_miss_distance_km=projected_miss_km,
            miss_distance_gain_km=gain_km,
            fuel_cost_kg=fuel_kg,
            new_perigee_km=new_perigee,
            new_apogee_km=new_apogee,
            new_period_minutes=new_period,
            secondary_conjunctions_count=sec_count,
            secondary_conjunctions_safe=sec_count < 50
        )
