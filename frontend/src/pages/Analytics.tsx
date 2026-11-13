import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  ShieldAlert,
  Satellite,
  Flame,
  Radio,
  RefreshCw,
  Layers,
  Compass,
  Database,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SystemStatistics, Conjunction, OrbitalObject, RiskLevel } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { formatUtcTime, parseUtcDate } from '../utils/utcTime';

interface DensityBin {
  altitude_range_km: string;
  min_alt_km: number;
  max_alt_km: number;
  count: number;
  satellites: number;
  debris: number;
  rocket_bodies: number;
}

interface AnalyticsProps {
  stats: SystemStatistics | null;
  conjunctions: Conjunction[];
  objects?: OrbitalObject[];
  onNavigateTo3D?: (conj: Conjunction) => void;
  onSelectObject?: (obj: OrbitalObject) => void;
}

const pct = (part: number, total: number): string => {
  if (!total || total <= 0) return '0.0';
  return ((part / total) * 100).toFixed(1);
};

const classifyRisk = (c: Conjunction): RiskLevel => {
  if (
    c.risk_level === 'CRITICAL' ||
    c.risk_level === 'HIGH' ||
    c.risk_level === 'MEDIUM' ||
    c.risk_level === 'LOW'
  ) {
    return c.risk_level;
  }
  if (c.miss_distance_km < 5) return 'CRITICAL';
  if (c.miss_distance_km < 25) return 'HIGH';
  if (c.miss_distance_km < 50) return 'MEDIUM';
  return 'LOW';
};

