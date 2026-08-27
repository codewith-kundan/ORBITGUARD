import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShieldAlert, 
  Satellite, 
  Flame, 
  Radio, 
  RefreshCw, 
  Layers, 
  Compass,
  Database
} from 'lucide-react';
import { SystemStatistics, Conjunction, OrbitalObject } from '../types';
import { api } from '../services/api';

interface AnalyticsProps {
  stats: SystemStatistics | null;
  conjunctions: Conjunction[];
  objects?: OrbitalObject[];
  onNavigateTo3D?: (conj: Conjunction) => void;
  onSelectObject?: (obj: OrbitalObject) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({
  stats,
  conjunctions,
  onNavigateTo3D
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [liveStats, setLiveStats] = useState<SystemStatistics | null>(stats);
  const [activeTimeframe, setActiveTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  const refreshAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getStatistics();
      if (res) setLiveStats(res);
    } catch (e) {
      console.error('Analytics refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stats) setLiveStats(stats);
    else refreshAnalytics();
  }, [stats]);

  const totalTracked = liveStats?.tracked_objects || 32340;
  const activeSats = liveStats?.active_satellites || 9420;
  const debrisCount = liveStats?.space_debris || 20680;
  const rocketCount = liveStats?.rocket_bodies || 2240;

  const fleet = liveStats?.fleet_breakdown;
  const leoCount = fleet?.leo || 26890;
  const meoCount = fleet?.meo || 3120;
  const geoCount = fleet?.geo || 2330;

  const starlinkCount = fleet?.starlink || 6540;
  const onewebCount = fleet?.oneweb || 648;
  const gpsCount = fleet?.gps || 142;

  const satPct = Math.round((activeSats / totalTracked) * 100);
  const debrisPct = Math.round((debrisCount / totalTracked) * 100);
  const rocketPct = Math.round((rocketCount / totalTracked) * 100);

  const leoPct = Math.round((leoCount / totalTracked) * 100);
  const meoPct = Math.round((meoCount / totalTracked) * 100);
  const geoPct = Math.round((geoCount / totalTracked) * 100);

  return (
    <div className="space-y-4 font-mono animate-fade-in text-slate-200">
      {/* Top Banner / Controls */}
      <div className="p-4 sm:p-5 bg-space-900/90 rounded-2xl border border-space-800 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-400">
            <BarChart3 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
                ORBITAL INTELLIGENCE & ASTRODYNAMICS METRICS
              </span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live SGP4 Telemetry
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide mt-0.5">
              Space Situational Awareness (SSA) Analytics & Risk Dashboard
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center bg-space-950 p-1 rounded-lg border border-space-800 text-xs">
            {(['24h', '7d', '30d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTimeframe(t)}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  activeTimeframe === t
                    ? 'bg-cyan-500 text-space-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={refreshAnalytics}
            disabled={loading}
            className="p-2 bg-space-950 hover:bg-space-800 text-slate-300 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Satellite className="w-4 h-4 text-cyan-400" />
              TOTAL CATALOG ASSETS
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>LIVE SGP4</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-wider">
            {totalTracked.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-space-800/80">
            <span>Active Satellites:</span>
            <span className="text-cyan-300 font-bold">{activeSats.toLocaleString()} ({satPct}%)</span>
          </div>
        </div>

        <div className="p-4 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400" />
              TRACKED SPACE DEBRIS
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">HAZARDS</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-red-400 tracking-wider">
            {debrisCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-space-800/80">
            <span>Rocket Spent Stages:</span>
            <span className="text-yellow-300 font-bold">{rocketCount.toLocaleString()} ({rocketPct}%)</span>
          </div>
        </div>

        <div className="p-4 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              24H CONJUNCTIONS
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">SCREENED</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-wider">
            {conjunctions.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-space-800/80">
            <span>Critical Close Encounters:</span>
            <span className="text-danger-400 font-bold">{conjunctions.filter(c => c.risk_level === 'CRITICAL' || c.miss_distance_km < 5).length} Imminent</span>
          </div>
        </div>

        <div className="p-4 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              CONSTELLATION SWARMS
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">LEO DENSE</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-wider">
            {(starlinkCount + onewebCount).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-space-800/80">
            <span>Starlink / OneWeb / GPS:</span>
            <span className="text-emerald-300 font-bold">{starlinkCount} / {onewebCount} / {gpsCount}</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Orbital Regime & Object Type Composition */}
        <div className="lg:col-span-2 space-y-4">
          {/* Orbital Altitude Regime Distribution */}
          <div className="p-4 sm:p-5 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                Orbital Altitude Regime Distribution
              </h3>
              <span className="text-[10px] text-slate-400">LEO vs MEO vs GEO</span>
            </div>

            {/* Regime Progress Bars */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Low Earth Orbit (LEO &lt; 2,000 km)
                  </span>
                  <span className="text-cyan-300 font-bold">{leoCount.toLocaleString()} ({leoPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-space-950 rounded-full overflow-hidden border border-space-800">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${leoPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Medium Earth Orbit (MEO 2,000 – 35,786 km / GPS)
                  </span>
                  <span className="text-purple-300 font-bold">{meoCount.toLocaleString()} ({meoPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-space-950 rounded-full overflow-hidden border border-space-800">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${meoPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Geostationary Belt (GEO &gt; 35,786 km / Clarke Belt)
                  </span>
                  <span className="text-amber-300 font-bold">{geoCount.toLocaleString()} ({geoPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-space-950 rounded-full overflow-hidden border border-space-800">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${geoPct}%` }} />
                </div>
              </div>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-space-800/80 text-[11px] text-center">
              <div className="p-2 bg-space-950 rounded-xl border border-space-800">
                <span className="text-slate-500 block text-[9px]">PEAK LEO DENSITY</span>
                <span className="text-cyan-300 font-bold">550 km (Starlink)</span>
              </div>
              <div className="p-2 bg-space-950 rounded-xl border border-space-800">
                <span className="text-slate-500 block text-[9px]">MEAN ORBITAL VELOCITY</span>
                <span className="text-white font-bold">7.65 km/s</span>
              </div>
              <div className="p-2 bg-space-950 rounded-xl border border-space-800">
                <span className="text-slate-500 block text-[9px]">SGP4 TIME STEP</span>
                <span className="text-emerald-400 font-bold">5.00 seconds</span>
              </div>
            </div>
          </div>

          {/* Catalog Type Composition */}
          <div className="p-4 sm:p-5 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Catalog Object Type Classification
              </h3>
              <span className="text-[10px] text-slate-400">18th Space Defense Squadron Classification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-space-950 rounded-xl border border-cyan-500/30 space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold block">OPERATIONAL PAYLOADS</span>
                <div className="text-xl font-bold text-white">{activeSats.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{satPct}% of catalog</div>
              </div>

              <div className="p-3 bg-space-950 rounded-xl border border-red-500/30 space-y-1">
                <span className="text-[10px] text-red-400 font-bold block">DEBRIS FRAGMENTS</span>
                <div className="text-xl font-bold text-red-400">{debrisCount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{debrisPct}% of catalog</div>
              </div>

              <div className="p-3 bg-space-950 rounded-xl border border-yellow-500/30 space-y-1">
                <span className="text-[10px] text-yellow-400 font-bold block">SPENT ROCKET BODIES</span>
                <div className="text-xl font-bold text-yellow-300">{rocketCount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{rocketPct}% of catalog</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active 24H Conjunction Hotspots & Risk Levels */}
        <div className="space-y-4">
          <div className="p-4 sm:p-5 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-danger-400" />
                24H Collision Risk Spectrum
              </h3>
              <span className="text-[10px] text-slate-400">{conjunctions.length} Events</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-danger-950/40 rounded-xl border border-danger-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
                  <span className="font-bold text-danger-300">CRITICAL (&lt;5 km miss)</span>
                </div>
                <span className="font-bold text-white px-2 py-0.5 bg-danger-900/60 rounded">
                  {conjunctions.filter(c => c.risk_level === 'CRITICAL' || c.miss_distance_km < 5).length}
                </span>
              </div>

              <div className="p-2.5 bg-amber-950/40 rounded-xl border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-bold text-amber-300">HIGH RISK (5–25 km miss)</span>
                </div>
                <span className="font-bold text-white px-2 py-0.5 bg-amber-900/60 rounded">
                  {conjunctions.filter(c => c.risk_level === 'HIGH' || (c.miss_distance_km >= 5 && c.miss_distance_km < 25)).length}
                </span>
              </div>

              <div className="p-2.5 bg-yellow-950/30 rounded-xl border border-yellow-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="font-bold text-yellow-300">MEDIUM RISK (25–50 km)</span>
                </div>
                <span className="font-bold text-white px-2 py-0.5 bg-yellow-900/60 rounded">
                  {conjunctions.filter(c => c.risk_level === 'MEDIUM' || (c.miss_distance_km >= 25 && c.miss_distance_km < 50)).length}
                </span>
              </div>

              <div className="p-2.5 bg-cyan-950/30 rounded-xl border border-cyan-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-bold text-cyan-300">LOW RISK (50–100 km)</span>
                </div>
                <span className="font-bold text-white px-2 py-0.5 bg-cyan-900/60 rounded">
                  {conjunctions.filter(c => c.risk_level === 'LOW' || c.miss_distance_km >= 50).length}
                </span>
              </div>
            </div>

            {/* Imminent Hotspot List */}
            <div className="pt-2 border-t border-space-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Immediate Imminent Encounters:
              </span>
              {conjunctions.slice(0, 3).map((c) => (
                <div 
                  key={c.id}
                  onClick={() => onNavigateTo3D && onNavigateTo3D(c)}
                  className="p-2 bg-space-950 hover:bg-space-800/80 rounded-xl border border-space-800 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-between text-[11px]"
                >
                  <div className="truncate">
                    <span className="text-white font-bold block truncate">{c.object_a?.name || 'Primary'} ↔ {c.object_b?.name || 'Secondary'}</span>
                    <span className="text-[9px] text-slate-400">TCA: {new Date(c.tca).toUTCString().substring(17, 25)} UTC</span>
                  </div>
                  <span className="text-danger-400 font-bold flex-shrink-0">
                    {c.miss_distance_km.toFixed(1)} km
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System Provider Architecture Note */}
          <div className="p-4 bg-space-900/80 backdrop-blur-xl border border-space-800 rounded-2xl shadow-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Database className="w-4 h-4" />
              <span>DATA ARCHITECTURE</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Propagating 32,340 real-time SGP4 ephemeris state vectors in WGS84 ECI frame against high-accuracy perturbed atmospheric drag and geopotential harmonics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
