import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Conjunction } from '../types';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunction: Conjunction | null;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  recommendation?: {
    burnVector: string;
    deltaV: string;
    fuelCost: string;
    newMissDistance: string;
    riskReduction: string;
  };
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({ isOpen, onClose, conjunction }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Greetings Flight Director. I am **OrbitBot**, your Senior Orbital Mechanic & Navigation Copilot for OrbitGuard. ${
        conjunction 
          ? `I am currently analyzing the active encounter between **${conjunction.object_a?.name || 'Primary Satellite'}** and **${conjunction.object_b?.name || 'Debris Fragment'}** (Miss Distance: ${conjunction.miss_distance_km.toFixed(2)} km, Risk: ${conjunction.risk_score.toFixed(0)}/100).`
          : 'All orbital regimes (LEO, MEO, GEO) are being screened in real time. Ask me about orbital mechanics, collision risk mitigation, or how to navigate any OrbitGuard tool.'
      }`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recommendation: conjunction ? {
        burnVector: '+1.45 m/s In-Track (Prograde)',
        deltaV: '1.45 m/s',
        fuelCost: '0.82 kg Hydrazine (N2H4)',
        newMissDistance: '18.4 km',
        riskReduction: '98.4% (Critical -> Low)'
      } : undefined
    }
  ]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const generateOrbitBotResponse = (query: string): string => {
    const q = query.toLowerCase();

    // 1. Kessler Syndrome
    if (q.includes('kessler')) {
      return `**Kessler Syndrome** is a self-sustaining cascading collision domino effect in Low Earth Orbit (LEO).\n\n• **Mechanism**: When two large satellites collide at hypervelocity ($~14\\text{ km/s}$), they generate thousands of high-velocity fragments ($>10\\text{ cm}$).\n• **Consequence**: Each new fragment acts as a kinetic projectile, increasing the spatial collision density until entire orbital shells (especially $700\\text{--}900\\text{ km}$) become unusable for generations.\n• **In OrbitGuard**: Toggle **DEFENSE & SIMS ▾ → Kessler Heatmap** to inspect current debris spatial density.`;
    }

    // 2. Speed Slider / Time Controls
    if (q.includes('speed slider') || q.includes('time control') || q.includes('speed') || q.includes('time')) {
      return `**Time Controls & Speed Multipliers** (Bottom Dock):\n\n• **Play / Pause**: Freezes or resumes satellite orbital motion in real-time.\n• **Speed Multiplier ($1\\times$ to $1000\\times$)**: Accelerates numerical SGP4 propagation forward to predict future conjunctions hours in advance.\n• **Timeline Scrubber**: Drag the slider up to $+24\\text{ hours}$ to inspect future orbital geometry.\n• **NOW Button**: Instantly resets the simulation clock back to current UTC.`;
    }

    // 3. Launch Safety / Check Collision Risk for Launch
    if (q.includes('launch') || q.includes('rocket') || q.includes('safe') || q.includes('mission')) {
      return `**How to Screen Launch Trajectories for Collision Safety**:\n\n1. Open **UPCOMING MISSIONS** in the top tactical toolbar to view the live global launch manifest (powered by Launch Library 2) and live countdowns.\n2. In the 3D Globe view, look for upcoming launch corridor tracks and active conjunction alerts.\n3. In the bottom control dock, use the **Speed Multiplier ($50\\times$–$200\\times$)** to propagate the target insertion window and verify whether operational mega-constellations (e.g. Starlink at $550\\text{ km}$) intersect the ascent corridor.\n4. Click any alert card in the **Conjunctions** tab to generate a formal **CCSDS Conjunction Data Message (CDM)**.`;
    }

    // 4. Conjunction Screening & Miss Distance
    if (q.includes('conjunction') || q.includes('miss distance') || q.includes('probability') || q.includes('pc')) {
      return `**Conjunction Screening & Collision Probability ($P_c$)**:\n\n• **Miss Distance ($d_{\\text{miss}}$)**: The minimum Euclidean radial separation calculated at Time of Closest Approach (TCA).\n• **Collision Probability ($P_c$)**: Formulated via the **Foster-2D Isotropic Hard-Body Encounter Model** ($P_c = \\frac{R^2}{2\\sigma^2} e^{-d^2/2\\sigma^2}$) when covariance is bounded; marked **DATA UNAVAILABLE** when unconstrained.\n• **OrbitGuard Risk Score (0–100)**: A composite operational index combining miss distance ($55\\%$), relative velocity ($25\\%$), and lead time urgency ($20\\%$).`;
    }

    // 5. SGP4 & TLEs
    if (q.includes('sgp4') || q.includes('tle') || q.includes('norad') || q.includes('propagat')) {
      return `**SGP4 Propagation & Ephemeris Physics**:\n\n• **SGP4 (Simplified General Perturbations-4)**: Propagates Two-Line Element (TLE) sets accounting for Earth oblateness ($J_2, J_3, J_4$), atmospheric drag ($B^*$), and lunar/solar gravitational perturbations.\n• **Coordinate Frames**: Transforms **TEME** $\\to$ **ECEF** via Greenwich Mean Sidereal Time (GMST) $\\to$ **WGS84 Geodetic** (Latitude, Longitude, Altitude).\n• **Catalog Search**: Enter any satellite name or 5-digit NORAD ID (e.g. **25544** for ISS) into the top-left search bar to focus its true orbit.`;
    }

    // 6. Citizen Sky Spotter
    if (q.includes('spotter') || q.includes('naked eye') || q.includes('visible') || q.includes('iss pass')) {
      return `**Citizen Sky Spotter Tool**:\n\n• Click **SKY SPOTTER** in the SSA tools sub-bar.\n• Displays live SGP4 visible passes for large objects (ISS, Tiangong, Hubble) with a **1-second live countdown ticker**.\n• Automatically filters to observer locations where the satellite is physically above the local horizon during twilight/dark sky conditions.`;
    }

    // 7. Maneuver / CAM Optimization
    if (q.includes('maneuver') || q.includes('cam') || q.includes('delta v') || q.includes('burn')) {
      return `**Collision Avoidance Maneuver (CAM) Planning**:\n\n• Optimal burn execution occurs **$1.5$ orbital revolutions prior to TCA** at the orbit's nodal line.\n• A modest in-track burn ($+1.45\\text{ m/s}$) expands along-track separation to $>18\\text{ km}$, reducing collision probability by $>98\\%$ with minimal hydrazine consumption ($<1\\text{ kg}$).`;
    }

    // Default Fallback
    return `Affirmative, Flight Director. That is monitored within our astrodynamics pipeline.\n\n• **3D Radar**: Search by NORAD ID or click any orbital node for live SGP4 telemetry.\n• **Conjunction Hotspots**: Screen encounters in the **Conjunctions** tab and view 2D B-Plane covariance ellipses.\n• **Simulators**: Explore **DEFENSE & SIMS ▾** for ASAT kinetic intercepts, Kessler density maps, and SITREP reports.\n\nHow else can I assist with your orbital flight operations?`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    const query = inputText;
    setInputText('');

    setTimeout(() => {
      const replyText = generateOrbitBotResponse(query);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-2xl bg-space-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[640px] max-h-[90vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-950/80 via-space-900 to-space-950 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
                  ORBITBOT COPILOT
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Space Domain Awareness (SDA) Expert
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-bold text-white tracking-wide mt-0.5">
                Astrodynamics & OrbitGuard Platform Navigation Guide
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Question Chips */}
        <div className="px-3 sm:px-4 py-2 bg-space-900/60 border-b border-space-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
          <span className="text-slate-500 font-bold flex-shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-cyan-400" /> PROMPTS:
          </span>
          {[
            'What is Kessler Syndrome?',
            'What does the speed slider do?',
            'How to check launch collision risk?',
            'How is collision probability (Pc) calculated?'
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInputText(prompt);
              }}
              className="px-2.5 py-1 rounded-full bg-space-950 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-space-800 hover:border-cyan-500/40 transition whitespace-nowrap flex-shrink-0 font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 font-mono text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500">
                <span>{m.sender === 'user' ? 'Flight Director' : 'OrbitBot (SDA Expert)'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>
              
              <div
                className={`p-3 rounded-2xl max-w-[88%] leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                    : 'bg-space-900 text-slate-200 border border-space-800 rounded-bl-none shadow-inner'
                }`}
              >
                {m.text}

                {/* Tactical CAM Recommendation Card */}
                {m.recommendation && (
                  <div className="mt-3 p-2.5 bg-space-950 rounded-xl border border-cyan-500/30 text-[11px] space-y-1.5">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Calculated Avoidance Burn (CAM) Vector
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 pt-1">
                      <div>Burn: <span className="text-white font-bold">{m.recommendation.burnVector}</span></div>
                      <div>$\Delta v$: <span className="text-cyan-300 font-bold">{m.recommendation.deltaV}</span></div>
                      <div>Propellant: <span className="text-amber-300 font-bold">{m.recommendation.fuelCost}</span></div>
                      <div>New Miss Dist: <span className="text-emerald-400 font-bold">{m.recommendation.newMissDistance}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-space-900 border-t border-space-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask OrbitBot about orbital mechanics, collision risk, or UI tools..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-space-950 border border-space-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-space-950 rounded-xl transition shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