const shortenShellLabel = (label: string): string => {
  if (label.startsWith('>')) return '>35.8k';
  const match = label.match(/^(\d+)-(\d+)/);
  if (!match) return label;
  const lo = Number(match[1]);
  const hi = Number(match[2]);
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`);
  return `${fmt(lo)}-${fmt(hi)}`;
};

export const Analytics: React.FC<AnalyticsProps> = ({
  stats,
  conjunctions,
  onNavigateTo3D,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [liveStats, setLiveStats] = useState<SystemStatistics | null>(stats);
  const [densityBins, setDensityBins] = useState<DensityBin[]>([]);
  const [densityError, setDensityError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  const refreshAnalytics = useCallback(async () => {
    setLoading(true);
    setStatsError(null);
    setDensityError(null);

    const [statsResult, densityResult] = await Promise.allSettled([
      api.getStatistics(),
      api.getDensityProfile(),
    ]);

    if (statsResult.status === 'fulfilled' && statsResult.value) {
      setLiveStats(statsResult.value);
    } else if (statsResult.status === 'rejected') {
      setStatsError(statsResult.reason?.message || 'Statistics endpoint unreachable');
    }

    if (densityResult.status === 'fulfilled' && Array.isArray(densityResult.value?.bins)) {
      setDensityBins(densityResult.value.bins);
    } else if (densityResult.status === 'rejected') {
      setDensityError(densityResult.reason?.message || 'Density profile unavailable');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (stats) setLiveStats(stats);
  }, [stats]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  const totalTracked = liveStats?.tracked_objects ?? 0;
  const activeSats = liveStats?.active_satellites ?? 0;
  const debrisCount = liveStats?.space_debris ?? 0;
  const rocketCount = liveStats?.rocket_bodies ?? 0;

  const fleet = liveStats?.fleet_breakdown;
  const leoCount = fleet?.leo ?? 0;
  const meoCount = fleet?.meo ?? 0;
  const geoCount = fleet?.geo ?? 0;

  const starlinkCount = fleet?.starlink ?? 0;
  const onewebCount = fleet?.oneweb ?? 0;
  const gpsCount = fleet?.gps ?? 0;

  const timeframeHours = activeTimeframe === '24h' ? 24 : activeTimeframe === '7d' ? 168 : 720;

  const filteredConjunctions = useMemo(() => {
    const nowMs = Date.now();
    const horizonMs = nowMs + timeframeHours * 3600 * 1000;
    const pastWindowMs = nowMs - 2 * 3600 * 1000;
    const withinWindow = conjunctions.filter((c) => {
      const tca = parseUtcDate(c.tca);
      if (!tca) return true;
      const ms = tca.getTime();
      return ms >= pastWindowMs && ms <= horizonMs;
    });
    return withinWindow.sort((a, b) => a.miss_distance_km - b.miss_distance_km);
  }, [conjunctions, timeframeHours]);

  const riskCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    for (const c of filteredConjunctions) {
      counts[classifyRisk(c)] += 1;
    }
    return counts;
  }, [filteredConjunctions]);

  const meanRelVelocity = useMemo(() => {
    if (filteredConjunctions.length === 0) return null;
    const valid = filteredConjunctions.filter(
      (c) => typeof c.relative_velocity_km_s === 'number' && Number.isFinite(c.relative_velocity_km_s)
    );
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, c) => acc + c.relative_velocity_km_s, 0);
    return sum / valid.length;
  }, [filteredConjunctions]);

  const peakShell = useMemo(() => {
    if (densityBins.length === 0) return null;
    return densityBins.reduce((best, cur) => (cur.count > best.count ? cur : best), densityBins[0]);
  }, [densityBins]);

  const chartData = useMemo(
    () =>
      densityBins.map((bin) => ({
        shell: shortenShellLabel(bin.altitude_range_km),
        fullLabel: bin.altitude_range_km,
        Satellites: bin.satellites,
        Debris: bin.debris,
        'Rocket Bodies': bin.rocket_bodies,
        Total: bin.count,
      })),
    [densityBins]
  );

  const hasCatalogData = totalTracked > 0;
  const statusLabel = statsError
    ? 'Telemetry Offline'
    : hasCatalogData
    ? 'Database Catalog Loaded'
    : 'Catalog Empty';

  return (
    <div className="space-y-4 font-mono text-slate-200 max-w-[1600px] mx-auto">
      {/* Workspace Header */}
      <div className="p-4 bg-space-900 border border-space-700 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-space-950 rounded-md border border-space-700 text-accent-400 shrink-0" aria-hidden="true">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-sky-500/10 text-sky-300 rounded border border-sky-500/30">
                CATALOG &amp; RISK ANALYTICS
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                  statsError
                    ? 'bg-red-500/10 text-red-300 border-red-500/30'
                    : hasCatalogData
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {statsError ? (
                  <AlertOctagon className="w-3 h-3" aria-hidden="true" />
                ) : hasCatalogData ? (
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Info className="w-3 h-3" aria-hidden="true" />
                )}
                {statusLabel}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-slate-100 mt-1">
              Orbital Regime Density &amp; Conjunction Exposure
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div
            className="flex items-center bg-space-950 p-1 rounded-md border border-space-700 text-xs"
            role="group"
            aria-label="Conjunction horizon window"
          >
            {(['24h', '7d', '30d'] as const).map((t) => {
              const active = activeTimeframe === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTimeframe(t)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={refreshAnalytics}
            disabled={loading}
            aria-label="Refresh analytics telemetry"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-space-950 hover:bg-space-800 text-slate-200 rounded-md border border-space-700 text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent-400' : ''}`} aria-hidden="true" />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {statsError && (
        <div
          role="alert"
          className="p-3 bg-red-500/10 border border-red-500/35 rounded-lg text-xs text-red-200 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>Statistics feed unavailable: {statsError}</span>
          </span>
          <button
            type="button"
            onClick={refreshAnalytics}
            className="px-2.5 py-1 rounded border border-red-500/40 bg-space-950 hover:bg-space-800 text-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Tracked Catalog Objects"
          value={totalTracked.toLocaleString()}
          subtitle={`Active Payloads: ${activeSats.toLocaleString()} (${pct(activeSats, totalTracked)}%)`}
          icon={Satellite}
          variant="cyan"
        />
        <StatCard
          title="Debris & Spent Stages"
          value={debrisCount.toLocaleString()}
          subtitle={`Rocket Bodies: ${rocketCount.toLocaleString()} (${pct(rocketCount, totalTracked)}%)`}
          icon={Flame}
          variant="danger"
        />
        <StatCard
          title={`${activeTimeframe.toUpperCase()} Screened Events`}
          value={filteredConjunctions.length.toLocaleString()}
          subtitle={`Critical: ${riskCounts.CRITICAL} • High: ${riskCounts.HIGH}`}
          icon={ShieldAlert}
          variant={riskCounts.CRITICAL > 0 ? 'danger' : 'warning'}
        />
        <StatCard
          title="Monitored Constellations"
          value={(starlinkCount + onewebCount + gpsCount).toLocaleString()}
          subtitle={`SLK ${starlinkCount.toLocaleString()} / OW ${onewebCount.toLocaleString()} / GPS ${gpsCount.toLocaleString()}`}
          icon={Radio}
          variant="default"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Shell Density Chart + Regimes + Object Composition */}
        <div className="lg:col-span-2 space-y-4">
          {/* Altitude Shell Density Distribution */}
          <section className="p-4 sm:p-5 bg-space-900 border border-space-700 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-2.5 flex-wrap gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <Compass className="w-4 h-4 text-accent-400" aria-hidden="true" />
                <span>Altitude Shell Spatial Density</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Computed from perigee/apogee mean altitude
              </span>
            </div>

            {densityError ? (
              <div className="p-4 bg-space-950 border border-space-700 rounded-lg text-xs text-slate-400 flex items-center justify-between gap-2">
                <span>Shell density unavailable: {densityError}</span>
                <button
                  type="button"
                  onClick={refreshAnalytics}
                  className="px-2.5 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200"
                >
                  Retry
                </button>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid stroke="#1e2836" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="shell"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e131b',
                        borderColor: '#1e2836',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#e2e8f0',
                      }}
                      labelFormatter={(_label, payload) =>
                        payload?.[0]?.payload?.fullLabel || _label
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                    <Bar dataKey="Satellites" stackId="a" fill="#38bdf8" />
                    <Bar dataKey="Debris" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Rocket Bodies" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-6 bg-space-950 border border-space-800 rounded-lg text-center text-xs text-slate-400">
                No catalog shell density bins populated yet.
              </div>
            )}

            {/* Orbital Regime Share */}
            <div className="space-y-2.5 pt-2 border-t border-space-800 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-space-950 border border-space-800 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">LEO (&lt; 2,000 km)</span>
                    <span className="text-accent-400 font-semibold tabular-nums">
                      {leoCount.toLocaleString()} ({pct(leoCount, totalTracked)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-space-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${Math.min(100, Number(pct(leoCount, totalTracked)))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-space-950 border border-space-800 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">MEO (2k - 35.8k km)</span>
                    <span className="text-amber-300 font-semibold tabular-nums">
                      {meoCount.toLocaleString()} ({pct(meoCount, totalTracked)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-space-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${Math.min(100, Number(pct(meoCount, totalTracked)))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-space-950 border border-space-800 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">GEO (&ge; 35,786 km)</span>
                    <span className="text-emerald-300 font-semibold tabular-nums">
                      {geoCount.toLocaleString()} ({pct(geoCount, totalTracked)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-space-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${Math.min(100, Number(pct(geoCount, totalTracked)))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Computed Telemetry Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Peak Density Shell</span>
                  <span className="text-slate-100 font-semibold tabular-nums">
                    {peakShell && peakShell.count > 0
                      ? `${peakShell.altitude_range_km} (${peakShell.count.toLocaleString()})`
                      : 'Unavailable'}
                  </span>
                </div>
                <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Mean Encounter Rel Vel</span>
                  <span className="text-slate-100 font-semibold tabular-nums">
                    {meanRelVelocity !== null ? `${meanRelVelocity.toFixed(2)} km/s` : '—'}
                  </span>
                </div>
                <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Propagation Frame</span>
                  <span className="text-slate-100 font-semibold">WGS84 TEME / SGP4</span>
                </div>
              </div>
            </div>
          </section>

          {/* Catalog Composition */}
          <section className="p-4 sm:p-5 bg-space-900 border border-space-700 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-space-800 pb-2.5">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-accent-400" aria-hidden="true" />
                <span>Catalog Object Classification</span>
              </h2>
              <span className="text-[11px] text-slate-400">Active Database Inventory</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-space-950 rounded-md border border-space-800 space-y-1">
                <span className="text-[10px] text-accent-400 font-semibold block uppercase">
                  Active Payloads
                </span>
                <div className="text-xl font-semibold text-slate-100 tabular-nums">
                  {activeSats.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {pct(activeSats, totalTracked)}% of catalog
                </div>
              </div>

              <div className="p-3 bg-space-950 rounded-md border border-space-800 space-y-1">
                <span className="text-[10px] text-red-400 font-semibold block uppercase">
                  Tracked Debris
                </span>
                <div className="text-xl font-semibold text-slate-100 tabular-nums">
                  {debrisCount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {pct(debrisCount, totalTracked)}% of catalog
                </div>
              </div>

              <div className="p-3 bg-space-950 rounded-md border border-space-800 space-y-1">
                <span className="text-[10px] text-amber-400 font-semibold block uppercase">
                  Spent Rocket Bodies
                </span>
                <div className="text-xl font-semibold text-slate-100 tabular-nums">
                  {rocketCount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {pct(rocketCount, totalTracked)}% of catalog
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Risk Spectrum & Imminent Encounters */}
        <div className="space-y-4">
          <section className="p-4 sm:p-5 bg-space-900 border border-space-700 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-2.5">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>{activeTimeframe.toUpperCase()} Risk Spectrum</span>
              </h2>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {filteredConjunctions.length} Events
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-red-500/10 rounded-md border border-red-500/30 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-red-300">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                  <span>CRITICAL</span>
                </span>
                <span className="font-semibold text-slate-100 tabular-nums px-2 py-0.5 bg-space-950 rounded border border-space-700">
                  {riskCounts.CRITICAL}
                </span>
              </div>

              <div className="p-2.5 bg-orange-500/10 rounded-md border border-orange-500/30 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-orange-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                  <span>HIGH RISK</span>
                </span>
                <span className="font-semibold text-slate-100 tabular-nums px-2 py-0.5 bg-space-950 rounded border border-space-700">
                  {riskCounts.HIGH}
                </span>
              </div>

              <div className="p-2.5 bg-amber-500/10 rounded-md border border-amber-500/30 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-amber-300">
                  <Info className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>MEDIUM RISK</span>
                </span>
                <span className="font-semibold text-slate-100 tabular-nums px-2 py-0.5 bg-space-950 rounded border border-space-700">
                  {riskCounts.MEDIUM}
                </span>
              </div>

              <div className="p-2.5 bg-emerald-500/10 rounded-md border border-emerald-500/30 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>LOW RISK</span>
                </span>
                <span className="font-semibold text-slate-100 tabular-nums px-2 py-0.5 bg-space-950 rounded border border-space-700">
                  {riskCounts.LOW}
                </span>
              </div>
            </div>

            {/* Closest Screened Encounters */}
            <div className="pt-3 border-t border-space-800 space-y-2">
              <h3 className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Closest Encounters ({activeTimeframe.toUpperCase()})
              </h3>

              {filteredConjunctions.length === 0 ? (
                <div className="p-3 bg-space-950 border border-space-800 rounded-md text-xs text-slate-400">
                  No conjunctions recorded inside the {activeTimeframe.toUpperCase()} window.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredConjunctions.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onNavigateTo3D?.(c)}
                      className="w-full text-left p-2.5 bg-space-950 hover:bg-space-800 rounded-md border border-space-800 hover:border-space-600 transition-colors flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold truncate">
                          {c.object_a?.name || `NORAD #${c.object_a_id}`} / {c.object_b?.name || `NORAD #${c.object_b_id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                          TCA: {formatUtcTime(c.tca)} UTC
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <RiskBadge level={c.risk_level} size="sm" />
                        <span className="text-slate-200 font-semibold tabular-nums">
                          {c.miss_distance_km.toFixed(2)} km
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="p-4 bg-space-900 border border-space-700 rounded-lg space-y-2 text-xs">
            <div className="flex items-center gap-2 text-accent-400 font-semibold uppercase tracking-wider">
              <Database className="w-4 h-4" aria-hidden="true" />
              <span>Engine Provenance</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
              All catalog counts, altitude shell bins, and conjunction rankings above reflect live
              records returned by the database and SGP4 conjunction screening pipeline. Metrics show
              explicit empty or unavailable states when no upstream feed is connected.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
