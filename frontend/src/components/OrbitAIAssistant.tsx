import React, { useState, useEffect, useRef } from 'react';
import {
  X,
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
  Terminal,
  ChevronDown,
} from 'lucide-react';
import { Conjunction, OrbitalObject, SystemStatistics, DataStatus } from '../types';
import { SpaceIntelligenceEngine, CopilotResponse, CopilotAction } from '../services/spaceIntelligenceEngine';
import { api } from '../services/api';
import { ModalDialog } from './ModalDialog';
import { FormattedTelemetryText } from '../utils/formatRichText';
import { formatUtcTime, formatUtcDateTime } from '../utils/utcTime';

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
  onNavigateToTab?: (
    tab: 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics' | 'validation'
  ) => void;
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
  onNavigateToTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const objectCount =
    stats?.tracked_objects ?? dataStatus?.total_objects ?? (objects.length > 0 ? objects.length : null);

  // Initialize greeting once when opened with empty thread
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;

    const highestRisk = [...conjunctions].sort((a, b) => b.risk_score - a.risk_score)[0];
    const initialActions: CopilotAction[] = [];

    if (highestRisk) {
      initialActions.push({
        label: `Focus ${highestRisk.object_a?.name || 'Primary'} in 3D`,
        icon: 'globe',
        actionType: 'FOCUS_CONJUNCTION',
        payload: highestRisk,
      });
      initialActions.push({
        label: 'Inspect Top Encounter',
        icon: 'crosshair',
        actionType: 'OPEN_CONJUNCTION',
        payload: highestRisk,
      });
    }

    const trackedText =
      objectCount !== null ? `${objectCount.toLocaleString()} cataloged space objects` : 'live orbital catalog';

    setMessages([
      {
        id: 'welcome-1',
        sender: 'ai',
        text: `**OrbitGuard Operations Copilot** online.\n\nConnected to deterministic SGP4 propagation, orthogonal TCA root-finding, Foster-2D collision probability estimation, and Gauss/Tsiolkovsky avoidance maneuver planners.\n\n**Active Telemetry Scope:**\n• Monitoring ${trackedText}\n• Screening ${conjunctions.length} active conjunction events\n• Ephemeris Source: ${dataStatus?.source || 'Backend SGP4 Catalog'}\n\nAsk a tactical question below to invoke backend physics diagnostics.`,
        timestamp: formatUtcTime(Date.now(), false),
        source: 'OrbitGuard Deterministic Physics Engine',
        sourceType: 'ORBITGUARD_LIVE',
        retrievedAt: formatUtcDateTime(Date.now()),
        confidence: 'VERIFIED BACKEND SGP4',
        actions: initialActions,
        source_badges: ['SGP4 Engine', 'Deterministic Tools'],
      },
    ]);
  }, [isOpen, messages.length, conjunctions, objectCount, dataStatus]);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
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
        if (onOpenSpaceWeather) onOpenSpaceWeather();
        break;
      case 'OPEN_LAUNCH':
        if (onOpenLaunchRadar) onOpenLaunchRadar();
        break;
      case 'OPEN_TRUST':
        if (onOpenTrustCenter) onOpenTrustCenter();
        break;
    }
    onClose();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputValue).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: formatUtcTime(Date.now(), false),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const contextPayload = {
        selected_conjunction_id:
          selectedConjunction?.id ?? (conjunctions.length > 0 ? conjunctions[0].id : null),
        selected_object_id: selectedObject?.id ?? null,
        active_tab: activeTab,
        mode: 'quick',
      };

      const backendRes = await api.queryAICopilot(query, contextPayload).catch(() => null);

      if (backendRes && backendRes.text) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: backendRes.text,
          timestamp: formatUtcTime(Date.now(), false),
          source: 'OrbitGuard Backend Physics Engine',
          sourceType: 'ORBITGUARD_LIVE',
          confidence: 'DETERMINISTIC BACKEND SGP4',
          tool_logs: backendRes.tool_logs || [],
          evidence: backendRes.evidence || null,
          source_badges: backendRes.source_badges || ['Backend Physics Tools', 'Ephemeris Data'],
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const response: CopilotResponse = SpaceIntelligenceEngine.processQuery(query, {
          activeTab,
          selectedObject,
          selectedConjunction,
          objects,
          conjunctions,
          stats,
          dataStatus,
          mode: 'quick',
          conversationHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
        });

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: response.text,
          timestamp: formatUtcTime(Date.now(), false),
          source: response.source,
          sourceType: response.sourceType,
          retrievedAt: response.retrievedAt,
          confidence: response.confidence,
          actions: response.actions,
          source_badges: ['Local Deterministic Fallback (Backend Copilot Offline)'],
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: `Copilot query failed: ${err?.message || 'Unable to process orbital diagnostic request.'}`,
          timestamp: formatUtcTime(Date.now(), false),
          source_badges: ['Error'],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const starterPrompts = [
    'Why is the top conjunction high risk?',
    'What happens if I perform a 0.1 m/s prograde maneuver?',
    'What is the CCSDS 508.0-B-1 CDM standard?',
    'Explain Gauss equations and Tsiolkovsky propellant mass',
  ];

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="orbit-ai-title"
      maxWidthClass={isExpanded ? 'max-w-3xl' : 'max-w-2xl'}
      className="h-[82dvh]"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/35 text-sky-400 shrink-0">
            <Bot className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="orbit-ai-title" className="text-sm font-semibold text-slate-100">
                Orbit AI Operations Copilot
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 border border-space-700 text-sky-300">
                Physics-Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Deterministic SGP4 • Foster-2D Pc • CAM Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Collapse copilot dialog' : 'Expand copilot dialog'}
            className="hidden sm:inline-flex p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setMessages([])}
            aria-label="Clear conversation history"
            className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Orbit AI copilot"
            className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Strip */}
      <div className="px-4 py-1.5 bg-space-950/70 border-b border-space-800 text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {selectedConjunction
              ? `Encounter #${selectedConjunction.id} (${
                  selectedConjunction.object_a?.name || 'Asset A'
                } vs ${selectedConjunction.object_b?.name || 'Asset B'})`
              : selectedObject
              ? `Asset: ${selectedObject.name} (NORAD #${selectedObject.norad_id})`
              : objectCount !== null
              ? `Catalog: ${objectCount.toLocaleString()} Objects • ${conjunctions.length} Conjunctions`
              : `${conjunctions.length} Screened Conjunctions`}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-emerald-300 shrink-0">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Grounded Tool Execution
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isAI = m.sender === 'ai';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 items-start ${isAI ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                  isAI
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/35'
                    : 'bg-space-800 text-slate-300 border-space-700'
                }`}
              >
                {isAI ? (
                  <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-xl p-3.5 text-xs space-y-2 border ${
                  isAI
                    ? 'bg-space-950 border-space-800 text-slate-200'
                    : 'bg-sky-500/10 border-sky-500/35 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono text-slate-400">
                  <span>{isAI ? m.source || 'Orbit AI' : 'Operator'}</span>
                  <span className="tabular-nums">{m.timestamp}</span>
                </div>

                {isAI && m.source_badges && m.source_badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-space-800">
                    {m.source_badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] font-mono rounded bg-space-900 border border-space-700 text-sky-300"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                <FormattedTelemetryText content={m.text} />

                {isAI && m.tool_logs && m.tool_logs.length > 0 && (
                  <details className="mt-2 bg-space-900 border border-space-800 rounded-lg p-2.5 text-[11px] font-mono">
                    <summary className="cursor-pointer font-medium text-sky-300 hover:text-sky-200 flex items-center justify-between list-none">
                      <span className="inline-flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Inspect {m.tool_logs.length} Backend Tool Execution(s)</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    </summary>
                    <div className="mt-2 pt-2 border-t border-space-800 space-y-2 text-slate-300">
                      {m.tool_logs.map((tl, idx) => (
                        <div key={idx} className="bg-space-950 p-2 rounded border border-space-800">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-300">
                            <span>{tl.tool}()</span>
                            <span className="text-slate-400 tabular-nums">{tl.duration_ms} ms</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 break-all">
                            Inputs: {JSON.stringify(tl.arguments)}
                          </div>
                          <div className="text-[10px] text-sky-300 mt-1 break-all">
                            Output: {JSON.stringify(tl.result)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-space-800">
                    {m.actions.map((act, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => executeAction(act)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-sky-300 text-[11px] font-medium transition-colors"
                      >
                        {act.icon === 'globe' && <Globe className="w-3 h-3" aria-hidden="true" />}
                        {act.icon === 'crosshair' && (
                          <Crosshair className="w-3 h-3" aria-hidden="true" />
                        )}
                        {act.icon === 'play' && <Play className="w-3 h-3" aria-hidden="true" />}
                        {act.icon === 'activity' && (
                          <Activity className="w-3 h-3" aria-hidden="true" />
                        )}
                        {act.icon === 'shield' && (
                          <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                        )}
                        {act.icon === 'sun' && <Sun className="w-3 h-3" aria-hidden="true" />}
                        {act.icon === 'rocket' && (
                          <Rocket className="w-3 h-3" aria-hidden="true" />
                        )}
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
          <div className="text-xs font-mono text-sky-400">
            Executing backend astrodynamics diagnostics...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-space-950/70 border-t border-space-800 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Prompts:</span>
          {starterPrompts.map((promptText, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleSendMessage(promptText)}
              className="px-2.5 py-1 rounded bg-space-900 hover:bg-space-800 border border-space-800 text-slate-300 hover:text-sky-300 text-[11px] whitespace-nowrap transition-colors shrink-0"
            >
              {promptText}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-space-950 border-t border-space-800 flex items-center gap-2 shrink-0"
      >
        <label htmlFor="orbit-ai-input" className="sr-only">
          Ask Orbit AI Copilot a question
        </label>
        <input
          id="orbit-ai-input"
          type="text"
          placeholder="Ask about risk drivers, CAM Delta-V, SGP4 propagation, or CCSDS CDMs..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 bg-space-900 border border-space-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          aria-label="Send query to Orbit AI Copilot"
          className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 transition-colors disabled:opacity-40 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </ModalDialog>
  );
};
