import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

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

    # If OpenAI API Key is provided, call the official OpenAI Chat Completions API
    if openai_api_key:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            }

            # Build full message history with OrbitBot system prompt
            api_messages = [{"role": "system", "content": ORBITBOT_SYSTEM_PROMPT}]
            for msg in payload.messages:
                api_messages.append({"role": msg.role, "content": msg.content})

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

                if resp.status_code == 200:
                    data = resp.json()
                    bot_text = data["choices"][0]["message"]["content"]
                    return ChatResponse(
                        response=bot_text,
                        model="gpt-4o-mini (OpenAI)",
                        status="LIVE_OPENAI"
                    )
                else:
                    logger.warning(f"OpenAI API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")

    # Graceful intelligent fallback when OPENAI_API_KEY is not set or rate-limited
    last_user_msg = payload.messages[-1].content if payload.messages else ""
    fallback_reply = _generate_intelligent_dynamic_fallback(last_user_msg)

    return ChatResponse(
        response=fallback_reply,
        model="OrbitBot Neural Engine (Setup OPENAI_API_KEY for live ChatGPT)",
        status="FALLBACK_ACTIVE"
    )


def _generate_intelligent_dynamic_fallback(query: str) -> str:
    """Dynamic fallback responder answering specific space questions directly."""
    q = query.trim().lower() if hasattr(query, 'trim') else query.strip().lower()

    if 'what is space' in q:
      return "Outer space begins at the **Kármán Line** (100 km / 62 miles above sea level), where atmospheric lift becomes negligible and orbital speed (~7.8 km/s) is necessary to avoid re-entry. It is an extremely hard vacuum characterized by microgravity, cosmic radiation, and plasma fields."

    if 'kessler' in q:
      return "**Kessler Syndrome** is a self-propagating cascade of orbital collisions in Low Earth Orbit (LEO). As satellites and spent stages fragment at hypervelocity (~14 km/s), each collision creates thousands of kinetic projectiles (>10 cm), progressively making entire altitude shells (especially 700–900 km) hazardous for space flight."

    if 'speed slider' in q or 'slider' in q or 'time control' in q:
      return "The **Speed Multiplier** in the bottom Mission Control dock accelerates numerical SGP4 propagation from **1x up to 1000x**. This allows you to simulate satellite constellation motion and project close-approach encounters hours into the future."

    if 'launch' in q and ('safe' in q or 'risk' in q or 'how' in q):
      return "To screen launch trajectories for collision risk:\n1. Click **UPCOMING MISSIONS** in the top tactical bar to check active launch manifests.\n2. In the 3D globe, monitor target insertion corridors against mega-constellations (like Starlink at 550 km).\n3. In the **Conjunctions** tab, inspect predicted close-approach miss distances and generate formal CCSDS CDMs."

    if 'conjunction' in q or 'collision' in q or 'miss distance' in q:
      return "In orbital dynamics, a **conjunction** occurs when two orbiting objects pass within a critical spatial screening volume (typically <50 km). OrbitGuard calculates the exact **Time of Closest Approach (TCA)**, **Miss Distance** (km), and **Foster-2D Collision Probability ($P_c$)** in the encounter plane."

    if 'orbit' in q and 'how' in q:
      return "Satellites stay in orbit by balancing gravitational pull with forward tangential velocity ($v = \\sqrt{GM/r}$). An orbital object is in continuous free-fall toward Earth, but its forward speed (~7.8 km/s in LEO) ensures Earth's surface curves away beneath it at the exact same rate."

    return f"Regarding your question on '{query}': In orbital operations, space sustainability relies on continuous SGP4 tracking, automated conjunction screening, and timely collision avoidance maneuvers. (To enable full open-domain ChatGPT responses, configure `OPENAI_API_KEY` in your environment)."
