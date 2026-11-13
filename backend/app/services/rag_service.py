import re
from typing import Dict, Any, List, Optional

class RAGService:
    """
    Authoritative Technical Knowledge Base & RAG Layer for ORBITGUARD.
    Provides verified aerospace documentation from:
    - CCSDS 508.0-B-1 Conjunction Data Message Blue Book
    - NASA CARA (Conjunction Assessment Risk Analysis) Guidelines
    - NOAA Space Weather Prediction Center (SWPC) Manuals
    - AFSPC / AIAA SGP4/SDP4 Astrodynamics Standards
    - King-Hele Orbital Decay & Upper Atmosphere Models
    - NASA Standard Breakup Model & Gabbard Dispersion
    """

    KNOWLEDGE_CORPUS = [
        {
            "id": "CCSDS_508_CDM",
            "title": "CCSDS 508.0-B-1 Conjunction Data Message (CDM) Standard",
            "keywords": ["cdm", "ccsds", "conjunction data message", "kvn", "xml", "caram", "interoperability"],
            "technical_basis": "The Consultative Committee for Space Data Systems (CCSDS) 508.0-B-1 Blue Book defines the universal standard for exchanging space conjunction data between satellite operators, tracking networks, and government agencies (NASA CARA, ESA Space Debris Office, ISRO NETRA).",
            "project_evidence": "ORBITGUARD implements complete automated CCSDS 508.0-B-1 XML and KVN message generation in `ComplianceService` with verified TEME/WGS84 state vectors and encounter covariance matrices.",
            "sources": "CCSDS 508.0-B-1 Blue Book (June 2013) / NASA Conjunction Assessment Program"
        },
        {
            "id": "NASA_CARA_PC_THRESHOLDS",
            "title": "NASA CARA Collision Probability (Pc) & Actionable Safety Thresholds",
            "keywords": ["risk threshold", "actionable pc", "cara", "red alert", "foster", "1e-4", "collision probability"],
            "technical_basis": "NASA CARA defines standard operational risk thresholds: Red Threshold (Pc >= 1.0e-4 or 0.01%) mandates evaluating and executing a Collision Avoidance Maneuver (CAM); Yellow Threshold (1.0e-7 <= Pc < 1.0e-4) requires enhanced tracking and thruster readiness; Green (Pc < 1.0e-7) is nominal.",
            "project_evidence": "ORBITGUARD evaluates encounter risk dynamically using Foster-2D isotropic covariance integrals, Akella-Alfriend curvilinear probability, and 10,000 Monte Carlo perturbation bounds.",
            "sources": "NASA SP-20205011404 Conjunction Assessment Risk Analysis Best Practices Handbook"
        },
        {
            "id": "GAUSS_TSIOLKOVSKY_CAM",
            "title": "Gauss Variational Equations & Tsiolkovsky Propellant Budgeting for CAM",
            "keywords": ["cam", "delta v", "tsiolkovsky", "gauss", "fuel", "propellant", "hydrazine", "n2h4", "burn"],
            "technical_basis": "Along-track displacement Delta s prior to TCA is governed by Gauss variational equations: for an in-track prograde burn Delta v_t, separation grows approximately as Delta s = 3 * (Delta t / a) * v_orb * Delta v_t / 2. Propellant expenditure is computed from the Tsiolkovsky Rocket Equation: Delta m = m_0 * (1 - exp(-Delta V / (Isp * g0))).",
            "project_evidence": "ORBITGUARD's CAMService computes 4 maneuver candidates (Prograde, Retrograde, Cross-Track, and Combined Optimal) and screens the post-maneuver orbit against secondary objects.",
            "sources": "Vallado, D. A. (2013). Fundamentals of Astrodynamics and Applications / Curtis Orbital Mechanics"
        },
        {
            "id": "SGP4_TEME_WGS84",
            "title": "SGP4 / SDP4 Ephemeris Propagation & Coordinate Frame Transformations",
            "keywords": ["sgp4", "sdp4", "teme", "ecef", "wgs84", "tle", "geodetic", "bowring"],
            "technical_basis": "SGP4 propagates Two-Line Element (TLE) ephemerides accounting for Earth oblateness (J2, J3, J4 zonal harmonics), low-altitude atmospheric drag, and deep-space lunar/solar perturbations. State vectors in the TEME frame are rotated to ECEF via GMST and converted to WGS-84 geodetic coordinates via Bowring's method.",
            "project_evidence": "ORBITGUARD executes C-accelerated SGP4 propagation and Bowring transformations in PropagationService, validated against Vallado AIAA 2006-6753 reference test vectors.",
            "sources": "AIAA 2006-6753 Revisiting Spacetrack Report #3 / US Space Force"
        },
        {
            "id": "NOAA_SPACE_WEATHER_DRAG",
            "title": "NOAA Space Weather Coupling & Thermospheric Density Perturbations",
            "keywords": ["space weather", "solar flux", "f10.7", "kp index", "geomagnetic storm", "atmospheric drag", "king-hele"],
            "technical_basis": "Elevated solar radio flux (F10.7 > 150 sfu) and geomagnetic storms (Kp >= 5.0) heat and expand the thermosphere, increasing neutral density in LEO (200-600 km) and accelerating along-track orbital decay and TCA phase drift.",
            "project_evidence": "ORBITGUARD couples planetary Kp and solar F10.7 flux indices in DecayService to estimate ballistic lifetime and atmospheric drag profiles.",
            "sources": "NOAA Space Weather Prediction Center / King-Hele Satellite Orbits in an Atmosphere"
        }
    ]

    @classmethod
    def query_knowledge(cls, query: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves matching authoritative domain knowledge entry based on query keywords.
        """
        q_lower = query.lower()
        best_match = None
        highest_score = 0

        for entry in cls.KNOWLEDGE_CORPUS:
            score = sum(1 for kw in entry["keywords"] if kw in q_lower)
            if score > highest_score:
                highest_score = score
                best_match = entry

        return best_match if highest_score > 0 else None

    @classmethod
    def format_rag_response(
        cls,
        answer: str,
        technical_basis: str,
        project_evidence: str,
        sources: str
    ) -> str:
        """
        Formats standardized RAG response:
        ANSWER -> TECHNICAL BASIS -> PROJECT EVIDENCE -> SOURCES
        """
        return (
            f"{answer}\n\n"
            f"TECHNICAL BASIS:\n{technical_basis}\n\n"
            f"IMPLEMENTATION & EVIDENCE:\n{project_evidence}\n\n"
            f"SOURCES:\n{sources}"
        )
