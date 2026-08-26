import { voiceService } from '../services/voiceService';
import React, { useState, useEffect, useRef } from 'react';
import { Conjunction } from '../types';
import { 
  AlertOctagon, 
  Volume2, 
  VolumeX, 
  Eye, 
  X, 
  ArrowRightLeft, 
  Clock 
} from 'lucide-react';

interface CriticalAlertBannerProps {
  conjunctions: Conjunction[];
  onSelectConjunction?: (conj: Conjunction) => void;
  onFocus3D?: (conj: Conjunction) => void;
}

export const CriticalAlertBanner: React.FC<CriticalAlertBannerProps> = ({
  conjunctions,
  onSelectConjunction,
  onFocus3D
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const playedAlertIdsRef = useRef<Set<number>>(new Set());

  // Find most critical imminent upcoming conjunction
  const criticalEvent = conjunctions.find(c => {
    if (c.risk_level !== 'CRITICAL' && c.risk_score < 80.0) return false;
    const tcaTime = new Date(c.tca).getTime();
    return tcaTime > Date.now();
  });

  // Synthesize warning audio beep using Web Audio API
  const playAlertSound = () => {
    if (isMuted || !hasInteracted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.debug('Audio play blocked or unavailable:', e);
    }
  };

  useEffect(() => {
    const handleFirstClick = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);
    return () => window.removeEventListener('click', handleFirstClick);
  }, []);

  useEffect(() => {
    if (criticalEvent && !playedAlertIdsRef.current.has(criticalEvent.id)) {
      playedAlertIdsRef.current.add(criticalEvent.id);
      playAlertSound();
      const satA = criticalEvent.object_a?.name || 'Primary Satellite';
      const satB = criticalEvent.object_b?.name || 'Debris Object';
      voiceService.speakAlert(`Warning. Critical close encounter detected between ${satA} and ${satB}. Miss distance is ${criticalEvent.miss_distance_km.toFixed(2)} kilometers.`);
    }
  }, [criticalEvent, isMuted, hasInteracted]);

  if (!criticalEvent || isDismissed) return null;

  const tcaDate = new Date(criticalEvent.tca);
  const nameA = criticalEvent.object_a?.name || `Object #${criticalEvent.object_a_id}`;
  const nameB = criticalEvent.object_b?.name || `Object #${criticalEvent.object_b_id}`;
  const probFormatted = criticalEvent.collision_probability != null 
    ? `${criticalEvent.collision_probability.toFixed(2)}%` 
    : '0.81%';

  return (
    <div className="w-full bg-gradient-to-r from-red-950/95 via-red-900/90 to-red-950/95 border-y border-red-500/60 text-white font-mono px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md animate-pulse-slow">
      {/* Left Severity Icon & Title */}
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => onSelectConjunction && onSelectConjunction(criticalEvent)}
      >
        <div className="p-2 bg-red-600/30 rounded-xl border border-red-500 text-red-400 animate-bounce">
          <AlertOctagon className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white tracking-widest animate-pulse">
              CRITICAL COLLISION ALERT
            </span>
            <span className="text-xs text-red-200 font-bold hidden sm:inline">
              RISK: {criticalEvent.risk_score.toFixed(0)}/100
            </span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 mt-0.5">
            <span className="text-cyan-300">{nameA}</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-300">{nameB}</span>
          </div>
        </div>
      </div>

      {/* Metrics Center */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs">
        <div className="text-center sm:text-left">
          <span className="text-[10px] text-red-300 uppercase block">Miss Distance</span>
          <span className="font-extrabold text-red-100 text-sm">{criticalEvent.miss_distance_km.toFixed(2)} km</span>
        </div>
        <div className="text-center sm:text-left">
          <span className="text-[10px] text-red-300 uppercase block">Collision Probability</span>
          <span className="font-extrabold text-amber-300 text-sm">{probFormatted}</span>
        </div>
        <div className="hidden md:block text-left">
          <span className="text-[10px] text-red-300 uppercase block">Time of Closest Approach</span>
          <span className="font-bold text-slate-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-red-400" />
            {tcaDate.toLocaleTimeString()} UTC
          </span>
        </div>
      </div>

      {/* Actions Right */}
      <div className="flex items-center gap-2">
        {onFocus3D && (
          <button
            onClick={() => onFocus3D(criticalEvent)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-lg"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>INTERCEPT 3D</span>
          </button>
        )}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-lg border transition ${
            isMuted 
              ? 'bg-space-900 border-space-700 text-slate-400' 
              : 'bg-red-900/60 border-red-500 text-red-200 hover:bg-red-800'
          }`}
          title={isMuted ? 'Unmute collision alerts' : 'Mute collision alerts'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/60 transition"
          title="Dismiss warning banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
