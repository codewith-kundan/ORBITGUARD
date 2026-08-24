# Conjunction Assessment & AI Risk Decision Support Engine

**SPACE SENTINEL** features a deterministic 3-phase conjunction screening engine paired with an explainable AI Collision Avoidance Maneuver (CAM) decision support model.

---

## 1. Conjunction Screening Pipeline

To evaluate $N \approx 20,000$ objects ($~200,000,000$ potential pairwise interactions) over a 72-hour screening window, the engine uses hierarchical spatial filtering:

```
[All 20,000 Objects]
         │
         ▼
[Phase 1: Geometric Apogee/Perigee Altitude Sieve]
(Eliminates >99% non-overlapping pairs without propagation)
         │ (Candidates: ~500 pairs)
         ▼
[Phase 2: Coarse SGP4 Stepping (60-second intervals)]
(Detects spherical bounding radius cross-tracks < 150 km)
         │ (Candidate Windows: ~150 pairs)
         ▼
[Phase 3: Golden Section Search & Sub-Second Step]
(Pinpoints exact Time of Closest Approach (TCA), Miss Distance, and Relative Velocity)
         │
         ▼
[Filtered Conjunctions & Collision Alerts Saved to DB]
```

### Mathematical Screening Criteria:
1. **Altitude Overlap Condition**:
   Pair $(A, B)$ is skipped if:
   $$r_{p,A} - r_{a,B} > d_{\text{threshold}} \quad \text{or} \quad r_{p,B} - r_{a,A} > d_{\text{threshold}}$$
2. **Time of Closest Approach (TCA) Optimization**:
   The distance function $f(t) = \|\mathbf{r}_A(t) - \mathbf{r}_B(t)\|$ is minimized using Golden Section search over local minima to find $t = \text{TCA}$.
3. **Relative Encounter Geometry**:
   - **Miss Distance**: $d_{\text{miss}} = \|\mathbf{r}_A(\text{TCA}) - \mathbf{r}_B(\text{TCA})\|$
   - **Relative Velocity**: $\mathbf{v}_{\text{rel}} = \mathbf{v}_A(\text{TCA}) - \mathbf{v}_B(\text{TCA})$
   - **Encounter Angle**: $\theta_{\text{enc}} = \arccos\left(\frac{\mathbf{v}_A \cdot \mathbf{v}_B}{\|\mathbf{v}_A\| \|\mathbf{v}_B\|}\right)$

---

## 2. Risk Classification Matrix

| Risk Level | Miss Distance ($d$) | Probability ($P_c$) | Recommended Operational Action |
|:---|:---|:---|:---|
| **CRITICAL** | $d < 1.0\text{ km}$ | $P_c > 10^{-4}$ | Immediate Collision Avoidance Maneuver (CAM) execution. |
| **HIGH** | $1.0 \le d < 5.0\text{ km}$ | $10^{-5} < P_c \le 10^{-4}$ | Spacecraft telemetry tracking, thruster pressurization. |
| **MEDIUM** | $5.0 \le d < 25.0\text{ km}$ | $10^{-6} < P_c \le 10^{-5}$ | Heightened radar observation, re-evaluate after next TLE epoch. |
| **LOW** | $25.0 \le d < 100.0\text{ km}$ | $P_c \le 10^{-6}$ | Nominal monitoring, catalog logging. |

---

## 3. Explainable AI Decision Support

The `/api/ai/predict-risk` endpoint applies an explainable multi-feature orbital risk model:

$$\text{Risk Score} = w_{\text{dist}} S_{\text{dist}} + w_{\text{vel}} S_{\text{vel}} + w_{\text{lead}} S_{\text{lead}} + w_{\text{cong}} S_{\text{cong}}$$

### Feature Contributions:
- **Miss Distance Proximity (50% Weight)**: Hyperbolic decay penalty $S_{\text{dist}} = 100 \times \exp\left(-\frac{d_{\text{miss}}}{10\text{ km}}\right)$
- **Relative Hypervelocity (25% Weight)**: Impact energy scales with $v_{\text{rel}}^2$ (kinetic destruction potential).
- **Lead Time Urgency (20% Weight)**: Maneuver lead time window before TCA.
- **Orbital Congestion (5% Weight)**: Density of surrounding objects within $\pm 50\text{ km}$ altitude shell.

### Output Insights:
- Recommended $\Delta V$ magnitude ($\text{m/s}$) and burn vector direction (Prograde / Retrograde / Radial-Out).
- Operational maneuver confidence score.
- Breakdown of feature contributions for transparent mission control decision making.
