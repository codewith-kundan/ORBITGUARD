import React from 'react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { ShieldAlert, ChevronRight } from 'lucide-react';

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
  const formatTCA = (tcaStr: string) => {
    const tca = new Date(tcaStr);
    const now = new Date();
    const diffMs = tca.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeFormatted = tca.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';
    if (diffMs > 0) {
      return { timeFormatted, countdown: `in ${diffHours}h ${diffMins}m` };
    }
    return { timeFormatted, countdown: 'Past TCA' };
  };

  return (
    <div className="bg-space-900/80 border border-space-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="p-4 border-b border-space-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-warning-neon" />
          <h2 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
            Detected Conjunction Events
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-space-800 text-cyan-400 border border-space-700">
            {conjunctions.length} Active
          </span>
        </div>

        {onScreenNew && (
          <button
            onClick={onScreenNew}
            disabled={isScreening}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-neon border border-cyan-500/30 rounded-lg text-xs font-mono transition disabled:opacity-50"
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`} />
            {isScreening ? 'Screening Catalog...' : 'RUN CONJUNCTION SCREEN'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-space-950/80 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-space-800">
            <tr>
              <th className="py-3 px-4">Primary Object (A)</th>
              <th className="py-3 px-4">Secondary Object (B)</th>
              <th className="py-3 px-4">Miss Distance</th>
              <th className="py-3 px-4">Rel. Velocity</th>
              <th className="py-3 px-4">TCA (UTC)</th>
              <th className="py-3 px-4 text-center">Risk Score</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800">
            {conjunctions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No close conjunctions detected in the current screening window.
                </td>
              </tr>
            ) : (
              conjunctions.map((c) => {
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
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span>{nameA}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-danger-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger-500"></span>
                        <span>{nameB}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${c.miss_distance_km < 5.0 ? 'text-danger-neon' : c.miss_distance_km < 15.0 ? 'text-warning-neon' : 'text-slate-200'}`}>
                        {c.miss_distance_km.toFixed(2)} km
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.relative_velocity_km_s.toFixed(2)} km/s
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">{timeFormatted}</div>
                      <div className="text-[10px] text-slate-400">{countdown}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="p-1 rounded bg-space-800 hover:bg-space-700 text-cyan-400 hover:text-cyan-neon border border-space-700">
                        <ChevronRight className="w-4 h-4" />
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
