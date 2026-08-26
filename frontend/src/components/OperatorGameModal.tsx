import React, { useState } from 'react';
import { 
  X, 
  Gamepad2, 
  Rocket, 
  RotateCcw, 
  Flame 
} from 'lucide-react';

interface OperatorGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OperatorGameModal: React.FC<OperatorGameModalProps> = ({ isOpen, onClose }) => {
  const [orbitAltitude, setOrbitAltitude] = useState<number>(550);
  const [fuelKg, setFuelKg] = useState<number>(10.0);
  const [score, setScore] = useState<number>(0);
  const [debrisDistanceKm, setDebrisDistanceKm] = useState<number>(12.0);
  const [status, setStatus] = useState<'NOMINAL' | 'DANGER' | 'COLLISION' | 'SUCCESS'>('NOMINAL');

  if (!isOpen) return null;

  const handleThrust = (direction: 'UP' | 'DOWN') => {
    if (fuelKg <= 0 || status === 'COLLISION') return;
    setFuelKg(prev => Math.max(0, Number((prev - 0.8).toFixed(1))));
    setOrbitAltitude(prev => direction === 'UP' ? prev + 15 : prev - 15);
    setDebrisDistanceKm(prev => prev + 8.5);
    setScore(prev => prev + 150);
  };

  const handleReset = () => {
    setOrbitAltitude(550);
    setFuelKg(10.0);
    setScore(0);
    setDebrisDistanceKm(12.0);
    setStatus('NOMINAL');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-2xl bg-space-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 to-space-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/40 text-emerald-400">
              <Gamepad2 className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
                ORBITAL EVASION SANDBOX
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Satellite Operator Maneuver Challenge
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

        {/* Game HUD Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-space-950 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 block">ALTITUDE</span>
              <span className="text-base font-bold text-cyan-400">{orbitAltitude} km</span>
            </div>
            <div className="p-3 bg-space-950 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 block">PROPELLANT</span>
              <span className={`text-base font-bold ${fuelKg < 2 ? 'text-red-400' : 'text-emerald-400'}`}>{fuelKg} kg</span>
            </div>
            <div className="p-3 bg-space-950 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 block">DEBRIS DIST</span>
              <span className="text-base font-bold text-amber-400">{debrisDistanceKm.toFixed(1)} km</span>
            </div>
            <div className="p-3 bg-space-950 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 block">SCORE</span>
              <span className="text-base font-bold text-purple-400">{score} pts</span>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="p-5 bg-space-950 rounded-xl border border-space-800 text-center space-y-3">
            <p className="text-slate-300">
              Incoming high-speed debris cloud detected. Execute Delta-V altitude burns to maintain safe radial clearance over 15 km before propellant exhausts.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleThrust('UP')}
                disabled={fuelKg <= 0}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Rocket className="w-4 h-4" />
                <span>+15 km Prograde Climb (-0.8 kg)</span>
              </button>
              <button
                onClick={() => handleThrust('DOWN')}
                disabled={fuelKg <= 0}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4" />
                <span>-15 km Retrograde Drop (-0.8 kg)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-400 text-[11px]">NASA Standard Safety Clearance: 20 km</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-space-800 hover:bg-space-700 text-slate-300 rounded-lg text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Challenge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
