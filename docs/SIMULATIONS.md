# Space Simulation Engine: Breakups, Kessler Syndrome & ADR

**SPACE SENTINEL** includes an astrodynamics simulation engine for educational and research modeling of orbital breakups, long-term collision cascades, and active debris removal missions.

---

## 1. What-If Fragmentation & NASA Standard Breakup Model

When a satellite experiences an on-orbit explosion or hypervelocity kinetic collision, the number of fragments exceeding characteristic length $L_c$ is determined by the NASA Standard Breakup Model:

$$N(L_c) = 0.1\, M_{\text{dry}}^{0.75}\, L_c^{-1.71}$$

where $M_{\text{dry}}$ is the spacecraft mass in kilograms.

### Gabbard Dispersion Dynamics:
Each generated fragment receives an isotropic velocity impulse $\Delta V$ from an exponential velocity distribution:
$$\Delta V \sim \text{Exp}(\lambda = 1 / \sigma_v)$$

The resulting fragment orbit parameters (new perigee $r_p'$ and apogee $r_a'$) satisfy:
$$\mathcal{E}' = \frac{1}{2} \|\mathbf{v} + \Delta \mathbf{v}\|^2 - \frac{\mu}{r}$$
$$a' = -\frac{\mu}{2\mathcal{E}'}, \quad e' = \sqrt{1 - \frac{\|\mathbf{r} \times (\mathbf{v} + \Delta \mathbf{v})\|^2}{\mu a'}}$$

### Atmospheric Drag Decay:
Lifetime estimation follows King-Hele orbital contraction due to atmospheric scale height $H$:
$$\Delta a_{\text{orbit}} \approx -2\pi \frac{C_D A}{m} \rho_p a^2 \exp(-c) \left[I_0(c) + 2e I_1(c)\right]$$

---

## 2. Multi-Year Kessler Syndrome Cascade Simulator

The Kessler simulator models long-term coupled differential growth of active satellites $S(t)$ and debris fragments $D(t)$:

$$\frac{dS}{dt} = L_{\text{annual}} - \gamma_{\text{deorbit}} S - \kappa_{\text{col}} S(S + D)$$

$$\frac{dD}{dt} = (1 - \eta_{\text{PMD}}) \gamma_{\text{retire}} S + N_{\text{frags}} \kappa_{\text{col}} (S + D)^2 - \lambda_{\text{decay}}(h) D$$

### Key Parameters:
- **$L_{\text{annual}}$**: Megaconstellation launch replenishment rate.
- **$\eta_{\text{PMD}}$**: Post-Mission Disposal (PMD) compliance percentage (5-year / 25-year rule).
- **$N_{\text{frags}}$**: Average lethal fragments created per hypervelocity collision ($~450\text{ frags}$).
- **$\kappa_{\text{col}}$**: Spatial density collision cross-section probability coefficient.
- **Cascade Tipping Point**: Year when self-sustaining collisional fragment generation outpaces atmospheric decay rate $\left(\frac{dD}{dt}\Big|_{\text{collisions}} > \frac{dD}{dt}\Big|_{\text{decay}}\right)$.

---

## 3. Active Debris Removal (ADR) Mitigation Model

Based on the Liou & Johnson remediation model (removing $5 - 20$ high-mass derelict rocket bodies and defunct satellites annually from crowded LEO shells: 750–850 km and 950–1050 km):

$$\Delta P_{\text{cascade}}(t) = - \int_0^t N_{\text{removals}}(\tau) \cdot \sigma_{\text{target}} \cdot \bar{\rho}_{\text{flux}}(\tau) \, d\tau$$

### Modeled Removal Technologies:
1. **Robotic Arm & Harpoon Capture**: High-mass upper stage deorbiting ($>1000\text{ kg}$).
2. **Electrodynamic Tethers & Drag Sails**: Accelerated plasma drag deorbit for smallsats.
3. **Laser Ablation Momentum Impartation**: Ground/space-based photon pressure perigee lowering.
