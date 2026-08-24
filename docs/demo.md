# ORBITGUARD — 3-Minute Live Hackathon Demo Script

## Timing & Stage Directions

### 0:00 – 0:30 | The Problem & Space Congestion Context
- **Speaker:** "Distinguished Jury, today Low Earth Orbit is experiencing exponential congestion with over 40,000 tracked objects and millions of lethal un-tracked debris fragments traveling at 8 km/s. Current Space Situational Awareness tools are either classified, locked behind enterprise paywalls, or fail to provide explainable risk screening."
- **Action:** Open ORBITGUARD mission control homepage (`http://localhost:5173`).

### 0:30 – 1:00 | Mission Control & Live TLE Ingestion
- **Speaker:** "This is ORBITGUARD. At the top right, you can see our real-time system status. We ingest live Two-Line Elements from CelesTrak, and our system includes an automatic local cached fallback for 100% hackathon demo reliability."
- **Action:** Point out `LIVE DATA ●` or `DEMO MODE ●` badge and 5 top StatCards. Click `SYNC TLE` button to demonstrate live refresh.

### 1:00 – 1:30 | Analytical SGP4 Propagation & 2D Ground Track
- **Speaker:** "Unlike mock dashboards, ORBITGUARD computes real SGP4 orbital mechanics. Notice the 2D Equirectangular map: each satellite is propagating its sub-satellite coordinates in real-time."
- **Action:** Click on `ISS (ZARYA)` or `STARLINK-1007` on the map. Show the projected ground track trajectory and open the real-time telemetry modal showing exact altitude, latitude, and 7.6 km/s orbital speed.

### 1:30 – 2:15 | Conjunction Detection & Explainable Risk Scoring
- **Speaker:** "Now let's examine the core aerospace innovation: our multi-tiered Conjunction Detection engine. It runs broad-phase apogee/perigee screening, followed by 10-second narrow-phase TCA refinement."
- **Action:** Click on a detected conjunction from the right-hand panel (e.g. `STARLINK-1007 ↔ STARLINK-1019` or debris conjunction).
- **Speaker:** "Notice our Conjunction Risk Score: 84/100. It transparently breaks down miss distance, hypervelocity kinetic impact potential, and lead time."

### 2:15 – 2:45 | Alert Center & 3D Celestial Globe
- **Speaker:** "High-risk conjunctions automatically dispatch actionable alerts for satellite operators to plan collision avoidance maneuvers. We also provide a complete 3D Celestial Earth Globe built in Three.js."
- **Action:** Navigate to the `Alerts` tab, acknowledge an active alert, then switch to the `3D Globe` tab and rotate the Earth with live orbital shells.

### 2:45 – 3:00 | Impact & Conclusion
- **Speaker:** "ORBITGUARD makes space safety accessible to universities, emerging commercial operators, and national space agencies. Thank you!"
