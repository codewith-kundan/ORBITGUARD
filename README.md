# 🛰️ ORBITGUARD — Space Situational Awareness & Orbital Defense Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-orbitguard--six.vercel.app-00f2fe?style=for-the-badge&logo=vercel)](https://orbitguard-six.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_60_FPS-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![SGP4 Engine](https://img.shields.io/badge/Physics-SGP4_%2F_WGS84-cyan?style=for-the-badge)](https://celestrak.org)
[![Defense Compliance](https://img.shields.io/badge/CCSDS-CDM_Compliant-purple?style=for-the-badge)](https://public.ccsds.org)

> **"TRACK → PROPAGATE → SCREEN → OPTIMIZE → PROTECT"**
> 
> *An authentic, research-grade, GPU-accelerated Space Situational Awareness (SSA) & Collision Risk Intelligence Platform designed for space operators, defense analysts, and commercial mega-constellations.*

---

## 📌 Table of Contents
1. [Executive Summary & Problem Statement](#-1-executive-summary--the-orbital-congestion-crisis)
2. [Key Features & Capabilities](#-2-key-features--capabilities)
3. [System Architecture](#-3-system-architecture)
4. [Astrodynamic & Mathematical Rigor](#-4-astrodynamic--mathematical-rigor)
5. [Space Defense & Tactical Toolset](#-5-space-defense--tactical-toolset)
6. [API Reference & Data Standards](#-6-api-reference--data-standards)
7. [Local Quickstart & Verification](#-7-local-quickstart--verification)
8. [Pitch Deck & Presentation Guide](#-8-pitch-deck--hackathon-presentation-guide)

---

## 🌌 1. Executive Summary: The Orbital Congestion Crisis

### The Problem
* **36,500+ tracked objects** (>10 cm) and over **1,000,000 lethally untracked fragments** orbit Earth at hypersonic velocities (~7.8 km/s — 10x faster than a rifle bullet).
* Commercial mega-constellations (Starlink, OneWeb, Project Kuiper) are launching **thousands of new satellites annually**, increasing orbital crowding by over **400%** in this decade.
* A single high-velocity collision can trigger the **Kessler Syndrome** — an exponential, runaway cascade of orbital collisions that could render entire Low Earth Orbit (LEO) shells unusable for generations, threatening critical global GPS, weather monitoring, telecommunications, and national defense assets.

### The OrbitGuard Solution
**OrbitGuard** bridges the gap between raw military radar feeds and actionable flight-director intelligence:
* **High-Throughput WebGL Astrodynamics**: Real-time 3D propagation of **3,000–5,000 objects simultaneously at a smooth 60 FPS**.
* **Automated Foster-2D Conjunction Screening**: Instantaneous close-approach detection ($d_{\text{miss}}$, TCA countdown, collision probability $P_c$).
* **Autonomous CAM Planner**: Instant $\Delta V$ collision avoidance burn vector calculation with hydrazine fuel budget estimations.
* **Mission-Ready Defense Dossiers**: 1-click **Executive SITREP PDF generator** and **CCSDS CDM XML/KVN export** for NASA/ISRO/ESA space agencies.

---

## ⚡ 2. Key Features & Capabilities

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            ORBITGUARD CORE ENGINE                            │
├──────────────────────┬───────────────────────┬───────────────────────────────┤
│   3D ASTRODYNAMICS   │  CONJUNCTION SCREENER │      TACTICAL SSA SUITE       │
│ • 3,000+ Sats @ 60FPS│ • Foster-2D Algorithm │ • NOAA Space Weather (Kp, F10)│
│ • Custom GPU Shaders │ • Exact TCA Minimize  │ • Kessler Density Heatmap     │
│ • Day/Night Split    │ • CAM ΔV Burn Vectors │ • Defense SITREP (PDF Export) │
│ • 1X–500X Time Warp  │ • CCSDS CDM Export    │ • Kinetic ASAT Missile Sim    │
│ • +24h Orbit Scrub   │ • Covariance Ellipses │ • Citizen Sky Spotter         │
└──────────────────────┴───────────────────────┴───────────────────────────────┘
```

### 1. High-Density 3D Astrodynamics Engine
- **Hardware-Accelerated WebGL/Three.js**: Utilizes GPU `InstancedMesh` with custom billboard shaders to aggregate thousands of orbital bodies into ~4 draw calls, preserving a butter-smooth **60 FPS**.
- **Interactive Swarm Density Selector**: Toggle dynamically between `⚡ Lite (1.2k)`, `🚀 Standard (3.0k)`, and `🛰️ Ultra (5.0k)` object swarms.
- **Time Machine & Orbit Scrubber**: Pause, rewind, accelerate time (`1X`, `10X`, `50X`, `100X`, `500X`), or scrub up to `+24 hours` into the future to inspect converging orbital encounters.
- **Dynamic Solar Terminator**: Accurately renders Earth's day/night dividing curve and sub-solar point based on real astronomical time.

### 2. 2D Ground Track & Ground Station Coverage
- Real-time sub-satellite geographic coordinates, orbital ribbons, and visibility cones for global deep-space tracking stations (Svalbard, Diego Garcia, Thule, Cape Canaveral, Hartebeesthoek).

### 3. SGP4 Conjunction Screening & CAM Burn Planner
- Computes 3D Euclidean Miss Distance ($d_{\text{miss}}$), Time of Closest Approach (TCA), and relative velocity ($\mathbf{v}_{\text{rel}}$).
- Formulates optimal in-track (prograde/retrograde) and out-of-plane cross-track $\Delta V$ maneuvers using the **Tsiolkovsky Rocket Equation**.

---

## 🏗️ 3. System Architecture

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
                  │ • CAM Maneuver Vector Optimizer (ΔV, Fuel N2H4) │
                  │ • CCSDS CDM Export Engine (XML / KVN)           │
                  └────────────────────────┬────────────────────────┘
                                           │
                                           ▼
                  ┌─────────────────────────────────────────────────┐
                  │             FastAPI Backend REST Layer          │
                  └────────────────────────┬────────────────────────┘
                                           │
                                           ▼
                  ┌─────────────────────────────────────────────────┐
                  │        Frontend 3D WebGL Real-Time Client       │
                  │ (Three.js GPU Instancing, 60 FPS Swarm, React)  │
                  └─────────────────────────────────────────────────┘
```

---

## 🔬 4. Astrodynamic & Mathematical Rigor

### 1. Coordinate Frame Transformations
Orbital positions are propagated using standard **SGP4** in the **TEME** (True Equator Mean Equinox) inertial frame, rotated to **ECEF** (Earth-Centered Earth-Fixed) via Greenwich Mean Sidereal Time (GMST), and projected to **WGS84 Geodetic** (Latitude, Longitude, Altitude):
$$\theta_{\text{GMST}} = 280.46061837 + 360.98564736629 \cdot (JD - 2451545.0) \pmod{360^\circ}$$

### 2. Foster-2D Collision Probability ($P_c$)
When positional covariance matrices ($\mathbf{C}_A, \mathbf{C}_B$) are bounded at TCA, the combined encounter covariance $\mathbf{C} = \mathbf{C}_A + \mathbf{C}_B$ is projected onto the 2D encounter plane (B-plane):
$$P_c = \frac{1}{2\pi \sqrt{|\mathbf{C}_{2D}|}} \iint_{\mathcal{A}} \exp\left(-\frac{1}{2} \mathbf{r}^T \mathbf{C}_{2D}^{-1} \mathbf{r}\right) d x \, d y$$
*(where $\mathcal{A}$ is the combined hard-body collision cross-section disk of radius $R = R_A + R_B$)*.

### 3. Collision Avoidance Maneuver (CAM) $\Delta V$ & Propellant Budget
Calculates the required impulsive delta-V to shift the encounter miss distance beyond safety thresholds:
$$\Delta r_{\text{in-track}} \approx 3 a \, \omega \, \Delta t \cdot \left(\frac{\Delta v_{\text{prograde}}}{v_{\text{orb}}}\right)$$
Propellant mass consumption ($\Delta m$) is determined via the **Tsiolkovsky Rocket Equation**:
$$\Delta m = m_0 \left(1 - \exp\left(-\frac{\Delta V}{I_{\text{sp}} \, g_0}\right)\right)$$
*(where $I_{\text{sp}} = 220\text{ s}$ for standard satellite Monopropellant Hydrazine $N_2H_4$ thrusters)*.

### 4. Explainable OrbitGuard Risk Score (0–100)
A multi-parameter heuristic screening score when full covariance is unconstrained:
$$\text{Score} = 0.55 \cdot S_{\text{distance}} + 0.25 \cdot S_{\text{velocity}} + 0.20 \cdot S_{\text{time\_to\_TCA}}$$

---

## 🛡️ 5. Space Defense & Tactical Toolset

All accessible in 1 click from the top **SSA TOOLS** command bar:

| Tool | Focus | Real-World Operational Impact |
| :--- | :--- | :--- |
| ☀️ **Space Weather** | NOAA SWPC Solar Storms | Tracks $Kp$ geomagnetic index and $F_{10.7}$ Solar Flux to predict elevated atmospheric drag on LEO orbits. |
| 👁️ **Sky Spotter** | Topocentric Observation | Computes azimuth, elevation, and visual magnitude for naked-eye visible passes over global cities. |
| 🚀 **Upcoming Missions** | Global Launch & Reentry | Live manifest of upcoming rocket launches (SpaceX, ISRO, Rocket Lab) and decaying orbital stages. |
| 🔥 **Kessler Heatmap** | Spatial Object Crowding | Maps debris density across altitude shells ($150\text{ km}$ to $36,000\text{ km}$) to identify critical cascade zones. |
| 📄 **Defense SITREP** | Executive Briefing Dossier | Formats active conjunctions and threat parameters into a 1-click **Print / PDF export** intelligence report. |
| 💥 **ASAT Missile Sim** | Kinetic Threat Modeling | Simulates direct-ascent kinetic missile intercepts, calculating fragment counts and multi-decade decay timelines. |

---

## 📡 6. API Reference & Data Standards

| Endpoint | Method | Output / Standard | Description |
|:---|:---:|:---|:---|
| `/api/objects/positions` | `GET` | JSON Batch (`limit=3000`) | Real-time SGP4 Cartesian & Geodetic state vectors |
| `/api/conjunctions` | `GET` | JSON List | Active close encounters with Miss Distance, TCA, and Risk Scores |
| `/api/cam/simulate` | `POST` | JSON (`CAMPlanResponse`) | Computes optimal $\Delta V$ burn vector and fuel consumption |
| `/api/compliance/cdm/{id}` | `GET` | **CCSDS CDM (XML / KVN)** | Generates international Conjunction Data Message |
| `/api/spotter/visible-passes` | `GET` | JSON Look-Angles | Computes topocentric pass window and elevation angles |
| `/api/statistics` | `GET` | JSON Analytics | System-wide orbital population and debris state breakdown |

---

## 💻 7. Local Quickstart & Verification

### Prerequisites
- **Node.js**: v18.0+ & `npm`
- **Python**: 3.10+ & `pip`

### 1. Clone & Setup
```bash
git clone https://github.com/codewith-kundan/ORBITGUARD.git
cd ORBITGUARD
```

### 2. Start Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run automated tests (44/44 passing)
pytest tests/ -v

# Launch server
python3 ../start.py
# ➔ API running at http://localhost:8000
```

### 3. Start Frontend (React + Three.js)
```bash
cd ../frontend
npm install
npm run build   # Type-check and production bundle
npm run dev     # Vite local server
# ➔ UI running at http://localhost:5173
```

---

## 🎯 8. Pitch Deck & Hackathon Presentation Guide

### The 60-Second Elevator Pitch
> *"Over 10,000 satellites and 36,000 pieces of debris travel at 10 times the speed of a bullet in Low Earth Orbit. A single collision could trigger a chain reaction that knocks out global GPS, weather satellites, and communications.*
> 
> ***OrbitGuard** is a high-performance Space Situational Awareness platform. We render 3,000+ live satellites at 60 FPS in 3D WebGL, screen close encounters mathematically using the Foster-2D algorithm, and calculate optimal collision-avoidance thruster burns in seconds. Whether you are a satellite constellation operator, a space defense analyst, or a researcher, OrbitGuard protects critical assets in orbit."*

### Key Presentation Demos
1. **Live 3D Swarm**: Show the 3,000-object swarm rotating smoothly at 60 FPS with Day/Night solar lighting.
2. **Time Machine**: Drag the `PROPAGATE` slider forward 6 hours to watch satellites orbit Earth and converge on conjunction hotspots.
3. **Collision Avoidance (CAM)**: Open a critical conjunction, view the miss distance (<1 km), and trigger the **CAM Planner** to compute the $\Delta V$ thruster burn.
4. **Defense SITREP**: Click **`DEFENSE SITREP`** in the SSA bar, show the intelligence briefing, and click **`PRINT / PDF`** to demonstrate executive reporting.

---

## 📜 License
OrbitGuard is open-source under the **[MIT License](LICENSE)**.
