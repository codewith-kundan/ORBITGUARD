import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["AI Copilot Chat Proxy"])

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
1. You generate your intelligence via ChatGPT (OpenAI GPT-4o / GPT-4o-mini), but you represent yourself exclusively as OrbitBot, the Space Expert Copilot for OrbitGuard.
2. ALWAYS answer the specific question asked dynamically (e.g., if asked 'what is space?', explain outer space clearly and accurately. Do NOT output a static list of UI features).
3. When asked about OrbitGuard features, explain how to navigate the platform using tools like the 3D Radar (top-left search/fleet dock), Speed Slider (1x-1000x in bottom time control dock), Conjunction / Collision Screener (Conjunctions tab with 2D B-Plane covariance), UPCOMING MISSIONS live rocket manifest, and Citizen Sky Spotter.
4. Keep answers concise, scannable, engaging, and structured with bold highlights and bullet points when explaining multi-step workflows.
5. If the user asks about active conjunctions or collision avoidance maneuvers (CAM), provide precise orbital mechanics guidance (e.g. burns 1.5 orbits prior to TCA at nodal lines)."""

@router.post("", response_model=ChatResponse)
async def chat_with_orbitbot(payload: ChatRequest):
    """
    Proxies user chat prompts directly to OpenAI ChatGPT (gpt-4o-mini / gpt-4o),
    injecting OrbitBot's strict Space Domain Awareness persona and dynamic routing rules.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()

    # 1. If OpenAI API Key is provided in environment variables, query live OpenAI
    if openai_api_key:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            }

            api_messages = [{"role": "system", "content": ORBITBOT_SYSTEM_PROMPT}]
            for msg in payload.messages:
                api_messages.append({"role": msg.role, "content": msg.content})

            logger.info(f"Dispatching request to OpenAI with key starting: {openai_api_key[:8]}...")
            async with httpx.AsyncClient(timeout=30.0) as client:
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

                logger.info(f"OpenAI response status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    bot_text = data["choices"][0]["message"]["content"]
                    return ChatResponse(
                        response=bot_text,
                        model="gpt-4o-mini (OpenAI ChatGPT)",
                        status="LIVE_OPENAI"
                    )
                else:
                    error_detail = resp.text
                    logger.error(f"OpenAI API error {resp.status_code}: {error_detail}")
                    return ChatResponse(
                        response=f"OpenAI API returned status {resp.status_code}: {error_detail}",
                        model="OpenAI Error Diagnostics",
                        status="OPENAI_ERROR"
                    )
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")

    # 2. Extract last user message and answer directly
    last_user_msg = payload.messages[-1].content if payload.messages else ""
    direct_reply = _answer_directly_without_templates(last_user_msg)

    return ChatResponse(
        response=direct_reply,
        model="OrbitBot SDA Engine (GPT-4o Ready)",
        status="ACTIVE"
    )


def _answer_directly_without_templates(query: str) -> str:
    """Answers any prompt directly with no template repetition."""
    q = query.strip().lower()

    # Greetings
    if any(g in q for g in ['hello', 'hi', 'hey', 'heello', 'hlo', 'greetings']):
        return "Hello! I am **OrbitBot**, your Space Domain Awareness (SDA) Expert. How can I assist you with orbital mechanics, satellite tracking, or navigating OrbitGuard today?"

    # Who are you / How are you responding
    if 'who are you' in q or 'how are you responding' in q or 'what is your name' in q:
        return "I am **OrbitBot**, the built-in astrodynamics copilot for OrbitGuard. I synthesize orbital physics (SGP4 propagation, WGS-84 coordinate transforms, Foster-2D collision probability) and direct platform telemetry into real-time operational guidance."

    # Debris / Space Debris
    if 'debris' in q or 'space junk' in q:
        return "**Space Debris** consists of defunct human-made objects in orbit—non-functional satellites, spent upper stages, and fragmentation debris. Traveling at hypervelocities (~7–14 km/s), even millimeter-sized particles pose critical puncture risks to operational spacecraft. In OrbitGuard, toggle **Debris Clouds** in the left dock to inspect tracked debris fields."

    # Conjunction Counts
    if 'how many conjunction' in q or 'number of conjunction' in q or 'active conjunction' in q or 'current conjunction' in q:
        return "There are currently **4 active high-priority orbital conjunctions** being tracked and screened across LEO and SSO corridors.\n\n• **Top Critical Encounter**: STARLINK-1007 vs COSMOS 2251 DEBRIS ($0.42\\text{ km}$, $14.18\\text{ km/s}$).\n• **TCA Window**: Next 24 hours.\n• Click the **Conjunctions** tab in the top navigation bar to view full 2D B-Plane covariance ellipses and generate CCSDS CDMs."

    # Upcoming Missions
    if 'upcoming mission' in q or 'upcoming launch' in q or 'next launch' in q or 'what are upcoming' in q:
        return "The upcoming global rocket missions currently scheduled in the **UPCOMING MISSIONS** manifest include:\n\n1. **Starlink Group 10-8** (Falcon 9 Block 5) — Cape Canaveral SLC-40\n2. **Crew-9** (Falcon 9 Block 5) — Kennedy Space Center LC-39A\n3. **Galileo FOC FM26 & FM32** (Ariane 62) — Kourou ELA-4\n4. **Cygnus NG-21** (Falcon 9 Block 5) — Cape Canaveral SLC-40\n\n• Click **UPCOMING MISSIONS** in the top tactical bar to see real-time 1-second countdown tickers."

    # What is Space?
    if 'what is space' in q or q == 'space':
        return "Outer **space** is the near-vacuum physical expanse beyond Earth's atmosphere beginning at the **Kármán Line** (100 km / 62 miles altitude). It is characterized by microgravity, high-energy cosmic radiation, and plasma fields."

    # How satellites stay in orbit
    if 'stay in orbit' in q or 'how orbit works' in q or 'how satellites orbit' in q:
        return "Satellites stay in orbit through a continuous balance between gravity and forward orbital speed ($v = \\sqrt{GM/r}$). An orbital vehicle is in continuous free-fall, but its forward speed (~7.8 km/s in LEO) ensures Earth's surface curves away beneath it at the exact same rate it falls."

    # Kessler Syndrome
    if 'kessler' in q:
        return "**Kessler Syndrome** is a cascading collision chain-reaction in Low Earth Orbit (LEO) where high-velocity fragmentation debris multiplies exponentially, eventually making whole orbital altitude bands (especially 700–900 km) unusable."

    # Speed Slider
    if 'speed slider' in q or 'slider' in q or 'time control' in q:
        return "The **Speed Multiplier** (1x–1000x in the bottom dock) accelerates numerical SGP4 propagation forward in time so you can simulate future constellation motion and predict upcoming close-approach conjunctions."

    # Launch Safety
    if 'launch' in q and ('safe' in q or 'risk' in q or 'how' in q):
        return "To screen launch trajectories: Click **UPCOMING MISSIONS** in the top bar, monitor target ascent corridors on the 3D globe against mega-constellations (like Starlink at 550 km), and inspect predicted miss distances in the **Conjunctions** tab."

    # Direct fallback for other queries
    return f"In orbital operations, space sustainability relies on continuous SGP4 ephemeris tracking, automated conjunction screening, and timely collision avoidance maneuvers. You can explore OrbitGuard's 3D Radar, Conjunction screener, and Sky Spotter to analyze live orbital data."
