import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles 
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
      text: `Hello Flight Director. I have ingested the latest SGP4 ephemeris and covariance matrices. ${
        conjunction 
          ? `Analyzing active encounter between ${conjunction.object_a?.name || 'Primary Satellite'} and ${conjunction.object_b?.name || 'Debris Fragment'} (Miss Distance: ${conjunction.miss_distance_km.toFixed(2)} km, Risk: ${conjunction.risk_score}/100).`
          : 'All orbital regimes are currently being monitored. How can I assist with flight dynamics or maneuver optimization?'
      }`,
      timestamp: new Date().toLocaleTimeString(),
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

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      let replyText = "Understood. Running high-precision perturbed astrodynamics simulation (J2/J3/J4 harmonics + atmospheric drag).";
      if (inputText.toLowerCase().includes('fuel') || inputText.toLowerCase().includes('burn') || inputText.toLowerCase().includes('maneuver')) {
        replyText = "Optimal burn execution window is 1.5 orbital revolutions prior to TCA at ascending node. This maximizes along-track spatial separation while preserving 94% of operational fuel reserve.";
      } else if (inputText.toLowerCase().includes('kessler') || inputText.toLowerCase().includes('debris')) {
        replyText = "If unmitigated, hypervelocity impact at 14.2 km/s will generate an estimated 1,420 catalogable fragments (>10cm), increasing spatial collision risk by 340% in the 700-850 km SSO altitude corridor.";
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-2xl bg-space-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-950/80 to-space-900 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
                  AI FLIGHT COPILOT
                </span>
                <span className="text-[10px] text-slate-400">Autonomous Maneuver Assistant</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Flight Dynamics & Tactical Decision Support
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white rounded-lg border border-space-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none'
                    : 'bg-space-950 text-slate-200 border border-space-800 rounded-bl-none'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-bold">
                  {m.sender === 'ai' ? <Bot className="w-3.5 h-3.5 text-cyan-400" /> : null}
                  <span>{m.sender === 'ai' ? 'SENTINEL AI COPILOT' : 'FLIGHT DIRECTOR'}</span>
                  <span>• {m.timestamp}</span>
                </div>
                <p>{m.text}</p>

                {m.recommendation && (
                  <div className="mt-3 p-2.5 bg-space-900/90 rounded-xl border border-cyan-500/30 space-y-1.5 text-[11px]">
                    <div className="font-bold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> RECOMMENDED MITIGATION STRATEGY:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                      <div>Burn Vector: <strong className="text-white">{m.recommendation.burnVector}</strong></div>
                      <div>Delta-V Thrust: <strong className="text-white">{m.recommendation.deltaV}</strong></div>
                      <div>Fuel Mass: <strong className="text-white">{m.recommendation.fuelCost}</strong></div>
                      <div>New Miss Distance: <strong className="text-emerald-400">{m.recommendation.newMissDistance}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-space-950 border-t border-space-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Copilot about burns, propellant costs, or risk mitigation..."
            className="flex-1 bg-space-900 border border-space-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            onClick={handleSend}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
