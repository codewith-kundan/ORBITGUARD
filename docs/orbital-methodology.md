# Orbital Propagation Methodology

## 1. Mathematical Framework
ORBITGUARD implements the analytical **Simplified General Perturbations-4 (SGP4)** orbital propagation model.

### Keplerian Extraction
From TLE Line 2:
- $i$: Orbital inclination in degrees
- $e$: Orbital eccentricity
- $n$: Mean motion (revolutions / day)

Mean motion conversion to angular frequency:
$$n_{rad/s} = \frac{n \times 2\pi}{86400}$$

Semi-Major Axis ($a$):
$$a = \left(\frac{\mu}{n_{rad/s}^2}\right)^{1/3}$$
where $\mu = 398600.4418 \text{ km}^3/\text{s}^2$ is the Earth gravitational parameter.

Perigee ($h_p$) and Apogee ($h_a$) relative to WGS84 Earth radius ($R_E = 6378.137\text{ km}$):
$$h_p = a(1 - e) - R_E$$
$$h_a = a(1 + e) - R_E$$

## 2. Coordinate Transformation (TEME $\to$ ECEF $\to$ Geodetic)
SGP4 produces state vectors $(\vec{r}_{TEME}, \vec{v}_{TEME})$ in the True Equator Mean Equinox frame.

To compute Greenwich Mean Sidereal Time ($\theta_{GMST}$):
$$\theta_{GMST}(T_u) = 24110.54841 + 8640184.812866 T_u + 0.093104 T_u^2 - 6.2\times 10^{-6} T_u^3$$
where $T_u$ is Julian centuries from J2000.0.

Rotate TEME to ECEF:
$$\begin{bmatrix} x_{ECEF} \\ y_{ECEF} \\ z_{ECEF} \end{bmatrix} = \begin{bmatrix} \cos\theta_{GMST} & \sin\theta_{GMST} & 0 \\ -\sin\theta_{GMST} & \cos\theta_{GMST} & 0 \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x_{TEME} \\ y_{TEME} \\ z_{TEME} \end{bmatrix}$$

Convert ECEF to Geodetic $(\phi, \lambda, h)$ using Bowring's closed-form method on the WGS84 ellipsoid ($a = 6378.137\text{ km}$, $f = 1/298.257223563$).
