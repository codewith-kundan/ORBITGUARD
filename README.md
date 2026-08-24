# SPACE SENTINEL — Space Debris Tracking & Conjunction Risk Assessment Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000.svg?logo=three.js)](https://threejs.org/)
[![SGP4](https://img.shields.io/badge/Orbital_Mechanics-SGP4_WGS84-cyan.svg)](https://celestrak.org)
[![Pytest](https://img.shields.io/badge/Tests-25%20Passing-brightgreen.svg)](backend/tests/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"Accessible, Real-Time Space Situational Awareness & Satellite Collision Risk Prediction Platform"**
> 
> *Notice: This system is a research/educational conjunction screening platform and is not an operational collision-avoidance service.*

---

## 1. System Architecture

```
                    EXTERNAL DATA SOURCE (CelesTrak)
                                  │
                                  ▼
                   DATA INGESTION & TLE VALIDATION
              (Modulo-10 Checksum & Keplerian Parsing)
                                  │
                                  ▼
                     DATABASE (SQLite / PostgreSQL)
            (orbital_objects, tle_records, sync_logs, conjunctions)
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
    SGP4 / WGS84 PROPAGATOR              CONJUNCTION SCREENING ENGINE
 (TEME ➔ ECEF ➔ WGS84 Geodetic)       (3-Phase Sieve + Fine Golden Step)
              │                                       │
              ▼                                       ▼
  REAL-TIME UTC POSITIONS & PATHS      CONJUNCTION RISK SCORE (0–100)
              │                                       │
              └───────────────────┬───────────────────┘
                                  │
                                  ▼
                         FASTAPI REST BACKEND
                                  │
                                  ▼
                 3D WEBGL COMMAND CENTER (Three.js)
    (Realistic Earth, Sun Day/Night Geometry, Moon, GPU Instancing)
```

---

## 2. Six Core Capabilities

### 1. Real Orbital Data
- Ingests real General Perturbations (GP) Two-Line Element (TLE) ephemeris directly from **CelesTrak** across active payloads, space stations, and tracked orbital debris.
- Modular data provider abstraction (`BaseDataProvider` $\to$ `CelesTrakProvider`) with local failover caching.
- Validates Modulo-10 checksums, epoch timestamps, and extracts true Keplerian orbital elements (inclination, eccentricity, mean motion, semi-major axis, perigee, apogee).

### 2. Real Database
- Relational schema storing indexed `orbital_objects`, `tle_records`, `conjunctions`, and `sync_logs`.
- Normalized indexes on `norad_id`, `name`, `object_type`, `epoch`, and `perigee_km`/`apogee_km`.

### 3. Real Orbit Propagation
- Authoritative calculation layer powered by the C-accelerated standard SGP4 orbital propagator.
- Transforms coordinates: **TEME** (True Equator Mean Equinox) $\to$ **ECEF** (via Greenwich Mean Sidereal Time rotation) $\to$ **WGS84 Geodetic** (Latitude, Longitude, Altitude, Speed) strictly in **UTC**.
- Generates true future orbital trajectory points (+5min, +10min... +90min/period) for selected objects.

### 4. Real 3D Visualization
- WebGL Three.js Earth with color-calibrated day/night illumination computed from real-time Sun/Earth solar geometry.
- Real Moon orbital position calculated via celestial mechanics.
- GPU-instanced rendering of ~20,000 tracked objects at 60 FPS (Cyan = Active Satellites, Red = Debris, Amber = Rocket Bodies, Magenta = Screened Hotspots).
- Object inspector showing: Name, NORAD ID, Classification, Current Altitude, Velocity, Lat, Lon, Epoch, Source, and Last Update.

### 5. Conjunction Detection
- 3-Phase spatial screening engine evaluating candidate close approaches over configurable prediction windows (default 24h).
- **Phase 1**: Apogee/Perigee altitude overlap sieve eliminates $>99\%$ non-intersecting candidate pairs without expensive propagation.
- **Phase 2**: Coarse multi-point SGP4 stepping.
- **Phase 3**: Golden Section search finding exact Time of Closest Approach (TCA), 3D Euclidean Miss Distance ($d_{\text{miss}}$), and relative velocity ($\mathbf{v}_{\text{rel}}$).

### 6. Risk Analysis & Live Synchronization
- Deterministic, explainable **Conjunction Risk Score (0–100)**:
  - **Miss Distance Component (Max 55 pts)**: Exponential penalty for close encounters $< 5\text{ km}$.
  - **Relative Velocity Component (Max 25 pts)**: Kinetic destruction scaling for hypervelocity crossings $> 10\text{ km/s}$.
  - **Lead Time Urgency (Max 20 pts)**: Reaction window before TCA.
- Automated periodic background sync (`SYNC_INTERVAL_MINUTES=30`).
- Resilient cached data failover: network errors preserve existing valid data and display clear cached status indicators.

---

## 3. Coordinate Transformations

1. **TEME $\to$ ECEF**:
   $$\begin{bmatrix} x_{\text{ECEF}} \\ y_{\text{ECEF}} \\ z_{\text{ECEF}} \end{bmatrix} = \begin{bmatrix} \cos\theta_{\text{GMST}} & \sin\theta_{\text{GMST}} & 0 \\ -\sin\theta_{\text{GMST}} & \cos\theta_{\text{GMST}} & 0 \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x_{\text{TEME}} \\ y_{\text{TEME}} \\ z_{\text{TEME}} \end{bmatrix}$$

2. **ECEF $\to$ WGS84 Geodetic**:
   Using Bowring's closed-form method on WGS84 ellipsoid ($a = 6378.137\text{ km}, f = 1/298.257223563$):
   $$\lambda = \text{atan2}(y, x), \quad \phi = \arctan\left(\frac{z + e'^2 b \sin^3 \theta}{p - e^2 a \cos^3 \theta}\right), \quad h = \frac{p}{\cos\phi} - N(\phi)$$

---

## 4. API Endpoints Reference

| Endpoint | Method | Description |
|:---|:---:|:---|
| `/api/health` | `GET` | System health and database connectivity status |
| `/api/data/status` | `GET` | Current provider status and catalog metrics |
| `/api/data/sync` | `POST` | Trigger ephemeris sync (`mode=LIVE` or `mode=DEMO`) |
| `/api/objects` | `GET` | Paginated catalog (`page`, `page_size`, `search`, `object_type`) |
| `/api/objects/{id}/details` | `GET` | Complete metadata and Keplerian orbital elements |
| `/api/objects/{id}/position` | `GET` | Real-time SGP4 coordinates (TEME, ECEF, Geodetic) |
| `/api/objects/{id}/trajectory` | `GET` | Future orbital trajectory points (+24h) |
| `/api/objects/{id}/ground-track` | `GET` | Projected sub-satellite ground trace |
| `/api/objects/positions` | `GET` | High-performance batch ephemeris for 3D globe |
| `/api/conjunctions` | `GET` | Screened close approach events with TCA and miss distance |
| `/api/conjunctions/high-risk` | `GET` | Critical and high-risk conjunction events |
| `/api/conjunctions/screen` | `POST` | Execute 24h conjunction screening |
| `/api/statistics` | `GET` | System-wide orbital population metrics |

---

## 5. Quickstart & Verification

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run automated tests (25/25 passing)
PYTHONPATH=. pytest tests/ -v

# Start FastAPI development server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
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

## 6. Environment Variables (`.env`)

```env
APP_NAME=SPACE SENTINEL
APP_ENV=production
API_PORT=8000
API_HOST=0.0.0.0
CORS_ORIGINS=*

DATABASE_URL=sqlite:///./data/orbitguard.db

ORBITAL_DATA_PROVIDER=CelesTrak
SYNC_INTERVAL_MINUTES=30
DEFAULT_PREDICTION_WINDOW_HOURS=24
CONJUNCTION_THRESHOLD_KM=500.0
```

---

## 7. Known Limitations
1. **Covariance Data**: Public Two-Line Element (TLE) sets do not provide 6x6 error covariance matrices; conjunction screening calculates deterministic geometric miss distances and relative velocities rather than formal covariance-based Probability of Collision ($P_c$).
2. **SGP4 Propagation Uncertainty**: SGP4 accuracy is typically within $\sim 1\text{ km}$ at epoch and degrades over several days due to unmodeled space weather atmospheric fluctuations.

---

## 8. License
Licensed under the [MIT License](LICENSE).
