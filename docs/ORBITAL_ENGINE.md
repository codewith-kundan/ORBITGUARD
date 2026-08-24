# Orbital Propagation & Astrodynamics Engine

**SPACE SENTINEL** calculates satellite state vectors and look angles using the standard SGP4/SDP4 analytical perturbation theory and WGS84 geodetic transformations.

---

## 1. Coordinate Reference Frames

Orbital computations transition across 4 primary coordinate systems:

```
[TLE Ephemeris]
       │
       ▼ (SGP4 Model)
[True Equator Mean Equinox (TEME)]
       │
       ▼ (GMST Rotation Matrix)
[Earth-Centered Earth-Fixed (ECEF)]
  ┌────┴──────────────────────────┐
  ▼ (WGS84 Ellipsoid)             ▼ (Topocentric Horizon Transform)
[Geodetic: Lat, Lon, Alt]       [Topocentric ENU: Azimuth, Elevation, Range]
```

### Transformations:

#### A. TEME to ECEF
Greenwich Mean Sidereal Time (GMST) is calculated from Julian Date:
$$\theta_{\text{GMST}} = 280.46061837^\circ + 360.98564736629^\circ \times (JD - 2451545.0) + \dots$$

The rotation about the Z-axis:
$$\begin{bmatrix} x_{\text{ECEF}} \\ y_{\text{ECEF}} \\ z_{\text{ECEF}} \end{bmatrix} = \begin{bmatrix} \cos\theta & \sin\theta & 0 \\ -\sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x_{\text{TEME}} \\ y_{\text{TEME}} \\ z_{\text{TEME}} \end{bmatrix}$$

#### B. ECEF to WGS84 Geodetic
Using Bowring's iterative method for flattening $f = 1/298.257223563$ and semi-major axis $a = 6378.137\text{ km}$:
$$\lambda = \text{atan2}(y, x)$$
$$\phi = \arctan\left(\frac{z + e'^2 b \sin^3 \theta}{p - e^2 a \cos^3 \theta}\right)$$
$$h = \frac{p}{\cos\phi} - N(\phi)$$

#### C. ECEF to Topocentric ENU (East-North-Up)
Given observer geodetic coordinates $(\phi_{\text{obs}}, \lambda_{\text{obs}}, h_{\text{obs}})$:
$$\begin{bmatrix} e \\ n \\ u \end{bmatrix} = \begin{bmatrix} -\sin\lambda & \cos\lambda & 0 \\ -\sin\phi\cos\lambda & -\sin\phi\sin\lambda & \cos\phi \\ \cos\phi\cos\lambda & \cos\phi\sin\lambda & \sin\phi \end{bmatrix} \begin{bmatrix} \Delta x \\ \Delta y \\ \Delta z \end{bmatrix}$$

- **Azimuth**: $Az = (\text{atan2}(e, n) \times \frac{180^\circ}{\pi} + 360^\circ) \pmod{360^\circ}$
- **Elevation**: $El = \arcsin\left(\frac{u}{\sqrt{e^2 + n^2 + u^2}}\right) \times \frac{180^\circ}{\pi}$
- **Slant Range**: $\rho = \sqrt{e^2 + n^2 + u^2}$

---

## 2. Analytical SGP4 Perturbations Modeled

1. **Earth Oblateness Gravitational Harmonics ($J_2, J_3, J_4$)**:
   - Nodal regression of ascending node: $\dot{\Omega} = -\frac{3}{2} J_2 \left(\frac{R_E}{p}\right)^2 n \cos i$
   - Apsidal precession of perigee: $\dot{\omega} = \frac{3}{4} J_2 \left(\frac{R_E}{p}\right)^2 n (5\cos^2 i - 1)$
2. **Atmospheric Drag**:
   - Exponential atmospheric density decay using BSTAR parameter.
3. **Deep Space Resonances (SDP4)**:
   - Solar and Lunar gravitational third-body perturbations for periods $T > 225\text{ min}$ (MEO/GEO objects).
