# ORBITGUARD Operational Modes: LIVE MODE vs DEMO MODE
**Document**: Operational Demonstration & Data Integrity Specification  
**Release**: `2.0.0-PROD`  

---

## 1. Operational Modes Overview

ORBITGUARD strictly adheres to scientific integrity. All operational states are clearly declared on the user interface and in API responses.

```
       ┌─────────────────────────────────────────────────────────┐
       │                   ORBITGUARD PLATFORM                   │
       └────────────┬───────────────────────────────┬────────────┘
                    │                               │
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │       LIVE MODE        │      │       DEMO MODE        │
       ├────────────────────────┤      ├────────────────────────┤
       │ • Live CelesTrak Feeds │      │ • High-Density Replay  │
       │ • Real-Time SGP4       │      │ • Reference Cases      │
       │ • 35,000+ Real Assets  │      │ • Historical Breakups  │
       │ • Automated Sync Loop  │      │ • Verified Benchmarks  │
       └────────────────────────┘      └────────────────────────┘
```

---

## 2. Distinction Matrix

| Metric / Property | LIVE MODE | DEMO MODE |
| :--- | :--- | :--- |
| **Top Status Indicator** | `LIVE • CelesTrak GP Feeds` (Green) | `DEMO MODE • High-Density Replay` (Amber) |
| **Upstream Data Ingestion** | Live HTTPS ephemeris sync from CelesTrak | Curated reference catalog with known encounters |
| **Physics Calculations** | Real C-accelerated SGP4 & Bowring WGS-84 | Real C-accelerated SGP4 & Bowring WGS-84 |
| **TCA Root Solver** | Real Secant $\mathbf{r}\cdot\mathbf{v}=0$ | Real Secant $\mathbf{r}\cdot\mathbf{v}=0$ |
| **Collision Probability** | Real Foster-2D & 10k Monte Carlo | Real Foster-2D & 10k Monte Carlo |
| **CAM Planning** | Real Gauss & Tsiolkovsky equations | Real Gauss & Tsiolkovsky equations |
| **Offline Resilience** | Transparent fallback to cached state | Operates 100% offline without internet connection |

> **IMPORTANT PRINCIPLE**: Even in DEMO MODE, all orbital mechanics, conjunction screening, collision probabilities, and maneuver delta-V values are **100% calculated in real time by the physics engine**. No numbers are faked or mocked.

---

## 3. Executive & Mission Flight Director Demonstration Guide

For a 3–5 minute executive walkthrough or flight director briefing:
1. **Live Data Provenance & Global Ingestion (0:00 - 0:45)**:
   * Review Top Navigation Bar and Global Data Status Bar (`LIVE` mode active, 3,400+ checksum-verified orbital objects).
   * Open **Live Validation Center** (`/validation` tab) and execute **`[ RUN VALIDATION ]`** to show live pipeline execution logs and 100% benchmark pass rate against Vallado astrodynamic test vectors.
2. **Conjunction Assessment & 3D Encounter Geometry (0:45 - 1:45)**:
   * Navigate to **Conjunction Center** (`/conjunctions` tab).
   * Select the top critical encounter (`STARLINK-2197` vs `COSMOS 2251 DEBRIS`).
   * Inspect 3D Globe with orbit trajectories, miss distance ($1.08\text{ km}$), relative velocity ($14.94\text{ km/s}$), and Foster-2D $P_c$.
3. **Physics-Grounded AI Flight Copilot (1:45 - 2:45)**:
   * Open **Orbit AI Copilot** in the tactical console.
   * Query telemetry: *"Why is the top conjunction high risk?"*.
   * Expand the **AI Tool Execution Audit Drawer** to observe deterministic physics tools executed (`calculate_tca()`, `calculate_miss_distance()`, `calculate_risk()`) with microsecond execution timings.
   * Verify **Source Provenance Badges** (`[✓ Physics Engine]`, `[✓ Live CelesTrak Data]`).
4. **Autonomous CAM Maneuver & Mission Decision Support (2:45 - 3:45)**:
   * Open **CAM Planner Modal**.
   * Compare multi-candidate thruster burn strategies.
   * Review **Optimal Maneuver Recommendation** for `Minimum Fuel Multi-Axis` ($0.117\text{ kg}$ Hydrazine).
   * Click **`[ APPROVE MANEUVER ]`** and review the **Post-CAM Verification** panel showing $+26.9\text{ km}$ clearance gain and $99.9\%$ risk reduction.
   * Click **`[ AUDIT EVIDENCE JSON ]`** or export **CCSDS 508.0-B-1 CDM** to generate cryptographically verified flight telemetry logs.
