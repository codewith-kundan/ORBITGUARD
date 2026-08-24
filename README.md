# ORBITGUARD — Space Situational Awareness & Collision Risk Prediction Platform

[![SIH 2026](https://img.shields.io/badge/SIH%202026-PS--04-blue.svg)](https://www.sih.gov.in/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000.svg?logo=three.js)](https://threejs.org/)
[![SGP4](https://img.shields.io/badge/Orbital_Mechanics-SGP4_WGS84-cyan.svg)](https://celestrak.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"Accessible Space Situational Awareness & Orbital Collision Risk Prediction"**  
> *Developed for Smart India Hackathon (SIH) Internal 2026 — Problem Statement PS-04*

---

## 1. System Architecture

```
                 REAL ORBITAL DATA SOURCE (CelesTrak / Space-Track)
                                       │
                                       ▼
                       DATA INGESTION & TLE VALIDATION
                    (NORAD Modulo-10 Checksum & SGP4 Init)
                                       │
                                       ▼
                          RELATIONAL DATABASE (SQLite / PostgreSQL)
                    (orbital_objects, tle_records, conjunctions, alerts)
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
            SGP4 / SKYFIELD PROPAGATOR         CONJUNCTION SCREENING ENGINE
         (TEME ➔ ECEF ➔ WGS84 Geodetic)      (Broad Radial Shell + 10s TCA Refine)
                      │                                 │
                      ▼                                 ▼
          REAL-TIME TELEMETRY & POSITIONS     CONJUNCTION RISK SCORE (0-100)
                      │                                 │
                      └────────────────┬────────────────┘
                                       │
                                       ▼
                    REST API & BATCH EPHEMERIS ENDPOINTS
                                       │
                                       ▼
                    MISSION CONTROL DASHBOARD & 3D GLOBE
          (Realistic Earth, Sun, Moon, Stars, GPU Instancing, SGP4 Trails)
```

---

## 2. Key Features

- **Real Orbital Ingestion:** Ingests live Two-Line Elements (TLEs) from CelesTrak across active satellites, space stations, and orbital debris.
- **Strict Data Integrity (Live vs Demo Isolation):** Never silently replaces failed live requests with demo data. Displays live errors with explicit operator controls (`[RETRY SYNC]` or `[USE DEMO DATA]`).
- **Analytical SGP4 / WGS84 Propagation:** Computes true TEME Cartesian state vectors and Bowring's closed-form geodetic coordinates (Latitude, Longitude, Altitude).
- **Multi-Tier Conjunction Engine:** Broad-phase radial apogee/perigee envelope filtering + localized 10-second sub-stepping narrow phase to locate the exact Time of Closest Approach (TCA) and 3D Euclidean separation.
- **Explainable Conjunction Risk Scoring (0–100):** Multi-factor deterministic risk model factoring miss distance (55%), relative kinetic velocity (25%), and reaction lead time (20%).
- **World-Class 3D Celestial Globe:** Built with Three.js featuring realistic colorful Earth (oceans, continents, atmosphere), solar day/night illumination, lunar orbit, 4000+ deep-space stars, and GPU-instanced asset rendering.
- **Interactive Trajectories & Ground Tracks:** On-demand SGP4 trajectory computation (15m, 1h, 3h, 6h, 12h, 24h) and projected sub-satellite ground tracks.

---

## 3. Tech Stack

- **Backend:** Python 3.9+, FastAPI, SQLAlchemy, SGP4, Skyfield, Pydantic v2, Uvicorn, Pytest.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Three.js, Lucide Icons.
- **Database:** SQLite (local development) / PostgreSQL & Supabase (production).
- **Deployment:** Docker, Docker Compose, Nginx.

---

## 4. API Reference

| Endpoint | Method | Description |
|----------|:------:|-------------|
| `/api/health` | `GET` | System health and service status |
| `/api/data/status` | `GET` | Live data synchronization and catalog metrics |
| `/api/data/sync` | `POST` | Trigger TLE catalog synchronization (`mode=LIVE` or `mode=DEMO`) |
| `/api/objects` | `GET` | Paginated orbital object catalog (`page`, `page_size`, `search`, `type`) |
| `/api/objects/{id}/details` | `GET` | Complete metadata and Keplerian orbital elements |
| `/api/objects/{id}/position` | `GET` | Real-time SGP4 position and geodetic telemetry |
| `/api/objects/{id}/trajectory` | `GET` | Future orbital trajectory points across prediction window |
| `/api/objects/{id}/ground-track` | `GET` | Sub-satellite ground track path over Earth |
| `/api/objects/positions` | `GET` | High-performance batch position ephemeris for 3D globe |
| `/api/conjunctions` | `GET` | List all detected conjunction events |
| `/api/conjunctions/high-risk` | `GET` | List critical and high-risk conjunction events |
| `/api/conjunctions/screen` | `POST` | Execute conjunction screening across tracked objects |
| `/api/alerts` | `GET` | List active collision risk alerts |

---

## 5. Scientific Methodology & Coordinate Systems

### 5.1 Coordinate Frames
1. **TEME (True Equator Mean Equinox):** Standard inertial frame output by SGP4.
2. **ECEF (Earth-Centered, Earth-Fixed):** Computed by rotating TEME through Greenwich Mean Sidereal Time ($\theta_{GMST}$):
   $$\begin{pmatrix} x_{ecef} \\ y_{ecef} \\ z_{ecef} \end{pmatrix} = \begin{pmatrix} \cos\theta_{GMST} & \sin\theta_{GMST} & 0 \\ -\sin\theta_{GMST} & \cos\theta_{GMST} & 0 \\ 0 & 0 & 1 \end{pmatrix} \begin{pmatrix} x_{teme} \\ y_{teme} \\ z_{teme} \end{pmatrix}$$
3. **WGS84 Geodetic Coordinates:** Converted via Bowring's closed-form algorithm yielding Geodetic Latitude ($\phi$), Longitude ($\lambda$), and Height ($h$) above the reference ellipsoid ($a = 6378.137\text{ km}$, $f = 1/298.257223563$).

### 5.2 Conjunction Risk Scoring vs Probability of Collision ($P_c$)
ORBITGUARD employs a deterministic **Conjunction Risk Score (0–100)**:
- $S_{total} = S_{distance} (55\text{ pts max}) + S_{velocity} (25\text{ pts max}) + S_{lead\_time} (20\text{ pts max})$

> **Scientific Transparency Note:** Full Probability of Collision ($P_c$) integration (e.g. Foster-1992 or Akella-Alfriend 2D collision plane integrals) requires full 6x6 state covariance matrices, which are not distributed in open TLE datasets. OrbitGuard transparently labels this metric as **Conjunction Risk Score**.

---

## 6. Local Setup & Execution

### Prerequisites
- Python 3.9+
- Node.js 18+ & npm

### Backend Setup
```bash
# 1. Navigate to repository root
cd /Users/kundan/Downloads/ORBITGUARD

# 2. Activate virtual environment & install dependencies
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# 3. Launch FastAPI backend server
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
# 1. Navigate to frontend directory
cd /Users/kundan/Downloads/ORBITGUARD/frontend

# 2. Install dependencies & start Vite dev server
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Automated Testing Suite

Run the full pytest suite (25 automated unit & integration tests):
```bash
PYTHONPATH=. pytest backend/tests/
```

Run the standalone end-to-end orbital calculation pipeline test:
```bash
PYTHONPATH=. pytest -s backend/tests/test_real_orbital_pipeline.py
```

---

## 8. Docker Deployment

```bash
docker-compose up --build
```
- Backend: [http://localhost:8000/docs](http://localhost:8000/docs)
- Frontend: [http://localhost:5173](http://localhost:5173)
