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
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Conjunction, OrbitalObject, SystemStatistics, DataStatus } from '../types';
import { SpaceIntelligenceEngine, CopilotResponse, CopilotAction } from '../services/spaceIntelligenceEngine';

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
  onNavigateToTab?: (tab: 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics') => void;
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
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep'>('quick');
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
          text: `👋 Greetings, Space Operations Officer. I am **Orbit AI**, your specialized Space Intelligence & Astrodynamics Copilot.\n\nI am grounded in live **SGP4 orbital propagation**, NOAA space weather, global launch radar, and authoritative astrodynamics.\n\n**Current Environment Snapshot:**\n• Tracking **${(stats?.tracked_objects || dataStatus?.total_objects || 32340).toLocaleString()} space objects**\n• Evaluating **${conjunctions.length} screened conjunctions (24h)**\n• Upstream ephemeris: **${dataStatus?.source || 'Space-Track / CelesTrak'}**\n\nHow may I assist your mission analysis today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'OrbitGuard Space Intelligence Engine',
          sourceType: 'ORBITGUARD_LIVE',
          retrievedAt: new Date().toUTCString().slice(5, 25) + ' UTC',
          confidence: 'REAL-TIME PROCESSED SGP4',
          actions: initialActions
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

  const handleSendMessage = (textToSend?: string) => {
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

    setTimeout(() => {
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
        actions: response.actions
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const starterPrompts = [
    'Are there any high-risk conjunctions?',
    'What is happening in orbit right now?',
    'Show the closest screened encounter in 3D',
    'Why is the highest-risk conjunction dangerous?',
    'Is there a solar storm right now?',
    'What is a TLE?',
    'How do rockets reach orbit?'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end sm:pr-6 sm:pb-6 bg-black/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none font-mono animate-in fade-in duration-200 pointer-events-auto">
      {/* AI Assistant Floating Window */}
      <div 
        className={`w-full sm:w-[480px] ${
          isExpanded ? 'sm:w-[680px] h-[88vh]' : 'h-[560px] sm:h-[600px]'
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
                  <span>ORBIT AI</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                    SPACE INTELLIGENCE COPILOT
                  </span>
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Astrodynamics Reasoning • NOAA Weather • Launch Radar • 3D Actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick vs Deep Mode Switcher */}
            <button
              onClick={() => setAnalysisMode(analysisMode === 'quick' ? 'deep' : 'quick')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                analysisMode === 'deep'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-space-900 text-slate-400 border-space-800 hover:text-white'
              }`}
              title="Toggle Quick Answer vs Deep Analysis"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">{analysisMode === 'deep' ? 'DEEP ANALYSIS' : 'QUICK'}</span>
            </button>

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
        <div className="px-3.5 py-1 bg-space-950/80 border-b border-space-800/80 text-[10px] text-slate-400 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Info className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            <span className="truncate">
              {selectedObject ? `Context: ${selectedObject.name} (#${selectedObject.norad_id || selectedObject.id})` : (selectedConjunction ? `Context: Conjunction #${selectedConjunction.id}` : `Context: Global Catalog (${(stats?.tracked_objects || 32340).toLocaleString()} Objects)`)}
            </span>
          </div>
          <span className="text-cyan-400 font-bold flex-shrink-0">
            {analysisMode === 'deep' ? '🔬 DEEP REASONING' : '⚡ FAST SGP4'}
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
                  className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed space-y-2.5 shadow-md ${
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

                  {/* Provenance & Scientific Source Badge */}
                  {isAI && m.source && (
                    <div className="pt-2 border-t border-space-800/60 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span className="truncate max-w-[200px] text-slate-400">
                        SRC: <span className="text-cyan-400 font-semibold">{m.source}</span>
                      </span>
                      <span className="text-slate-400">
                        {m.confidence}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
              <span className="text-[11px] text-slate-400 italic">Orbit AI is reasoning over SGP4 ephemeris & multi-source telemetry...</span>
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
            placeholder="Ask about satellites, solar weather, launches, SGP4 math, 3D orbits..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-space-950 border border-space-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
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
