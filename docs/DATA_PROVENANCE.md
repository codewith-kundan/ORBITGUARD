# ORBITGUARD Authoritative Data Provenance & Telemetry Lineage
**Standard**: NASA Space Tracking Data Protocol / CCSDS Conjunction Architecture  
**Release**: `2.0.0-PROD`  

---

## 1. Upstream Data Ingestion Architecture

ORBITGUARD ingests orbital ephemerides from live public space domain awareness catalogs:
* **Primary Live Source**: CelesTrak General Perturbations (GP) Feeds / Space-Track.org
* **Format**: Two-Line Element Sets (TLEs) with 69-character Modulo-10 Checksum Verification
* **Sync Interval**: Configurable background sync worker (`backend/app/main.py`)
* **Fallbacks**: Offline cached catalog with deterministic SGP4 propagation if network is unavailable.

```
 [ Space-Track / CelesTrak ]
            │ (HTTP GET GP JSON/TLE)
            ▼
 ┌───────────────────────────────┐
 │   TLE INGESTION & CHECKSUM    │ ──> Validates Modulo-10 Checksums & Line Formats
 └──────────────┬────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │     SQLITE / POSTGRES DB      │ ──> Stores OrbitalObjects, TLERecords, SyncLogs
 └──────────────┬────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │   SGP4 / BOWRING PROPAGATOR   │ ──> Converts TEME to ECEF/WGS84 with GMST Rotation
 └──────────────┬────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │  3-TIER HIERARCHICAL SIEVE    │ ──> Broad-phase Shell Sieve -> SGP4 Array -> Secant TCA
 └──────────────┬────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │   PROVENANCE OBJECT IN UI     │ ──> Exact Timestamps, Frames, & Algorithm Metadata
 └───────────────────────────────┘
```

---

## 2. Immutable Provenance Metadata Schema

Every conjunction close-approach event carries complete provenance via `/api/validation/provenance/{id}`:

```json
{
  "conjunction_id": 1,
  "primary_asset": {
    "norad_id": 45697,
    "name": "STARLINK-2197",
    "type": "ACTIVE_SATELLITE",
    "epoch_utc": "2026-08-31T05:22:18.000Z",
    "rcs_size": "MEDIUM"
  },
  "secondary_asset": {
    "norad_id": 33855,
    "name": "COSMOS 2251 DEBRIS #55",
    "type": "DEBRIS",
    "epoch_utc": "2026-08-31T02:11:45.000Z",
    "rcs_size": "SMALL"
  },
  "encounter_metrics": {
    "tca_utc": "2026-08-31T18:42:15.500Z",
    "miss_distance_km": 1.0797,
    "relative_velocity_km_s": 14.9364,
    "collision_probability": 0.00034,
    "risk_score": 87,
    "risk_level": "CRITICAL"
  },
  "data_provenance": {
    "upstream_source": "CelesTrak GP Feeds",
    "source_status": "LIVE",
    "ingestion_timestamp_utc": "2026-08-31T12:00:00Z",
    "propagation_model": "SGP4 (AIAA 2006 Standard)",
    "coordinate_frame": "TEME (True Equator Mean Equinox)",
    "geodetic_ellipsoid": "WGS-84",
    "collision_probability_model": "Foster-2D Isotropic Hard-Body / 10k Monte Carlo",
    "algorithm_version": "2.0.0-PROD",
    "software_release": "ORBITGUARD SIH 2026",
    "calculation_timestamp_utc": "2026-08-31T14:10:00Z"
  }
}
```

---

## 3. Provenance Verification in Live Validation Center

Operators and judges can inspect complete provenance directly in the **Live Validation Center** (`/validation` tab) by selecting any conjunction from the catalog. The inspector displays:
1. Exact upstream source and ingestion timestamp.
2. Coordinate frames (TEME vs ECEF vs WGS-84 Geodetic).
3. Collision probability model and Monte Carlo iteration count.
4. Calculation execution timestamp and software build release.
