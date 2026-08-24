# Orbital Ephemeris Ingestion & Data Pipeline

**SPACE SENTINEL** ingests real orbital ephemeris data (Two-Line Element sets / General Perturbation elements) from authoritative space surveillance sources.

---

## 1. Provider Abstraction Layer

The system defines a modular `BaseDataProvider` interface in `backend/app/services/data_providers/`:

```
                  ┌────────────────────────┐
                  │    DataProviderManager │
                  └───────────┬────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐
│ CelesTrakProvider│  │ SatNOGSProvider │  │SpaceTrackProvider│
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
┌────────┴────────┐
│ LocalFallback   │ (Offline verified cache)
└─────────────────┘
```

### Supported Providers:
1. **CelesTrak (`CelesTrakProvider`)**:
   - Fetches GP ephemeris sets in parallel across curated groups:
     - Space Stations (`/gp.php?GROUP=stations&FORMAT=tle`)
     - Brightest Active Satellites (`/gp.php?GROUP=visual&FORMAT=tle`)
     - Starlink Megaconstellation (`/gp.php?GROUP=starlink&FORMAT=tle`)
     - OneWeb Fleet (`/gp.php?GROUP=oneweb&FORMAT=tle`)
     - Global Navigation GNSS (GPS, GLONASS, Galileo, BeiDou) (`/gp.php?GROUP=gnss&FORMAT=tle`)
     - 1982/2009 Collision Fragments (`/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle`)
2. **Space-Track (`SpaceTrackProvider`)**:
   - Official USSPACECOM 18th Space Defense Squadron repository.
   - Authenticates via `SPACETRACK_USERNAME` and `SPACETRACK_PASSWORD` environment variables.
3. **SatNOGS (`SatNOGSProvider`)**:
   - Open-source satellite tracking ground station network feed (`https://db.satnogs.org/api/tle/`).
4. **Local Fallback Cache (`LocalFallbackProvider`)**:
   - High-fidelity offline TLE cache stored in `backend/app/data/tle_cache.json`.
   - Activated automatically if external networks are unreachable or firewalled.

---

## 2. Ingestion & TLE Parsing Workflow

1. Raw 3-line or 2-line TLE blocks are parsed using strict checksum validation.
2. Extracted orbital parameters include:
   - NORAD Catalog Number
   - International Designator (COSPAR ID)
   - Epoch Year & Day of Year (Julian date)
   - Orbital Inclination $i$ (degrees)
   - Right Ascension of Ascending Node $\Omega$ (degrees)
   - Eccentricity $e$
   - Argument of Perigee $\omega$ (degrees)
   - Mean Anomaly $M$ (degrees)
   - Mean Motion $n$ (revolutions/day)
   - BSTAR Drag Term ($1/\text{Earth Radii}$)
3. Derived Keplerian orbital elements:
   - Semi-major axis: $a = \left(\frac{\mu}{n^2}\right)^{1/3}$
   - Perigee altitude: $r_p = a(1 - e) - R_E$
   - Apogee altitude: $r_a = a(1 + e) - R_E$
   - Orbital period: $T = \frac{2\pi}{n}$
4. Objects are upserted into SQLite / PostgreSQL with atomic transaction locks.

---

## 3. Stale Ephemeris Diagnostics

The `/api/data/health` endpoint evaluates ephemeris age:
- **Fresh**: Epoch $< 3$ days old (nominal SGP4 accuracy).
- **Aging**: Epoch $3 - 7$ days old (minor in-track drift).
- **Stale**: Epoch $> 7$ days old (flagged for background re-synchronization).
