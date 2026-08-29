import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

OUTPUT_PPTX = "/Users/kundan/Downloads/ORBITGUARD/ORBITGUARD_SIH_2026_IDEA_PRESENTATION.pptx"
ASSETS_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/assets"

NAVY_PRIMARY = RGBColor(26, 54, 93)       # #1A365D - Deep Navy SIH
NAVY_DARK = RGBColor(15, 23, 42)          # #0F172A - Slate 900
BLUE_ACCENT = RGBColor(30, 64, 175)       # #1E40AF - Blue 800
CYAN_ACCENT = RGBColor(14, 116, 144)      # #0E7490 - Cyan 700
BLUE_FOOTER = RGBColor(2, 132, 199)       # #0284C7 - Blue 600
TEXT_MAIN = RGBColor(30, 41, 59)          # #1E293B - Slate 800
TEXT_MUTED = RGBColor(71, 85, 105)        # #475569 - Slate 600
BG_LIGHT = RGBColor(248, 250, 252)        # #F8FAFC - Off White
BG_CARD = RGBColor(255, 255, 255)         # #FFFFFF - White
BORDER_CARD = RGBColor(203, 213, 225)     # #CBD5E1 - Slate 300
WHITE = RGBColor(255, 255, 255)

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def add_slide_header(slide, title_text, slide_num):
        badge = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(0.5), Inches(0.25), Inches(1.8), Inches(0.85)
        )
        badge.fill.solid()
        badge.fill.fore_color.rgb = WHITE
        badge.line.color.rgb = RGBColor(15, 23, 42)
        badge.line.width = Pt(1.5)
        tf_b = badge.text_frame
        tf_b.word_wrap = True
        p_b1 = tf_b.paragraphs[0]
        p_b1.text = "Your"
        p_b1.font.size = Pt(9.5)
        p_b1.font.name = "Arial"
        p_b1.font.color.rgb = NAVY_DARK
        p_b1.alignment = PP_ALIGN.CENTER

        p_b2 = tf_b.add_paragraph()
        p_b2.text = "Team"
        p_b2.font.size = Pt(11)
        p_b2.font.bold = True
        p_b2.font.name = "Arial"
        p_b2.font.color.rgb = NAVY_DARK
        p_b2.alignment = PP_ALIGN.CENTER

        p_b3 = tf_b.add_paragraph()
        p_b3.text = "Name"
        p_b3.font.size = Pt(9.5)
        p_b3.font.name = "Arial"
        p_b3.font.color.rgb = NAVY_DARK
        p_b3.alignment = PP_ALIGN.CENTER

        title_box = slide.shapes.add_textbox(Inches(2.5), Inches(0.3), Inches(8.333), Inches(0.75))
        tf_t = title_box.text_frame
        tf_t.word_wrap = True
        p_t = tf_t.paragraphs[0]
        p_t.text = title_text
        p_t.font.name = "Arial"
        p_t.font.size = Pt(25)
        p_t.font.bold = True
        p_t.font.color.rgb = NAVY_DARK
        p_t.alignment = PP_ALIGN.CENTER

        logo_path = f"{ASSETS_DIR}/sih_logo_header.png"
        if os.path.exists(logo_path):
            slide.shapes.add_picture(logo_path, Inches(11.0), Inches(0.18), width=Inches(1.85))

        footer_bar = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.12), Inches(13.333), Inches(0.38)
        )
        footer_bar.fill.solid()
        footer_bar.fill.fore_color.rgb = BLUE_FOOTER
        footer_bar.line.fill.background()

        footer_box = slide.shapes.add_textbox(Inches(0.5), Inches(7.12), Inches(12.333), Inches(0.38))
        tf_f = footer_box.text_frame
        p_f = tf_f.paragraphs[0]
        p_f.text = f"@SIH Idea submission- Template  {slide_num}"
        p_f.font.name = "Arial"
        p_f.font.size = Pt(9.5)
        p_f.font.color.rgb = WHITE
        p_f.alignment = PP_ALIGN.CENTER

        p_num = slide.shapes.add_textbox(Inches(12.2), Inches(7.12), Inches(0.8), Inches(0.38))
        tf_num = p_num.text_frame
        p_n = tf_num.paragraphs[0]
        p_n.text = str(slide_num)
        p_n.font.name = "Arial"
        p_n.font.size = Pt(9.5)
        p_n.font.color.rgb = WHITE
        p_n.alignment = PP_ALIGN.RIGHT

    # ==========================================
    # SLIDE 1: TITLE PAGE
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = BG_LIGHT
    bg1.line.fill.background()

    sih_top = s1.shapes.add_textbox(Inches(1.0), Inches(0.4), Inches(11.333), Inches(0.65))
    tf_sih = sih_top.text_frame
    p_sih = tf_sih.paragraphs[0]
    p_sih.text = "SMART INDIA HACKATHON 2026"
    p_sih.font.name = "Arial"
    p_sih.font.size = Pt(30)
    p_sih.font.bold = True
    p_sih.font.color.rgb = NAVY_PRIMARY
    p_sih.alignment = PP_ALIGN.CENTER

    title_sub = s1.shapes.add_textbox(Inches(1.0), Inches(1.05), Inches(11.333), Inches(0.5))
    tf_ts = title_sub.text_frame
    p_ts = tf_ts.paragraphs[0]
    p_ts.text = "TITLE PAGE"
    p_ts.font.name = "Arial"
    p_ts.font.size = Pt(20)
    p_ts.font.bold = True
    p_ts.font.color.rgb = NAVY_DARK
    p_ts.alignment = PP_ALIGN.CENTER

    logo_path = f"{ASSETS_DIR}/sih_logo_header.png"
    if os.path.exists(logo_path):
        s1.shapes.add_picture(logo_path, Inches(10.8), Inches(0.25), width=Inches(2.0))

    left_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.65), Inches(7.4), Inches(5.35))
    left_card.fill.solid()
    left_card.fill.fore_color.rgb = BG_CARD
    left_card.line.color.rgb = BORDER_CARD
    left_card.line.width = Pt(1.2)

    tf_details = left_card.text_frame
    tf_details.margin_left = Inches(0.35)
    tf_details.margin_right = Inches(0.35)
    tf_details.margin_top = Inches(0.3)
    tf_details.word_wrap = True

    items = [
        ("• Problem Statement ID –", "PS-04"),
        ("• Problem Statement Title –", "Space Debris Tracking & Satellite Collision Risk Prediction Dashboard"),
        ("• Theme –", "Space Technology"),
        ("• PS Category –", "Software"),
        ("• Team ID –", "SIH2026-PS04-OG01"),
        ("• Team Name –", "ORBITGUARD (Registered on portal)")
    ]

    for i, (label, val) in enumerate(items):
        p = tf_details.paragraphs[0] if i == 0 else tf_details.add_paragraph()
        p.space_after = Pt(12)
        run1 = p.add_run()
        run1.text = f"{label}\n   "
        run1.font.name = "Arial"
        run1.font.bold = True
        run1.font.size = Pt(13)
        run1.font.color.rgb = NAVY_PRIMARY

        run2 = p.add_run()
        run2.text = val
        run2.font.name = "Arial"
        run2.font.size = Pt(12)
        run2.font.color.rgb = TEXT_MAIN

    right_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.2), Inches(1.65), Inches(4.5), Inches(5.35))
    right_card.fill.solid()
    right_card.fill.fore_color.rgb = BG_CARD
    right_card.line.color.rgb = BORDER_CARD
    right_card.line.width = Pt(1.2)

    shot_3d = f"{ASSETS_DIR}/shot_space_view_card.png"
    if os.path.exists(shot_3d):
        s1.shapes.add_picture(shot_3d, Inches(8.35), Inches(1.8), width=Inches(4.2))

    cap_box = s1.shapes.add_textbox(Inches(8.35), Inches(4.35), Inches(4.2), Inches(2.5))
    tf_cap = cap_box.text_frame
    tf_cap.word_wrap = True
    p_c1 = tf_cap.paragraphs[0]
    p_c1.text = "ORBITGUARD SSA PLATFORM"
    p_c1.font.name = "Arial"
    p_c1.font.size = Pt(12)
    p_c1.font.bold = True
    p_c1.font.color.rgb = CYAN_ACCENT
    p_c1.space_after = Pt(4)

    features = [
        "✔ Real-time multi-source ephemeris ingestion (CelesTrak / Space-Track)",
        "✔ Deterministic 3-phase conjunction screening for 35,000+ catalog objects",
        "✔ Foster-2D Pc & Explainable Multi-Factor OrbitGuard Risk Scoring (0–100)",
        "✔ Interactive 3D WebGL celestial globe & 2D tactical ground track view",
        "✔ Automated collision alerts, CAM Delta-V planner & CCSDS CDM export"
    ]
    for feat in features:
        p_f = tf_cap.add_paragraph()
        p_f.text = feat
        p_f.font.name = "Arial"
        p_f.font.size = Pt(9.5)
        p_f.font.color.rgb = TEXT_MUTED
        p_f.space_after = Pt(3)

    # ==========================================
    # SLIDE 2: IDEA TITLE / PROPOSED SOLUTION
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_slide_header(s2, "IDEA TITLE", 2)

    sub_title = s2.shapes.add_textbox(Inches(0.6), Inches(1.15), Inches(12.133), Inches(0.4))
    tf_st = sub_title.text_frame
    p_st = tf_st.paragraphs[0]
    p_st.text = "❖ Proposed Solution (Describe your Idea/Solution/Prototype)"
    p_st.font.name = "Arial"
    p_st.font.size = Pt(16)
    p_st.font.bold = True
    p_st.font.color.rgb = BLUE_ACCENT

    col_w = Inches(3.88)
    col_gap = Inches(0.24)
    col_h = Inches(5.35)
    col_y = Inches(1.6)

    cards_s2 = [
        {
            "title": "Detailed Explanation of Proposed Solution",
            "bullets": [
                "**ORBITGUARD** is an open, high-precision Space Situational Awareness (SSA) & Collision Risk Intelligence platform.",
                "**End-to-End Pipeline**: Ingests authoritative TLEs $\\to$ Validates modulo-10 checksums $\\to$ Analytical SGP4 propagation $\\to$ 3-Phase spatial screening sieve $\\to$ Multi-factor risk calculation $\\to$ Interactive 3D/2D WebGL visualizer $\\to$ Real-time alerts.",
                "**Operational Scale**: Fully implemented full-stack architecture tracking **35,000+ cataloged objects** (payloads, debris, rocket stages) with deterministic sub-second updates."
            ]
        },
        {
            "title": "How It Addresses the Problem (PS-04)",
            "bullets": [
                "**Democratizes SSA Intelligence**: Breaks the monopoly of expensive, closed military/enterprise systems, empowering student teams, smallsat operators, and space startups.",
                "**Solves Pairwise Bottleneck**: Hierarchical apogee/perigee altitude filtering eliminates >99% non-crossing pairs in $\\mathcal{O}(N \\log N)$ time, preventing compute overload.",
                "**Actionable Operator Guidance**: Converts raw orbital coordinates into exact Time of Closest Approach (TCA), 3D miss distance, relative velocity, and lead-time alerts."
            ]
        },
        {
            "title": "Innovation & Uniqueness of Solution",
            "bullets": [
                "**Dual-Engine Risk Framework**: Combines an explainable 0–100 OrbitGuard Risk Score with formal Foster-2D $P_c$ & 10,000 Monte Carlo stochastic perturbations.",
                "**Scientific Data Truth Badges**: Explicitly marks `LIVE SGP4`, `CALCULATED`, `MODEL PREDICTION`, `SIMULATION`, and `DATA UNAVAILABLE` (zero fabricated covariance).",
                "**Integrated Mission Toolkit**: Includes Collision Avoidance Maneuver (CAM) $\\Delta v$ optimization, King-Hele atmospheric decay tracking, and CCSDS CDM Blue Book export."
            ]
        }
    ]

    for idx, c in enumerate(cards_s2):
        cx = Inches(0.6) + idx * (col_w + col_gap)
        card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, col_y, col_w, col_h)
        card.fill.solid()
        card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = BORDER_CARD
        card.line.width = Pt(1.2)

        tf = card.text_frame
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.2)
        tf.word_wrap = True

        p_hdr = tf.paragraphs[0]
        p_hdr.space_after = Pt(10)
        r_num = p_hdr.add_run()
        r_num.text = f"• {c['title']}"
        r_num.font.name = "Arial"
        r_num.font.bold = True
        r_num.font.size = Pt(12.5)
        r_num.font.color.rgb = NAVY_PRIMARY

        for b in c["bullets"]:
            p_b = tf.add_paragraph()
            p_b.space_after = Pt(8)
            parts = b.split("**")
            is_bold = False
            for part in parts:
                if part:
                    run = p_b.add_run()
                    run.text = part
                    run.font.name = "Arial"
                    run.font.size = Pt(10)
                    run.font.bold = is_bold
                    run.font.color.rgb = TEXT_MAIN
                is_bold = not is_bold

    # ==========================================
    # SLIDE 3: TECHNICAL APPROACH
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_slide_header(s3, "TECHNICAL APPROACH", 3)

    left_w = Inches(5.8)
    left_h = Inches(5.7)
    left_x = Inches(0.6)
    left_y = Inches(1.25)

    left_panel = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_x, left_y, left_w, left_h)
    left_panel.fill.solid()
    left_panel.fill.fore_color.rgb = BG_CARD
    left_panel.line.color.rgb = BORDER_CARD
    left_panel.line.width = Pt(1.2)

    tf_lp = left_panel.text_frame
    tf_lp.margin_left = Inches(0.25)
    tf_lp.margin_right = Inches(0.25)
    tf_lp.margin_top = Inches(0.2)
    tf_lp.word_wrap = True

    p_ts_hdr = tf_lp.paragraphs[0]
    p_ts_hdr.text = "• Technologies to be used (Implemented Tech Stack)"
    p_ts_hdr.font.name = "Arial"
    p_ts_hdr.font.bold = True
    p_ts_hdr.font.size = Pt(12)
    p_ts_hdr.font.color.rgb = NAVY_PRIMARY
    p_ts_hdr.space_after = Pt(5)

    tech_items = [
        "**Frontend**: React 18.3, TypeScript, Vite, Tailwind CSS, Three.js (WebGL 3D Earth, Shaders), Recharts, Lucide.",
        "**Backend & Orbital**: Python 3.9+, FastAPI (Async REST), C-accelerated SGP4/SDP4 (`sgp4.api.Satrec`), Skyfield, NumPy, SQLAlchemy.",
        "**Database & Infra**: Indexed SQLite / PostgreSQL (spatial/perigee/apogee indices), Docker Compose, Background Daemons.",
        "**Data Sources**: CelesTrak (CSSI / AGI), Space-Track.org (18th SDS), Launch Library 2, NOAA SWPC ($F_{10.7}$, $A_p$)."
    ]

    for item in tech_items:
        p = tf_lp.add_paragraph()
        p.space_after = Pt(3)
        parts = item.split("**")
        is_bold = False
        for part in parts:
            if part:
                run = p.add_run()
                run.text = part
                run.font.name = "Arial"
                run.font.size = Pt(9.2)
                run.font.bold = is_bold
                run.font.color.rgb = TEXT_MAIN
            is_bold = not is_bold

    p_meth_hdr = tf_lp.add_paragraph()
    p_meth_hdr.space_before = Pt(6)
    p_meth_hdr.text = "• Methodology and Process for Implementation"
    p_meth_hdr.font.name = "Arial"
    p_meth_hdr.font.bold = True
    p_meth_hdr.font.size = Pt(12)
    p_meth_hdr.font.color.rgb = NAVY_PRIMARY
    p_meth_hdr.space_after = Pt(5)

    meth_items = [
        "**Astrodynamic Frame Transforms**: $\\text{TLE} \\xrightarrow{\\text{SGP4}} \\text{TEME} \\xrightarrow{\\text{GMST}} \\text{ECEF} \\xrightarrow{\\text{Bowring}} \\text{WGS84 Geodetic } (\\text{Lat, Lon, Alt})$.",
        "**3-Phase Conjunction Screening Sieve**:\n  1. *Phase 1 (Altitude Envelope)*: Eliminates >99% non-overlapping pairs in $\\mathcal{O}(N \\log N)$.\n  2. *Phase 2 (Coarse Step)*: 3-min intervals detect candidate encounter windows.\n  3. *Phase 3 (Fine Step & Golden Search)*: 10s sub-stepping pinpoints exact Time of Closest Approach (TCA) and 3D miss distance ($d_{\\text{miss}}$).",
        "**Multi-Factor Risk Assessment Engine**:\n  $\\text{Score} = 0.55 S_{\\text{dist}} + 0.25 S_{\\text{vel}} + 0.20 S_{\\text{time}}$ (Weighted Explainable Score)\n  Foster-2D Isotropic Hard-Body $P_c$ & 10k Monte Carlo runs."
    ]

    for item in meth_items:
        p = tf_lp.add_paragraph()
        p.space_after = Pt(3)
        parts = item.split("**")
        is_bold = False
        for part in parts:
            if part:
                run = p.add_run()
                run.text = part
                run.font.name = "Arial"
                run.font.size = Pt(9.2)
                run.font.bold = is_bold
                run.font.color.rgb = TEXT_MAIN
            is_bold = not is_bold

    # Right Column Screenshots
    right_x = Inches(6.65)
    right_w = Inches(6.08)
    
    shot1_card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, right_x, Inches(1.25), right_w, Inches(2.75))
    shot1_card.fill.solid()
    shot1_card.fill.fore_color.rgb = BG_CARD
    shot1_card.line.color.rgb = BORDER_CARD
    shot1_card.line.width = Pt(1.2)

    shot1_img = f"{ASSETS_DIR}/shot_space_view_card.png"
    if os.path.exists(shot1_img):
        s3.shapes.add_picture(shot1_img, Inches(6.75), Inches(1.35), width=Inches(5.88))

    cap1 = s3.shapes.add_textbox(Inches(6.75), Inches(3.68), Inches(5.88), Inches(0.3))
    p_c1 = cap1.text_frame.paragraphs[0]
    p_c1.text = "▲ Working Prototype: Real-Time 3D WebGL Globe & SGP4 Orbital Object Tracking"
    p_c1.font.name = "Arial"
    p_c1.font.size = Pt(8.5)
    p_c1.font.bold = True
    p_c1.font.color.rgb = CYAN_ACCENT

    shot2_card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, right_x, Inches(4.2), right_w, Inches(2.75))
    shot2_card.fill.solid()
    shot2_card.fill.fore_color.rgb = BG_CARD
    shot2_card.line.color.rgb = BORDER_CARD
    shot2_card.line.width = Pt(1.2)

    shot2_img = f"{ASSETS_DIR}/shot_conjunction_matrix_card.png"
    if os.path.exists(shot2_img):
        s3.shapes.add_picture(shot2_img, Inches(6.75), Inches(4.45), width=Inches(5.88))

    cap2 = s3.shapes.add_textbox(Inches(6.75), Inches(6.62), Inches(5.88), Inches(0.3))
    p_c2 = cap2.text_frame.paragraphs[0]
    p_c2.text = "▲ Working Prototype: Real-Time Conjunction Risk & Close Encounter Matrix Dashboard"
    p_c2.font.name = "Arial"
    p_c2.font.size = Pt(8.5)
    p_c2.font.bold = True
    p_c2.font.color.rgb = CYAN_ACCENT

    # ==========================================
    # SLIDE 4: FEASIBILITY AND VIABILITY
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_slide_header(s4, "FEASIBILITY AND VIABILITY", 4)

    cards_s4 = [
        {
            "title": "Analysis of Feasibility",
            "bullets": [
                "**Authoritative Public Ingestion**: Ingests free, high-volume TLE ephemerides directly from CelesTrak & Space-Track (18th SDS) with zero proprietary hardware requirements.",
                "**Software-Centric Scalability**: Pure mathematical SGP4 propagation and spatial sieving run efficiently on standard cloud or edge servers with sub-second execution ($<1.5\\text{s}$).",
                "**Client-Side WebGL Rendering**: Three.js GPU shaders offload visualization computation directly to the client browser, maintaining minimal backend server footprint.",
                "**Proven Working Prototype**: Fully functional full-stack codebase with **44/44 passing automated pytest test cases** verifying numerical correctness."
            ]
        },
        {
            "title": "Potential Challenges & Risks",
            "bullets": [
                "**Covariance Absence in TLEs**: Standard public TLE sets do not provide formal $6\\times 6$ error covariance matrices, making true mathematical $P_c$ unconstrained.",
                "**Combinatorial Compute Scale**: Screening $N=35,000$ space objects against each other yields $\\approx 6.1 \\times 10^8$ pairwise interactions over a 72-hour window.",
                "**Upstream API Outages / Limits**: External network latency, Space-Track rate limits, or CelesTrak upstream downtime can disrupt live data synchronization.",
                "**Client GPU Load with Thousands of Objects**: Rendering tens of thousands of dynamic 3D points and trajectories simultaneously can cause client frame drops."
            ]
        },
        {
            "title": "Strategies for Overcoming Challenges",
            "bullets": [
                "**Transparent Heuristic vs $P_c$ Separation**: Uses an explainable OrbitGuard Risk Score (0–100) and explicitly marks $P_c$ as `UNAVAILABLE` when covariance is absent (zero fake claims).",
                "**3-Phase Spatial Sieving**: Geometric apogee/perigee sorting eliminates >99% non-overlapping orbits instantly, screening only $\\approx 400$ candidate crossing pairs.",
                "**Resilient Multi-Tier Ingestion**: In-memory cache + persistent database + deterministic verified offline fallback mode ensures 100% platform availability.",
                "**GPU Point Cloud Instancing**: Instanced buffer geometries and Level-of-Detail (LOD) management deliver consistent **60 FPS WebGL rendering** on commodity devices."
            ]
        }
    ]

    for idx, c in enumerate(cards_s4):
        cx = Inches(0.6) + idx * (col_w + col_gap)
        card = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, Inches(1.35), col_w, Inches(5.6))
        card.fill.solid()
        card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = BORDER_CARD
        card.line.width = Pt(1.2)

        tf = card.text_frame
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.2)
        tf.word_wrap = True

        p_hdr = tf.paragraphs[0]
        p_hdr.space_after = Pt(10)
        r_num = p_hdr.add_run()
        r_num.text = f"• {c['title']}"
        r_num.font.name = "Arial"
        r_num.font.bold = True
        r_num.font.size = Pt(12.5)
        r_num.font.color.rgb = NAVY_PRIMARY

        for b in c["bullets"]:
            p_b = tf.add_paragraph()
            p_b.space_after = Pt(8)
            parts = b.split("**")
            is_bold = False
            for part in parts:
                if part:
                    run = p_b.add_run()
                    run.text = part
                    run.font.name = "Arial"
                    run.font.size = Pt(9.8)
                    run.font.bold = is_bold
                    run.font.color.rgb = TEXT_MAIN
                is_bold = not is_bold

    # ==========================================
    # SLIDE 5: IMPACT AND BENEFITS
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_slide_header(s5, "IMPACT AND BENEFITS", 5)

    top_w = Inches(12.133)
    top_h = Inches(2.2)
    top_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.3), top_w, top_h)
    top_box.fill.solid()
    top_box.fill.fore_color.rgb = BG_CARD
    top_box.line.color.rgb = BORDER_CARD
    top_box.line.width = Pt(1.2)

    tf_tb = top_box.text_frame
    tf_tb.margin_left = Inches(0.25)
    tf_tb.margin_right = Inches(0.25)
    tf_tb.margin_top = Inches(0.15)
    tf_tb.word_wrap = True

    p_t1 = tf_tb.paragraphs[0]
    p_t1.text = "• Potential Impact on the Target Audience"
    p_t1.font.name = "Arial"
    p_t1.font.bold = True
    p_t1.font.size = Pt(13)
    p_t1.font.color.rgb = NAVY_PRIMARY
    p_t1.space_after = Pt(6)

    targets = [
        "**SmallSat & CubeSat Operators**: Provides free, research-grade collision avoidance intelligence and maneuver lead-time without million-dollar enterprise licenses.",
        "**Academic & Research Institutions**: Serves as an open testbed for astrodynamics training, orbital mechanics labs, and debris modeling studies.",
        "**Space Tech Startups & Developing Space Agencies**: Enhances regional Space Situational Awareness (SSA) complementing national programs (e.g., ISRO NETRA)."
    ]

    for t in targets:
        p = tf_tb.add_paragraph()
        p.space_after = Pt(4)
        parts = t.split("**")
        is_bold = False
        for part in parts:
            if part:
                run = p.add_run()
                run.text = part
                run.font.name = "Arial"
                run.font.size = Pt(10)
                run.font.bold = is_bold
                run.font.color.rgb = TEXT_MAIN
            is_bold = not is_bold

    bot_y = Inches(3.65)
    bot_h = Inches(3.3)
    b_col_w = Inches(2.88)
    b_col_gap = Inches(0.2)

    benefit_cols = [
        {
            "cat": "Technical Benefits",
            "points": [
                "Unified multi-source TLE ingestion",
                "Sub-kilometer TCA spatial precision",
                "Explainable risk factor decomposition",
                "CCSDS CDM Blue Book export"
            ]
        },
        {
            "cat": "Operational Benefits",
            "points": [
                "Converts raw ephemerides into alerts",
                "Automated high-risk priority queue",
                "Dual 3D celestial & 2D ground track",
                "72-hour maneuver preparation lead"
            ]
        },
        {
            "cat": "Economic Benefits",
            "points": [
                "Democratizes space safety software",
                ">90% reduction in SSA tooling costs",
                "Prevents catastrophic mission loss",
                "Accessible on standard web browsers"
            ]
        },
        {
            "cat": "Space Sustainability",
            "points": [
                "Mitigates cascading Kessler Syndrome",
                "Promotes responsible orbital slots",
                "Supports UN COPUOS debris rules",
                "Assists national space safety goals"
            ]
        }
    ]

    for idx, b in enumerate(benefit_cols):
        bx = Inches(0.6) + idx * (b_col_w + b_col_gap)
        b_card = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, bx, bot_y, b_col_w, bot_h)
        b_card.fill.solid()
        b_card.fill.fore_color.rgb = BG_CARD
        b_card.line.color.rgb = BORDER_CARD
        b_card.line.width = Pt(1.2)

        tf_b = b_card.text_frame
        tf_b.margin_left = Inches(0.18)
        tf_b.margin_right = Inches(0.18)
        tf_b.margin_top = Inches(0.15)
        tf_b.word_wrap = True

        p_h = tf_b.paragraphs[0]
        p_h.text = f"• {b['cat']}"
        p_h.font.name = "Arial"
        p_h.font.bold = True
        p_h.font.size = Pt(11.5)
        p_h.font.color.rgb = BLUE_ACCENT
        p_h.space_after = Pt(8)

        for pt in b["points"]:
            p_pt = tf_b.add_paragraph()
            p_pt.text = f"✔ {pt}"
            p_pt.font.name = "Arial"
            p_pt.font.size = Pt(9.5)
            p_pt.font.color.rgb = TEXT_MAIN
            p_pt.space_after = Pt(5)

    # ==========================================
    # SLIDE 6: RESEARCH AND REFERENCES
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_slide_header(s6, "RESEARCH AND REFERENCES", 6)

    ref_card = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.3), Inches(12.133), Inches(5.65))
    ref_card.fill.solid()
    ref_card.fill.fore_color.rgb = BG_CARD
    ref_card.line.color.rgb = BORDER_CARD
    ref_card.line.width = Pt(1.2)

    tf_rc = ref_card.text_frame
    tf_rc.margin_left = Inches(0.35)
    tf_rc.margin_right = Inches(0.35)
    tf_rc.margin_top = Inches(0.2)
    tf_rc.word_wrap = True

    p_rh = tf_rc.paragraphs[0]
    p_rh.text = "• Details / Links of the reference and research work"
    p_rh.font.name = "Arial"
    p_rh.font.bold = True
    p_rh.font.size = Pt(13)
    p_rh.font.color.rgb = NAVY_PRIMARY
    p_rh.space_after = Pt(10)

    references = [
        ("1. Hoots, F. R., & Roehrich, R. L. (1980)", "Spacetrack Report No. 3: Models for Propagation of NORAD Element Sets (SGP4/SDP4)", "Aerospace Defense Command, Peterson AFB, Colorado. Standard mathematical formulations for analytical orbital perturbation propagation."),
        ("2. Vallado, D. A., Crawford, P., Hujsak, R., & Kelso, T. S. (2006)", "Revisiting Spacetrack Report #3: Rev 2 (AIAA 2006-6753)", "Analytical Graphics, Inc. / CelesTrak. Comprehensive derivation and code validation for official SGP4 implementation with WGS84."),
        ("3. Foster, J. L., & Estes, H. S. (1992)", "A Determination of the Probability of Collision Between Two Space Objects", "NASA Johnson Space Center Internal Report, Houston, TX. Formulation for 2D isotropic hard-body encounter collision probability ($P_c$)."),
        ("4. Alfano, S. (2005)", "Review of Conjunction Assessment Techniques", "The Journal of the Astronautical Sciences, Vol. 53, No. 4, pp. 355–375. Maximum collision probability boundary assessment and encounter geometry metrics."),
        ("5. Consultative Committee for Space Data Systems (CCSDS, 2019)", "Conjunction Data Message (CDM) Recommended Standard Blue Book 508.0-B-1", "CCSDS Secretariat, Washington, DC. Formal international data format standard for conjunction event data exchange (KVN & XML)."),
        ("6. NASA Orbital Debris Program Office & King-Hele, D. G. (1987)", "Satellite Orbits in an Atmosphere: Theory and Applications & ODMSP", "Atmospheric drag modeling with King-Hele decay equations and Jacchia-Roberts scale heights for re-entry lifetime predictions."),
        ("7. 18th Space Defense Squadron & CelesTrak", "Space-Track.org REST API & CSSI Orbital Data Services", "Authoritative sources for open-access Two-Line Element (TLE) ephemerides and active satellite/debris catalog tracking.")
    ]

    for title, paper, desc in references:
        p = tf_rc.add_paragraph()
        p.space_after = Pt(6)
        
        r1 = p.add_run()
        r1.text = f"{title}: "
        r1.font.name = "Arial"
        r1.font.bold = True
        r1.font.size = Pt(10)
        r1.font.color.rgb = BLUE_ACCENT

        r2 = p.add_run()
        r2.text = f"\"{paper}\". "
        r2.font.name = "Arial"
        r2.font.bold = True
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = NAVY_DARK

        r3 = p.add_run()
        r3.text = desc
        r3.font.name = "Arial"
        r3.font.size = Pt(9)
        r3.font.color.rgb = TEXT_MUTED

    prs.save(OUTPUT_PPTX)
    print(f"Successfully regenerated enhanced PPTX at {OUTPUT_PPTX}")

if __name__ == "__main__":
    build_presentation()
