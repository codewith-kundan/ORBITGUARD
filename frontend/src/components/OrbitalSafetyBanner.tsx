import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  ArrowRightLeft, 
  ChevronRight,
  Radio
} from 'lucide-react';
import { Conjunction, DataStatus, SystemStatistics } from '../types';

interface OrbitalSafetyBannerProps {
  conjunctions: Conjunction[];
  dataStatus?: DataStatus | null;
  stats?: SystemStatistics | null;
  onSelectConjunction?: (conj: Conjunction) => void;
  onNavigateToConjunctions?: () => void;
}

const parseUtcMs = (dStr: string): number => {
  if (!dStr) return Date.now();
  let s = dStr.trim();
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (!s.endsWith('Z') && !s.includes('+')) {
    s += 'Z';
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? Date.now() : t;
};

export const OrbitalSafetyBanner: React.FC<OrbitalSafetyBannerProps> = ({
  conjunctions,
  dataStatus,
  stats,
  onSelectConjunction,
  onNavigateToConjunctions
}) => {
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter valid upcoming events
  const upcoming = conjunctions
    .map(c => ({ ...c, _tcaMs: parseUtcMs(c.tca) }))
    .filter(c => c._tcaMs > nowMs - 15 * 60 * 1000)
    .sort((a, b) => b.risk_score - a.risk_score);

  const highestRisk = upcoming.length > 0 ? upcoming[0] : null;
  const closestPair = [...upcoming].sort((a, b) => a.miss_distance_km - b.miss_distance_km)[0] || highestRisk;

  const criticalCount = upcoming.filter(c => c.risk_level === 'CRITICAL' || c.risk_score >= 80.0).length;
  const highCount = upcoming.filter(c => c.risk_level === 'HIGH' || (c.risk_score >= 60.0 && c.risk_score < 80.0)).length;
  const highRiskTotal = criticalCount + highCount;

  // Determine overall orbital safety environment accurately without contradiction
  let envStatus: 'SAFE' | 'ELEVATED' | 'CRITICAL' = 'SAFE';
  if (criticalCount > 0) {
    envStatus = 'CRITICAL';
  } else if (highCount > 0) {
    envStatus = 'ELEVATED';
  } else if (upcoming.length > 0) {
    // Events exist but all are nominal / low / medium risk
    envStatus = 'ELEVATED';
  }

  // Next TCA Countdown
  const earliestTcaEvent = [...upcoming].sort((a, b) => a._tcaMs - b._tcaMs)[0];
  let nextTcaStr = 'NO ACTIVE TCA';
  if (earliestTcaEvent) {
    const diffSec = Math.max(0, Math.floor((earliestTcaEvent._tcaMs - nowMs) / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    nextTcaStr = `T-${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const lastSyncDate = dataStatus?.last_updated || dataStatus?.last_sync || stats?.last_sync;
  const syncTimeFormatted = lastSyncDate 
    ? new Date(lastSyncDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC'
    : 'LIVE SGP4';

  const isActuallyHighRisk = highRiskTotal > 0 || (highestRisk && highestRisk.risk_score >= 60.0);
  const featuredEvent = isActuallyHighRisk ? highestRisk : closestPair;

  const statusConfig = {
    SAFE: {
      border: 'border-emerald-500/40',
      bg: 'bg-gradient-to-r from-emerald-950/70 via-space-900/90 to-space-950/90',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
      label: 'NOMINAL (LOW RISK)',
      headline: 'Orbital Environment Stable',
      sub: `${upcoming.length} screened conjunction events • 0 high-risk events detected across 24h horizon.`
    },
    ELEVATED: {
      border: highRiskTotal > 0 ? 'border-amber-500/50' : 'border-cyan-500/30',
      bg: 'bg-gradient-to-r from-space-900/95 via-space-950/95 to-space-900/95',
      badgeBg: highRiskTotal > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      dot: highRiskTotal > 0 ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse' : 'bg-cyan-400 shadow-[0_0_8px_#00f2ff]',
      label: highRiskTotal > 0 ? 'ELEVATED RISK' : 'ELEVATED ORBITAL ACTIVITY',
      headline: highRiskTotal > 0 ? 'Elevated Orbital Conjunction Alert' : 'Active Orbital Screening Underway',
      sub: `${upcoming.length} screened conjunction events • ${highRiskTotal} high-risk event${highRiskTotal === 1 ? '' : 's'} detected.`
    },
    CRITICAL: {
      border: 'border-danger-500/60',
      bg: 'bg-gradient-to-r from-red-950/90 via-space-900/95 to-space-950/95',
      badgeBg: 'bg-danger-500/25 text-danger-neon border-danger-500/60 animate-pulse',
      dot: 'bg-danger-500 shadow-[0_0_15px_#ff3344] animate-ping',
      label: 'CRITICAL COLLISION RISK',
      headline: 'CRITICAL CLOSE APPROACH DETECTED',
      sub: `${criticalCount} critical close approach${criticalCount > 1 ? 'es' : ''} require immediate collision avoidance assessment.`
    }
  }[envStatus];

  return (
    <div className={`w-full rounded-2xl border ${statusConfig.border} ${statusConfig.bg} p-3.5 sm:p-4 mb-3 font-mono shadow-2xl backdrop-blur-xl transition-all duration-300`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Status Indicator */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-space-950/80 border border-space-700 shadow-inner flex-shrink-0">
            {envStatus === 'SAFE' && <ShieldCheck className="w-6 h-6 text-emerald-400" />}
            {envStatus === 'ELEVATED' && <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />}
            {envStatus === 'CRITICAL' && <ShieldAlert className="w-6 h-6 text-danger-neon animate-bounce" />}
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${statusConfig.dot}`} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                ORBITAL STATUS:
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-bold tracking-wider ${statusConfig.badgeBg}`}>
                {statusConfig.label}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">•</span>
              <span className="text-[10px] text-cyan-300 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                {upcoming.length} Screened Conjunctions ({syncTimeFormatted})
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide mt-0.5">
              {statusConfig.headline}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-300/80 line-clamp-1 max-w-2xl">
              {statusConfig.sub}
            </p>
          </div>
        </div>

        {/* Center & Right Quick Metrics */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-4 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-space-800/80">
          {/* Featured Conjunction Card (Accurately labeled) */}
          {featuredEvent && (
            <div 
              onClick={() => onSelectConjunction && onSelectConjunction(featuredEvent)}
              className="bg-space-950/80 hover:bg-space-900 border border-space-800 hover:border-cyan-500/40 rounded-xl px-3 py-1.5 transition cursor-pointer group flex items-center gap-2.5 flex-1 sm:flex-initial"
              title="Click to view full encounter evidence & B-plane geometry"
            >
              <div className="text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">
                  {isActuallyHighRisk ? 'HIGHEST-RISK CONJUNCTION' : 'CLOSEST SCREENED PAIR'}
                </span>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-300 max-w-[90px] sm:max-w-[130px] truncate">
                    {featuredEvent.object_a?.name || `ID-${featuredEvent.object_a_id}`}
                  </span>
                  <ArrowRightLeft className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition" />
                  <span className={isActuallyHighRisk ? 'text-red-300 max-w-[90px] sm:max-w-[130px] truncate' : 'text-slate-300 max-w-[90px] sm:max-w-[130px] truncate'}>
                    {featuredEvent.object_b?.name || `ID-${featuredEvent.object_b_id}`}
                  </span>
                </div>
              </div>
              <div className="text-right border-l border-space-800 pl-2">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">MISS DIST</span>
                <span className={`text-xs font-bold ${featuredEvent.miss_distance_km < 5.0 ? 'text-red-400' : featuredEvent.miss_distance_km < 25.0 ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {featuredEvent.miss_distance_km.toFixed(2)} km
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
            </div>
          )}

          {/* Next TCA Countdown */}
          <div className="bg-space-950/80 border border-space-800 rounded-xl px-3 py-1.5 text-center min-w-[110px]">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block flex items-center justify-center gap-1 font-bold">
              <Clock className="w-2.5 h-2.5 text-cyan-400" />
              NEXT TCA
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-cyan-neon tracking-wider">
              {nextTcaStr}
            </span>
          </div>

          {/* View Conjunctions Action */}
          {onNavigateToConjunctions && (
            <button
              onClick={onNavigateToConjunctions}
              className="px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border border-cyan-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <span>CONJUNCTION CENTER</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
