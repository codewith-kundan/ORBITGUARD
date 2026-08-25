import React from 'react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { X, ShieldAlert, ArrowRightLeft, Clock, Gauge, Layers, Rocket, Atom } from 'lucide-react';

interface ConjunctionDetailsModalProps {
  conjunction: Conjunction | null;
  onClose: () => void;
  onOpenCAM?: (conjunction: Conjunction) => void;
  onOpenBreakup?: (conjunction: Conjunction) => void;
}

export const ConjunctionDetailsModal: React.FC<ConjunctionDetailsModalProps> = ({
  conjunction,
  onClose,
  onOpenCAM,
  onOpenBreakup
}) => {
  if (!conjunction) return null;

  const tcaDate = new Date(conjunction.tca);
  const now = new Date();
  const diffHours = ((tcaDate.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1);

  const nameA = conjunction.object_a?.name || `Object #${conjunction.object_a_id}`;
  const nameB = conjunction.object_b?.name || `Object #${conjunction.object_b_id}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-space-900 border border-warning-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-space-800 pb-3 sm:pb-4 mb-4 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-warning-500/10 border border-warning-500/30 text-warning-neon glow-cyan">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Conjunction Event #{conjunction.id}
                </h3>
                <RiskBadge level={conjunction.risk_level} score={conjunction.risk_score} size="sm" />
              </div>
              <p className="text-xs text-slate-400">
                Primary vs Secondary Proximity Encounter Analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Encounters Objects Bar */}
        <div className="bg-space-950 p-3 sm:p-4 rounded-xl border border-space-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="w-full sm:flex-1 text-center sm:text-left">
            <div className="text-[10px] text-slate-400 uppercase">PRIMARY ASSET</div>
            <div className="text-xs sm:text-sm font-bold text-cyan-400">{nameA}</div>
            <div className="text-[10px] sm:text-xs text-slate-500">NORAD: {conjunction.object_a?.norad_id || conjunction.object_a_id}</div>
          </div>

          <div className="flex items-center gap-2 py-1 px-3 bg-space-900 rounded-lg border border-space-800">
            <ArrowRightLeft className="w-4 h-4 text-warning-neon" />
            <span className="text-xs font-bold text-danger-neon">
              {conjunction.miss_distance_km.toFixed(2)} km
            </span>
          </div>

          <div className="w-full sm:flex-1 text-center sm:text-right">
            <div className="text-[10px] text-slate-400 uppercase">SECONDARY OBJECT</div>
            <div className="text-xs sm:text-sm font-bold text-danger-400">{nameB}</div>
            <div className="text-[10px] sm:text-xs text-slate-500">NORAD: {conjunction.object_b?.norad_id || conjunction.object_b_id}</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
          <div className="bg-space-950 p-2.5 sm:p-3 rounded-lg border border-space-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> TIME OF CLOSEST APPROACH
            </div>
            <div className="text-xs sm:text-sm font-bold text-white mt-1">
              {tcaDate.toLocaleTimeString()} UTC
            </div>
            <div className="text-[10px] text-slate-400">
              {tcaDate.toISOString().split('T')[0]} ({diffHours}h lead time)
            </div>
          </div>

          <div className="bg-space-950 p-2.5 sm:p-3 rounded-lg border border-space-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-warning-neon" /> RELATIVE VELOCITY
            </div>
            <div className="text-xs sm:text-sm font-bold text-warning-neon mt-1">
              {conjunction.relative_velocity_km_s.toFixed(2)} km/s
            </div>
            <div className="text-[10px] text-slate-400">Relative speed at TCA</div>
          </div>

          <div className="bg-space-950 p-2.5 sm:p-3 rounded-lg border border-space-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> ORBITAL ALTITUDE
            </div>
            <div className="text-xs sm:text-sm font-bold text-cyan-400 mt-1">
              {conjunction.altitude_km ? `${conjunction.altitude_km.toFixed(1)} km` : 'LEO Regime'}
            </div>
            <div className="text-[10px] text-slate-400">WGS84 Ellipsoid</div>
          </div>
        </div>

        {/* Risk Score Factor Explanation */}
        <div className="bg-space-950/80 p-3 sm:p-4 rounded-xl border border-space-800">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-warning-neon" />
            Conjunction Risk Factor Attribution
          </div>
          <div className="space-y-1.5 sm:space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-space-800/60 pb-1.5 text-[11px] sm:text-xs">
              <span className="text-slate-400">Miss Distance Proximity (55%)</span>
              <span className="text-white font-bold">
                {conjunction.factors?.miss_distance_factor?.contribution || `${conjunction.miss_distance_km.toFixed(1)} km`}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-space-800/60 pb-1.5 text-[11px] sm:text-xs">
              <span className="text-slate-400">Relative Kinetic Velocity (25%)</span>
              <span className="text-white font-bold">
                {conjunction.factors?.relative_velocity_factor?.contribution || `${conjunction.relative_velocity_km_s.toFixed(1)} km/s`}
              </span>
            </div>
            <div className="flex items-center justify-between pb-1 text-[11px] sm:text-xs">
              <span className="text-slate-400">Reaction Lead Time / Urgency (20%)</span>
              <span className="text-white font-bold">
                {conjunction.factors?.time_to_tca_factor?.contribution || `${diffHours}h lead`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-space-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] text-slate-500 font-mono">
            SGP4 Conjunction Assessment
          </div>
          <div className="flex items-center gap-2">
            {onOpenBreakup && (
              <button
                onClick={() => onOpenBreakup(conjunction)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition"
              >
                <Atom className="w-4 h-4" />
                SIMULATE BREAKUP
              </button>
            )}

            {onOpenCAM && (
              <button
                onClick={() => onOpenCAM(conjunction)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-500/20"
              >
                <Rocket className="w-4 h-4" />
                PLAN CAM
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
