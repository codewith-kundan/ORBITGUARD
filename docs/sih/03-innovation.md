# SIH 2026 — Key Innovations & Architecture

## Key Innovations (Slide 3 & 7)
1. **Multi-Scale Broad-to-Narrow Screening:**
   - Prunes 85% of pairwise computations via apogee/perigee envelope intersection checks.
   - 10-second sub-stepping TCA refinement achieves sub-kilometer distance precision without computational bottlenecks.
2. **Transparent Risk Factor Attribution:**
   - Explicit breakdown across Miss Distance (55%), Velocity (25%), and Reaction Lead Time (20%).
   - Eliminates "black-box" confusion for mission operators.
3. **Dual Offline Demo & Online Live Fallback:**
   - Guaranteed presentation reliability with automatic CelesTrak live detection and local fallback cache.

## Technical Architecture (Slide 6)
- **Backend:** FastAPI + SGP4 + NumPy + SQLAlchemy
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Three.js + Recharts
- **Database:** Indexed SQLite / PostgreSQL
- **Orchestration:** Docker Compose
