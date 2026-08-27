import React, { useState, useEffect } from 'react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { ShieldAlert, Crosshair, RefreshCw } from 'lucide-react';

const parseUtcDate = (dStr: string): number => {
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

const formatTcaCountdown = (tcaMs: number, nowMs: number) => {
  const diffMs = tcaMs - nowMs;
  if (diffMs <= 0) return 'PASSED';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getMissDistanceColor = (km: number) => {
  if (km < 5) return 'text-red-400 font-bold';
  if (km < 25) return 'text-amber-400 font-bold';
  return 'text-cyan-400 font-semibold';
};

interface ConjunctionTableProps {
  conjunctions: Conjunction[];
  selectedConjunction: Conjunction | null;
  onSelectConjunction: (conj: Conjunction) => void;
  onFocus3D?: (conj: Conjunction) => void;
  onGroundTrack2D?: (conj: Conjunction) => void;
  onScreenNew?: () => void;
  isScreening?: boolean;
}

export const ConjunctionTable: React.FC<ConjunctionTableProps> = ({
  conjunctions,
  selectedConjunction,
  onSelectConjunction,
  onFocus3D,
  onGroundTrack2D,
  onScreenNew,
  isScreening
}) => {
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  // Dynamic 1-second interval keeps countdown live and ensures events stay until completed
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter conjunctions and sort chronologically (soonest TCA first)
  const validUpcoming = conjunctions
    .map(c => ({
      ...c,
      _tcaMs: parseUtcDate(c.tca)
    }))
    .filter(c => {
      // Keep events visible during monitoring (up to 30 min post TCA)
      if (c._tcaMs <= currentTimeMs - 30 * 60 * 1000) return false;
      if (riskFilter !== 'ALL' && c.risk_level !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameA = (c.object_a?.name || '').toLowerCase();
        const nameB = (c.object_b?.name || '').toLowerCase();
        const idA = (c.object_a?.norad_id || c.object_a_id || '').toString();
        const idB = (c.object_b?.norad_id || c.object_b_id || '').toString();
        if (!nameA.includes(q) && !nameB.includes(q) && !idA.includes(q) && !idB.includes(q)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => a._tcaMs - b._tcaMs);

  const formatTCA = (tcaMs: number) => {
    const d = new Date(tcaMs);
    const diffMs = tcaMs - currentTimeMs;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
    if (diffMs > 0) {
      return { timeFormatted, countdown: `in ${diffHours}h ${diffMins}m` };
    }
    return { timeFormatted, countdown: 'Passed TCA' };
  };

  return (
    <div className="bg-space-900/90 border border-space-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
      {/* Header & Screening Controls */}
      <div className="p-4 sm:p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-neon">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white tracking-wider flex items-center gap-2 flex-wrap">
                <span>CONJUNCTION RISK & CLOSE ENCOUNTER MATRIX</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-danger-500/20 text-danger-neon border border-danger-500/30 font-bold">
                  {validUpcoming.length} ACTIVE (NEXT 24H)
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Real-Time SGP4 Close Approaches • Filter by Risk Severity or Asset Name
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search Starlink, Cosmos, ISS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-space-950 border border-space-800 rounded-xl px-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-44 sm:w-56"
          />

          {/* Risk Level Tabs */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition font-medium ${
                  riskFilter === lvl
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Trigger Conjunction Screening Button */}
          {onScreenNew && (
            <button
              onClick={onScreenNew}
              disabled={isScreening}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-neon border border-cyan-500/40 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`} />
              <span>{isScreening ? 'SCREENING...' : 'RUN SCREENING'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-space-950/80 border-b border-space-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Primary Target (Object A)</th>
              <th className="py-3 px-4">Secondary Target (Object B)</th>
              <th className="py-3 px-4">Miss Distance</th>
              <th className="py-3 px-4">Relative Velocity</th>
              <th className="py-3 px-4">Time of Closest Approach (TCA)</th>
              <th className="py-3 px-4 text-center">TCA Countdown</th>
              <th className="py-3 px-4 text-center">Risk Level</th>
              <th className="py-3 px-4 text-center">Collision Probability</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800/60 font-mono">
            {validUpcoming.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  No conjunction events matching the selected filter level in the next 24 hours.
                </td>
              </tr>
            ) : (
              validUpcoming.map((c) => {
                const isSelected = selectedConjunction?.id === c.id;
                const { timeFormatted, countdown } = formatTCA(c._tcaMs);
                const nameA = c.object_a?.name || `ID-${c.object_a_id}`;
                const nameB = c.object_b?.name || `ID-${c.object_b_id}`;

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectConjunction(c)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-cyan-500/15 text-white'
                        : 'hover:bg-space-850/60 text-slate-300'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-cyan-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span>{nameA}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-danger-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-danger-500"></span>
                        <span>{nameB}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${getMissDistanceColor(c.miss_distance_km)}`}>
                        {c.miss_distance_km.toFixed(2)} km
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.relative_velocity_km_s.toFixed(2)} km/s
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{timeFormatted}</div>
                      <div className="text-[10px] text-slate-400">{countdown}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-400">
                      {formatTcaCountdown(c._tcaMs, currentTimeMs)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                      {c.collision_probability != null ? `${c.collision_probability.toFixed(2)}%` : '<0.01%'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {onFocus3D && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFocus3D(c);
                            }}
                            className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                            title="Focus in 3D Orbit View (Blinking Objects)"
                          >
                            <span>🌐 3D</span>
                          </button>
                        )}
                        {onGroundTrack2D && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onGroundTrack2D(c);
                            }}
                            className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                            title="View 2D Ground Track & Collision TCA Hotspot"
                          >
                            <span>🗺️ 2D</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectConjunction(c);
                          }}
                          className="px-2 py-1 bg-space-800 hover:bg-space-700 text-slate-300 border border-space-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>DETAILS</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
