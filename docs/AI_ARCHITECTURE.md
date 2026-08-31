# ORBITGUARD Physics-Grounded AI Architecture
**Classification**: Mission Decision Support & Astrodynamics Intelligence Engine  
**Release**: `2.0.0-PROD`  
**Security Policy**: Zero LLM Physics Calculation / Deterministic Backend Execution Only  

---

## 1. Executive Overview & Core Directives

ORBITGUARD uses a **Physics-Grounded AI Copilot Architecture**. Large Language Models (LLMs) are **never** permitted to calculate orbital mechanics, numerical integration, coordinate transformations, collision probabilities, or $\Delta V$ burns. 

Instead, the AI Copilot operates strictly as an intelligent query classifier and interface layer over **15 allowlisted deterministic backend physics tools**, backed by an authoritative RAG knowledge base.

```
                    ┌───────────────────────────────┐
                    │      USER / OPERATOR QUERY    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │    INTENT CLASSIFIER & RAG    │
                    │   (CCSDS / NASA CARA Corpus)  │
                    └───────────────┬───────────────┘
                                    │ Dispatches authorized tool
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             STRICT ALLOWLISTED TOOL REGISTRY           │
       │  • get_object()          • calculate_tca()             │
       │  • propagate_object()    • calculate_miss_distance()   │
       │  • find_conjunctions()   • calculate_collision_prob() │
       │  • simulate_cam()        • verify_post_cam()           │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                STRUCTURED EVIDENCE OBJECT              │
       │   { conjunction_id, miss_distance_km, rel_vel_km_s,   │
       │     collision_probability, tca, epoch, algorithm_ver } │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             DIGIT VALIDATOR & SANITIZATION             │
       │    (Verifies every number in text matches evidence     │
       │     within +/-1% tolerance; suppresses hallucinations) │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       VERIFIED OUTPUT TO UI   │
                    │  + Source Badges & Tool Logs  │
                    └───────────────────────────────┘
```

---

## 2. Authorized Backend Tool Registry

| Tool Function | Description | Deterministic Physics Backend |
| :--- | :--- | :--- |
| `get_object(object_id)` | Catalog lookup by NORAD ID or name | SQLite / SQLAlchemy SATCAT query |
| `get_orbital_data(object_id)` | Returns semi-major axis, eccentricity, period | Keplerian orbital elements extractor |
| `get_tle(object_id)` | Fetches raw two-line element set | TLE repository with Modulo-10 checksum |
| `propagate_object(object_id, epoch)` | Propagates state vector to target epoch | C-accelerated SGP4 + Bowring WGS84 |
| `find_conjunctions(a, b)` | Screen encounters across catalog assets | 3-Tier Spatial Sieve ($98\%$ pruning) |
| `calculate_tca(conjunction_id)` | Calculates sub-second zero-crossing epoch | Orthogonal Secant Root Solver ($\mathbf{r}\cdot\mathbf{v}=0$) |
| `calculate_miss_distance(id)` | Computes exact Euclidean separation | Analytic Cartesian Norm $\sqrt{\Delta x^2+\Delta y^2+\Delta z^2}$ |
| `calculate_relative_velocity(id)` | Computes encounter velocity magnitude | Analytic Velocity Norm $\sqrt{\Delta v_x^2+\Delta v_y^2+\Delta v_z^2}$ |
| `calculate_collision_probability(id)` | Calculates collision probability ($P_c$) | Foster-2D Isotropic Integral + 10k Monte Carlo |
| `calculate_risk(conjunction_id)` | Evaluates multi-factor composite risk score | Deterministic weighted risk formula (0–100) |
| `simulate_cam(conjunction_id, dv, ...)` | Simulates impulsive orbital maneuver | Gauss Variational Equations |
| `optimize_cam(conjunction_id)` | Evaluates 4 candidate CAM burn strategies | Multi-axis $\Delta V$ optimization |
| `verify_post_cam(conjunction_id, ...)` | Pre-vs-Post maneuver verification | Before vs After delta metrics & secondary check |
| `generate_cdm(conjunction_id)` | Generates standard CCSDS 508.0-B-1 CDM | XML and KVN message builder |
| `generate_sitrep(conjunction_id)` | Generates executive defense briefing | Tactical SITREP generator |

---

## 3. Structured Evidence Object & Digit Validator

Every mission query compiles an internal, immutable **Evidence Object**:
```json
{
  "conjunction_id": 1,
  "primary_asset": "STARLINK-2197",
  "secondary_asset": "COSMOS 2251 DEBRIS #55",
  "tca": "2026-08-31T18:42:15.500Z",
  "miss_distance_km": 1.0797,
  "relative_velocity_km_s": 14.9364,
  "collision_probability": 0.00034,
  "risk_score": 87,
  "risk_level": "CRITICAL",
  "data_epoch": "2026-08-31T12:00:00Z",
  "source": "Space-Track.org / CelesTrak GP",
  "calculation_timestamp": "2026-08-31T14:10:00Z",
  "algorithm_version": "2.0.0-PROD"
}
```

### Digit Validator Enforcement:
1. All numerical quantities in the generated explanation are parsed via regex.
2. Each extracted number is checked against the numbers present in the Evidence Object.
3. If a number deviates by more than $\pm 1\%$ without grounding, the response is aligned or suppressed.
4. If a requested metric is unmeasured, the engine outputs: `"This value is unavailable from the current evidence."`

---

## 4. Authoritative Source Labeling & Audit Logs

Every response rendered in the UI includes verified source badges:
* `[✓ Physics Engine]`: Output computed directly by SGP4 or Gauss equations.
* `[✓ Live CelesTrak Data]`: Ingested from live NORAD/CelesTrak GP feeds.
* `[⚡ Simulation Result]`: Output of deterministic CAM simulation.
* `[ℹ AI Interpretation]`: Natural language tactical explanation and mission reasoning.

The UI also includes an expandable **AI Tool Execution Audit Log** displaying tool name, input arguments, execution duration in milliseconds, and raw tool output.
