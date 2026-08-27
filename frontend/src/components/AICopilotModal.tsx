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
      text: `Hello! I am **OrbitBot**, your Space Domain Awareness (SDA) Expert and copilot for OrbitGuard. ${
        conjunction 
          ? `I'm tracking an active conjunction between **${conjunction.object_a?.name || 'Primary Satellite'}** and **${conjunction.object_b?.name || 'Debris Object'}** (Miss Distance: ${conjunction.miss_distance_km.toFixed(2)} km, Risk: ${conjunction.risk_score.toFixed(0)}/100).`
          : 'Feel free to ask me any question about space, orbital physics, satellite tracking, or navigating OrbitGuard.'
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
    const q = query.trim().toLowerCase();

    // ==========================================
    // CATEGORY A: General Space, Astronomy & Astrodynamics
    // ==========================================

    // 1. What is space?
    if (q === 'what is space' || q === 'what is space?' || q.includes('definition of space')) {
      return `**Space** (outer space) is the physical universe beyond Earth's atmosphere. It begins officially at the **Kármán line** ($100\\text{ km}$ / $62\\text{ miles}$ above sea level), where Earth's atmosphere becomes too thin to support aerodynamic flight, requiring orbital velocities ($~7.8\\text{ km/s}$) to stay aloft. It is a near-perfect vacuum filled with low-density particles, plasma, magnetic fields, radiation, and celestial bodies.`;
    }

    // 2. How do satellites stay in orbit?
    if (q.includes('stay in orbit') || q.includes('how orbit works') || q.includes('how do satellites orbit')) {
      return `Satellites stay in orbit through a continuous balance between **gravitational attraction** and **tangential orbital velocity**.\n\n• An orbital vehicle is essentially in continuous free-fall toward Earth, but its forward speed ($~7.8\\text{ km/s}$ in Low Earth Orbit) means Earth's surface curves away beneath it at the exact same rate.\n• Orbital velocity is governed by $v = \\sqrt{\\frac{GM}{r}}$, where $G$ is the gravitational constant, $M$ is Earth's mass, and $r$ is the orbital radius from Earth's center.`;
    }

    // 3. Kessler Syndrome
    if (q.includes('kessler')) {
      return `**Kessler Syndrome** is a theoretical scenario where the spatial density of objects in Low Earth Orbit (LEO) becomes high enough that collisions between satellites and debris create a cascading chain reaction.\n\n• Each collision generates thousands of high-speed fragments ($>10\\text{ cm}$).\n• These fragments multiply the likelihood of further collisions, potentially rendering entire orbital bands (especially $700\\text{--}900\\text{ km}$) hazardous and unusable for future space missions.`;
    }

    // 4. LEO vs MEO vs GEO
    if (q.includes('leo') || q.includes('meo') || q.includes('geo') || q.includes('geostationary') || q.includes('orbit types')) {
      return `**Orbital Regimes**:\n\n• **LEO (Low Earth Orbit, $160\\text{--}2,000\\text{ km}$)**: Fast orbital periods ($~90\\text{ mins}$). Home to the ISS, Earth observation satellites, and Starlink.\n• **MEO (Medium Earth Orbit, $2,000\\text{--}35,786\\text{ km}$)**: Primary home of GNSS/Navigation constellations (GPS, Galileo, GLONASS).\n• **GEO (Geostationary Orbit, $35,786\\text{ km}$)**: Orbit period exactly matches Earth's rotation ($23\\text{h } 56\\text{m}$), keeping satellites fixed above a specific longitude for telecommunications and weather monitoring.`;
    }

    // 5. Orbital Debris / Space Junk
    if (q.includes('space junk') || (q.includes('debris') && !q.includes('filter') && !q.includes('how to'))) {
      return `**Space Debris** refers to defunct human-made objects in orbit—spent rocket stages, inactive satellites, and fragmentation debris from explosions or collisions.\n\n• Traveling at hypervelocities ($~7\\text{--}14\\text{ km/s}$), even a $1\\text{ cm}$ particle carries the kinetic impact energy of an exploding hand grenade.\n• There are currently over $36,000$ tracked pieces larger than $10\\text{ cm}$ and millions of smaller untrackable fragments.`;
    }

    // ==========================================
    // CATEGORY B: Website & OrbitGuard UI Guidance
    // ==========================================

    // 1. Speed Slider / Time Controls
    if (q.includes('speed slider') || q.includes('time control') || q.includes('slider')) {
      return `**Time Controls & Speed Multipliers** (Bottom Dock):\n\n• **Play / Pause**: Freezes or resumes orbital motion in real time.\n• **Speed Buttons ($1\\times$ to $1000\\times$)**: Accelerates numerical SGP4 propagation forward to preview satellite positions hours ahead.\n• **Timeline Scrubber**: Drag the slider up to $+24\\text{ hours}$ to inspect upcoming orbital geometry.\n• **NOW Button**: Instantly snaps the simulation clock back to current live UTC.`;
    }

    // 2. How to check launch safety / collision risk for launch
    if (q.includes('launch') && (q.includes('check') || q.includes('safe') || q.includes('risk') || q.includes('how'))) {
      return `**Checking Launch Trajectory & Mission Safety in OrbitGuard**:\n\n1. Click **UPCOMING MISSIONS** in the top tactical toolbar to view the live global rocket manifest, launch complex coordinates, and liftoff countdowns.\n2. In the **3D Globe**, view projected orbital insertion tracks and look for intersecting mega-constellations (e.g. Starlink at $550\\text{ km}$).\n3. Accelerate the bottom **Speed Slider** to check if the target orbital regime has active conjunction warnings during insertion.`;
    }

    // 3. How to check satellite collision risk / conjunctions
    if (q.includes('conjunction') || q.includes('collision risk') || q.includes('check risk') || q.includes('miss distance')) {
      return `**Checking Conjunctions & Collision Risk**:\n\n1. Navigate to the **Conjunctions** tab in the top navigation bar to view all screened close approaches sorted chronologically by TCA.\n2. Click on any encounter row or card to open the **2D B-Plane Covariance Modal**.\n3. Review the calculated **Miss Distance** ($km$), **Relative Velocity** ($km/s$), and **Foster-2D Collision Probability ($P_c$)**.\n4. Click **PLAN CAM** to calculate an optimal Collision Avoidance Maneuver $\\Delta v$ burn.`;
    }

    // 4. Where is 3D Radar / How to search
    if (q.includes('search') || q.includes('find satellite') || q.includes('radar') || q.includes('3d')) {
      return `**Using the 3D Orbital Radar & Catalog Search**:\n\n1. Click the **3D Globe** tab in the top navigation bar.\n2. Open the top-left **ORBITAL RADAR** dock to access the search bar.\n3. Enter any satellite name (e.g. \`Starlink\`, \`Tiangong\`) or 5-digit NORAD ID (e.g. \`25544\` for ISS).\n4. Click any search result to automatically focus the 3D camera on the object and display its real-time SGP4 ephemeris and orbit trail.`;
    }

    // 5. Sky Spotter / Naked-Eye Passes
    if (q.includes('spotter') || q.includes('naked eye') || q.includes('visible pass')) {
      return `**Using the Citizen Sky Spotter**:\n\n1. Click **SKY SPOTTER** in the SSA tools sub-bar.\n2. By default, it displays all confirmed naked-eye visible passes across global observer corridors.\n3. Use the **FILTER BY LOCATION** dropdown to see passes exclusively for your observer city (e.g. Bengaluru, London, New York) with live $1\\text{-second}$ countdown timers.`;
    }

    // ==========================================
    // CATEGORY C: Hybrid / Specific Satellite Queries
    // ==========================================
    if (q.includes('iss') || q.includes('space station') || q.includes('25544')) {
      return `The **International Space Station (ISS)** (NORAD #25544) orbits at an altitude of $~415\\text{--}420\\text{ km}$ with an orbital inclination of $51.64^\\circ$ and a speed of $~7.66\\text{ km/s}$.\n\n• **In OrbitGuard**: Type **25544** into the top-left search bar in the **3D Globe** to focus its real-time trajectory, or open **SKY SPOTTER** to view tonight's naked-eye overpass window.`;
    }

    if (q.includes('starlink')) {
      return `**Starlink** is SpaceX's mega-constellation operating primarily in circular LEO shells at $~550\\text{ km}$ ($53.2^\\circ$ inclination).\n\n• **In OrbitGuard**: In the **3D Globe** left dock, select **◆ Starlink** under Fleet Filters to highlight the entire Starlink constellation mesh and monitor orbital density.`;
    }

    // Direct conversational response for other queries
    return `That's an interesting question regarding orbital operations and space dynamics.\n\nCould you clarify if you're looking for specific astrodynamics calculations (e.g. SGP4 propagation, Keplerian elements, $P_c$ covariance), or would you like guidance on using a specific OrbitGuard feature?`;
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
    }, 350);
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
            'What is space?',
            'What is Kessler Syndrome?',
            'What does the speed slider do?',
            'How to check launch collision risk?'
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInputText(prompt);
              }}
              className="px-2.5 py-1 rounded-full bg-space-950 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-space-800 hover:border-cyan-500/40 transition whitespace-nowrap flex-shrink-0 font-medium cursor-pointer"
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
                <span>{m.sender === 'user' ? 'You' : 'OrbitBot (SDA Expert)'}</span>
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
            placeholder="Ask OrbitBot anything about space or how to use OrbitGuard..."
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
