import os
import sys
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import fitz

OUTPUT_PDF = "/Users/kundan/Downloads/ORBITGUARD/ORBITGUARD_SIH_2026_IDEA_PRESENTATION.pdf"
ASSETS_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/assets"

PAGE_WIDTH = 960
PAGE_HEIGHT = 540

C_NAVY_PRIMARY = colors.HexColor("#1A365D")
C_NAVY_DARK = colors.HexColor("#0F172A")
C_BLUE_ACCENT = colors.HexColor("#1E40AF")
C_CYAN_ACCENT = colors.HexColor("#0E7490")
C_BLUE_FOOTER = colors.HexColor("#0284C7")
C_TEXT_MAIN = colors.HexColor("#1E293B")
C_TEXT_MUTED = colors.HexColor("#475569")
C_BG_LIGHT = colors.HexColor("#F8FAFC")
C_BG_CARD = colors.HexColor("#FFFFFF")
C_BORDER_CARD = colors.HexColor("#CBD5E1")
C_WHITE = colors.HexColor("#FFFFFF")

def draw_header_footer(c, title_text, slide_num):
    c.setFillColor(C_BG_LIGHT)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # 1. Top Left Oval Team Badge
    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_NAVY_DARK)
    c.setLineWidth(1.2)
    c.roundRect(25, PAGE_HEIGHT - 65, 110, 50, 20, fill=1, stroke=1)
    
    c.setFillColor(C_NAVY_DARK)
    c.setFont("Helvetica", 8)
    c.drawCentredString(80, PAGE_HEIGHT - 32, "Your")
    c.setFont("Helvetica-Bold", 9.5)
    c.drawCentredString(80, PAGE_HEIGHT - 44, "Team")
    c.setFont("Helvetica", 8)
    c.drawCentredString(80, PAGE_HEIGHT - 56, "Name")

    # 2. Top Center Title
    c.setFillColor(C_NAVY_DARK)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - 48, title_text)

    # 3. Top Right SIH Logo
    logo_path = f"{ASSETS_DIR}/sih_logo_header.png"
    if os.path.exists(logo_path):
        c.drawImage(logo_path, PAGE_WIDTH - 165, PAGE_HEIGHT - 68, width=145, height=52, mask='auto')

    # 4. Bottom Footer Bar
    c.setFillColor(C_BLUE_FOOTER)
    c.rect(0, 0, PAGE_WIDTH, 26, fill=1, stroke=0)

    c.setFillColor(C_WHITE)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(PAGE_WIDTH / 2.0, 9, f"@SIH Idea submission- Template  {slide_num}")
    c.drawRightString(PAGE_WIDTH - 25, 9, str(slide_num))

def wrap_text(c, text, max_width, font_name, font_size):
    c.setFont(font_name, font_size)
    words = text.split(' ')
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        if c.stringWidth(test_line, font_name, font_size) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines

