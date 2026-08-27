# ORBITGUARD — Space Situational Awareness & Collision Risk Intelligence Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000.svg?logo=three.js)](https://threejs.org/)
[![SGP4](https://img.shields.io/badge/Orbital_Mechanics-SGP4_WGS84-cyan.svg)](https://celestrak.org)
[![Pytest](https://img.shields.io/badge/Tests-44%20Passing-brightgreen.svg)](backend/tests/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"TRACK → PROPAGATE → SCREEN → PREDICT → EXPLAIN"**
> 
> *Authentic, Accessible, Research-Grade Space Situational Awareness (SSA) & Collision Risk Intelligence.*

---

## 1. System Architecture

```
                 ┌─────────────────────────────────────────────────┐
                 │       Authoritative External Data Sources       │
                 │                                                 │
                 │ • Space-Track.org (18th Space Defense Squadron) │
                 │ • CelesTrak (Analytical Graphics / CSSI)        │
                 │ • Launch Library 2 (The Space Devs API)         │
                 │ • NOAA SWPC (Space Weather Prediction Center)   │
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
                 ┌─────────────────────────────────────────────────┐
                 │         Data Ingestion & TLE Validation         │
                 │ (Modulo-10 Checksum, Keplerian Physics, Epoch)  │
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
                 ┌─────────────────────────────────────────────────┐
                 │          Canonical Database / Cache Layer       │
                 │ (orbital_objects, tle_records, conjunctions)    │
                 └────────────────────────┬────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              ▼                           ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
    │  SGP4 Propagator │        │ Launch Processor │        │ Re-entry Engine  │
    │  TEME ➔ ECEF ➔   │        │ (Launch Lib 2,   │        │ (King-Hele Drag, │
    │  WGS84 Geodetic  │        │ Net Window, NET) │        │ Jacchia Scale H) │
    └─────────┬────────┘        └─────────┬────────┘        └─────────┬────────┘
              │                           │                           │
              └───────────────────────────┼───────────────────────────┘
                                          ▼
                 ┌─────────────────────────────────────────────────┐
                 │      Conjunction Screening & TCA Engine         │
                 │  (3-Phase Spatial Sieve + Golden Section Search)│
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
                 ┌─────────────────────────────────────────────────┐
                 │              Astrodynamics Risk Engine          │
                 │ • Foster-2D Pc (When Covariance Available)      │
                 │ • OrbitGuard Risk Score (Explainable 0–100)     │
                 │ • Data States: LIVE, CALCULATED, PREDICTED,     │
                 │                SIMULATED, UNAVAILABLE           │
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
                 ┌─────────────────────────────────────────────────┐
                 │             FastAPI Backend REST Layer          │
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
                 ┌─────────────────────────────────────────────────┐
                 │          Frontend 3D WebGL Dashboard            │
                 │ (Three.js Globe, SGP4 Sky Spotter, CDM Exports) │
                 └─────────────────────────────────────────────────┘
```

---

## 2. Core Methodologies & Physics Rigor

### 1. Unified SGP4 Astrodynamic Engine
- **Propagation**: Authoritative C-accelerated standard SGP4 orbital propagator (`sgp4.api.Satrec`).
- **Coordinate Frames**: Transforms **TEME** (True Equator Mean Equinox) $\to$ **ECEF** (via GMST rotation) $\to$ **WGS84 Geodetic** strictly in **UTC**.
- **Orbit Trails**: Propagates true future state vectors (+90 min) rather than drawing circular geometry.

### 2. Conjunction Screening & Exact TCA Minimization
- **Phase 1 (Altitude Sieve)**: Apogee/Perigee envelope filtering eliminates non-intersecting pairs in $\mathcal{O}(N \log N)$ time.
- **Phase 2 (Coarse Stepping)**: Identifies bounding approach windows.
- **Phase 3 (Golden Section Minimization)**: Refines exact **Time of Closest Approach (TCA)**, 3D Euclidean Miss Distance ($d_{\text{miss}}$), and relative velocity ($\mathbf{v}_{\text{rel}}$).

### 3. Collision Probability ($P_c$) vs OrbitGuard Risk Score
- **Collision Probability ($P_c$)**: Computed via the **Foster-2D Isotropic Hard-Body Encounter Model** when positional uncertainty is bounded; clearly marked `UNAVAILABLE` when covariance is unconstrained (never fabricated as a 0–100 pseudo-probability).
- **OrbitGuard Risk Score (0–100)**: Transparent operational screening metric:
  $$\text{Score} = 0.55 \cdot S_{\text{dist}} + 0.25 \cdot S_{\text{vel}} + 0.20 \cdot S_{\text{time}}$$

### 4. Atmospheric Decay & Re-Entry Lifetime
- Employs **King-Hele Drag Mechanics** integrated against **Jacchia-Roberts atmospheric scale heights** and space weather indices ($F_{10.7}$, $A_p$).
- Yields estimated re-entry windows with explicit uncertainty bounds ($\pm \Delta t$).

### 5. Citizen Sky Spotter (Naked-Eye Visibility)
- Calculates true topocentric azimuth, elevation, and range rate from observer coordinates.
- Validates that the observer is in twilight/dark sky and the satellite is sunlit above the local elevation cutoff.

---

## 3. Standard Scientific Data States

| State | Badge | Definition |
|:---|:---:|:---|
| **LIVE** | `LIVE SGP4` | Upstream data freshly synchronized from Space-Track / Launch Library 2 |
| **CALCULATED** | `CALCULATED (SGP4)` | Deterministically computed from valid TLE orbital state vectors |
| **PREDICTED** | `MODEL PREDICTION` | Atmospheric decay / re-entry timeline with uncertainty window |
| **SIMULATED** | `SIMULATION` | Hypothetical breakup or kinetic ASAT intercept scenarios |
| **UNAVAILABLE** | `DATA UNAVAILABLE` | Missing telemetry or unconstrained covariance parameters |

---

## 4. API Endpoints Reference

| Endpoint | Method | Description |
|:---|:---:|:---|
| `/api/health` | `GET` | System health, database status, and provider connectivity |
| `/api/data/status` | `GET` | Ephemeris provider status and catalog statistics |
| `/api/data/sync` | `POST` | Trigger ephemeris synchronization (`mode=LIVE` or `mode=DEMO`) |
| `/api/objects` | `GET` | Paginated catalog search (`page`, `search`, `object_type`) |
| `/api/objects/{id}/position` | `GET` | Real-time SGP4 coordinates (TEME, ECEF, Geodetic) |
| `/api/objects/{id}/trajectory` | `GET` | Future orbital trajectory points |
| `/api/conjunctions` | `GET` | Screened close approach events with TCA and miss distance |
| `/api/launches` | `GET` | Live upcoming global rocket launches from Launch Library 2 |
| `/api/spotter/visible-passes` | `GET` | Live naked-eye visible satellite passes for valid observer cities |
| `/api/decay/watchlist` | `GET` | Prioritized atmospheric re-entry candidates with King-Hele lifetime |
| `/api/cam/plan` | `POST` | Collision Avoidance Maneuver (CAM) $\Delta v$ optimization via Tsiolkovsky |
| `/api/compliance/cdm/{id}` | `GET` | Formal CCSDS Conjunction Data Message (CDM) export (KVN / XML) |

---

## 5. Quickstart & Verification

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run automated tests (44/44 passing)
PYTHONPATH=. pytest tests/ -v

# Start development server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run dev
```

---

## 6. Required Environment Variables (`.env`)

```env
APP_NAME=ORBITGUARD
APP_ENV=production
API_PORT=8000
API_HOST=0.0.0.0
CORS_ORIGINS=*

DATABASE_URL=sqlite:///./data/orbitguard.db

# Space-Track.org Credentials (18th SDS)
SPACE_TRACK_USERNAME=your_username
SPACE_TRACK_PASSWORD=your_password

ORBITAL_DATA_PROVIDER=Space-Track
SYNC_INTERVAL_MINUTES=60
DEFAULT_PREDICTION_WINDOW_HOURS=24
CONJUNCTION_THRESHOLD_KM=500.0
```

---

## 7. License
Licensed under the [MIT License](LICENSE).
