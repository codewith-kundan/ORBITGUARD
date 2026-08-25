import React, { useState } from 'react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { ShieldAlert, Activity, Crosshair } from 'lucide-react';

const parseUtcDate = (dStr: string) => {
  if (!dStr) return new Date();
  let s = dStr.trim();
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (!s.endsWith('Z') && !s.includes('+')) {
    s += 'Z';
  }
  return new Date(s);
};

const formatTcaCountdown = (tcaStr: string) => {
  const tca = parseUtcDate(tcaStr);
  const now = new Date();
  const diffMs = tca.getTime() - now.getTime();
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
  onScreenNew?: () => void;
  isScreening?: boolean;
}

export const ConjunctionTable: React.FC<ConjunctionTableProps> = ({
  conjunctions,
  selectedConjunction,
  onSelectConjunction,
  onScreenNew,
  isScreening
}) => {
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filtered = conjunctions.filter((c) => {
    // Automatically remove passed conjunctions
    const tcaMs = parseUtcDate(c.tca).getTime();
    if (tcaMs <= Date.now()) return false;

    if (riskFilter === 'ALL') return true;
    return c.risk_level === riskFilter;
  });

  const formatTCA = (tcaStr: string) => {
    const tca = parseUtcDate(tcaStr);
    const now = new Date();
    const diffMs = tca.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeFormatted = tca.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
    if (diffMs > 0) {
      return { timeFormatted, countdown: `in ${diffHours}h ${diffMins}m` };
    }
    return { timeFormatted, countdown: 'Past TCA' };
  };

  return (
    <div className="bg-space-900/90 border border-space-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
      {/* Header & Screening Controls */}
      <div className="p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-neon">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-wider flex items-center gap-2">
                <span>CONJUNCTION RISK & CLOSE ENCOUNTER MATRIX</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-danger-500/20 text-danger-neon border border-danger-500/30">
                  {conjunctions.length} ACTIVE ENCOUNTERS
                </span>
              </h2>
              <p className="text-xs text-slate-400">Broad-Phase Altitude Pruning & Narrow-Phase SGP4 Closest Approach Analysis</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Risk Level Tabs */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  riskFilter === lvl
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {onScreenNew && (
            <button
              onClick={onScreenNew}
              disabled={isScreening}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-neon border border-cyan-500/30 rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              <Activity className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`} />
              {isScreening ? 'Screening Catalog...' : 'RUN CONJUNCTION SCREEN'}
            </button>
          )}
        </div>
      </div>

      {/* Conjunction Table */}
      <div className="overflow-x-auto min-h-[460px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-space-950/90 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-space-800">
            <tr>
              <th className="py-3 px-4">Primary Target (Object A)</th>
              <th className="py-3 px-4">Secondary Target (Object B)</th>
              <th className="py-3 px-4">Miss Distance</th>
              <th className="py-3 px-4">Relative Velocity</th>
              <th className="py-3 px-4">Time of Closest Approach (TCA)</th>
              <th className="py-3 px-4 text-center">TCA Countdown</th>
              <th className="py-3 px-4 text-center">Collision Risk Score</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  No conjunction events matching the selected filter level.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedConjunction?.id === c.id;
                const { timeFormatted, countdown } = formatTCA(c.tca);
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
                      {formatTcaCountdown(c.tca)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectConjunction(c);
                        }}
                        className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-neon border border-cyan-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto shadow-sm"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>INSPECT</span>
                      </button>
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
