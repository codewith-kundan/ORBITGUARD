# ORBITGUARD 🛰️🛡️
**Smart India Hackathon (SIH) 2026 — Problem Statement PS-04**
> *Accessible Space Situational Awareness & Satellite Collision Risk Prediction Dashboard*

---

## 📌 Overview
ORBITGUARD is a high-performance, deterministic space situational awareness platform designed to ingest public Two-Line Element (TLE) orbital sets, propagate trajectories analytically via SGP4/Skyfield, perform geometric broad-to-narrow conjunction screening, compute Time of Closest Approach (TCA) and miss distance, and score collision risks.

## 🏗️ Architecture Pipeline
```
TLE Ingestion (CelesTrak / Local Cache)
          ↓
Analytical Orbital Propagation (SGP4 / Skyfield)
          ↓
Future 3D Ephemeris & Geodetic Coordinates
          ↓
Conjunction Detection Engine (Broad-Phase Apogee/Perigee + Narrow-Phase Time Stepping)
          ↓
Time of Closest Approach (TCA) & Relative Velocity Calculation
          ↓
Conjunction Risk Scoring (0–100 Multi-Factor Deterministic Algorithm)
          ↓
Visualization & Alert System (2D Ground Track / 3D Orbital Spheres + Risk Alerts)
```

## 🚀 Tech Stack
- **Backend:** Python 3.9+, FastAPI, SGP4, Skyfield, NumPy, SQLAlchemy, Pydantic v2
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Three.js
- **Data Source:** CelesTrak public GP/TLE datasets with local fallback caching
- **Testing:** Pytest, Vite TypeScript compiler

## 🛠️ Quick Start

### 1. Backend Setup
```bash
# Set up Python virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Run backend server
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Run Automated Tests
```bash
PYTHONPATH=. backend/venv/bin/pytest backend/tests/
```
