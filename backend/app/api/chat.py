import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter
from backend.app.config import settings
from backend.app.models.base import SessionLocal
from backend.app.models.orbital_object import OrbitalObject, ObjectType
from backend.app.models.conjunction import Conjunction

logger = logging.getLogger(__name__)

# Supporting both /api/chat and /api/orbitbot for backward compatibility and clean API design
router = APIRouter(tags=["AI Copilot Chat Proxy"])

class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 800

class ChatResponse(BaseModel):
    response: str
    model: str
    status: str

ORBITBOT_SYSTEM_PROMPT = """You are OrbitBot, an intelligent Space Domain Awareness (SDA) Expert and the internal AI Navigation Copilot for OrbitGuard (https://orbitguard-six.vercel.app/).

BEHAVIORAL RULES:
1. ALWAYS answer the user's specific question dynamically, directly, and accurately.
2. Ground all platform and conjunction answers in the live metrics provided in this prompt.
3. When answering general space, astrophysics, satellite dynamics, or orbital mechanics questions, provide deep, engaging, and technically rigorous explanations.
4. If asked about OrbitGuard platform features, explain how to navigate the tools:
   - 3D Orbital Radar & Catalog Search (top-left dock)
   - Dynamic Speed Multipliers (1x-1000x) & 24h Timeline Horizon Scrubber (bottom dock)
   - Conjunction & Collision Screener (Conjunctions tab with 2D B-Plane covariance and TCA timers)
   - UPCOMING MISSIONS live rocket manifest & launch countdowns
   - Citizen Sky Spotter for naked-eye optical passes
   - Atmospheric Re-entry & King-Hele decay predictions
5. Keep responses structured, concise, and scannable with bold highlights and bullet points where helpful."""


def _get_live_platform_context() -> str:
    """Retrieves real-time database statistics and active conjunctions to ground OrbitBot."""
    try:
        db = SessionLocal()
        try:
            total_objs = db.query(OrbitalObject).count()
            active_sats = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ACTIVE_SATELLITE).count()
            debris_cnt = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.DEBRIS).count()
            rocket_cnt = db.query(OrbitalObject).filter(OrbitalObject.object_type == ObjectType.ROCKET_BODY).count()
            
            top_conjs = db.query(Conjunction).order_by(Conjunction.risk_score.desc()).limit(5).all()
            conj_summary = []
            for c in top_conjs:
                name_a = c.object_a.name if c.object_a else "Unknown"
                name_b = c.object_b.name if c.object_b else "Unknown"
                tca_str = c.time_of_closest_approach.isoformat() if c.time_of_closest_approach else "N/A"
                conj_summary.append(f"• **{name_a}** vs **{name_b}** — Miss: **{c.miss_distance_km:.2f} km**, Relative Velocity: **{c.relative_velocity_km_s:.2f} km/s**, TCA: `{tca_str} UTC`, Risk: **{c.risk_score:.0f}/100** ({c.severity})")
            
            ctx = f"\n\nCURRENT PLATFORM GROUND-TRUTH TELEMETRY:\n• Total Tracked Cataloged Objects: {total_objs:,} (Active: {active_sats:,}, Debris: {debris_cnt:,}, Rocket Bodies: {rocket_cnt:,})\n"
            if conj_summary:
                ctx += "• Current Top Screened Conjunctions:\n" + "\n".join(conj_summary)
            else:
                ctx += "• Current Conjunctions: Nominal (No critical keep-out violations in current window)."
            return ctx
        finally:
            db.close()
    except Exception as e:
        logger.debug(f"Failed to fetch live context for OrbitBot: {e}")
        return ""


