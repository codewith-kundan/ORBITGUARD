# SPACE SENTINEL — Space Debris Tracking & Satellite Collision Risk Prediction Dashboard

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000.svg?logo=three.js)](https://threejs.org/)
[![SGP4](https://img.shields.io/badge/Orbital_Mechanics-SGP4_WGS84-cyan.svg)](https://celestrak.org)
[![Pytest](https://img.shields.io/badge/Tests-32%20Passing-brightgreen.svg)](backend/tests/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"Accessible, Real-Time Space Situational Awareness & Satellite Collision Risk Prediction Platform"**

---

## 1. System Overview

**SPACE SENTINEL** is an enterprise-grade Space Situational Awareness (SSA) and orbital safety command center. It ingests live orbital ephemeris data (Two-Line Element sets) from global surveillance networks, propagates satellite state vectors via analytical SGP4 perturbation theory, screens candidate pairs for close encounters over 72-hour operational horizons, predicts ground station visibility look angles, and provides multi-factor AI Collision Avoidance Maneuver (CAM) decision support.

---

## 2. Core Architecture & Subsystems

```
                                  EXTERNAL EPHEMERIS FEEDS
                   (CelesTrak / Space-Track / SatNOGS / Local Fallback)
                                             │
                                             ▼
                             DATA PROVIDER ABSTRACTION LAYER
                               (Multi-source failover & health)
                                             │
                                             ▼
                               RELATIONAL DATABASE STORAGE
                           (19,578 Tracked Space Objects)
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    ▼                                                 ▼
     ANALYTICAL SGP4 ENGINE                           3-PHASE CONJUNCTION SCREENER
 (TEME ➔ ECEF ➔ Topocentric ENU)                   (Apogee/Perigee Sieve ➔ Fine TCA)
                    │                                                 │
                    ├────────────────────────┬────────────────────────┤
                    ▼                        ▼                        ▼
           PASS PREDICTOR            AI DECISION ENGINE       SPACE SIMULATORS
        (Look Angles: Az/El/Range)   (CAM Recommendations)   (Kessler / Breakup / ADR)
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                                             ▼
                               FASTAPI ASYNCHRONOUS BACKEND
                                             │
                                             ▼
                              MISSION CONTROL FRONTEND
              (3D Three.js Globe, 2D Ground Tracks, Conjunctions & Alerts)
```

---

## 3. Key Capabilities

### 🌐 3D Space Traffic Control Command Center
- High-fidelity Three.js WebGL globe with dynamic Sun ephemeris, real Jean Meeus lunar position, Earth GMST axial rotation, and 4000+ deep-space stars.
- GPU instanced rendering displaying 19,500+ active satellites and debris fragments at 60 FPS.
- Altitude reference rings (ISS ~420km, Starlink ~550km, Sun-sync ~800km, GPS/MEO ~20,200km).
- Time machine playback controls (`1X`, `10X`, `50X`, `200X`, `1000X`, `PAUSE`, and `NOW`).
- Camera lock / orbit tracking mode following selected spacecraft.

### 🛡️ Conjunction Assessment & Collision Alerts
- 3-Phase spatial screening engine evaluating close approaches over 72-hour operational windows.
- Computes exact Time of Closest Approach (TCA) countdown, 3D Euclidean miss distance, and relative hypervelocity.
- Collision alert management with severity tiering (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and operator acknowledgment.

### 🤖 Explainable AI Risk & Decision Support
- Multi-factor risk forecasting: Miss Distance (50%), Relative Velocity (25%), Lead Time Urgency (20%), and Local Altitude Congestion (5%).
- Automated Collision Avoidance Maneuver (CAM) $\Delta V$ magnitude and burn vector directions (Prograde / Retrograde / Radial-Out).

### 🔭 Satellite Pass & Visibility Predictor
- Calculates topocentric look angles (Azimuth, Elevation, Slant Range) and optical/RF pass windows.
- Computes Acquisition of Signal (AOS), Loss of Signal (LOS), and Culmination Max Elevation for any observer on Earth.

### 🗺️ 2D Mercator Ground Track Analyzer
- Dedicated 2D world projection showing sub-satellite ground trace and day/night terminator boundaries.
- Trajectory window selector (1 orbit, 3 hours, 6 hours, 12 hours, 24 hours).

### 🧪 Astrodynamic Simulation Center
- **What-If Breakup Simulator**: NASA Standard Breakup Model fragment size distribution ($N(L_c) \propto M^{0.75} L_c^{-1.71}$), Gabbard apogee/perigee dispersion, and atmospheric drag decay timelines.
- **Kessler Syndrome Cascade Simulator**: 10–50 year non-linear differential growth of active satellites, collision frequencies, and runaway cascade tipping point detection.
- **Active Debris Removal (ADR)**: Robotic capture, electrodynamic drag sails, and laser ablation deorbit mitigation efficacy comparisons.

### 💾 Data Integrity & Health Monitor
- Real-time provider health dashboard tracking CelesTrak, SatNOGS, Space-Track, and offline fallback cache.
- Network latency monitors, stale TLE epoch diagnostics, and one-click JSON/CSV data message exports.

---

## 4. API Endpoints Reference

| Endpoint | Method | Description |
|:---|:---:|:---|
| `/api/health` | `GET` | System health and database connectivity |
| `/api/data/status` | `GET` | Current provider status and catalog statistics |
| `/api/data/health` | `GET` | Multi-provider latency and stale TLE diagnostics |
| `/api/data/sync` | `POST` | Trigger ephemeris sync (`mode=LIVE` or `mode=DEMO`) |
| `/api/objects` | `GET` | Paginated catalog (`page`, `page_size`, `search`, `type`, `regime`) |
| `/api/objects/{id}/position` | `GET` | Real-time SGP4 coordinates (TEME, ECEF, Geodetic) |
| `/api/objects/{id}/trajectory` | `GET` | Future orbital trajectory points |
| `/api/objects/{id}/ground-track` | `GET` | Sub-satellite geodetic ground trace |
| `/api/conjunctions` | `GET` | Screened close approach events with TCA and miss distance |
| `/api/conjunctions/screen` | `POST` | Execute 72h conjunction screening |
| `/api/alerts` | `GET` | Active collision risk warnings |
| `/api/alerts/{id}/ack` | `POST` | Acknowledge collision alert |
| `/api/visibility/passes` | `GET` | Topocentric pass look angles for ground observer |
| `/api/ai/predict-risk` | `POST` | AI Collision Avoidance Maneuver recommendations |
| `/api/simulations/what-if` | `POST` | NASA Breakup Model fragment cloud simulation |
| `/api/simulations/kessler` | `POST` | Multi-year Kessler Syndrome cascade model |
| `/api/simulations/adr` | `POST` | Active Debris Removal risk mitigation model |
| `/api/export/objects` | `GET` | Export catalog as CSV or JSON |
| `/api/export/conjunctions` | `GET` | Export conjunction events as CSV or JSON |

---

## 5. Quickstart Guide

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run automated tests
pytest tests/ -v

# Start FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 6. Technical Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Orbital Ingestion & Data Pipeline](docs/DATA_PIPELINE.md)
- [Astrodynamics & SGP4 Engine](docs/ORBITAL_ENGINE.md)
- [Conjunction Assessment & Risk Engine](docs/RISK_ENGINE.md)
- [Astrodynamic Simulations (Breakup, Kessler, ADR)](docs/SIMULATIONS.md)

---

## 7. License & Credits

Built with precision for the global aerospace community. Licensed under the [MIT License](LICENSE).
