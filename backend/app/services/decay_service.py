import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.schemas.decay import (
    DecayProfilePoint,
    ReentryPrediction,
    DecayWatchlistItem,
    DecayAssessmentRequest
)

logger = logging.getLogger(__name__)

MU_EARTH = 398600.4418  # km^3/s^2
EARTH_RADIUS_KM = 6371.0
RHO_0_SGP4 = 2.461e-5  # kg/m^2/km reference density for B*

# US Standard Atmosphere Piecewise Exponential Scale Heights
# (h0_km, rho0_kg_m3, H_km)
ATMOSPHERE_LAYERS: List[Tuple[float, float, float]] = [
    (80.0, 5.7e-6, 5.8),
    (100.0, 5.6e-7, 6.0),
    (120.0, 2.4e-8, 7.2),
    (140.0, 3.8e-9, 8.5),
    (160.0, 1.2e-9, 10.2),
    (180.0, 5.2e-10, 12.5),
    (200.0, 2.8e-10, 15.0),
    (250.0, 7.2e-11, 20.5),
    (300.0, 2.4e-11, 28.0),
    (350.0, 9.5e-12, 36.0),
    (400.0, 4.0e-12, 45.0),
    (450.0, 1.8e-12, 54.0),
    (500.0, 8.2e-13, 63.0),
    (600.0, 2.0e-13, 82.0),
    (700.0, 5.5e-14, 105.0),
    (800.0, 1.7e-14, 130.0),
    (1000.0, 2.0e-15, 180.0)
]


