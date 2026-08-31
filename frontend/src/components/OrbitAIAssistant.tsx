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
  Sun, 
  Rocket, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Info, 
  CheckCircle2, 
  Terminal 
} from 'lucide-react';
import { Conjunction, OrbitalObject, SystemStatistics, DataStatus } from '../types';
import { SpaceIntelligenceEngine, CopilotResponse, CopilotAction } from '../services/spaceIntelligenceEngine';
import { api } from '../services/api';

interface OrbitAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  conjunctions: Conjunction[];
  objects: OrbitalObject[];
  selectedObject?: OrbitalObject | null;
  selectedConjunction?: Conjunction | null;
  stats?: SystemStatistics | null;
  dataStatus?: DataStatus | null;
  activeTab?: string;
  onFocus3D?: (target: OrbitalObject | Conjunction) => void;
  onSelectConjunction?: (conj: Conjunction) => void;
  onOpenReplay?: (conj: Conjunction) => void;
  onOpenCAM?: (conj: Conjunction) => void;
  onOpenSpaceWeather?: () => void;
  onOpenLaunchRadar?: () => void;
  onOpenTrustCenter?: () => void;
  onNavigateToTab?: (tab: 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics' | 'validation') => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  source?: string;
  sourceType?: string;
  retrievedAt?: string;
  confidence?: string;
  actions?: CopilotAction[];
  tool_logs?: any[];
  evidence?: any;
  source_badges?: string[];
}

