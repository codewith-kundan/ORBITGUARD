import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  ShieldAlert 
} from 'lucide-react';

interface ASATSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ASATSimulatorModal: React.FC<ASATSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [altitudeKm, setAltitudeKm] = useState<number>(550);
  const [targetType, setTargetType] = useState<string>('750 kg Recon Satellite');

  if (!isOpen) return null;

  const totalFragments10cm = Math.round(1800 * (altitudeKm / 500));
  const totalFragments1cm = totalFragments10cm * 18;
  const decayTimeYears = altitudeKm < 400 ? '2 - 4 Weeks' : altitudeKm < 600 ? '5 - 12 Years' : '80+ Years';
  const impactedConstellations = altitudeKm <= 600 ? ['Starlink V2 Shell', 'OneWeb LEO', 'ISS / Tiangong'] : ['Sun-Sync Earth Observation', 'Sentinel Constellation'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-3xl bg-space-900 border border-orange-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-950/80 to-space-900 border-b border-orange-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 rounded-xl border border-orange-500/40 text-orange-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/40">
                KINETIC MISSILE SIMULATOR
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Direct-Ascent ASAT & Kessler Collision Cascade Model
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-space-950 rounded-xl border border-space-800">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">INTERCEPT ALTITUDE: {altitudeKm} km</label>
              <input
                type="range"
                min="300"
                max="1000"
                step="25"
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">TARGET SPACECRAFT CLASS</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-space-900 border border-space-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="750 kg Recon Satellite">750 kg Reconnaissance Satellite</option>
                <option value="2,500 kg Heavy Space Station Module">2,500 kg Heavy Space Station Module</option>
                <option value="300 kg SmallSat Constellation Node">300 kg SmallSat Constellation Node</option>
              </select>
            </div>
          </div>

          {/* Fragment Output Matrix */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-space-950 rounded-xl border border-orange-500/30">
              <span className="text-[10px] text-slate-400 uppercase">Trackable (&gt;10cm)</span>
              <div className="text-xl font-bold text-orange-400 mt-0.5">{totalFragments10cm.toLocaleString()}</div>
              <span className="text-[9px] text-slate-500">Lethal fragments</span>
            </div>
            <div className="p-3 bg-space-950 rounded-xl border border-red-500/30">
              <span className="text-[10px] text-slate-400 uppercase">Lethal (&gt;1cm)</span>
              <div className="text-xl font-bold text-red-400 mt-0.5">{totalFragments1cm.toLocaleString()}</div>
              <span className="text-[9px] text-slate-500">Untrackable shrapnel</span>
            </div>
            <div className="p-3 bg-space-950 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 uppercase">Orbital Persistence</span>
              <div className="text-lg font-bold text-amber-300 mt-0.5">{decayTimeYears}</div>
              <span className="text-[9px] text-slate-500">Atmospheric half-life</span>
            </div>
          </div>

          {/* Cascade Risk Card */}
          <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-xl text-xs space-y-2">
            <span className="font-bold text-orange-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              Impacted Constellations & Collision Multiplier
            </span>
            <p className="text-slate-300 leading-relaxed">
              Debris cloud forms an eccentric toroidal ring around Earth within 24 hours. Primary collision risk surges by <strong>+420%</strong> for intersecting orbital shells:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {impactedConstellations.map((c) => (
                <span key={c} className="px-2.5 py-1 rounded bg-space-900 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
