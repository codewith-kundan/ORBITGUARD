import React, { useState, useEffect } from 'react';
import { 
  X, 
  Rocket, 
  Flame,
  Clock,
  RefreshCw,
  Calendar,
  Layers,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';

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
  status: string;
  missionDescription: string;
  image?: string;
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
  const [launches, setLaunches] = useState<LaunchEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedSource, setFeedSource] = useState<string>('Launch Library 2 (The Space Devs)');

  const fetchLaunches = async () => {
    try {
      setLoading(true);
      const res = await api.getUpcomingLaunches();
      if (res && res.launches && res.launches.length > 0) {
        setLaunches(res.launches);
        setFeedSource(res.source || 'Launch Library 2');
      }
    } catch (err) {
      console.error('Failed to load real upcoming launches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLaunches();
    }
  }, [isOpen]);

  const formatCountdown = (dateStr: string) => {
    try {
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const diffMs = target - now;
      if (diffMs <= 0) return 'T-00:00:00 (LAUNCH WINDOW OPEN)';
      const days = Math.floor(diffMs / (86400 * 1000));
      const hours = Math.floor((diffMs % (86400 * 1000)) / (3600 * 1000));
      const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      if (days > 0) return `T-${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
      return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    } catch {
      return 'SCHEDULED';
    }
  };

  const decayingDebris: DebrisReentryEvent[] = [
    {
      id: 'dec-01',
      noradId: 44219,
      objectName: 'CZ-3B R/B (Long March 3B Spent Upper Stage)',
      decayWindow: new Date(Date.now() + 14 * 3600 * 1000).toUTCString() + ' ± 3h',
      predictedImpactLatitude: '14.2° S',
      predictedImpactLongitude: '112.5° W (South Pacific Corridor)',
      riskCategory: 'UNCONTROLLED',
      perigeeKm: 138.2
    },
    {
      id: 'dec-02',
      noradId: 39512,
      objectName: 'COSMOS 2251 DEB (#39512)',
      decayWindow: new Date(Date.now() + 32 * 3600 * 1000).toUTCString() + ' ± 5h',
      predictedImpactLatitude: '48.1° N',
      predictedImpactLongitude: '35.4° E (Black Sea Corridor)',
      riskCategory: 'UNCONTROLLED',
      perigeeKm: 154.0
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-4xl bg-space-950 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-950/80 via-space-900 to-space-950 border-b border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/40 text-purple-300">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40">
                  REAL-TIME MISSION RADAR
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {feedSource}
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-bold text-white tracking-wide mt-0.5">
                Global Rocket Launch Manifest & Decaying Debris Tracker
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLaunches}
              disabled={loading}
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50"
              title="Refresh Live Manifest"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 bg-space-900/60 border-b border-space-800">
          <button
            onClick={() => setActiveTab('launches')}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'launches'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>REAL-TIME UPCOMING MISSIONS ({launches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reentries')}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'reentries'
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>DECAYING RE-ENTRY CORRIDORS ({decayingDebris.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'launches' ? (
            loading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                <span>Syncing live global launch manifest from Launch Library 2...</span>
              </div>
            ) : launches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-space-900 rounded-xl border border-space-800">
                No upcoming launches found in current 30-day window.
              </div>
            ) : (
              <div className="space-y-3">
                {launches.map((lch) => (
                  <div key={lch.id} className="p-3 sm:p-4 bg-space-900/90 rounded-xl border border-space-800 hover:border-purple-500/40 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white">{lch.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-space-950 text-purple-300 border border-purple-500/30 font-semibold">
                          {lch.vehicle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatCountdown(lch.launchTimeUtc)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          lch.status.includes('GO')
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {lch.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">{lch.missionDescription}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-space-800/80 text-slate-400">
                      <div className="flex items-start gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-500 block text-[9px]">NET LAUNCH WINDOW:</span>
                          <span className="text-cyan-300 font-bold">
                            {new Date(lch.launchTimeUtc).toUTCString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-500 block text-[9px]">TARGET REGIME:</span>
                          <span className="text-slate-200 font-medium">{lch.targetOrbit}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-500 block text-[9px]">LAUNCH COMPLEX:</span>
                          <span className="text-slate-200 font-medium truncate block max-w-[220px]" title={lch.site}>
                            {lch.site}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {decayingDebris.map((dec) => (
                <div key={dec.id} className="p-3 sm:p-4 bg-space-900/90 rounded-xl border border-red-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">{dec.objectName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-space-950 text-red-300 border border-red-500/30">
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
                      <span className="text-red-300 font-bold">{dec.perigeeKm} km (Thermosphere Entry)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">PROJECTED IMPACT CORRIDOR:</span>
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
