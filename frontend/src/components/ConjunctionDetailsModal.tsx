import React from 'react';
import { Conjunction } from '../types';
import {
  X,
  AlertTriangle,
  Play,
  Globe,
  Map as MapIcon,
  Navigation,
  Zap,
  FileText,
  Clock,
  Activity,
} from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { EvidenceFooter } from './EvidenceFooter';
import { ModalDialog } from './ModalDialog';
import { formatUtcDateTime, formatCountdownToUtc } from '../utils/utcTime';

interface ConjunctionDetailsModalProps {
  conjunction: Conjunction;
  isOpen?: boolean;
  onClose: () => void;
  onNavigateTo3D?: (conj: Conjunction) => void;
  onNavigateTo2D?: (conj: Conjunction) => void;
  onOpenReplay?: (conj: Conjunction) => void;
  onOpenCAM?: (conj: Conjunction) => void;
  onOpenBreakup?: (conj: Conjunction) => void;
  onOpenCDM?: (conj: Conjunction) => void;
}

export const ConjunctionDetailsModal: React.FC<ConjunctionDetailsModalProps> = ({
  conjunction,
  isOpen = true,
  onClose,
  onNavigateTo3D,
  onNavigateTo2D,
  onOpenReplay,
  onOpenCAM,
  onOpenBreakup,
  onOpenCDM,
}) => {
  const formatPcPct = (pcPct?: number | null): string => {
    if (pcPct === null || pcPct === undefined || Number.isNaN(pcPct)) return 'Unavailable';
    if (pcPct === 0) return '0.0000%';
    if (pcPct < 0.0001) return `${pcPct.toExponential(2)}%`;
    return `${pcPct.toFixed(4)}%`;
  };

  const primaryPcPct =
    conjunction.collision_probability ?? conjunction.factors?.collision_probability ?? null;

  const benchmarks = conjunction.factors?.advanced_benchmarks;
  const factors = conjunction.factors;

  const factorRows = [
    {
      label: 'Miss Distance Envelope',
      metric:
        factors?.miss_distance_factor?.value_km !== undefined
          ? `${factors.miss_distance_factor.value_km.toFixed(2)} km`
          : `${conjunction.miss_distance_km.toFixed(2)} km`,
      score: factors?.miss_distance_factor?.score,
      weight: factors?.miss_distance_factor?.weight,
      detail: factors?.miss_distance_factor?.description,
    },
    {
      label: 'Relative Encounter Speed',
      metric:
        factors?.relative_velocity_factor?.value_km_s !== undefined
          ? `${factors.relative_velocity_factor.value_km_s.toFixed(2)} km/s`
          : `${conjunction.relative_velocity_km_s.toFixed(2)} km/s`,
      score: factors?.relative_velocity_factor?.score,
      weight: factors?.relative_velocity_factor?.weight,
      detail: factors?.relative_velocity_factor?.description,
    },
    {
      label: 'Approach Geometry',
      metric:
        (factors?.approach_geometry_factor?.angle_deg ?? conjunction.approach_angle_deg) !== undefined
          ? `${(factors?.approach_geometry_factor?.angle_deg ?? conjunction.approach_angle_deg)!.toFixed(1)}°`
          : 'Unavailable',
      score: factors?.approach_geometry_factor?.score,
      weight: factors?.approach_geometry_factor?.weight,
      detail: factors?.approach_geometry_factor?.description,
    },
    {
      label: 'Combined Body Envelope',
      metric:
        (factors?.object_size_factor?.size_m ?? conjunction.combined_size_m) !== undefined
          ? `${(factors?.object_size_factor?.size_m ?? conjunction.combined_size_m)!.toFixed(1)} m`
          : 'Unavailable',
      score: factors?.object_size_factor?.score,
      weight: factors?.object_size_factor?.weight,
      detail: factors?.object_size_factor?.description,
    },
    {
      label: 'Time to Closest Approach',
      metric:
        factors?.time_to_tca_factor?.hours_to_tca !== undefined
          ? `${factors.time_to_tca_factor.hours_to_tca.toFixed(1)} hrs`
          : formatCountdownToUtc(conjunction.tca),
      score: factors?.time_to_tca_factor?.score,
      weight: factors?.time_to_tca_factor?.weight,
      detail: factors?.time_to_tca_factor?.description,
    },
  ];

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="conjunction-details-title"
      maxWidthClass="max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/35 text-red-300 shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2
                id="conjunction-details-title"
                className="text-base sm:text-lg font-semibold text-slate-100 truncate"
              >
                {conjunction.object_a?.name || `NORAD #${conjunction.object_a_id}`} vs{' '}
                {conjunction.object_b?.name || `NORAD #${conjunction.object_b_id}`}
              </h2>
              <RiskBadge level={conjunction.risk_level} score={conjunction.risk_score} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-400 flex-wrap tabular-nums">
              <span>Event #{conjunction.id}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                TCA {formatUtcDateTime(conjunction.tca)} ({formatCountdownToUtc(conjunction.tca)})
              </span>
              <span>Status {conjunction.status}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close conjunction dossier"
          className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto p-5 space-y-5 flex-1">
        {/* Encounter Pair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-space-950 border border-space-800 rounded-lg p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 mb-1">
              Primary Object (Protected Asset)
            </div>
            <div className="text-sm font-semibold text-slate-100">
              {conjunction.object_a?.name || 'Unknown Primary'}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1 flex flex-wrap gap-3 tabular-nums">
              <span>NORAD #{conjunction.object_a?.norad_id ?? conjunction.object_a_id}</span>
              <span>Type {conjunction.object_a?.object_type || 'UNKNOWN'}</span>
              {conjunction.object_a?.perigee_km !== undefined &&
                conjunction.object_a?.apogee_km !== undefined && (
                  <span>
                    Orbit {conjunction.object_a.perigee_km.toFixed(0)} ×{' '}
                    {conjunction.object_a.apogee_km.toFixed(0)} km
                  </span>
                )}
            </div>
          </div>

          <div className="bg-space-950 border border-space-800 rounded-lg p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
              Secondary Object (Intruder / Chaser)
            </div>
            <div className="text-sm font-semibold text-slate-100">
              {conjunction.object_b?.name || 'Unknown Secondary'}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1 flex flex-wrap gap-3 tabular-nums">
              <span>NORAD #{conjunction.object_b?.norad_id ?? conjunction.object_b_id}</span>
              <span>Type {conjunction.object_b?.object_type || 'UNKNOWN'}</span>
              {conjunction.object_b?.perigee_km !== undefined &&
                conjunction.object_b?.apogee_km !== undefined && (
                  <span>
                    Orbit {conjunction.object_b.perigee_km.toFixed(0)} ×{' '}
                    {conjunction.object_b.apogee_km.toFixed(0)} km
                  </span>
                )}
            </div>
          </div>
        </div>

        {/* Core Encounter Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-space-950 border border-space-800 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">Miss Distance</div>
            <div className="text-base font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
              {conjunction.miss_distance_km.toFixed(3)} km
            </div>
          </div>
          <div className="bg-space-950 border border-space-800 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">Relative Velocity</div>
            <div className="text-base font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
              {conjunction.relative_velocity_km_s.toFixed(2)} km/s
            </div>
          </div>
          <div className="bg-space-950 border border-space-800 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">Collision Probability (Pc)</div>
            <div className="text-base font-mono font-semibold text-red-300 mt-0.5 tabular-nums">
              {formatPcPct(primaryPcPct)}
            </div>
          </div>
          <div className="bg-space-950 border border-space-800 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">Encounter Altitude</div>
            <div className="text-base font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
              {conjunction.altitude_km !== null && conjunction.altitude_km !== undefined
                ? `${conjunction.altitude_km.toFixed(1)} km`
                : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Probability Benchmark Suite (strictly from backend when computed) */}
        <section aria-labelledby="pc-benchmark-heading">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3
              id="pc-benchmark-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              Collision Probability (Pc) & B-Plane Telemetry
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {conjunction.probability_method ||
                factors?.probability_methodology ||
                'Foster-2D Encounter Screening'}
            </span>
          </div>

          {benchmarks ? (
            <div className="bg-space-950 border border-space-800 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">Foster 2D Analytic</div>
                  <div className="font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                    {formatPcPct(benchmarks.foster_2d_pc_pct)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Akella-Alfriend</div>
                  <div className="font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                    {formatPcPct(benchmarks.akella_alfriend_pc_pct)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Alfano Max Upper Bound</div>
                  <div className="font-mono font-semibold text-amber-300 mt-0.5 tabular-nums">
                    {formatPcPct(benchmarks.alfano_max_pc_pct)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">
                    Monte Carlo ({benchmarks.monte_carlo_iterations.toLocaleString()} runs)
                  </div>
                  <div className="font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                    {formatPcPct(benchmarks.monte_carlo_pc_pct)}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-space-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">B-Plane B·T / B·R</div>
                  <div className="font-mono text-slate-200 tabular-nums mt-0.5">
                    {benchmarks.b_plane.b_dot_t_m.toFixed(0)} m / {benchmarks.b_plane.b_dot_r_m.toFixed(0)} m
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">1-Sigma Covariance (R/T/N)</div>
                  <div className="font-mono text-slate-200 tabular-nums mt-0.5">
                    {benchmarks.b_plane.sigma_radial_m.toFixed(0)} /{' '}
                    {benchmarks.b_plane.sigma_intrack_m.toFixed(0)} /{' '}
                    {benchmarks.b_plane.sigma_crosstrack_m.toFixed(0)} m
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Impact Energy</div>
                  <div className="font-mono text-slate-200 tabular-nums mt-0.5">
                    {benchmarks.kinetic_energy_mj.toFixed(2)} MJ
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">TNT Yield Equivalent</div>
                  <div className="font-mono text-slate-200 tabular-nums mt-0.5">
                    {benchmarks.tnt_equivalent_kg.toFixed(2)} kg TNT
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-space-950 border border-space-800 rounded-lg p-3.5 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-2">
              <span>
                Primary Foster-2D Pc: <strong className="font-mono text-slate-200 tabular-nums">{formatPcPct(primaryPcPct)}</strong>
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Extended multi-model covariance benchmarks not attached to this encounter record.
              </span>
            </div>
          )}
        </section>

        {/* Risk Scoring Breakdown */}
        <section aria-labelledby="risk-factors-heading">
          <h3
            id="risk-factors-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2"
          >
            Composite Risk Factor Breakdown (Score {conjunction.risk_score.toFixed(1)} / 100)
          </h3>
          <div className="bg-space-950 border border-space-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <caption className="sr-only">
                Weighted risk factors contributing to conjunction risk score
              </caption>
              <thead className="bg-space-900 border-b border-space-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-3.5 py-2">Factor</th>
                  <th scope="col" className="px-3.5 py-2">Measured Value</th>
                  <th scope="col" className="px-3.5 py-2 text-right">Sub-Score</th>
                  <th scope="col" className="px-3.5 py-2 text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-800/80">
                {factorRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-3.5 py-2 font-medium text-slate-200">
                      <div>{row.label}</div>
                      {row.detail && (
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                          {row.detail}
                        </div>
                      )}
                    </th>
                    <td className="px-3.5 py-2 font-mono text-slate-200 tabular-nums">
                      {row.metric}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-right text-slate-200 tabular-nums">
                      {row.score !== undefined ? `${row.score.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-right text-slate-400 tabular-nums">
                      {row.weight !== undefined ? `${(row.weight * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Action Workflows */}
        <section aria-label="Encounter action controls" className="pt-2 border-t border-space-800">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenCAM && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCAM(conjunction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold text-xs transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                Plan Avoidance Maneuver (CAM)
              </button>
            )}
            {onOpenCDM && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCDM(conjunction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-slate-100 font-medium text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                CCSDS CDM & Dispatch
              </button>
            )}
            {onOpenBreakup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBreakup(conjunction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-slate-100 font-medium text-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Breakup Simulation
              </button>
            )}
            {onOpenReplay && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReplay(conjunction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-slate-100 font-medium text-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                TCA Encounter Replay
              </button>
            )}
            {onNavigateTo3D && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTo3D(conjunction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-space-950 hover:bg-space-800 border border-space-700 text-slate-200 font-medium text-xs transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                Focus 3D Viewport
              </button>
            )}
            {onNavigateTo2D && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTo2D(conjunction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-space-950 hover:bg-space-800 border border-space-700 text-slate-200 font-medium text-xs transition-colors"
              >
                <MapIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                Focus 2D Ground Track
              </button>
            )}
          </div>
        </section>

        <EvidenceFooter
          evidence={{
            data_state: conjunction.object_a?.source ? 'LIVE' : 'CALCULATED',
            source:
              conjunction.object_a?.source ||
              conjunction.object_b?.source ||
              'Orbital Screening Engine (SGP4)',
            retrieved_at: conjunction.calculated_at || conjunction.created_at,
            tle_epoch: conjunction.object_a?.tle_epoch,
            calculation_method:
              conjunction.probability_method ||
              factors?.methodology ||
              'SGP4 Trajectory Propagation + Foster-2D Pc',
            model_version: 'OrbitGuard-Screen',
            confidence: primaryPcPct !== null ? 'HIGH' : 'MEDIUM',
          }}
        />
      </div>
    </ModalDialog>
  );
};
