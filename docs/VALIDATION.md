# ORBITGUARD Scientific Validation & Benchmark Specification
**Standard**: NASA CARA / ESA Space Debris / AIAA Astrodynamics Framework  
**Version**: `2.0.0-PROD`  
**Automated Verification Suite**: `tests/validation/` & `scripts/run_validation.py`  

---

## 1. Mathematical Formulations & Coordinate Frames

### 1.1 Coordinate Systems & Frame Transformations
ORBITGUARD defines all Cartesian states in the **TEME (True Equator Mean Equinox)** inertial reference frame as specified in Spacetrack Report #3.
* **TEME $\rightarrow$ ECEF Transformation**:
  $$\mathbf{r}_{\text{ECEF}} = \mathbf{R}_z(\theta_{\text{GMST}}) \mathbf{r}_{\text{TEME}}$$
  where $\theta_{\text{GMST}}$ is Greenwich Mean Sidereal Time in radians calculated from Julian Date $JD$:
  $$\theta_{\text{GMST}} = 280.46061837 + 360.98564736629 \times (JD - 2451545.0) \pmod{360^\circ}$$
* **ECEF $\rightarrow$ WGS-84 Geodetic Transformation (Bowring's Closed-Form Formulation)**:
  * Equatorial semi-major axis $a = 6378.137\text{ km}$, flattening $f = 1/298.257223563$, polar axis $b = a(1-f) = 6356.7523142\text{ km}$.
  * First eccentricity squared $e^2 = 2f - f^2$, second eccentricity squared $e'^2 = (a^2 - b^2)/b^2$.
  * Parametric latitude angle $\theta = \arctan\left(\frac{z \cdot a}{p \cdot b}\right)$ where $p = \sqrt{x^2 + y^2}$.
  * Geodetic latitude $\phi = \arctan\left(\frac{z + e'^2 b \sin^3\theta}{p - e^2 a \cos^3\theta}\right)$.
  * Prime vertical radius $N(\phi) = \frac{a}{\sqrt{1 - e^2 \sin^2\phi}}$.
  * Altitude $h = \frac{p}{\cos\phi} - N(\phi)$.

---

### 1.2 3-Tier Hierarchical Spatial Sieve & Orthogonal TCA Solver
To eliminate $O(N^2)$ scaling bottlenecks across 35,000+ objects:
1. **Tier 1 (Broad-Phase Shell Sieve)**:
   $$\text{Candidate Pair iff } [r_{p,A} - \Delta r, r_{a,A} + \Delta r] \cap [r_{p,B} - \Delta r, r_{a,B} + \Delta r] \neq \emptyset$$
   where $\Delta r = 75\text{ km}$ buffer.
2. **Tier 2 (Vectorized SGP4 Array Screening)**:
   Evaluates relative position array $\Delta \mathbf{r}(t) = \mathbf{r}_A(t) - \mathbf{r}_B(t)$ in coarse 3-minute steps using `satrec.sgp4_array(jd_arr, fr_arr)`.
3. **Tier 3 (Sub-Second Orthogonal TCA Root Solver)**:
   Isolates local distance minima by solving the orthogonality condition:
   $$f(t) = \Delta \mathbf{r}(t) \cdot \Delta \mathbf{v}(t) = 0$$
   using bracketed Secant root-finding with Golden Section Search fallback ($0.1\text{ ms}$ precision).

---

### 1.3 Collision Probability ($P_c$) Models

#### Foster-2D Isotropic Hard-Body Encounter Model
Projects 3D covariance matrices onto the 2D encounter B-plane perpendicular to relative velocity $\mathbf{v}_{\text{rel}}$:
$$P_c = \frac{1}{2\pi \sigma_x \sigma_y} \iint_{\mathcal{H}} \exp\left(-\frac{x^2}{2\sigma_x^2} - \frac{y^2}{2\sigma_y^2}\right) dx\,dy$$
where $\mathcal{H}$ is the circular collision disk of combined hard-body radius $R_A + R_B$. For isotropic positional uncertainty $\sigma$:
$$P_c = \frac{R^2}{2\sigma^2} \exp\left(-\frac{d^2}{2\sigma^2}\right)$$

#### Akella-Alfriend Curvilinear Formulation
Accounts for curved orbital trajectories during high-velocity shallow crossings:
$$P_c^{\text{curv}} = P_c^{\text{Foster}} \times \left(1 + \frac{\kappa^2 \sigma_r^2}{2}\right)^{-1/2}$$
where $\kappa$ is the relative orbital path curvature.

#### Vectorized 10,000-Iteration Monte Carlo Sampling
Perturbs 3D state vectors $\mathbf{r}_A \sim \mathcal{N}(\mathbf{r}_A, \mathbf{\Sigma}_A)$ and $\mathbf{r}_B \sim \mathcal{N}(\mathbf{r}_B, \mathbf{\Sigma}_B)$ over 10,000 stochastic iterations to evaluate non-Gaussian tail risks.

---

### 1.4 Collision Avoidance Maneuver (CAM) & Propellant Budget
* **Gauss In-Track Impulsive Burn Equation**:
  $$\Delta s_{\text{in-track}} = \frac{3}{2} \left(\frac{\Delta t}{a}\right) v_{\text{orb}} \Delta v_t$$
* **Tsiolkovsky Propellant Mass Expenditure**:
  $$\Delta m = m_0 \left(1 - \exp\left(-\frac{\Delta V}{I_{\text{sp}} g_0}\right)\right)$$
  where Monopropellant Hydrazine ($N_2H_4$) specific impulse $I_{\text{sp}} = 220\text{ s}$ and $g_0 = 9.80665\text{ m/s}^2$.

---

## 2. Benchmark Reference Datasets & Tolerances

| Subsystem | Reference Source | Measured Parameter | Strict Tolerance | Pass Criterion |
| :--- | :--- | :--- | :--- | :---: |
| **SGP4 Propagation** | Spacetrack Report #3 / Vallado 2006 | Cartesian TEME $[X,Y,Z]$ | $\le 0.010\text{ km}$ | $100\%$ |
| **SGP4 Velocity** | Spacetrack Report #3 / Vallado 2006 | Cartesian TEME $[V_x,V_y,V_z]$ | $\le 0.0001\text{ km/s}$ | $100\%$ |
| **Coordinate Transform** | WGS-84 Ellipsoid Standard | Geodetic Coordinates $[\phi, \lambda, h]$ | $\le 0.001\text{ km}$ | $100\%$ |
| **TCA Root Solver** | Orthogonality $\Delta\mathbf{r} \cdot \Delta\mathbf{v} = 0$ | Zero-Crossing Convergence | $\le 0.0001\text{ s}$ | $100\%$ |
| **Miss Distance** | Analytic Vector Norm | $\sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}$ | $\le 0.001\text{ km}$ | $100\%$ |
| **Foster-2D $P_c$** | Analytical Gaussian Integral | Collision Probability % | $\le 0.0001\%$ | $100\%$ |
| **CAM Fuel Budget** | Tsiolkovsky Rocket Equation | Hydrazine Mass $\Delta m$ | $\le 0.005\text{ kg}$ | $100\%$ |

---

## 3. How to Execute Automated Validation

```bash
# 1. Run full validation benchmark script & generate HTML/JSON reports:
python3 scripts/run_validation.py

# 2. Run pytest suite across validation and unit tests:
export PYTHONPATH=.
pytest tests/validation/ backend/tests/ -v
```
