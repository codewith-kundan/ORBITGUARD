import React from 'react';
import { 
  X, 
  Layers 
} from 'lucide-react';
import { SystemStatistics } from '../types';

interface KesslerDensityModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SystemStatistics | null;
}

export const KesslerDensityModal: React.FC<KesslerDensityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const altitudeBands = [
    { band: '150 - 400 km (VLEO / ISS)', count: 840, density: 'Moderate', risk: 'LOW', color: 'bg-emerald-500' },
    { band: '500 - 600 km (Starlink Shell)', count: 6850, density: 'Very High', risk: 'HIGH', color: 'bg-purple-500' },
    { band: '700 - 900 km (Sun-Sync Choke Point)', count: 4210, density: 'Critical Density', risk: 'CRITICAL', color: 'bg-red-500' },
    { band: '1000 - 1500 km (Legacy Debris)', count: 1980, density: 'High', risk: 'MODERATE', color: 'bg-amber-500' },
    { band: '20,200 km (MEO / GNSS Belt)', count: 180, density: 'Low', risk: 'LOW', color: 'bg-blue-500' },
    { band: '35,786 km (Geostationary Ring)', count: 620, density: 'Crowded Orbital Arc', risk: 'MODERATE', color: 'bg-yellow-500' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-3xl bg-space-900 border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/80 to-space-900 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-500/40 text-red-400">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full border border-red-500/40">
                  CRITICAL MASS ANALYSIS
                </span>
                <span className="text-[10px] text-slate-400">Orbital Spatial Crowding & Collision Cascade</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Kessler Syndrome Spatial Density Heatmap
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
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-200 leading-relaxed">
            <strong>Kessler Threshold Alert:</strong> Orbital altitude shell 700 - 900 km (Sun-Synchronous orbit at 98 deg inclination) has surpassed safe critical spatial density thresholds due to historical ASAT fragments and legacy rocket stages.
          </div>

          {/* Altitude Bands Matrix */}
          <div className="space-y-2.5">
            {altitudeBands.map((b) => (
              <div key={b.band} className="p-3 bg-space-950 rounded-xl border border-space-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{b.band}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{b.count.toLocaleString()} objects</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      b.risk === 'CRITICAL' ? 'bg-red-600/30 text-red-300 border border-red-500' :
                      b.risk === 'HIGH' ? 'bg-amber-600/30 text-amber-300 border border-amber-500' :
                      'bg-emerald-600/30 text-emerald-300 border border-emerald-500'
                    }`}>
                      {b.risk}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-space-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${b.color}`} 
                    style={{ width: `${Math.min(100, (b.count / 7000) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
