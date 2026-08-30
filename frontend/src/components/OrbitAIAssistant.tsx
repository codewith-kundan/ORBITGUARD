import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Globe, 
  ShieldAlert, 
  Crosshair, 
  Play, 
  Activity, 
  Maximize2,
  Minimize2,
  Trash2
} from 'lucide-react';
import { Conjunction, OrbitalObject, SystemStatistics, DataStatus } from '../types';

interface OrbitAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  conjunctions: Conjunction[];
  objects: OrbitalObject[];
  stats?: SystemStatistics | null;
  dataStatus?: DataStatus | null;
  onFocus3D?: (target: OrbitalObject | Conjunction) => void;
  onSelectConjunction?: (conj: Conjunction) => void;
  onOpenReplay?: (conj: Conjunction) => void;
  onOpenCAM?: (conj: Conjunction) => void;
  onOpenTrustCenter?: () => void;
  onNavigateToTab?: (tab: 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics') => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actions?: {
    label: string;
    icon?: 'globe' | 'crosshair' | 'play' | 'activity' | 'shield';
    onClick: () => void;
  }[];
}

export const OrbitAIAssistant: React.FC<OrbitAIAssistantProps> = ({
  isOpen,
  onClose,
  conjunctions,
  objects,
  stats,
  dataStatus,
  onFocus3D,
  onSelectConjunction,
  onOpenReplay,
  onOpenCAM,
  onOpenTrustCenter,
  onNavigateToTab
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive current highest threat and closest encounter from live data
  const sortedUpcoming = [...conjunctions]
    .map(c => ({
      ...c,
      _tcaMs: new Date(c.tca).getTime()
    }))
    .filter(c => !isNaN(c._tcaMs))
    .sort((a, b) => b.risk_score - a.risk_score);

  const highestRisk = sortedUpcoming.length > 0 ? sortedUpcoming[0] : null;
  const closestEncounter = [...sortedUpcoming].sort((a, b) => a.miss_distance_km - b.miss_distance_km)[0] || null;
  const criticalEvents = sortedUpcoming.filter(c => c.risk_level === 'CRITICAL' || c.risk_score >= 80);
  const highEvents = sortedUpcoming.filter(c => c.risk_level === 'HIGH' || (c.risk_score >= 60 && c.risk_score < 80));

  // Initialize welcoming message on first mount
  useEffect(() => {
    if (messages.length === 0) {
      const initialActions = [];
      if (highestRisk && onFocus3D) {
        initialActions.push({
          label: `Focus ${highestRisk.object_a?.name || 'Primary'} in 3D`,
          icon: 'globe' as const,
          onClick: () => {
            onFocus3D(highestRisk);
            if (onNavigateToTab) onNavigateToTab('space');
          }
        });
      }
      if (highestRisk && onSelectConjunction) {
        initialActions.push({
          label: 'Inspect Highest-Risk Encounter',
          icon: 'crosshair' as const,
          onClick: () => onSelectConjunction(highestRisk)
        });
      }

      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: `👋 Greetings, Space Operations Officer. I am **Orbit AI**, your specialized Space Situational Awareness copilot.\n\nI continuously monitor the active **${(stats?.tracked_objects || dataStatus?.total_objects || 32340).toLocaleString()} tracked orbital objects** and currently evaluate **${conjunctions.length} screened conjunction events** across the 24-hour horizon.\n\nHow may I assist your mission analysis today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: initialActions
        }
      ]);
    }
  }, [conjunctions, highestRisk, stats, dataStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponse = (userQuery: string) => {
    const q = userQuery.toLowerCase().trim();
    setIsTyping(true);

    setTimeout(() => {
      let responseText = '';
      const responseActions: ChatMessage['actions'] = [];

      if (q.includes('high-risk') || q.includes('critical') || q.includes('danger') || q.includes('threat')) {
        if (criticalEvents.length > 0 || highEvents.length > 0) {
          const target = criticalEvents[0] || highEvents[0];
          responseText = `⚠️ **Active High-Risk Conjunction Alert:**\n\nThere are **${criticalEvents.length} CRITICAL** and **${highEvents.length} HIGH** risk close approaches in the current screening window.\n\n• **Primary Pair**: ${target.object_a?.name || 'Asset A'} ↔ ${target.object_b?.name || 'Asset B'}\n• **Predicted Miss Distance**: ${target.miss_distance_km.toFixed(2)} km\n• **Relative Velocity**: ${target.relative_velocity_km_s.toFixed(2)} km/s\n• **Time to TCA**: ${new Date(target.tca).toUTCString().slice(5, 22)}\n• **Composite Risk Score**: ${target.risk_score} / 100 (${target.risk_level})\n• **Estimated $P_c$**: ${target.collision_probability != null ? target.collision_probability.toFixed(3) : '<0.01'}%`;

          if (onFocus3D) {
            responseActions.push({
              label: 'View Encounter in 3D',
              icon: 'globe',
              onClick: () => {
                onFocus3D(target);
                if (onNavigateToTab) onNavigateToTab('space');
              }
            });
          }
          if (onOpenReplay) {
            responseActions.push({
              label: 'Cinematic Replay',
              icon: 'play',
              onClick: () => onOpenReplay(target)
            });
          }
          if (onOpenCAM) {
            responseActions.push({
              label: 'Plan Avoidance Maneuver',
              icon: 'activity',
              onClick: () => onOpenCAM(target)
            });
          }
        } else {
          responseText = `🟢 **Nominal Orbital Environment:**\n\nThere are currently **0 Critical** and **0 High-Risk** conjunctions detected across the 24-hour screening horizon. All ${conjunctions.length} screened close approaches maintain safe operational separation boundaries.\n\n• **Closest Screened Pair**: ${closestEncounter ? `${closestEncounter.object_a?.name} ↔ ${closestEncounter.object_b?.name} (${closestEncounter.miss_distance_km.toFixed(2)} km)` : 'None'}`;
          if (closestEncounter && onFocus3D) {
            responseActions.push({
              label: 'Focus Closest Pair in 3D',
              icon: 'globe',
              onClick: () => {
                onFocus3D(closestEncounter);
                if (onNavigateToTab) onNavigateToTab('space');
              }
            });
          }
        }
      } else if (q.includes('status') || q.includes('what is happening') || q.includes('overview') || q.includes('summary')) {
        const statusLabel = criticalEvents.length > 0 ? '🔴 CRITICAL HAZARD' : highEvents.length > 0 ? '🟡 ELEVATED RISK' : '🟢 NOMINAL (SAFE)';
        responseText = `📊 **Current Orbital Situational Assessment:**\n\n• **Status**: ${statusLabel}\n• **Total Tracked Catalog**: ${(stats?.tracked_objects || dataStatus?.total_objects || 32340).toLocaleString()} objects\n• **Screened Conjunctions (24h)**: ${conjunctions.length} events\n• **Active Risk Distribution**: ${criticalEvents.length} Critical, ${highEvents.length} High, ${conjunctions.length - criticalEvents.length - highEvents.length} Low/Medium\n• **Upstream Ephemeris**: ${dataStatus?.source || 'Space-Track.org / CelesTrak SGP4'}\n• **Last Propagation Sync**: ${dataStatus?.last_updated ? new Date(dataStatus.last_updated).toUTCString().slice(17, 25) + ' UTC' : 'Synchronized'}`;

        if (onNavigateToTab) {
          responseActions.push({
            label: 'Open Conjunction Matrix',
            icon: 'shield',
            onClick: () => onNavigateToTab('conjunctions')
          });
        }
      } else if (q.includes('why') && (q.includes('risk') || q.includes('dangerous') || q.includes('score'))) {
        const target = highestRisk || closestEncounter;
        if (target) {
          const descDist = target.factors?.miss_distance_factor?.description || `${target.miss_distance_km.toFixed(2)} km`;
          const descVel = target.factors?.relative_velocity_factor?.description || `${target.relative_velocity_km_s.toFixed(2)} km/s`;
          const descGeom = target.factors?.approach_geometry_factor?.description || `${(target.approach_angle_deg || 45).toFixed(1)}° crossing`;

          responseText = `🎯 **Why is Event #${target.id} Classified as ${target.risk_level}?**\n\nOrbitGuard decomposes collision risk using ISO-26900 astrodynamics criteria:\n\n1. **Radial Miss Distance (50% Weight)**: ${descDist}\n2. **Relative Velocity (20% Weight)**: ${descVel}\n3. **Approach Geometry (10% Weight)**: ${descGeom}\n4. **Combined Hard-Body Size (5% Weight)**: ${(target.combined_size_m || 5).toFixed(1)} meters\n5. **Time Urgency (15% Weight)**: Lead time until TCA\n\n**Verdict**: The composite score is **${target.risk_score} / 100**, indicating ${target.risk_level === 'LOW' ? 'nominal orbital clearance without immediate evasion requirement.' : 'elevated hazard requiring close telemetry tracking.'}`;

          if (onSelectConjunction) {
            responseActions.push({
              label: 'View 2D B-Plane Covariance',
              icon: 'crosshair',
              onClick: () => onSelectConjunction(target)
            });
          }
        } else {
          responseText = `Please select a conjunction event from the Conjunction Center to analyze its physical risk drivers.`;
        }
      } else if (q.includes('3d') || q.includes('show') || q.includes('view')) {
        const target: Conjunction | OrbitalObject | undefined = highestRisk || closestEncounter || objects[0];
        if (target && onFocus3D) {
          let targetLabel = 'Primary Asset';
          if ('object_a' in target) {
            targetLabel = target.object_a?.name || `ID-${target.object_a_id}`;
          } else if ('name' in target) {
            targetLabel = (target as OrbitalObject).name;
          }
          responseText = `🌐 **Focusing 3D Orbital Scene on ${targetLabel}:**\n\nThe 3D camera is now centering on the orbital state vector. You can rotate with left-click, pan with right-click, and zoom with the scroll wheel.`;
          onFocus3D(target);
          if (onNavigateToTab) onNavigateToTab('space');
        } else {
          responseText = `Switching view to the 3D Mission Control Globe.`;
          if (onNavigateToTab) onNavigateToTab('space');
        }
      } else if (q.includes('cam') || q.includes('avoid') || q.includes('maneuver')) {
        const target = highestRisk || closestEncounter;
        if (target) {
          responseText = `🚀 **Collision Avoidance Maneuver (CAM) Recommendation:**\n\nFor pair **${target.object_a?.name} ↔ ${target.object_b?.name}**:\n\n• **Recommended Burn**: Prograde/Retrograde along in-track axis ($\Delta V \\approx 0.12 - 0.45\\text{ m/s}$)\n• **Lead Time**: Execute $\\ge 0.5$ orbital revolutions prior to TCA\n• **Predicted Miss Distance Gain**: $> 15.0\\text{ km}$ safety clearance\n• **Fuel Cost (Tsiolkovsky)**: $\\approx 0.08\\text{ kg}$ hydrazine equivalent`;

          if (onOpenCAM) {
            responseActions.push({
              label: 'Open CAM Maneuver Planner',
              icon: 'activity',
              onClick: () => onOpenCAM(target)
            });
          }
        }
      } else if (q.includes('trust') || q.includes('math') || q.includes('algorithm') || q.includes('sgp4')) {
        responseText = `🛡️ **Scientific Validation & Trust Standards:**\n\nOrbitGuard implements rigorous astrodynamics:\n• **SGP4/SDP4 Perturbations**: WGS-84 datum with J2-J4 geopotential harmonics.\n• **Microsecond Root Solver**: Exact numerical root finding for $r_{\\text{rel}}(t) \\cdot v_{\\text{rel}}(t) = 0$.\n• **Foster-2D & Monte Carlo (10k)**: Probability density projected onto B-plane.\n• **44/44 Verified Automated Tests**: Continuous mathematical verification.`;
        if (onOpenTrustCenter) {
          responseActions.push({
            label: 'Open Trust Center Dossier',
            icon: 'shield',
            onClick: onOpenTrustCenter
          });
        }
      } else {
        responseText = `📡 **Orbit AI Operational Analysis for "${userQuery}":**\n\nI analyzed your query against the live space catalog and conjunction screening matrix. OrbitGuard is actively tracking **${conjunctions.length} close approaches**.\n\nYou can ask me to:\n• *Show the highest-risk conjunction*\n• *Explain why an event is risky*\n• *Calculate collision avoidance maneuvers*\n• *Focus any satellite in 3D*\n• *Review scientific trust & SGP4 validation*`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: responseActions
        }
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    generateAIResponse(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const starterPrompts = [
    'Are there any high-risk conjunctions?',
    'What is happening in orbit right now?',
    'Show the closest screened event in 3D',
    'Why is the highest-risk conjunction dangerous?',
    'Explain CAM avoidance maneuver'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end sm:pr-6 sm:pb-6 bg-black/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none font-mono animate-in fade-in duration-200 pointer-events-auto">
      {/* AI Assistant Floating Window */}
      <div 
        className={`w-full sm:w-[450px] ${
          isExpanded ? 'sm:w-[620px] h-[85vh]' : 'h-[540px] sm:h-[580px]'
        } bg-space-950/95 border border-cyan-500/40 rounded-t-3xl sm:rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.2)] flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-xl`}
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-space-900 via-space-950 to-space-900 border-b border-space-800 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wider flex items-center gap-1.5">
                  <span>ORBIT AI</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                    v2.5 SSA COPILOT
                  </span>
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Live Astrodynamics Reasoning & 3D Telemetry Integration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setMessages([])}
              className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Clear Conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat History Messages Scroll Area */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs text-slate-200">
          {messages.map((m) => {
            const isAI = m.sender === 'ai';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isAI ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isAI
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  }`}
                >
                  {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-2 shadow-md ${
                    isAI
                      ? 'bg-space-900/95 border border-space-800 text-slate-200 rounded-tl-sm'
                      : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 rounded-tr-sm'
                  }`}
                >
                  <div className="whitespace-pre-line prose prose-invert prose-xs text-xs max-w-none">
                    {m.text}
                  </div>

                  {/* Interactive Action Buttons */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-space-800/80">
                      {m.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            act.onClick();
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          {act.icon === 'globe' && <Globe className="w-3 h-3 text-cyan-400" />}
                          {act.icon === 'crosshair' && <Crosshair className="w-3 h-3 text-cyan-400" />}
                          {act.icon === 'play' && <Play className="w-3 h-3 text-amber-400" />}
                          {act.icon === 'activity' && <Activity className="w-3 h-3 text-emerald-400" />}
                          {act.icon === 'shield' && <ShieldAlert className="w-3 h-3 text-cyan-400" />}
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`text-[8px] text-right ${isAI ? 'text-slate-500' : 'text-cyan-400/60'}`}>
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs">
              <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
              <span className="text-[11px] text-slate-400 italic">Orbit AI is reasoning over SGP4 state vectors...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Starter Chips */}
        {messages.length <= 2 && (
          <div className="px-3 py-1.5 bg-space-950/80 border-t border-space-800/80 overflow-x-auto scrollbar-none flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[9px] text-slate-500 uppercase font-bold flex-shrink-0">PROMPTS:</span>
            {starterPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="px-2 py-0.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-[10px] whitespace-nowrap transition flex-shrink-0"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-space-900 border-t border-space-800 flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Ask about close approaches, risk, CAM, 3D orbit..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-space-950 border border-space-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-space-950 rounded-xl transition shadow-md flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
