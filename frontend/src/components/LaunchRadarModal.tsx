import React, { useState, useEffect } from 'react';
import { 
  X, 
  Rocket, 
  Flame,
  Clock,
  RefreshCw,
  Calendar,
  Layers,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { DecayWatchlistItem } from '../types';

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
  _netMs?: number;
}

export const LaunchRadarModal: React.FC<LaunchRadarModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'launches' | 'reentries'>('launches');
  const [rawLaunches, setRawLaunches] = useState<LaunchEvent[]>([]);
  const [decayWatchlist, setDecayWatchlist] = useState<DecayWatchlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDecay, setLoadingDecay] = useState<boolean>(false);
  const [feedSource, setFeedSource] = useState<string>('Launch Library 2 (The Space Devs)');
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // 1-second live ticker for real-time second-by-second countdown and past launch pruning
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchLaunches = async () => {
    try {
      setLoading(true);
      const res = await api.getUpcomingLaunches();
      if (res && res.launches && res.launches.length > 0) {
        const parsed = res.launches.map((l: any) => ({
          ...l,
          _netMs: new Date(l.launchTimeUtc).getTime()
        }));
        setRawLaunches(parsed);
        setFeedSource(res.source || 'Launch Library 2');
      }
    } catch (err) {
      console.error('Failed to load real upcoming launches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecayWatchlist = async () => {
    try {
      setLoadingDecay(true);
      const res = await api.getDecayWatchlist(180.0);
      if (res && res.length > 0) {
        setDecayWatchlist(res);
      }
    } catch (err) {
      console.error('Failed to load decay watchlist:', err);
    } finally {
      setLoadingDecay(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLaunches();
      fetchDecayWatchlist();
    }
  }, [isOpen]);

  // Filter out any past launches where NET + 30m launch window has completed, sort ascending by time
  const upcomingLaunches = rawLaunches
    .filter((l) => {
      const net = l._netMs || new Date(l.launchTimeUtc).getTime();
      return !isNaN(net) && (net + 30 * 60 * 1000) > nowMs; // Keep during launch window, prune once completed
    })
    .sort((a, b) => (a._netMs || 0) - (b._netMs || 0));

  const formatCountdown = (dateStr: string) => {
    try {
      const target = new Date(dateStr).getTime();
      const diffMs = target - nowMs;
      if (diffMs <= 0 && diffMs > -1800000) return 'LIFTOFF / IN FLIGHT';
      if (diffMs <= -1800000) return 'MISSION COMPLETED';
      
      const days = Math.floor(diffMs / (86400 * 1000));
      const hours = Math.floor((diffMs % (86400 * 1000)) / (3600 * 1000));
      const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diffMs % (60 * 1000)) / 1000);

      if (days > 0) {
        return `T-${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      }
      return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } catch {
      return 'SCHEDULED';
    }
  };

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
              onClick={() => { fetchLaunches(); fetchDecayWatchlist(); }}
              disabled={loading || loadingDecay}
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50"
              title="Refresh Live Manifest"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || loadingDecay) ? 'animate-spin text-purple-400' : ''}`} />
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
            <span>REAL-TIME UPCOMING MISSIONS ({upcomingLaunches.length})</span>
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
            <span>ATMOSPHERIC RE-ENTRY WATCHLIST ({decayWatchlist.length})</span>
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
            ) : upcomingLaunches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-space-900 rounded-xl border border-space-800">
                All scheduled missions have concluded. Checking next launch windows...
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingLaunches.map((lch) => (
                  <div key={lch.id} className="p-3 sm:p-4 bg-space-900/90 rounded-xl border border-space-800 hover:border-purple-500/40 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white">{lch.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-space-950 text-purple-300 border border-purple-500/30 font-semibold">
                          {lch.vehicle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1 tabular-nums">
                          <Clock className="w-2.5 h-2.5 animate-spin-slow" />
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
            /* TAB 2: REAL ATMOSPHERIC RE-ENTRY FROM LIVE SGP4 / KING-HELE PROPAGATION */
            loadingDecay ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-red-400" />
                <span>Computing live King-Hele atmospheric drag lifetime on low-perigee catalog tracks...</span>
              </div>
            ) : decayWatchlist.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-space-900 rounded-xl border border-space-800">
                No active orbital tracks currently below 200 km perigee re-entry threshold.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs flex items-center gap-2.5 text-red-300">
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
                  <span>
                    Real-time SGP4 thermospheric decay predictions calculated via <strong>King-Hele Drag Mechanics</strong> against Jacchia-Roberts scale heights.
                  </span>
                </div>

                {decayWatchlist.map((dec) => (
                  <div key={dec.norad_id} className="p-3 sm:p-4 bg-space-900/90 rounded-xl border border-red-500/30 space-y-2 hover:border-red-500/60 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white">{dec.object_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-space-950 text-red-300 border border-red-500/30">
                          NORAD #{dec.norad_id}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-space-950 text-slate-400 border border-space-800">
                          {dec.object_type}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        dec.risk_level === 'CRITICAL'
                          ? 'bg-red-600/20 text-red-400 border-red-500/50 animate-pulse'
                          : dec.risk_level === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                      }`}>
                        {dec.risk_level} RE-ENTRY RISK
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] pt-1.5 border-t border-space-800/80 text-slate-400">
                      <div>
                        <span className="text-slate-500 block text-[9px]">ESTIMATED LIFETIME:</span>
                        <span className="text-amber-300 font-bold">
                          {dec.estimated_lifetime_days < 1 
                            ? `${Math.round(dec.estimated_lifetime_days * 24)} hours` 
                            : `${dec.estimated_lifetime_days.toFixed(1)} days`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">CURRENT PERIGEE:</span>
                        <span className="text-red-300 font-bold">{dec.perigee_km.toFixed(1)} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">CURRENT APOGEE:</span>
                        <span className="text-cyan-300 font-bold">{dec.apogee_km.toFixed(1)} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">PROJECTED RE-ENTRY:</span>
                        <span className="text-slate-200 font-medium">
                          {new Date(dec.predicted_reentry_time).toUTCString().substring(0, 22)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