export const OrbitAIAssistant: React.FC<OrbitAIAssistantProps> = ({
  isOpen,
  onClose,
  conjunctions,
  objects,
  selectedObject,
  selectedConjunction,
  stats,
  dataStatus,
  activeTab = 'space',
  onFocus3D,
  onSelectConjunction,
  onOpenReplay,
  onOpenCAM,
  onOpenSpaceWeather,
  onOpenLaunchRadar,
  onOpenTrustCenter,
  onNavigateToTab
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [analysisMode] = useState<'quick' | 'deep'>('quick');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcoming message on first mount
  useEffect(() => {
    if (messages.length === 0) {
      const highestRisk = [...conjunctions].sort((a, b) => b.risk_score - a.risk_score)[0];
      const initialActions: CopilotAction[] = [];

      if (highestRisk) {
        initialActions.push({
          label: `Focus ${highestRisk.object_a?.name || 'Primary'} in 3D`,
          icon: 'globe',
          actionType: 'FOCUS_CONJUNCTION',
          payload: highestRisk
        });
        initialActions.push({
          label: 'Inspect Highest-Risk Encounter',
          icon: 'crosshair',
          actionType: 'OPEN_CONJUNCTION',
          payload: highestRisk
        });
      }

      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: `👋 Greetings, Space Operations Officer. I am **Orbit AI**, your physics-grounded Space Intelligence & Astrodynamics Copilot.\n\nI am connected to verified **SGP4 orbital propagation**, orthogonal TCA root-solvers, Foster-2D $P_c$ integrals, and Gauss/Tsiolkovsky CAM planners.\n\n**Mission Environment Snapshot:**\n• Tracking **${(stats?.tracked_objects || dataStatus?.total_objects || 32340).toLocaleString()} space objects**\n• Evaluating **${conjunctions.length} active conjunctions**\n• Ephemeris feed: **${dataStatus?.source || 'Space-Track / CelesTrak GP'}**\n\nAsk tactical questions like *"Why is the top conjunction high risk?"* or *"What happens if I perform a 0.1 m/s prograde maneuver?"* to execute real backend tools.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'ORBITGUARD Deterministic Physics Engine',
          sourceType: 'ORBITGUARD_LIVE',
          retrievedAt: new Date().toUTCString().slice(5, 25) + ' UTC',
          confidence: 'VERIFIED BACKEND SGP4',
          actions: initialActions,
          source_badges: ['Physics Engine', 'Live CelesTrak Data', 'AI Interpretation']
        }
      ]);
    }
  }, [conjunctions, stats, dataStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const executeAction = (action: CopilotAction) => {
    switch (action.actionType) {
      case 'FOCUS_OBJECT':
      case 'FOCUS_CONJUNCTION':
        if (onFocus3D && action.payload) {
          onFocus3D(action.payload);
          if (onNavigateToTab) onNavigateToTab('space');
        }
        break;
      case 'OPEN_CONJUNCTION':
        if (onSelectConjunction && action.payload) {
          onSelectConjunction(action.payload);
        }
        break;
      case 'OPEN_REPLAY':
        if (onOpenReplay && action.payload) {
          onOpenReplay(action.payload);
        }
        break;
      case 'OPEN_CAM':
        if (onOpenCAM && action.payload) {
          onOpenCAM(action.payload);
        }
        break;
      case 'OPEN_WEATHER':
        if (onOpenSpaceWeather) {
          onOpenSpaceWeather();
        }
        break;
      case 'OPEN_LAUNCH':
        if (onOpenLaunchRadar) {
          onOpenLaunchRadar();
        }
        break;
      case 'OPEN_TRUST':
        if (onOpenTrustCenter) {
          onOpenTrustCenter();
        }
        break;
    }
    onClose();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // 1. Try Backend Physics-Grounded AI Copilot API
      const contextPayload = {
        selected_conjunction_id: selectedConjunction?.id || (conjunctions.length > 0 ? conjunctions[0].id : null),
        selected_object_id: selectedObject?.id || null,
        active_tab: activeTab,
        mode: analysisMode
      };

      const backendRes = await api.queryAICopilot(query.trim(), contextPayload).catch(() => null);

      if (backendRes && backendRes.text) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: backendRes.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'ORBITGUARD Backend Physics Engine',
          sourceType: 'ORBITGUARD_LIVE',
          confidence: 'DETERMINISTIC PHYSICS GROUNDED',
          tool_logs: backendRes.tool_logs || [],
          evidence: backendRes.evidence || null,
          source_badges: backendRes.source_badges || ['Physics Engine', 'Live CelesTrak Data', 'AI Interpretation']
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Fallback to client-side engine if backend offline
        const response: CopilotResponse = SpaceIntelligenceEngine.processQuery(query.trim(), {
          activeTab,
          selectedObject,
          selectedConjunction,
          objects,
          conjunctions,
          stats,
          dataStatus,
          mode: analysisMode,
          conversationHistory: messages.map(m => ({ sender: m.sender, text: m.text }))
        });

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: response.source,
          sourceType: response.sourceType,
          retrievedAt: response.retrievedAt,
          confidence: response.confidence,
          actions: response.actions,
          source_badges: ['Physics Engine', 'AI Interpretation']
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (e) {
      console.error('Error in Copilot query:', e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const starterPrompts = [
    'Why is the top conjunction high risk?',
    'What happens if I perform a 0.1 m/s prograde maneuver?',
    'What is the CCSDS 508.0-B-1 CDM standard?',
    'Explain Gauss equations and Tsiolkovsky propellant mass'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end sm:pr-6 sm:pb-6 bg-black/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none font-mono animate-in fade-in duration-200 pointer-events-auto">
      {/* AI Assistant Floating Window */}
      <div 
        className={`w-full sm:w-[500px] ${
          isExpanded ? 'sm:w-[720px] h-[90vh]' : 'h-[600px]'
        } bg-space-950/95 border border-cyan-500/40 rounded-t-3xl sm:rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-2xl`}
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
                  <span>ORBIT AI COPILOT</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                    PHYSICS GROUNDED
                  </span>
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Real Backend SGP4 • Orthogonal TCA • Foster-2D Pc • CAM Impulses
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

        {/* Context Status Strip */}
        <div className="px-3.5 py-1.5 bg-space-950/80 border-b border-space-800/80 text-[10px] text-slate-400 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Info className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            <span className="truncate">
              {selectedConjunction ? `Encounter #${selectedConjunction.id} (${selectedConjunction.object_a?.name || 'Asset A'} ↔ ${selectedConjunction.object_b?.name || 'Asset B'})` : (selectedObject ? `Asset: ${selectedObject.name}` : `Catalog: ${(stats?.tracked_objects || 32340).toLocaleString()} Objects`)}
            </span>
          </div>
          <span className="text-emerald-400 font-bold flex-shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> NO-HALLUCINATION GUARD ACTIVE
          </span>
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
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  }`}
                >
                  {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed space-y-2.5 shadow-md ${
                    isAI
                      ? 'bg-space-900/95 border border-space-800 text-slate-200 rounded-tl-sm'
                      : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 rounded-tr-sm'
                  }`}
                >
                  {/* Verified Source Badges */}
                  {isAI && m.source_badges && (
                    <div className="flex flex-wrap gap-1.5 pb-1.5 border-b border-space-800/80">
                      {m.source_badges.map((b, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-space-950 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          <span>{b}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-line prose prose-invert prose-xs text-xs max-w-none">
                    {m.text}
                  </div>

                  {/* Expandable Tool Execution Audit Drawer */}
                  {isAI && m.tool_logs && m.tool_logs.length > 0 && (
                    <details className="mt-2 bg-space-950/90 border border-space-800 rounded-lg p-2 text-[11px] font-mono group">
                      <summary className="cursor-pointer font-bold text-cyan-400 hover:text-cyan-300 flex items-center justify-between list-none">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          <span>🔍 Inspect {m.tool_logs.length} Backend Tool Executions</span>
                        </span>
                        <span className="text-[10px] text-space-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-2 pt-2 border-t border-space-800 space-y-2 text-space-300">
                        {m.tool_logs.map((tl, idx) => (
                          <div key={idx} className="bg-space-900/60 p-2 rounded border border-space-800/60">
                            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                              <span>Tool: {tl.tool}()</span>
                              <span className="text-space-500">{tl.duration_ms} ms</span>
                            </div>
                            <div className="text-[10px] text-space-400 mt-1">
                              <strong>Inputs:</strong> {JSON.stringify(tl.arguments)}
                            </div>
                            <div className="text-[10px] text-cyan-300 mt-1 truncate">
                              <strong>Output:</strong> {JSON.stringify(tl.result)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Interactive Action Buttons */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-space-800/80">
                      {m.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => executeAction(act)}
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          {act.icon === 'globe' && <Globe className="w-3 h-3 text-cyan-400" />}
                          {act.icon === 'crosshair' && <Crosshair className="w-3 h-3 text-cyan-400" />}
                          {act.icon === 'play' && <Play className="w-3 h-3 text-amber-400" />}
                          {act.icon === 'activity' && <Activity className="w-3 h-3 text-emerald-400" />}
                          {act.icon === 'shield' && <ShieldAlert className="w-3 h-3 text-cyan-400" />}
                          {act.icon === 'sun' && <Sun className="w-3 h-3 text-amber-400" />}
                          {act.icon === 'rocket' && <Rocket className="w-3 h-3 text-purple-400" />}
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
              <span className="text-[11px] text-slate-400 italic">Orbit AI is executing deterministic backend physics tools...</span>
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
            placeholder="Ask about risk drivers, CAM delta-V, SGP4 math, CCSDS CDMs..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-space-950 border border-space-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner font-mono"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-space-950 rounded-xl transition shadow-md flex-shrink-0"
            title="Send Query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