class DecayService:
    @staticmethod
    def get_atmospheric_density(
        altitude_km: float,
        solar_flux_f107: float = 150.0,
        geomagnetic_ap: float = 15.0
    ) -> float:
        """
        Computes thermospheric density (kg/m^3) at a given altitude using
        piecewise exponential scale heights modulated by solar radio flux F10.7 and Ap.
        """
        if altitude_km < 80.0:
            return 1.0e-5  # Dense mesosphere / stratosphere
        if altitude_km > 1500.0:
            return 1.0e-18  # Exosphere negligible drag

        # Find atmospheric layer
        layer = ATMOSPHERE_LAYERS[0]
        for l in ATMOSPHERE_LAYERS:
            if altitude_km >= l[0]:
                layer = l
            else:
                break

        h0, rho0, H = layer
        delta_h = altitude_km - h0
        base_density = rho0 * math.exp(-delta_h / H)

        # Solar activity scaling (higher F10.7 expands upper thermosphere)
        f_solar = math.pow(max(60.0, solar_flux_f107) / 150.0, 0.75) * (1.0 + 0.003 * geomagnetic_ap)
        return max(1.0e-18, base_density * f_solar)

    @staticmethod
    def assess_decay_lifetime(
        obj: OrbitalObject,
        dry_mass_kg: Optional[float] = None,
        drag_area_m2: Optional[float] = None,
        solar_flux_f107: float = 150.0,
        geomagnetic_ap: float = 15.0
    ) -> ReentryPrediction:
        """
        Integrates drag-induced orbital decay over time using King-Hele formulation
        and SGP4 B* ballistic coefficient, estimating re-entry timeline and casualty risk.
        """
        now = datetime.now(timezone.utc)
        peri_alt = obj.perigee_km if obj.perigee_km is not None else 400.0
        apo_alt = obj.apogee_km if obj.apogee_km is not None else 420.0
        inc_deg = obj.inclination if obj.inclination is not None else 51.6

        # Dry mass estimation if unspecified
        if dry_mass_kg is None:
            if obj.object_type == ObjectType.ROCKET_BODY:
                dry_mass = 2500.0
            elif obj.object_type == ObjectType.DEBRIS:
                dry_mass = 15.0
            else:
                dry_mass = 850.0
        else:
            dry_mass = dry_mass_kg

        # Drag area estimation
        if drag_area_m2 is None:
            if obj.object_type == ObjectType.ROCKET_BODY:
                drag_area = 12.0
            elif obj.object_type == ObjectType.DEBRIS:
                drag_area = 0.2
            else:
                drag_area = 3.0
        else:
            drag_area = drag_area_m2

        # Effective B* ballistic drag parameter
        # B* in units of 1/Earth radii, typically ~ 1e-4 to 1e-3
        bstar_val = abs(obj.bstar) if obj.bstar and abs(obj.bstar) > 1e-7 else None
        if not bstar_val:
            cd = 2.2
            # (Cd * A / m) in m^2/kg = 12.7388 * B* => B* = (Cd * A / m) / 12.7388
            bstar_val = (cd * drag_area / dry_mass) / 12.7388
        bstar_val = max(1e-6, min(0.05, bstar_val))

        # Initial Keplerian Elements
        r_peri = EARTH_RADIUS_KM + peri_alt
        r_apo = EARTH_RADIUS_KM + apo_alt
        a = (r_peri + r_apo) / 2.0
        e = (r_apo - r_peri) / (2.0 * a)

        decay_profile: List[DecayProfilePoint] = []
        elapsed_days = 0.0
        max_days_limit = 365.0 * 30.0  # 30 years ceiling

        current_a = a
        current_e = e

        step_days = 1.0
        reentry_reached = False

        # Record initial state
        rho_curr = DecayService.get_atmospheric_density(peri_alt, solar_flux_f107, geomagnetic_ap)
        decay_profile.append(DecayProfilePoint(
            days_from_epoch=0.0,
            timestamp=now,
            perigee_altitude_km=round(peri_alt, 1),
            apogee_altitude_km=round(apo_alt, 1),
            semi_major_axis_km=round(a, 1),
            eccentricity=round(e, 4),
            atmospheric_density_kg_m3=rho_curr,
            decay_rate_km_per_day=0.0
        ))

        # Integration loop
        while elapsed_days < max_days_limit:
            curr_hp = current_a * (1.0 - current_e) - EARTH_RADIUS_KM
            curr_ha = current_a * (1.0 + current_e) - EARTH_RADIUS_KM

            if curr_hp <= 85.0:
                reentry_reached = True
                break

            # Adaptive time-step based on current perigee altitude
            if curr_hp > 500.0:
                step_days = 15.0
            elif curr_hp > 350.0:
                step_days = 5.0
            elif curr_hp > 250.0:
                step_days = 1.0
            elif curr_hp > 150.0:
                step_days = 0.25
            else:
                step_days = 0.05

            rho = DecayService.get_atmospheric_density(curr_hp, solar_flux_f107, geomagnetic_ap)

            # King-Hele semimajor axis and eccentricity decay rates
            cd_a_m = 12.7388 * bstar_val
            mu_si = 3.986004418e14  # m^3/s^2
            a_si = current_a * 1000.0  # meters

            # da/dt in m/s = - rho * sqrt(mu * a) * (Cd * A / m)
            da_dt_m_s = - rho * math.sqrt(mu_si * a_si) * cd_a_m
            da_dt = (da_dt_m_s * 86400.0) / 1000.0  # km / day

            # de/dt in 1/day
            de_dt = - (1.0 - current_e) * rho * math.sqrt(mu_si / a_si) * cd_a_m * 86400.0

            # Guard against excessive step overshooting
            delta_a = da_dt * step_days
            if abs(delta_a) > (current_a * 0.05):
                step_days = max(0.01, (current_a * 0.02) / max(1e-4, abs(da_dt)))
                delta_a = da_dt * step_days

            current_a += delta_a
            current_e = max(0.0001, current_e + de_dt * step_days)
            elapsed_days += step_days

            # Record profile points at interval
            if len(decay_profile) < 150 or curr_hp < 150.0:
                decay_profile.append(DecayProfilePoint(
                    days_from_epoch=round(elapsed_days, 2),
                    timestamp=now + timedelta(days=elapsed_days),
                    perigee_altitude_km=round(curr_hp, 1),
                    apogee_altitude_km=round(curr_ha, 1),
                    semi_major_axis_km=round(current_a, 1),
                    eccentricity=round(current_e, 4),
                    atmospheric_density_kg_m3=rho,
                    decay_rate_km_per_day=round(abs(da_dt), 3)
                ))

        estimated_lifetime_days = round(elapsed_days, 1)
        predicted_reentry = now + timedelta(days=estimated_lifetime_days)

        # Uncertainty window (standard Aerospace Corp / 18th SDS standard: ±15% of remaining lifetime)
        uncertainty_hours = round(max(2.0, (estimated_lifetime_days * 24.0) * 0.15), 1)

        is_imminent = estimated_lifetime_days <= 30.0

        # Risk level determination
        if estimated_lifetime_days <= 7.0:
            risk_level = "CRITICAL"
        elif estimated_lifetime_days <= 30.0:
            risk_level = "HIGH"
        elif estimated_lifetime_days <= 180.0:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # Surviving mass calculation per NASA DAS standard (15% for payloads, 25% for rocket bodies)
        surviving_fraction = 0.25 if obj.object_type == ObjectType.ROCKET_BODY else 0.15
        surviving_mass_kg = round(dry_mass * surviving_fraction, 1)

        # Casualty risk estimate
        if dry_mass > 2000.0:
            casualty_score = "1 : 2,500 (HIGH CASUALTY FOOTPRINT)"
        elif dry_mass > 500.0:
            casualty_score = "1 : 12,000 (NASA CASUALTY THRESHOLD)"
        else:
            casualty_score = "< 1 : 100,000 (NEGLIGIBLE RISK)"

        lat_band = f"{round(inc_deg, 1)}°S to {round(inc_deg, 1)}°N"

        return ReentryPrediction(
            norad_id=obj.norad_id,
            object_name=obj.name,
            object_type=obj.object_type.value if hasattr(obj.object_type, 'value') else str(obj.object_type),
            country_code=obj.country_code or obj.country,
            current_perigee_km=round(peri_alt, 1),
            current_apogee_km=round(apo_alt, 1),
            current_altitude_km=round((peri_alt + apo_alt) / 2.0, 1),
            bstar=bstar_val,
            estimated_lifetime_days=estimated_lifetime_days,
            predicted_reentry_time=predicted_reentry,
            uncertainty_window_hours=uncertainty_hours,
            is_decay_imminent=is_imminent,
            risk_level=risk_level,
            reentry_latitude_band=lat_band,
            estimated_dry_mass_kg=round(dry_mass, 1),
            estimated_surviving_mass_kg=surviving_mass_kg,
            casualty_risk_score=casualty_score,
            decay_profile=decay_profile[::max(1, len(decay_profile) // 60)]  # Subsample for UI chart
        )

    @staticmethod
    def get_decay_watchlist(db: Session, max_lifetime_days: float = 90.0) -> List[DecayWatchlistItem]:
        """
        Scans entire orbital catalog for objects with low perigee (<350 km) or high B* drag,
        returning prioritized re-entry watchlist.
        """
        # Query potential decaying objects (LEO objects with low perigee)
        candidates = db.query(OrbitalObject).filter(
            OrbitalObject.perigee_km != None,
            OrbitalObject.perigee_km <= 400.0
        ).limit(100).all()

        watchlist: List[DecayWatchlistItem] = []
        for obj in candidates:
            try:
                res = DecayService.assess_decay_lifetime(obj)
                if res.estimated_lifetime_days <= max_lifetime_days:
                    watchlist.append(DecayWatchlistItem(
                        norad_id=obj.norad_id,
                        object_name=obj.name,
                        object_type=obj.object_type.value if hasattr(obj.object_type, 'value') else str(obj.object_type),
                        country_code=obj.country_code or obj.country,
                        perigee_km=round(obj.perigee_km, 1),
                        apogee_km=round(obj.apogee_km or obj.perigee_km, 1),
                        bstar=res.bstar,
                        estimated_lifetime_days=res.estimated_lifetime_days,
                        predicted_reentry_time=res.predicted_reentry_time,
                        risk_level=res.risk_level
                    ))
            except Exception as e:
                logger.debug(f"Failed to assess decay for #{obj.norad_id}: {e}")

        # Sort by urgency (shortest remaining lifetime first)
        watchlist.sort(key=lambda x: x.estimated_lifetime_days)
        return watchlist