def generate_pdf():
    c = canvas.Canvas(OUTPUT_PDF, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    # ========================================================
    # SLIDE 1: TITLE PAGE
    # ========================================================
    c.setFillColor(C_BG_LIGHT)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # Top Heading
    c.setFillColor(C_NAVY_PRIMARY)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - 50, "SMART INDIA HACKATHON 2026")

    # Subheading
    c.setFillColor(C_NAVY_DARK)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - 76, "TITLE PAGE")

    # Top Right SIH Logo
    logo_path = f"{ASSETS_DIR}/sih_logo_header.png"
    if os.path.exists(logo_path):
        c.drawImage(logo_path, PAGE_WIDTH - 175, PAGE_HEIGHT - 76, width=150, height=52, mask='auto')

    # Left Container (Details Card)
    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.setLineWidth(1)
    c.roundRect(35, 40, 535, 405, 10, fill=1, stroke=1)

    details = [
        ("• Problem Statement ID –", "PS-04"),
        ("• Problem Statement Title –", "Space Debris Tracking & Satellite Collision Risk Prediction Dashboard"),
        ("• Theme –", "Space Technology"),
        ("• PS Category –", "Software"),
        ("• Team ID –", "SIH2026-PS04-OG01"),
        ("• Team Name –", "ORBITGUARD (Registered on portal)")
    ]

    y_pos = 412
    for label, val in details:
        c.setFillColor(C_NAVY_PRIMARY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(55, y_pos, label)
        
        c.setFillColor(C_TEXT_MAIN)
        lines = wrap_text(c, val, 480, "Helvetica", 10.5)
        for idx, line in enumerate(lines):
            c.drawString(70, y_pos - 16 - (idx * 14), line)
        
        y_pos -= (24 + len(lines) * 14)

    # Right Visual Container
    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.roundRect(585, 40, 340, 405, 10, fill=1, stroke=1)

    shot_3d = f"{ASSETS_DIR}/shot_space_view_card.png"
    if os.path.exists(shot_3d):
        c.drawImage(shot_3d, 598, 215, width=314, height=215, preserveAspectRatio=True, mask='auto')

    c.setFillColor(C_CYAN_ACCENT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(600, 195, "ORBITGUARD SSA PLATFORM")

    bullets_s1 = [
        "Real-time multi-source ephemeris ingestion (CelesTrak / Space-Track)",
        "Deterministic 3-phase conjunction screening for 35,000+ catalog objects",
        "Foster-2D Pc & Explainable Multi-Factor OrbitGuard Risk Scoring (0–100)",
        "Interactive 3D WebGL celestial globe & 2D tactical ground track view",
        "Automated collision alerts, CAM Delta-V planner & CCSDS CDM export"
    ]
    by = 175
    for b in bullets_s1:
        c.setFillColor(C_BLUE_ACCENT)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(600, by, "✔")
        c.setFillColor(C_TEXT_MUTED)
        lines = wrap_text(c, b, 300, "Helvetica", 7.8)
        for idx, l in enumerate(lines):
            c.drawString(612, by - (idx * 10), l)
        by -= (len(lines) * 10 + 5)

    c.showPage()

    # ========================================================
    # SLIDE 2: IDEA TITLE / PROPOSED SOLUTION
    # ========================================================
    draw_header_footer(c, "IDEA TITLE", 2)

    c.setFillColor(C_BLUE_ACCENT)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(35, PAGE_HEIGHT - 86, "❖ Proposed Solution (Describe your Idea/Solution/Prototype)")

    col_w = 280
    col_gap = 18
    col_h = 405
    col_y = 35

    cards_s2 = [
        {
            "title": "Detailed Explanation of Solution",
            "points": [
                ("ORBITGUARD Overview", "An open, high-precision Space Situational Awareness (SSA) and collision risk intelligence platform."),
                ("End-to-End Pipeline", "Ingests authoritative TLEs -> Validates Modulo-10 checksums -> Analytical SGP4 propagation -> 3-Phase spatial sieve -> Multi-factor risk engine -> 3D/2D WebGL visualizer -> Real-time alerts."),
                ("Operational Scale", "Fully functional full-stack architecture actively tracking 35,000+ space objects (satellites, debris, rocket stages) with deterministic sub-second updates.")
            ]
        },
        {
            "title": "How It Addresses Problem (PS-04)",
            "points": [
                ("Democratizes SSA Intelligence", "Breaks the monopoly of expensive, closed military/enterprise systems, empowering student teams, smallsat operators, and space startups."),
                ("Solves Pairwise Bottleneck", "Hierarchical apogee/perigee altitude filtering eliminates >99% non-crossing pairs in O(N log N) time, preventing compute overload."),
                ("Actionable Operator Guidance", "Converts raw orbital ephemerides into exact Time of Closest Approach (TCA), 3D miss distance, relative velocity, and lead-time alerts.")
            ]
        },
        {
            "title": "Innovation and Uniqueness",
            "points": [
                ("Dual-Engine Risk Model", "Combines an explainable 0–100 OrbitGuard Risk Score with formal Foster-2D Pc and 10,000 Monte Carlo stochastic perturbations."),
                ("Scientific Data Truth Badges", "Explicitly marks LIVE SGP4, CALCULATED, MODEL PREDICTION, SIMULATION, and DATA UNAVAILABLE (zero fabricated covariance)."),
                ("Integrated Mission Toolkit", "Includes Collision Avoidance Maneuver (CAM) Delta-V optimization, King-Hele atmospheric decay tracking, and CCSDS CDM export.")
            ]
        }
    ]

    for idx, card in enumerate(cards_s2):
        cx = 35 + idx * (col_w + col_gap)
        c.setFillColor(C_BG_CARD)
        c.setStrokeColor(C_BORDER_CARD)
        c.setLineWidth(1)
        c.roundRect(cx, col_y, col_w, col_h, 8, fill=1, stroke=1)

        c.setFillColor(C_NAVY_PRIMARY)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(cx + 14, col_y + col_h - 24, f"• {card['title']}")

        cy = col_y + col_h - 44
        for label, desc in card["points"]:
            c.setFillColor(C_BLUE_ACCENT)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(cx + 14, cy, f"▶ {label}:")
            cy -= 13

            c.setFillColor(C_TEXT_MAIN)
            lines = wrap_text(c, desc, col_w - 28, "Helvetica", 8)
            for l in lines:
                c.drawString(cx + 18, cy, l)
                cy -= 11
            cy -= 5

    c.showPage()

    # ========================================================
    # SLIDE 3: TECHNICAL APPROACH
    # ========================================================
    draw_header_footer(c, "TECHNICAL APPROACH", 3)

    # Left Column
    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.setLineWidth(1)
    c.roundRect(35, 35, 430, 430, 8, fill=1, stroke=1)

    c.setFillColor(C_NAVY_PRIMARY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(50, 442, "• Technologies to be used (Implemented Tech Stack)")

    techs = [
        ("Frontend", "React 18.3, TypeScript, Vite, Tailwind CSS, Three.js (WebGL 3D Earth, Shaders), Recharts, Lucide."),
        ("Backend & Orbital", "Python 3.9+, FastAPI (Async REST), C-accelerated SGP4/SDP4 (Satrec), Skyfield, NumPy, SQLAlchemy."),
        ("Database & Infra", "Indexed SQLite / PostgreSQL (spatial/perigee/apogee indices), Docker Compose, Background Daemons."),
        ("Data Sources", "CelesTrak (CSSI / AGI), Space-Track.org (18th SDS), Launch Library 2, NOAA SWPC (F10.7, Ap).")
    ]

    ty = 424
    for k, v in techs:
        c.setFillColor(C_BLUE_ACCENT)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, ty, f"✔ {k}:")
        c.setFillColor(C_TEXT_MAIN)
        lines = wrap_text(c, v, 320, "Helvetica", 8)
        for idx, l in enumerate(lines):
            if idx == 0:
                c.drawString(145, ty, l)
            else:
                c.drawString(65, ty, l)
            ty -= 10.5
        ty -= 3

    c.setFillColor(C_NAVY_PRIMARY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(50, ty - 4, "• Methodology and Process for Implementation")
    ty -= 20

    meths = [
        ("Transforms", "TLE -> TEME -> GMST -> ECEF -> WGS84 Geodetic (Lat, Lon, Alt) via Bowring's closed-form algorithm."),
        ("Phase 1 Sieve", "Apogee/Perigee altitude envelope filtering eliminates >99% non-overlapping pairs in O(N log N)."),
        ("Phase 2 & 3", "3-min coarse interval detect candidate windows; 10s sub-stepping & Golden Search finds exact TCA."),
        ("Risk Engine", "Score = 0.55*S_dist + 0.25*S_vel + 0.20*S_time + Foster-2D Pc & 10,000 Monte Carlo perturbations.")
    ]

    for k, v in meths:
        c.setFillColor(C_CYAN_ACCENT)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(55, ty, f"▶ {k}:")
        c.setFillColor(C_TEXT_MAIN)
        lines = wrap_text(c, v, 325, "Helvetica", 8)
        for idx, l in enumerate(lines):
            if idx == 0:
                c.drawString(145, ty, l)
            else:
                c.drawString(65, ty, l)
            ty -= 10.5
        ty -= 3

    # Right Column: Actual Screenshots Cards
    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.roundRect(485, 255, 440, 210, 8, fill=1, stroke=1)

    shot1_img = f"{ASSETS_DIR}/shot_space_view_card.png"
    if os.path.exists(shot1_img):
        c.drawImage(shot1_img, 495, 275, width=420, height=180, preserveAspectRatio=True, mask='auto')

    c.setFillColor(C_CYAN_ACCENT)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(500, 262, "▲ Working Prototype: Real-Time 3D WebGL Globe & SGP4 Orbital Object Tracking")

    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.roundRect(485, 35, 440, 210, 8, fill=1, stroke=1)

    shot2_img = f"{ASSETS_DIR}/shot_conjunction_matrix_card.png"
    if os.path.exists(shot2_img):
        c.drawImage(shot2_img, 495, 55, width=420, height=180, preserveAspectRatio=True, mask='auto')

    c.setFillColor(C_CYAN_ACCENT)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(500, 42, "▲ Working Prototype: Real-Time Conjunction Risk & Close Encounter Matrix Dashboard")

    c.showPage()

    # ========================================================
    # SLIDE 4: FEASIBILITY AND VIABILITY
    # ========================================================
    draw_header_footer(c, "FEASIBILITY AND VIABILITY", 4)

    cards_s4 = [
        {
            "title": "Analysis of Feasibility",
            "points": [
                ("Authoritative Ingestion", "Free, high-volume TLE ephemerides from CelesTrak & Space-Track (18th SDS) with zero proprietary hardware requirements."),
                ("Software-Centric Speed", "Pure mathematical SGP4 propagation and spatial sieving run on standard cloud/edge servers in <1.5s."),
                ("Client-Side WebGL", "Three.js GPU shaders offload visualization computation directly to the client browser, minimizing server load."),
                ("Proven Test Coverage", "Fully functional full-stack codebase with 44/44 passing automated pytest test cases verifying numerical correctness.")
            ]
        },
        {
            "title": "Potential Challenges & Risks",
            "points": [
                ("Covariance Absence in TLEs", "Standard public TLE sets lack formal 6x6 error covariance matrices, making mathematical Pc unconstrained."),
                ("Combinatorial Scale", "Screening N=35,000 objects yields ~6.1 x 10^8 pairwise interactions over a 72-hour screening window."),
                ("Upstream API Rate Limits", "External network latency or upstream Space-Track / CelesTrak downtime can disrupt live synchronization."),
                ("Client GPU Load", "Rendering tens of thousands of dynamic 3D points and trajectories simultaneously can cause client frame drops.")
            ]
        },
        {
            "title": "Strategies for Overcoming Challenges",
            "points": [
                ("Transparent Metric Separation", "Uses explainable Risk Score (0–100) and marks Pc as UNAVAILABLE when covariance is absent (zero fake claims)."),
                ("3-Phase Spatial Sieving", "Apogee/perigee envelope sorting eliminates >99% non-overlapping orbits instantly, screening <400 candidate pairs."),
                ("Resilient Ingestion Cache", "In-memory cache + persistent database + verified offline fallback mode guarantees 100% platform availability."),
                ("GPU Point Instancing", "Instanced buffer geometries and Level-of-Detail (LOD) management deliver consistent 60 FPS WebGL rendering.")
            ]
        }
    ]

    for idx, card in enumerate(cards_s4):
        cx = 35 + idx * (col_w + col_gap)
        c.setFillColor(C_BG_CARD)
        c.setStrokeColor(C_BORDER_CARD)
        c.setLineWidth(1)
        c.roundRect(cx, col_y, col_w, col_h, 8, fill=1, stroke=1)

        c.setFillColor(C_NAVY_PRIMARY)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(cx + 14, col_y + col_h - 24, f"• {card['title']}")

        cy = col_y + col_h - 44
        for label, desc in card["points"]:
            c.setFillColor(C_BLUE_ACCENT)
            c.setFont("Helvetica-Bold", 8.8)
            c.drawString(cx + 14, cy, f"✔ {label}:")
            cy -= 12

            c.setFillColor(C_TEXT_MAIN)
            lines = wrap_text(c, desc, col_w - 28, "Helvetica", 8)
            for l in lines:
                c.drawString(cx + 18, cy, l)
                cy -= 10.5
            cy -= 4

    c.showPage()

    # ========================================================
    # SLIDE 5: IMPACT AND BENEFITS
    # ========================================================
    draw_header_footer(c, "IMPACT AND BENEFITS", 5)

    # Top Section: Target Audience
    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.setLineWidth(1)
    c.roundRect(35, 295, 890, 165, 8, fill=1, stroke=1)

    c.setFillColor(C_NAVY_PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, 438, "• Potential Impact on the Target Audience")

    targets_s5 = [
        ("SmallSat & CubeSat Operators", "Provides free, research-grade collision avoidance intelligence and maneuver lead-time without million-dollar enterprise licenses."),
        ("Academic & Research Labs", "Serves as an open testbed for astrodynamics training, orbital mechanics labs, and debris modeling studies."),
        ("Space Tech Startups & Agencies", "Enhances regional Space Situational Awareness (SSA) complementing national programs (e.g., ISRO NETRA).")
    ]

    ty = 416
    for title, desc in targets_s5:
        c.setFillColor(C_BLUE_ACCENT)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(60, ty, f"▶ {title}:")
        c.setFillColor(C_TEXT_MAIN)
        lines = wrap_text(c, desc, 630, "Helvetica", 8.5)
        for idx, l in enumerate(lines):
            if idx == 0:
                c.drawString(245, ty, l)
            else:
                c.drawString(245, ty - (idx * 11), l)
        ty -= (len(lines) * 11 + 12)

    # Bottom Grid: 4 Benefit Cards
    b_col_w = 208
    b_col_gap = 19
    b_col_h = 245
    b_col_y = 35

    benefit_cols_pdf = [
        {
            "cat": "Technical Benefits",
            "items": [
                "Unified multi-source TLE ingestion",
                "Sub-kilometer TCA spatial precision",
                "Explainable risk factor breakdown",
                "CCSDS CDM Blue Book export"
            ]
        },
        {
            "cat": "Operational Benefits",
            "items": [
                "Converts raw data into alerts",
                "Automated high-risk priority queue",
                "Dual 3D celestial & 2D ground track",
                "72-hour maneuver lead horizon"
            ]
        },
        {
            "cat": "Economic Benefits",
            "items": [
                "Democratizes space safety tooling",
                ">90% reduction in SSA software costs",
                "Prevents catastrophic mission loss",
                "Accessible on standard web browsers"
            ]
        },
        {
            "cat": "Space Sustainability",
            "items": [
                "Mitigates cascading Kessler Syndrome",
                "Promotes responsible orbital slots",
                "Supports UN COPUOS debris rules",
                "Assists national space safety goals"
            ]
        }
    ]

    for idx, b in enumerate(benefit_cols_pdf):
        bx = 35 + idx * (b_col_w + b_col_gap)
        c.setFillColor(C_BG_CARD)
        c.setStrokeColor(C_BORDER_CARD)
        c.setLineWidth(1)
        c.roundRect(bx, b_col_y, b_col_w, b_col_h, 8, fill=1, stroke=1)

        c.setFillColor(C_NAVY_PRIMARY)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(bx + 14, b_col_y + b_col_h - 22, f"• {b['cat']}")

        by = b_col_y + b_col_h - 48
        for itm in b["items"]:
            c.setFillColor(C_CYAN_ACCENT)
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(bx + 14, by, "✔")
            c.setFillColor(C_TEXT_MAIN)
            lines = wrap_text(c, itm, b_col_w - 36, "Helvetica", 8)
            for idx, l in enumerate(lines):
                c.drawString(bx + 26, by - (idx * 10), l)
            by -= (len(lines) * 10 + 8)

    c.showPage()

    # ========================================================
    # SLIDE 6: RESEARCH AND REFERENCES
    # ========================================================
    draw_header_footer(c, "RESEARCH AND REFERENCES", 6)

    c.setFillColor(C_BG_CARD)
    c.setStrokeColor(C_BORDER_CARD)
    c.setLineWidth(1)
    c.roundRect(35, 35, 890, 430, 8, fill=1, stroke=1)

    c.setFillColor(C_NAVY_PRIMARY)
    c.setFont("Helvetica-Bold", 11.5)
    c.drawString(50, 442, "• Details / Links of the reference and research work")

    references_pdf = [
        ("1. Hoots, F. R., & Roehrich, R. L. (1980)", "Spacetrack Report No. 3: Models for Propagation of NORAD Element Sets (SGP4/SDP4)", "Aerospace Defense Command, Peterson AFB, CO. Standard analytical orbital perturbation models."),
        ("2. Vallado, D. A., Crawford, P., Hujsak, R., & Kelso, T. S. (2006)", "Revisiting Spacetrack Report #3: Rev 2 (AIAA 2006-6753)", "Analytical Graphics, Inc. / CelesTrak. Comprehensive derivation & validation for official SGP4 implementation."),
        ("3. Foster, J. L., & Estes, H. S. (1992)", "A Determination of the Probability of Collision Between Two Space Objects", "NASA Johnson Space Center Internal Report, Houston, TX. Formulation for 2D isotropic collision probability (Pc)."),
        ("4. Alfano, S. (2005)", "Review of Conjunction Assessment Techniques", "The Journal of the Astronautical Sciences, Vol. 53, No. 4, pp. 355–375. Maximum-Pc boundary assessment and encounter metrics."),
        ("5. Consultative Committee for Space Data Systems (CCSDS, 2019)", "Conjunction Data Message (CDM) Blue Book 508.0-B-1", "CCSDS Secretariat, Washington, DC. Formal international standard for conjunction exchange data (KVN & XML)."),
        ("6. NASA Orbital Debris Program Office & King-Hele, D. G. (1987)", "Satellite Orbits in an Atmosphere & ODMSP", "Atmospheric drag modeling with King-Hele decay equations and Jacchia-Roberts scale heights for re-entry forecasting."),
        ("7. 18th Space Defense Squadron & CelesTrak", "Space-Track.org REST API & CSSI Orbital Data Services", "Authoritative sources for open-access Two-Line Element (TLE) ephemerides and space debris catalog tracking.")
    ]

    ry = 418
    for title, paper, desc in references_pdf:
        c.setFillColor(C_BLUE_ACCENT)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(60, ry, f"{title}:")
        
        c.setFillColor(C_NAVY_DARK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(60, ry - 11, f"\"{paper}\"")
        
        c.setFillColor(C_TEXT_MUTED)
        c.setFont("Helvetica", 7.5)
        c.drawString(60, ry - 22, desc)
        ry -= 39

    c.showPage()
    c.save()
    print(f"Successfully generated enhanced PDF at {OUTPUT_PDF}")

if __name__ == "__main__":
    generate_pdf()
