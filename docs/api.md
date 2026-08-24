# ORBITGUARD API Reference

Base URL: `http://localhost:8000/api`
Interactive Swagger Docs: `http://localhost:8000/docs`

## Endpoints

### System & Health
- `GET /api/health` — Service health verification
- `GET /api/statistics` — Aggregate system metrics (objects by type, risk distribution, status mode)

### Data Ingestion
- `POST /api/data/refresh` — Ingest live TLEs from CelesTrak (falls back to local cached dataset if offline)

### Objects
- `GET /api/objects` — List tracked objects (supports `?object_type=`, `?search=`, `?limit=`)
- `GET /api/objects/{id}` — Object metadata & Keplerian elements by ID or NORAD
- `GET /api/objects/{id}/position` — Real-time SGP4 3D coordinates & geodetic lat/lon/alt
- `GET /api/objects/{id}/trajectory` — Forward ephemeris points (supports `?hours=24&step_minutes=5`)

### Conjunctions
- `POST /api/conjunctions/screen` — Trigger broad-to-narrow screening across catalog
- `GET /api/conjunctions` — List detected conjunctions sorted by risk score
- `GET /api/conjunctions/high-risk` — List CRITICAL and HIGH severity conjunctions
- `GET /api/conjunctions/summary` — Aggregate counts and closest miss distance
- `GET /api/conjunctions/{id}` — Conjunction event details with risk factor breakdown

### Alerts
- `GET /api/alerts` — Collision alerts list (supports `?status=`, `?severity=`)
- `POST /api/alerts/{id}/acknowledge` — Acknowledge an active alert