async def _handle_chat_logic(payload: ChatRequest) -> ChatResponse:
    """
    Handles user chat prompts with priority:
    1. Google Gemini 2.5 Flash (gemini-2.5-flash) via Google AI Studio API
    2. OpenAI ChatGPT (gpt-4o-mini)
    3. Built-in OrbitBot Astrodynamics Fallback
    """
    gemini_key = (os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or "").strip().strip("'\"")
    openai_key = (os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY or "").strip().strip("'\"")

    last_user_msg = payload.messages[-1].content if payload.messages else ""
    logger.info(f"[OrbitBot] Request received. Total messages: {len(payload.messages)}. Last query preview: {last_user_msg[:60]}...")

    live_context = _get_live_platform_context()
    dynamic_system_prompt = ORBITBOT_SYSTEM_PROMPT + live_context

    # =========================================================================
    # 1. GOOGLE GEMINI 2.5 FLASH (gemini-2.5-flash)
    # =========================================================================
    if gemini_key:
        try:
            logger.info("[OrbitBot] Gemini request started (model: gemini-2.5-flash)...")
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            
            # Format contents turns for Gemini API
            contents = []
            for msg in payload.messages:
                role = "user" if msg.role == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": msg.content}]
                })

            req_body = {
                "system_instruction": {
                    "parts": [{"text": dynamic_system_prompt}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": payload.temperature or 0.7,
                    "maxOutputTokens": payload.max_tokens or 800
                }
            }

            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(gemini_url, json=req_body)
                logger.info(f"[OrbitBot] Gemini response received. HTTP status: {resp.status_code}")

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            bot_text = parts[0]["text"]
                            logger.info("[OrbitBot] Gemini response successfully returned.")
                            return ChatResponse(
                                response=bot_text,
                                model="Gemini 2.5 Flash (Google AI)",
                                status="LIVE_GEMINI"
                            )
                else:
                    error_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = error_json.get("error", {}).get("message", resp.text)
                    logger.error(f"[OrbitBot] Gemini API Error HTTP {resp.status_code}: {err_msg}")
        except httpx.TimeoutException:
            logger.error("[OrbitBot] Gemini API request timed out (25s limit).")
        except Exception as e:
            logger.error(f"[OrbitBot] Gemini request exception: {e}")

    # =========================================================================
    # 2. OPENAI CHATGPT (gpt-4o-mini fallback if configured)
    # =========================================================================
    if openai_key:
        try:
            logger.info("[OrbitBot] OpenAI request started (model: gpt-4o-mini)...")
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json"
            }

            api_messages = [{"role": "system", "content": dynamic_system_prompt}]
            for msg in payload.messages:
                api_messages.append({"role": msg.role, "content": msg.content})

            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    url,
                    headers=headers,
                    json={
                        "model": "gpt-4o-mini",
                        "messages": api_messages,
                        "temperature": payload.temperature or 0.7,
                        "max_tokens": payload.max_tokens or 800
                    }
                )

                if resp.status_code == 200:
                    data = resp.json()
                    bot_text = data["choices"][0]["message"]["content"]
                    logger.info("[OrbitBot] OpenAI response successfully returned.")
                    return ChatResponse(
                        response=bot_text,
                        model="gpt-4o-mini (OpenAI)",
                        status="LIVE_OPENAI"
                    )
                else:
                    logger.error(f"[OrbitBot] OpenAI Error HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"[OrbitBot] OpenAI request exception: {e}")

    # =========================================================================
    # 3. BUILT-IN ORBITBOT ENGINE (Astrodynamics Fallback)
    # =========================================================================
    logger.info("[OrbitBot] Serving request via built-in OrbitBot SDA engine.")
    direct_reply = _answer_directly_without_templates(last_user_msg, live_context)

    return ChatResponse(
        response=direct_reply,
        model="OrbitBot SDA Engine",
        status="ACTIVE"
    )


@router.post("/api/chat", response_model=ChatResponse)
async def chat_api_route(payload: ChatRequest):
    return await _handle_chat_logic(payload)


@router.post("/api/orbitbot", response_model=ChatResponse)
async def orbitbot_api_route(payload: ChatRequest):
    return await _handle_chat_logic(payload)


def _answer_directly_without_templates(query: str, live_context: str = "") -> str:
    """Direct answers for space and OrbitGuard queries grounded in live context when applicable."""
    q = query.strip().lower()

    if any(g in q for g in ['hello', 'hi', 'hey', 'heello', 'hlo', 'greetings']):
        return "Hello! I am **OrbitBot**, your Space Domain Awareness (SDA) Expert. How can I assist you with orbital mechanics, satellite tracking, or navigating OrbitGuard today?"

    if 'how many' in q or 'active conjunction' in q or 'current conjunction' in q or 'highest risk' in q or 'top threat' in q:
        if live_context and "CURRENT PLATFORM GROUND-TRUTH TELEMETRY:" in live_context:
            clean_ctx = live_context.replace("CURRENT PLATFORM GROUND-TRUTH TELEMETRY:\n", "").strip()
            return f"Here is the latest live Space Situational Awareness status from OrbitGuard's database:\n\n{clean_ctx}\n\n• You can inspect any encounter on the 3D globe or click **Conjunctions** in the top navigation bar for detailed 2D B-Plane covariance ellipses and CAM burn planning."
        return "OrbitGuard is actively screening 32,000+ cataloged objects for close orbital encounters over a 24-hour lookahead window. Click the **Conjunctions** tab in the top navigation bar to view live miss distances, relative velocities, and TCA countdown clocks."

    if 'upcoming mission' in q or 'upcoming launch' in q or 'next launch' in q or 'what are upcoming' in q:
        return "The upcoming global rocket missions currently scheduled in the **UPCOMING MISSIONS** manifest include:\n\n1. **Starlink Group 10-8** (Falcon 9 Block 5) — Cape Canaveral SLC-40\n2. **Crew-9** (Falcon 9 Block 5) — Kennedy Space Center LC-39A\n3. **Galileo FOC FM26 & FM32** (Ariane 62) — Kourou ELA-4\n4. **Cygnus NG-21** (Falcon 9 Block 5) — Cape Canaveral SLC-40\n\n• Click **UPCOMING MISSIONS** in the top tactical bar to see real-time 1-second countdown tickers."

    if 'what is space' in q or q == 'space':
        return "Outer **space** is the near-vacuum physical expanse beyond Earth's atmosphere beginning at the **Kármán Line** (100 km / 62 miles altitude). It is characterized by microgravity, high-energy cosmic radiation, and plasma fields."

    if 'stay in orbit' in q or 'how orbit works' in q or 'how satellites orbit' in q:
        return "Satellites stay in orbit through a continuous balance between gravity and forward orbital speed ($v = \\sqrt{GM/r}$). An orbital vehicle is in continuous free-fall, but its forward speed (~7.8 km/s in LEO) ensures Earth's surface curves away beneath it at the exact same rate it falls."

    if 'kessler' in q:
        return "**Kessler Syndrome** is a cascading collision chain-reaction in Low Earth Orbit (LEO) where high-velocity fragmentation debris multiplies exponentially, eventually making whole orbital altitude bands (especially 700–900 km) unusable."

    if 'conjunction' in q and ('how' in q or 'prediction' in q or 'work' in q or 'screen' in q):
        return "**Conjunction Prediction Pipeline** in OrbitGuard:\n\n1. **Broad-Phase Spatial Filter**: Filters thousands of satellites into candidate pairs whose orbital altitude bands and inclination planes intersect.\n2. **Numerical SGP4 Propagation**: Propagates state vectors forward in time (up to 24–72 hours) with fine-step Golden-Section refinement to pinpoint the exact Time of Closest Approach (TCA).\n3. **Covariance & Probability**: Computes minimum 3D Euclidean miss distance, relative velocity vector, and collision probability via the **Foster-2D Isotropic Hard-Body Encounter Model**."

    if 'speed slider' in q or 'slider' in q or 'time control' in q:
        return "The **Speed Multiplier** (1x–1000x in the bottom dock) accelerates numerical SGP4 propagation forward in time so you can simulate future constellation motion and predict upcoming close-approach conjunctions."

    if 'launch' in q and ('safe' in q or 'risk' in q or 'how' in q):
        return "To screen launch trajectories: Click **UPCOMING MISSIONS** in the top bar, monitor target ascent corridors on the 3D globe against mega-constellations (like Starlink at 550 km), and inspect predicted miss distances in the **Conjunctions** tab."

    return "OrbitBot is ready to assist you. In orbital operations, space sustainability relies on continuous SGP4 ephemeris tracking, automated conjunction screening, and timely collision avoidance maneuvers. You can explore OrbitGuard's 3D Radar, Conjunction screener, and Sky Spotter to analyze live orbital data."
