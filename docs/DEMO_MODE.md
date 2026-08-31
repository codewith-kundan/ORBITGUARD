# ORBITGUARD Operational Modes: LIVE MODE vs DEMO MODE
**Document**: Hackathon & Defense Presentation Transparency Specification  
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

## 3. SIH Judge Demonstration Guide

For a 3–5 minute presentation to Smart India Hackathon judges:
1. **Introduction & Live Data Provenance (0:00 - 0:45)**:
   * Show Top Navigation Bar and Global Data Status Bar (`LIVE` mode active, 3400+ checksum-verified objects).
   * Open **Live Validation Center** (`/validation` tab) and click **`[ RUN VALIDATION ]`** to show live pipeline execution logs and 100% benchmark pass rate.
2. **Conjunction Assessment & 3D Encounter (0:45 - 1:45)**:
   * Navigate to **Conjunction Center** (`/conjunctions` tab).
   * Click on top critical event (`STARLINK-2197` vs `COSMOS 2251 DEBRIS`).
   * Show 3D Globe with orbit trajectories, miss distance ($1.08\text{ km}$), relative velocity ($14.94\text{ km/s}$), and Foster-2D $P_c$.
3. **Physics-Grounded AI Copilot (1:45 - 2:45)**:
   * Open **Orbit AI Copilot** in bottom right.
   * Click prompt *"Why is the top conjunction high risk?"*.
   * Expand the **AI Tool Execution Audit Drawer** to show the judges the actual backend physics tools called (`calculate_tca()`, `calculate_miss_distance()`, `calculate_risk()`) with millisecond timings.
   * Show **Verified Source Badges** (`[✓ Physics Engine]`, `[✓ Live CelesTrak Data]`).
4. **CAM Maneuver & Mission Decision Support (2:45 - 3:45)**:
   * Open **CAM Planner Modal**.
   * Show Multi-Candidate Evaluation Table comparing all 4 strategies.
   * Demonstrate **AI Recommendation** for `Minimum Fuel Multi-Axis` ($0.117\text{ kg}$ Hydrazine).
   * Click **`[ APPROVE MANEUVER ]`** and open **Post-CAM Verification** tab showing $+26.9\text{ km}$ clearance gain and $99.9\%$ risk reduction.
   * Click **`[ AUDIT EVIDENCE JSON ]`** to download the flight telemetry proof.
