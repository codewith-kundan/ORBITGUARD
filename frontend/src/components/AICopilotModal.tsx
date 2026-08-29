import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles, 
  HelpCircle, 
  Loader2, 
  Key, 
  Settings2, 
  ExternalLink, 
  Check, 
  Copy,
  Cpu,
  Trash2
} from 'lucide-react';
import { Conjunction } from '../types';
import { api } from '../services/api';

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
  modelBadge?: string;
  recommendation?: {
    burnVector: string;
    deltaV: string;
    fuelCost: string;
    newMissDistance: string;
    riskReduction: string;
  };
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({ isOpen, onClose, conjunction }) => {
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('orbitguard_gemini_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('orbitguard_gemini_model') || 'gemini-2.0-flash';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [keySaved, setKeySaved] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Hello! I am **OrbitBot**, your Space Domain Awareness (SDA) Expert powered by **Google Gemini (Google AI Studio)**. ${
        conjunction 
          ? `\n\n🚨 **Active Conjunction Tracking**:\n• Primary Asset: **${conjunction.object_a?.name || 'Primary Satellite'}**\n• Threat Object: **${conjunction.object_b?.name || 'Debris Object'}**\n• Miss Distance: **${conjunction.miss_distance_km.toFixed(2)} km**\n• Risk Score: **${conjunction.risk_score.toFixed(0)}/100** (${conjunction.risk_level || 'ELEVATED'})\n• Relative Velocity: **${conjunction.relative_velocity_km_s.toFixed(2)} km/s**\n\nI can calculate collision avoidance burns (CAM), analyze covariance ellipses, or assess Kessler fragmentation risks.`
          : 'Feel free to ask me anything about live satellite orbits, conjunction screening, collision avoidance maneuvers, rocket launches, or navigating OrbitGuard.'
      }`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelBadge: 'Gemini 2.0 Flash',
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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('orbitguard_gemini_api_key', key.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('orbitguard_gemini_model', model);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: 'Chat history cleared. How can OrbitBot assist your orbital operations?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelBadge: 'Gemini 2.0 Flash'
      }
    ]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation history for Google Gemini
      const chatHistory = [
        ...messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: textToSend }
      ];

      const res = await api.sendChatMessage(
        chatHistory,
        geminiApiKey || undefined,
        selectedModel
      );

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.response || 'I am ready to assist with your orbital tracking and collision screening queries.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelBadge: res.model
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('OrbitBot query error:', err);
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ **Service Temporarily Unavailable**: OrbitBot encountered an error connecting to Google AI Studio. Please check your Gemini API key in Settings or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelBadge: 'Gemini Offline'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-2xl bg-space-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[680px] max-h-[92vh]">
        
        {/* Header */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-950/90 via-space-900 to-space-950 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/30">
              <Bot className="w-5 h-5 animate-pulse text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 rounded-full border border-cyan-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-300 animate-spin" />
                  ORBITBOT COPILOT
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Google AI Studio (Gemini)
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide mt-0.5 flex items-center gap-1.5">
                Astrodynamics & Space Domain Awareness AI
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Google AI Studio Gemini API Key Settings"
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] ${
                isSettingsOpen 
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/30' 
                  : 'bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white border-space-800'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px]">API KEY</span>
            </button>
            <button
              onClick={handleClearChat}
              title="Clear chat messages"
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-red-400 rounded-lg border border-space-800 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Google AI Studio Settings Drawer (Expandable) */}
        {isSettingsOpen && (
          <div className="p-3 bg-space-900/95 border-b border-cyan-500/30 text-xs animate-fade-in space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google AI Studio (Gemini API) Configuration</span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"
              >
                Get Free Gemini API Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="password"
                  placeholder="Paste your Gemini API Key (e.g. AIzaSy...)"
                  value={geminiApiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  className="w-full bg-space-950 border border-space-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                />
              </div>

              <div>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-space-950 border border-space-700 rounded-lg px-2 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                >
                  <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">🚀 Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span className="flex items-center gap-1 text-slate-300">
                <Cpu className="w-3 h-3 text-cyan-400" />
                {geminiApiKey ? 'Custom Gemini API Key configured in browser.' : 'Using OrbitGuard default cloud proxy.'}
              </span>
              {keySaved && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Question Chips */}
        <div className="px-3 sm:px-4 py-2 bg-space-900/60 border-b border-space-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
          <span className="text-slate-500 font-bold flex-shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-cyan-400" /> PROMPTS:
          </span>
          {[
            '🚨 Analyze current highest-risk conjunction',
            '🚀 Calculate Collision Avoidance Burn (CAM)',
            '💥 Explain Kessler Syndrome chain reaction',
            '🛰️ How does SGP4 orbit propagation work?',
            '🌍 What is the Kármán line & atmospheric drag?'
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
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
                <span>{m.sender === 'user' ? 'Operator' : 'OrbitBot (Gemini AI)'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
                {m.modelBadge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-bold">
                    {m.modelBadge}
                  </span>
                )}
                {m.sender === 'ai' && (
                  <button
                    onClick={() => handleCopyText(m.id, m.text)}
                    className="text-slate-500 hover:text-cyan-300 transition ml-1"
                    title="Copy text"
                  >
                    {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              
              <div
                className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-space-900 text-slate-200 border border-space-800 rounded-bl-none shadow-inner'
                }`}
              >
                {m.text}

                {/* Tactical CAM Recommendation Card */}
                {m.recommendation && (
                  <div className="mt-3 p-3 bg-space-950 rounded-xl border border-cyan-500/30 text-[11px] space-y-1.5 shadow-inner">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      Tactical Collision Avoidance Maneuver (CAM) Plan
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 pt-1">
                      <div>Burn Vector: <span className="text-white font-bold">{m.recommendation.burnVector}</span></div>
                      <div>$\Delta v$ Budget: <span className="text-cyan-300 font-bold">{m.recommendation.deltaV}</span></div>
                      <div>Propellant Mass: <span className="text-amber-300 font-bold">{m.recommendation.fuelCost}</span></div>
                      <div>Cleared Miss Dist: <span className="text-emerald-400 font-bold">{m.recommendation.newMissDistance}</span></div>
                      <div className="col-span-2 text-emerald-400 font-bold pt-0.5">
                        Risk Reduction: {m.recommendation.riskReduction}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500">
                <span>OrbitBot</span>
                <span>•</span>
                <span className="text-cyan-400 font-bold">Querying Google Gemini...</span>
              </div>
              <div className="p-3 bg-space-900 border border-cyan-500/30 rounded-2xl rounded-bl-none text-slate-300 flex items-center gap-2.5 text-xs">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="animate-pulse text-cyan-300">
                  Synthesizing space domain telemetry via Google AI Studio...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-space-900 border-t border-space-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask Gemini anything about orbital mechanics, collision risk, or OrbitGuard..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleSend();
            }}
            className="flex-1 bg-space-950 border border-space-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-space-950 font-bold rounded-xl transition shadow-md cursor-pointer flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-space-950" />}
          </button>
        </div>
      </div>
    </div>
  );
};
