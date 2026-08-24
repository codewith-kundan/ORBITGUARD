# Conjunction Detection & Screening Methodology

## 1. Problem Formulation
Conjunction Assessment (CA) requires identifying if any pair of orbiting objects $(A, B)$ will violate a defined safety volume (e.g. 50 km spherical screening threshold) over a future prediction window $T \in [t_0, t_0 + \Delta t]$.

## 2. Multi-Tiered Screening Pipeline

### Tier 1: Broad-Phase Orbital Altitude Screening
Instead of testing all $\frac{N(N-1)}{2}$ pairs over all time steps, objects are first filtered by radial apogee/perigee envelopes:
$$[h_{p,A} - \Delta h_{buf}, h_{a,A} + \Delta h_{buf}] \cap [h_{p,B} - \Delta h_{buf}, h_{a,B} + \Delta h_{buf}] \neq \emptyset$$
Pairs in disjoint orbital altitudes (e.g. Starlink LEO 550 km vs GEO 35,786 km) are eliminated instantly in $O(1)$.

### Tier 2: Intermediate Coarse Propagation
For passing pairs, state vectors are propagated forward using 5-minute discrete time steps:
$$d(t) = \|\vec{r}_A(t) - \vec{r}_B(t)\|$$
If $d(t) < 120\text{ km}$, a close approach candidate window $[t - \Delta t_{coarse}, t + \Delta t_{coarse}]$ is registered.

### Tier 3: Narrow-Phase TCA Refinement (10-Second Sub-Stepping)
Within the candidate window, fine 10-second sub-stepping locates the local minimum separation:
$$TCA = \arg\min_{t} \|\vec{r}_A(t) - \vec{r}_B(t)\|$$
$$d_{min} = \|\vec{r}_A(TCA) - \vec{r}_B(TCA)\|$$
$$v_{rel} = \|\vec{v}_A(TCA) - \vec{v}_B(TCA)\|$$
