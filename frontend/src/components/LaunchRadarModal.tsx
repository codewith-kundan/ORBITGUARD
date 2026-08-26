import React, { useState } from 'react';
import { 
  X, 
  Rocket, 
  Flame 
} from 'lucide-react';

interface LaunchRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LaunchEvent {
  id: string;
  name: string;
  vehicle: string;
  site: string;
  launchTimeUtc: string;
  targetOrbit: string;
  status: 'SCHEDULED' | 'GO FOR LAUNCH' | 'T-MINUS 12H';
  missionDescription: string;
}

interface DebrisReentryEvent {
  id: string;
  noradId: number;
  objectName: string;
  decayWindow: string;
  predictedImpactLatitude: string;
  predictedImpactLongitude: string;
  riskCategory: 'UNCONTROLLED' | 'CONTROLLED' | 'MINIMAL RISK';
  perigeeKm: number;
}

export const LaunchRadarModal: React.FC<LaunchRadarModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'launches' | 'reentries'>('launches');

  const upcomingLaunches: LaunchEvent[] = [
    {
      id: 'lch-01',
      name: 'Starlink Group 10-15',
      vehicle: 'Falcon 9 Block 5',
      site: 'SLC-40, Cape Canaveral SFS, Florida',
      launchTimeUtc: '2026-08-27 14:22:00 UTC',
      targetOrbit: '530 km LEO (53.2° Inclination)',
      status: 'GO FOR LAUNCH',
      missionDescription: 'Deployment of 22 Starlink V2 Mini communication satellites into orbital shell 10.'
    },
    {
      id: 'lch-02',
      name: 'ISRO PSLV-C62 / EOS-09',
      vehicle: 'PSLV-XL',
      site: 'First Launch Pad, SDSC SHAR, Sriharikota',
      launchTimeUtc: '2026-08-28 05:45:00 UTC',
      targetOrbit: '630 km Sun-Synchronous (SSO 97.8°)',
      status: 'SCHEDULED',
      missionDescription: 'High-resolution multispectral Earth observation satellite for disaster management.'
    },
    {
      id: 'lch-03',
      name: 'Galileo FOC FM29/FM30',
      vehicle: 'Ariane 62',
      site: 'ELA-4, Guiana Space Centre, Kourou',
      launchTimeUtc: '2026-08-29 21:10:00 UTC',
      targetOrbit: '23,222 km MEO Navigation Ring (56.0°)',
      status: 'SCHEDULED',
      missionDescription: 'Expansion of European GNSS positioning constellation with atomic clock payloads.'
    }
  ];

  const decayingDebris: DebrisReentryEvent[] = [
    {
      id: 'dec-01',
      noradId: 44219,
      objectName: 'CZ-3B R/B (Long March 3B Spent Stage)',
      decayWindow: '27 Aug 2026 19:40 UTC ± 4h',
      predictedImpactLatitude: '14.2° S',
      predictedImpactLongitude: '112.5° W (South Pacific Ocean)',
      riskCategory: 'UNCONTROLLED',
      perigeeKm: 142.5
    },
    {
      id: 'dec-02',
      noradId: 39512,
      objectName: 'COSMOS 2251 DEB (#39512)',
      decayWindow: '28 Aug 2026 03:15 UTC ± 6h',
      predictedImpactLatitude: '48.1° N',
      predictedImpactLongitude: '35.4° E (Black Sea Corridor)',
      riskCategory: 'UNCONTROLLED',
      perigeeKm: 168.0
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-3xl bg-space-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/80 to-space-900 border-b border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/40 text-purple-300">
              <Rocket className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40">
                  ORBITAL CORRIDOR RADAR
                </span>
                <span className="text-[10px] text-slate-400">Live Space Traffic & Hazard Forecast</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Global Rocket Launch Manifest & Decaying Debris Tracker
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

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-space-800">
          <button
            onClick={() => setActiveTab('launches')}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'launches'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>UPCOMING LAUNCHES ({upcomingLaunches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reentries')}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'reentries'
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>ATMOSPHERIC RE-ENTRY CORRIDORS ({decayingDebris.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'launches' ? (
            <div className="space-y-3">
              {upcomingLaunches.map((lch) => (
                <div key={lch.id} className="p-4 bg-space-950 rounded-xl border border-space-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{lch.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-space-800 text-purple-300 border border-purple-500/30">
                        {lch.vehicle}
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      {lch.status}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs">{lch.missionDescription}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[9px]">LAUNCH WINDOW:</span>
                      <span className="text-cyan-300 font-bold">{lch.launchTimeUtc}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">TARGET REGIME:</span>
                      <span className="text-slate-200">{lch.targetOrbit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">LAUNCH FACILITY:</span>
                      <span className="text-slate-200">{lch.site}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {decayingDebris.map((dec) => (
                <div key={dec.id} className="p-4 bg-space-950 rounded-xl border border-red-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{dec.objectName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-space-800 text-red-300 border border-red-500/30">
                        NORAD #{dec.noradId}
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 font-bold">
                      {dec.riskCategory}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[9px]">DECAY HORIZON:</span>
                      <span className="text-amber-300 font-bold">{dec.decayWindow}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">CURRENT PERIGEE:</span>
                      <span className="text-red-300 font-bold">{dec.perigeeKm} km (Thermospheric Entry)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">PROJECTED IMPACT ZONE:</span>
                      <span className="text-slate-200">{dec.predictedImpactLatitude}, {dec.predictedImpactLongitude}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
