# ORBITGUARD Collision Avoidance Maneuver (CAM) Validation & Mathematical Specification
**Standard**: AIAA Astrodynamics / NASA CARA / Curtis Orbital Mechanics  
**Release**: `2.0.0-PROD`  

---

## 1. Astrodynamic Formulations

### 1.1 Gauss Variational Along-Track Orbital Displacement
For an impulsive in-track burn $\Delta v_t$ applied at lead time $\Delta t$ prior to the Time of Closest Approach (TCA):
$$\Delta s_{\text{in-track}} = \frac{3}{2} \left(\frac{\Delta t}{a}\right) v_{\text{orb}} \Delta v_t$$
where:
* $a$ = Semi-major axis ($r_{\text{earth}} + h$) in km
* $v_{\text{orb}} = \sqrt{\mu / a}$ = Vis-viva circular orbital speed in km/s ($\mu = 398600.4418\text{ km}^3/\text{s}^2$)
* $\Delta t$ = Maneuver lead time prior to encounter ($12.0\text{ hours} = 43200\text{ s}$)
* $\Delta v_t$ = Along-track prograde/retrograde impulse in km/s

---

### 1.2 Tsiolkovsky Rocket Equation for Propellant Mass
$$\Delta m = m_0 \left(1 - \exp\left(-\frac{\Delta V}{I_{\text{sp}} g_0}\right)\right)$$
where:
* $m_0$ = Spacecraft initial wet mass ($500.0\text{ kg}$)
* $\Delta V = \sqrt{\Delta v_r^2 + \Delta v_t^2 + \Delta v_w^2}$ = Total impulse magnitude in m/s
* $I_{\text{sp}}$ = Monopropellant Hydrazine ($N_2H_4$) specific impulse ($220.0\text{ s}$)
* $g_0$ = Standard gravitational acceleration ($9.80665\text{ m/s}^2$)

**Reference Case**:
For $m_0 = 500\text{ kg}$, $I_{\text{sp}} = 220\text{ s}$, and $\Delta V = 0.505\text{ m/s}$:
$$\Delta m = 500 \cdot \left(1 - \exp\left(-\frac{0.505}{220 \times 9.80665}\right)\right) \approx 0.1170\text{ kg Hydrazine}$$

---

## 2. Multi-Candidate Strategy Evaluation Matrix

ORBITGUARD calculates 4 deterministic candidate strategies for every actionable conjunction:

| Strategy | Burn Vector | Primary Axis | $\Delta V$ Budget | Fuel ($N_2H_4$) | Clearance Gain | Secondary Safety |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Prograde In-Track** | $+\mathbf{v}$ | In-Track | $0.620\text{ m/s}$ | $0.144\text{ kg}$ | $+32.8\text{ km}$ | 0 Hazards (Safe) |
| **Retrograde In-Track** | $-\mathbf{v}$ | In-Track | $0.620\text{ m/s}$ | $0.144\text{ kg}$ | $+32.8\text{ km}$ | 0 Hazards (Safe) |
| **Cross-Track Out-of-Plane** | $+\mathbf{w}$ | Normal | $1.450\text{ m/s}$ | $0.336\text{ kg}$ | $+18.2\text{ km}$ | 0 Hazards (Safe) |
| **Minimum Fuel Multi-Axis** | $\Delta v_t + \Delta v_r$ | Optimal | $0.505\text{ m/s}$ | $0.117\text{ kg}$ | $+26.9\text{ km}$ | 0 Hazards (Safe) |

---

## 3. Human-in-the-Loop Mission Decision Workflow

1. **AI Strategy Evaluation**: Evaluates $\Delta V$, fuel cost, miss distance gain, and secondary risk, highlighting the **AI Flight Dynamics Recommendation**.
2. **Operator Decision Controls**:
   * `[ APPROVE MANEUVER ]`: Transitions state to `APPROVED` and stages burn sequence.
   * `[ REJECT ]`: Rejects maneuver with operational justification.
   * `[ OVERRIDE PARAMETERS ]`: Allows manual flight director adjustment of $\Delta V$ components and lead time.
   * `[ AUDIT EVIDENCE JSON ]`: Exports full JSON telemetry payload with mathematical proofs.
3. **Post-CAM Verification Audit**: Displays Before vs After comparison:
   * Miss Distance: $1.08\text{ km} \rightarrow 28.00\text{ km}$ ($+26.92\text{ km}$ gain)
   * Collision Probability $P_c$: $3.4\times 10^{-4} \rightarrow < 10^{-7}$ ($99.9\%$ reduction)
   * Operational Risk: $\text{CRITICAL (87)} \rightarrow \text{NOMINAL (5)}$
   * Secondary Conjunctions Screened: $0$ hazards detected.
