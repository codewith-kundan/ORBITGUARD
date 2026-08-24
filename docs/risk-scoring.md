# Conjunction Risk Scoring Methodology

## 1. Score Definition
The **Conjunction Risk Score** ($S_{risk} \in [0, 100]$) is a deterministic, multi-factor engineering metric designed for rapid operator prioritization.

### Crucial Aerospace Scientific Distinction:
> **Important:** ORBITGUARD uses a deterministic screening index and does NOT label this "Probability of Collision ($P_c$)". True $P_c$ requires 3D position uncertainty covariance matrices (e.g. CCSDS Conjunction Data Messages - CDMs), which are not provided in open TLEs.

## 2. Multi-Factor Formula

$$S_{risk} = S_{dist} + S_{vel} + S_{time}$$

### Factor 1: Miss Distance Component ($S_{dist}$, Max 55 pts)
- $d_{min} \le 1.0\text{ km}$: $55.0$ pts (Critical)
- $1.0 < d_{min} \le 5.0\text{ km}$: $55.0 - (d_{min} - 1.0) \times \frac{15}{4}$ pts (High)
- $5.0 < d_{min} \le 15.0\text{ km}$: $40.0 - (d_{min} - 5.0) \times \frac{20}{10}$ pts (Moderate)
- $15.0 < d_{min} \le 30.0\text{ km}$: $20.0 - (d_{min} - 15.0) \times \frac{10}{15}$ pts (Low)
- $30.0 < d_{min} \le 50.0\text{ km}$: $10.0 - (d_{min} - 30.0) \times \frac{8}{20}$ pts (Minimal)
- $d_{min} > 50.0\text{ km}$: $0$ pts

### Factor 2: Relative Velocity Component ($S_{vel}$, Max 25 pts)
- $v_{rel} \ge 14.0\text{ km/s}$: $25.0$ pts (Extreme hypervelocity)
- $8.0 \le v_{rel} < 14.0\text{ km/s}$: $18.0 + (v_{rel} - 8.0) \times \frac{7}{6}$ pts
- $2.0 \le v_{rel} < 8.0\text{ km/s}$: $8.0 + (v_{rel} - 2.0) \times \frac{10}{6}$ pts
- $v_{rel} < 2.0\text{ km/s}$: $\max(2.0, v_{rel} \times 4.0)$ pts

### Factor 3: Time to TCA / Urgency ($S_{time}$, Max 20 pts)
- $\Delta t \le 2\text{ hours}$: $20.0$ pts (Immediate Urgency)
- $2 < \Delta t \le 6\text{ hours}$: $20.0 - (\Delta t - 2) \times \frac{6}{4}$ pts
- $6 < \Delta t \le 12\text{ hours}$: $14.0 - (\Delta t - 6) \times \frac{6}{6}$ pts
- $12 < \Delta t \le 24\text{ hours}$: $8.0 - (\Delta t - 12) \times \frac{4}{12}$ pts
- $\Delta t > 24\text{ hours}$: $2.0$ pts

## 3. Severity Categorization
- **0–30**: `LOW`
- **31–60**: `MEDIUM`
- **61–80**: `HIGH`
- **81–100**: `CRITICAL`
