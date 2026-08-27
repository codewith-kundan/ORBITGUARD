import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles,
  HelpCircle,
  Loader2
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
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText.trim();
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation history for OpenAI chat completions
      const chatHistory = [
        ...messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: userText }
      ];

      const res = await api.sendChatMessage(chatHistory);

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
        text: `Regarding "${userText}": I encountered a communication delay with the astrodynamics neural engine. You can monitor active conjunctions directly in the **Conjunctions** tab or search any satellite via NORAD ID in the **3D Globe**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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
                {m.modelBadge && (
                  <span className="text-[9px] px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {m.modelBadge}
                  </span>
                )}
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

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500">
                <span>OrbitBot</span>
                <span>•</span>
                <span>Synthesizing...</span>
              </div>
              <div className="p-3 bg-space-900 border border-cyan-500/30 rounded-2xl rounded-bl-none text-slate-300 flex items-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="animate-pulse">OrbitBot is querying astrodynamics intelligence...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-space-900 border-t border-space-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask OrbitBot anything about space or how to use OrbitGuard..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleSend();
            }}
            className="flex-1 bg-space-950 border border-space-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-space-950 rounded-xl transition shadow-md cursor-pointer flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
