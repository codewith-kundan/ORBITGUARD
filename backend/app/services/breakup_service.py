import math
import random
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from backend.app.models.conjunction import Conjunction
from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.breakup import (
    GabbardPoint,
    BreakupFragment,
    BreakupSimulateRequest,
    BreakupResponse
)

logger = logging.getLogger(__name__)

MU_EARTH = 398600.4418  # km^3/s^2
EARTH_RADIUS_KM = 6371.0

class BreakupService:
    """
    NASA Standard Satellite Breakup Model (SSBM / NASA EVOLVE 4.0)
    Simulates hypervelocity kinetic collisions, explosions, and ASAT intercepts.
    Generates debris fragment size spectra, A/m log-normal distributions,
    imparted Delta-V velocity kicks, Keplerian orbital elements, and Gabbard diagrams.
    """

    @staticmethod
    def _compute_orbital_velocity(r_km: float, a_km: float) -> float:
        """Vis-viva equation: v = sqrt(mu * (2/r - 1/a)) in km/s."""
        return math.sqrt(MU_EARTH * (2.0 / r_km - 1.0 / a_km))

    @staticmethod
    def _sample_area_to_mass(log_lc: float, event_type: str = "COLLISION") -> float:
        """
        Samples Area-to-Mass (A/m in m^2/kg) using NASA EVOLVE bimodal log-normal distribution.
        """
        if log_lc <= -0.5:
            mu = -0.3
            sigma = 0.55
        else:
            mu = -0.3 - 1.4 * (log_lc + 0.5)
            sigma = 0.45

        # Bimodal mixture
        if random.random() < 0.65:
            val = random.gauss(mu, sigma)
        else:
            val = random.gauss(mu - 0.5, sigma * 1.1)

        a_over_m = math.pow(10.0, max(-2.5, min(1.8, val)))
        return round(a_over_m, 4)

    @staticmethod
    def _sample_delta_v(a_over_m: float, event_type: str = "COLLISION") -> float:
        """
        Samples imparted ejection velocity Delta-V (m/s) based on A/m.
        log10(Delta-V) ~ N(mu_v, sigma_v)
        """
        log_am = math.log10(max(1e-4, a_over_m))
        if "EXPLOSION" in event_type.upper():
            mu_v = 0.2 * log_am + 2.4
            sigma_v = 0.4
        else:
            # Collision
            mu_v = 0.9 * log_am + 2.9
            sigma_v = 0.4

        val = random.gauss(mu_v, sigma_v)
        # Delta-V in m/s (clamped to realistic physics bounds: 5 m/s to 3500 m/s)
        dv = math.pow(10.0, max(0.7, min(3.55, val)))
        return round(dv, 2)

    @staticmethod
    def simulate_breakup(req: BreakupSimulateRequest) -> BreakupResponse:
        # 1. Kinetic collision energy & catastrophic check
        v_rel_m_s = req.relative_velocity_km_s * 1000.0
        kinetic_energy_j = 0.5 * req.impactor_mass_kg * (v_rel_m_s ** 2)
        specific_energy_j_kg = kinetic_energy_j / max(1.0, req.target_mass_kg)

        is_catastrophic = specific_energy_j_kg >= 40000.0 or "CATASTROPHIC" in req.event_type.upper() or "ASAT" in req.event_type.upper()

        if "EXPLOSION" in req.event_type.upper():
            effective_mass_kg = req.target_mass_kg
            is_catastrophic = True
        elif is_catastrophic:
            effective_mass_kg = req.target_mass_kg + req.impactor_mass_kg
        else:
            effective_mass_kg = max(0.1, req.impactor_mass_kg * (req.relative_velocity_km_s ** 2))

        # 2. Total predicted fragment count for Lc >= min_fragment_size_m
        # NASA power law: N(Lc >= L) = 0.1 * M^0.75 * L^(-1.71)
        l_min = max(0.01, req.min_fragment_size_m)
        if "EXPLOSION" in req.event_type.upper():
            total_predicted_n = int(6.0 * (effective_mass_kg ** 0.75) * (l_min ** -1.71))
        else:
            total_predicted_n = int(0.1 * (effective_mass_kg ** 0.75) * (l_min ** -1.71))
        total_predicted_n = max(10, total_predicted_n)

        # 3. Parent orbit state vector
        r_parent = EARTH_RADIUS_KM + req.altitude_km
        a_parent = r_parent
        v_parent_km_s = math.sqrt(MU_EARTH / r_parent)
        period_parent_min = (2.0 * math.pi * math.sqrt((a_parent ** 3) / MU_EARTH)) / 60.0

        # Parent initial position & velocity vectors (arbitrary along equatorial/inclined plane)
        inc_rad = math.radians(req.inclination_deg)
        r_vec_parent = (r_parent, 0.0, 0.0)
        v_vec_parent = (0.0, v_parent_km_s * math.cos(inc_rad), v_parent_km_s * math.sin(inc_rad))

        sample_size = min(req.max_fragments_to_generate, total_predicted_n)
        gabbard_points: List[GabbardPoint] = []
        fragments: List[BreakupFragment] = []

        decayed_count = 0
        min_perigee = 99999.0
        max_apogee = 0.0

        # Deterministic random seed for repeatable runs
        rng = random.Random(42)

        for i in range(sample_size):
            frag_id = i + 1

            # Sample Characteristic Length Lc from inverse CDF of power law: L = L_min * (1 - u)^(-1/1.71)
            u = rng.random() * 0.999
            lc_m = l_min * math.pow(1.0 - u, -1.0 / 1.71)
            lc_m = max(l_min, min(4.0, lc_m))
            log_lc = math.log10(lc_m)

            # Sample Area-to-Mass (A/m)
            a_over_m = BreakupService._sample_area_to_mass(log_lc, req.event_type)

            # Calculate fragment mass based on characteristic sphere/plate geometry
            # Area A ~ 0.55 * Lc^2
            area_m2 = 0.55 * (lc_m ** 2)
            frag_mass_kg = max(0.001, area_m2 / a_over_m)

            # Sample ejection Delta-V
            dv_m_s = BreakupService._sample_delta_v(a_over_m, req.event_type)
            dv_km_s = dv_m_s / 1000.0

            # Random isotropic ejection unit vector
            theta = rng.random() * math.pi
            phi = rng.random() * 2.0 * math.pi
            e_x = math.sin(theta) * math.cos(phi)
            e_y = math.sin(theta) * math.sin(phi)
            e_z = math.cos(theta)

            # New fragment velocity vector
            v_frag = (
                v_vec_parent[0] + dv_km_s * e_x,
                v_vec_parent[1] + dv_km_s * e_y,
                v_vec_parent[2] + dv_km_s * e_z
            )

            # Position of fragment at breakup
            r_frag = r_vec_parent
            r_mag = r_parent
            v_mag_sq = v_frag[0]**2 + v_frag[1]**2 + v_frag[2]**2
            v_mag = math.sqrt(v_mag_sq)

            # Compute specific orbital energy: E = v^2/2 - mu/r
            spec_energy = (v_mag_sq / 2.0) - (MU_EARTH / r_mag)

            if spec_energy >= 0:
                # Hyperbolic escape trajectory
                a_frag = 100000.0
                ecc = 1.1
                perigee_alt = req.altitude_km
                apogee_alt = 100000.0
                period_min = 999.0
            else:
                a_frag = -MU_EARTH / (2.0 * spec_energy)

                # Angular momentum vector: h = r x v
                hx = r_frag[1] * v_frag[2] - r_frag[2] * v_frag[1]
                hy = r_frag[2] * v_frag[0] - r_frag[0] * v_frag[2]
                hz = r_frag[0] * v_frag[1] - r_frag[1] * v_frag[0]
                h_mag_sq = hx*hx + hy*hy + hz*hz
                h_mag = math.sqrt(h_mag_sq)

                # Eccentricity vector: e_vec = (v x h)/mu - r/r_mag
                # v x h:
                vxh_x = v_frag[1] * hz - v_frag[2] * hy
                vxh_y = v_frag[2] * hx - v_frag[0] * hz
                vxh_z = v_frag[0] * hy - v_frag[1] * hx

                ex = (vxh_x / MU_EARTH) - (r_frag[0] / r_mag)
                ey = (vxh_y / MU_EARTH) - (r_frag[1] / r_mag)
                ez = (vxh_z / MU_EARTH) - (r_frag[2] / r_mag)
                ecc = math.sqrt(ex*ex + ey*ey + ez*ez)

                # Period: T = 2*pi*sqrt(a^3/mu)
                period_min = (2.0 * math.pi * math.sqrt(abs(a_frag ** 3) / MU_EARTH)) / 60.0

                perigee_alt = a_frag * (1.0 - ecc) - EARTH_RADIUS_KM
                apogee_alt = a_frag * (1.0 + ecc) - EARTH_RADIUS_KM

            is_decayed = perigee_alt <= 100.0
            if is_decayed:
                decayed_count += 1

            min_perigee = min(min_perigee, perigee_alt)
            max_apogee = max(max_apogee, apogee_alt)

            # Inclination
            h_mag = math.sqrt(r_parent**2 * (v_frag[1]**2 + v_frag[2]**2))
            frag_inc = math.degrees(math.acos(max(-1.0, min(1.0, (r_frag[0] * v_frag[1] - r_frag[1] * v_frag[0]) / max(1e-3, h_mag))))) if h_mag > 0 else req.inclination_deg

            # Gabbard Point
            gabbard_points.append(GabbardPoint(
                fragment_id=frag_id,
                characteristic_length_m=round(lc_m, 3),
                mass_kg=round(frag_mass_kg, 3),
                area_to_mass_m2_kg=round(a_over_m, 4),
                delta_v_m_s=round(dv_m_s, 1),
                period_minutes=round(period_min, 2),
                perigee_altitude_km=round(perigee_alt, 1),
                apogee_altitude_km=round(apogee_alt, 1),
                semi_major_axis_km=round(a_frag, 1),
                eccentricity=round(ecc, 4),
                inclination_deg=round(frag_inc, 2),
                is_decayed=is_decayed
            ))

            # Full Fragment Object for 3D visualization
            fragments.append(BreakupFragment(
                id=frag_id,
                name=f"DEBRIS-{frag_id:04d} (Lc={lc_m:.2f}m)",
                characteristic_length_m=round(lc_m, 3),
                mass_kg=round(frag_mass_kg, 3),
                area_to_mass_m2_kg=round(a_over_m, 4),
                delta_v_m_s=round(dv_m_s, 1),
                orbital_elements={
                    "semi_major_axis_km": round(a_frag, 1),
                    "eccentricity": round(ecc, 4),
                    "inclination_deg": round(frag_inc, 2),
                    "period_minutes": round(period_min, 2),
                    "perigee_km": round(perigee_alt, 1),
                    "apogee_km": round(apogee_alt, 1)
                },
                initial_state_vector={
                    "rx": round(r_frag[0], 2), "ry": round(r_frag[1], 2), "rz": round(r_frag[2], 2),
                    "vx": round(v_frag[0], 3), "vy": round(v_frag[1], 3), "vz": round(v_frag[2], 3)
                },
                position_at_epoch={
                    "x": round(r_frag[0] / 1000.0, 3),  # Three.js scaled units
                    "y": round(r_frag[1] / 1000.0, 3),
                    "z": round(r_frag[2] / 1000.0, 3)
                }
            ))

        now_str = datetime.now(timezone.utc).isoformat()
        event_id = f"EVT-BRK-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

        return BreakupResponse(
            event_id=event_id,
            event_type=req.event_type,
            event_timestamp=now_str,
            collision_energy_joules=round(kinetic_energy_j, 1),
            specific_energy_j_per_kg=round(specific_energy_j_kg, 1),
            is_catastrophic=is_catastrophic,
            total_mass_kg=round(req.target_mass_kg + req.impactor_mass_kg, 1),
            total_predicted_fragments_gt_min_size=total_predicted_n,
            sample_fragments_count=len(fragments),
            parent_orbit={
                "altitude_km": req.altitude_km,
                "velocity_km_s": round(v_parent_km_s, 3),
                "period_minutes": round(period_parent_min, 2),
                "inclination_deg": req.inclination_deg
            },
            gabbard_points=gabbard_points,
            fragments=fragments,
            cloud_dispersion_stats={
                "immediate_reentry_count": decayed_count,
                "immediate_reentry_percentage": round((decayed_count / sample_size) * 100.0, 1),
                "min_perigee_km": round(min_perigee, 1),
                "max_apogee_km": round(max_apogee, 1),
                "parent_period_minutes": round(period_parent_min, 2)
            }
        )

    @staticmethod
    def simulate_conjunction_breakup(db: Session, conjunction_id: int) -> Optional[BreakupResponse]:
        """
        Runs NASA SSBM on an existing active conjunction pair from the database.
        """
        conj = db.query(Conjunction).filter(Conjunction.id == conjunction_id).first()
        if not conj:
            return None

        primary = db.query(OrbitalObject).filter(OrbitalObject.norad_id == conj.primary_norad_id).first()
        secondary = db.query(OrbitalObject).filter(OrbitalObject.norad_id == conj.secondary_norad_id).first()

        alt = (primary.perigee_km + primary.apogee_km) / 2.0 if primary and primary.perigee_km else 780.0
        inc = primary.inclination if primary and primary.inclination else 74.0

        # Estimate masses (standard smallsat vs payload)
        target_mass = 1200.0
        impactor_mass = 250.0 if secondary and secondary.object_type == "ACTIVE_SATELLITE" else 25.0
        v_rel = conj.relative_velocity_km_s or 11.2

        req = BreakupSimulateRequest(
            event_type="CATASTROPHIC_COLLISION",
            target_name=conj.primary_object_name,
            target_mass_kg=target_mass,
            impactor_name=conj.secondary_object_name,
            impactor_mass_kg=impactor_mass,
            relative_velocity_km_s=v_rel,
            altitude_km=alt,
            inclination_deg=inc,
            min_fragment_size_m=0.05,
            max_fragments_to_generate=250
        )
        return BreakupService.simulate_breakup(req)
