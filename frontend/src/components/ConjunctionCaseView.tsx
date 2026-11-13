import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowLeft,
  Layers,
  Globe,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  X,
} from 'lucide-react';
import { Conjunction } from '../types';
import { api } from '../services/api';
import { MissionTimeline } from './MissionTimeline';
import { WorkflowStepper, WorkflowStageKey } from './WorkflowStepper';
import { formatUtcDateTime } from '../utils/utcTime';

interface ConjunctionCaseViewProps {
  conjunctionId: number | null;
  conjunctions?: Conjunction[];
  onSelectCaseConjunction?: (conjunctionId: number) => void;
  onBack: () => void;
  onOpen3D?: (conjunctionId: number) => void;
  onOpenCAM?: (conjunctionId: number) => void;
}

const formatMetricPct = (val: number | null | undefined, digits: number = 5): string => {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return `${val.toFixed(digits)}%`;
};

const formatKm = (val: number | null | undefined, digits: number = 1): string => {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return `${val.toFixed(digits)} km`;
};

export const ConjunctionCaseView: React.FC<ConjunctionCaseViewProps> = ({
  conjunctionId,
  conjunctions = [],
  onSelectCaseConjunction,
  onBack,
  onOpen3D,
  onOpenCAM,
}) => {
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const loadCase = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);
      const data = await api.getCaseByConjunction(id);
      setCaseData(data);
    } catch (e: any) {
      setCaseData(null);
      setError(e?.message || 'Unable to load conjunction case payload');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (conjunctionId !== null && conjunctionId !== undefined) {
      loadCase(conjunctionId);
    } else {
      setCaseData(null);
      setError(null);
      setLoading(false);
    }
  }, [conjunctionId, loadCase]);

  const handleStateTransition = async (targetState: string, rationale: string) => {
    if (!caseData?.case_id) return;
    try {
      setIsTransitioning(true);
      setActionError(null);
      await api.transitionCase(caseData.case_id, {
        target_state: targetState,
        operator: 'FLIGHT_DYNAMICS_OFFICER',
        rationale,
      });
      if (conjunctionId !== null) {
        await loadCase(conjunctionId);
      }
    } catch (e: any) {
      setActionError(e?.message || `Failed to transition case to ${targetState}`);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleExportJSON = () => {
    if (!caseData) return;
    const blob = new Blob([JSON.stringify(caseData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CASE_AUDIT_${caseData.case_number || conjunctionId || 'EXPORT'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (conjunctionId === null || conjunctionId === undefined) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto font-mono space-y-4 text-slate-200">
        <div className="p-6 bg-space-900 border border-space-700 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Layers className="w-4 h-4 text-accent-400" aria-hidden="true" />
            <span>No Conjunction Case Selected</span>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            No active conjunction encounters are available in the queue to open a Flight Director case dossier.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-space-800 hover:bg-space-700 border border-space-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Return to Conjunctions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-slate-300 space-y-2">
        <Activity className="w-6 h-6 animate-spin mx-auto text-accent-400" aria-hidden="true" />
        <div>Loading Conjunction Case #{conjunctionId} and Telemetry Audit Trail...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-4 sm:p-6 font-mono max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-space-900 hover:bg-space-800 border border-space-700 text-xs text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Conjunctions</span>
          </button>

          {conjunctions.length > 0 && onSelectCaseConjunction && (
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="case-error-switcher" className="text-slate-400">
                Switch Case:
              </label>
              <select
                id="case-error-switcher"
                value={conjunctionId}
                onChange={(e) => onSelectCaseConjunction(Number(e.target.value))}
                className="bg-space-950 border border-space-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs"
              >
                {conjunctions.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.object_a?.name || c.object_a_id} / {c.object_b?.name || c.object_b_id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          role="alert"
          className="p-4 bg-red-500/10 border border-red-500/35 rounded-lg text-red-200 text-xs flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>{error || 'Conjunction case not found.'}</span>
          </span>
          <button
            type="button"
            onClick={() => loadCase(conjunctionId)}
            className="px-2.5 py-1 rounded border border-red-500/40 bg-space-950 hover:bg-space-800 text-slate-200 shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const prim = caseData.primary_asset || {};
  const sec = caseData.secondary_threat || {};
  const benchmarks = caseData.risk_benchmarks || {};
  const camPlan = caseData.cam_plan || {};

  const stage: WorkflowStageKey =
    caseData.state === 'VERIFIED' || caseData.is_verified
      ? 'VERIFY'
      : caseData.state === 'APPROVED' || caseData.state === 'REJECTED'
      ? 'DECIDE'
      : 'ASSESS';

  const priorityBadgeClass =
    caseData.priority === 'CRITICAL'
      ? 'bg-red-500/15 text-red-300 border-red-500/40'
      : caseData.priority === 'ELEVATED'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35';

  return (
    <div className="max-w-[1600px] mx-auto font-mono text-slate-200 space-y-4">
      <WorkflowStepper currentStage={stage} />

      {/* Top Case Bar */}
      <div className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Conjunctions"
            className="p-2 rounded-md bg-space-950 hover:bg-space-800 text-slate-300 hover:text-slate-100 transition-colors border border-space-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide tabular-nums">
                CASE {caseData.case_number}
              </h1>
              <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${priorityBadgeClass}`}>
                {caseData.priority}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-500/15 text-sky-300 border border-sky-500/35">
                STATE: {caseData.state}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 tabular-nums">
              Encounter #{caseData.conjunction_id} • Operator: {caseData.assigned_operator || 'UNASSIGNED'} • Updated:{' '}
              {formatUtcDateTime(caseData.updated_at_utc)} UTC
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
          {conjunctions.length > 0 && onSelectCaseConjunction && (
            <div className="flex items-center gap-1.5 mr-1">
              <label htmlFor="case-dossier-switcher" className="text-[11px] text-slate-400">
                Encounter:
              </label>
              <select
                id="case-dossier-switcher"
                value={conjunctionId}
                onChange={(e) => onSelectCaseConjunction(Number(e.target.value))}
                className="bg-space-950 border border-space-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 max-w-[240px]"
              >
                {conjunctions.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} {c.object_a?.name || `Obj ${c.object_a_id}`} / {c.object_b?.name || `Obj ${c.object_b_id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onOpen3D && (
            <button
              type="button"
              onClick={() => onOpen3D(conjunctionId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-space-950 hover:bg-space-800 text-slate-200 border border-space-700 rounded-md text-xs font-semibold transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
              <span>3D Focus</span>
            </button>
          )}
          {onOpenCAM && (
            <button
              type="button"
              onClick={() => onOpenCAM(conjunctionId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-space-950 rounded-md text-xs font-semibold transition-colors"
            >
              <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
              <span>CAM Planner</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-space-950 hover:bg-space-800 text-slate-200 rounded-md text-xs font-semibold transition-colors border border-space-700"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3 bg-red-500/10 border border-red-500/35 rounded-lg text-xs text-red-200 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="p-1 rounded hover:bg-space-800 text-slate-300"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Main Dossier Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Primary & Secondary Object Specifications */}
          <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-4">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-space-800">
              <Layers className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Encounter Asset Specifications</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-space-950 p-4 rounded-lg border border-space-800 space-y-2">
                <div className="text-accent-400 font-semibold uppercase flex items-center justify-between">
                  <span>Primary Asset (Object A)</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">NORAD #{prim.norad_id ?? '—'}</span>
                </div>
                <div className="text-sm font-semibold text-slate-100">{prim.name || 'Unavailable'}</div>
                <dl className="space-y-1 text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Type</dt>
                    <dd className="text-slate-100 font-medium">{prim.type || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Perigee / Apogee</dt>
                    <dd className="text-slate-100 font-medium tabular-nums">
                      {formatKm(prim.perigee_km, 1)} / {formatKm(prim.apogee_km, 1)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Inclination</dt>
                    <dd className="text-slate-100 font-medium tabular-nums">
                      {prim.inclination_deg != null ? `${prim.inclination_deg.toFixed(2)}°` : '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-space-950 p-4 rounded-lg border border-space-800 space-y-2">
                <div className="text-red-400 font-semibold uppercase flex items-center justify-between">
                  <span>Secondary Object (Object B)</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">NORAD #{sec.norad_id ?? '—'}</span>
                </div>
                <div className="text-sm font-semibold text-slate-100">{sec.name || 'Unavailable'}</div>
                <dl className="space-y-1 text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Type</dt>
                    <dd className="text-slate-100 font-medium">{sec.type || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Perigee / Apogee</dt>
                    <dd className="text-slate-100 font-medium tabular-nums">
                      {formatKm(sec.perigee_km, 1)} / {formatKm(sec.apogee_km, 1)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Inclination</dt>
                    <dd className="text-slate-100 font-medium tabular-nums">
                      {sec.inclination_deg != null ? `${sec.inclination_deg.toFixed(2)}°` : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* Encounter Metrics & Probability Benchmarks */}
          <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-4">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-space-800">
              <Activity className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Astrodynamic Encounter &amp; Probability Benchmarks</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Miss Distance</div>
                <div className="text-base font-semibold text-slate-100 mt-1 tabular-nums">
                  {formatKm(caseData.miss_distance_km, 3)}
                </div>
                <div className="text-[10px] text-slate-400">Euclidean Norm</div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Relative Velocity</div>
                <div className="text-base font-semibold text-accent-400 mt-1 tabular-nums">
                  {caseData.relative_velocity_km_s != null
                    ? `${caseData.relative_velocity_km_s.toFixed(2)} km/s`
                    : '—'}
                </div>
                <div className="text-[10px] text-slate-400">Closing Speed</div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Foster-2D Pc</div>
                <div className="text-base font-semibold text-red-300 mt-1 tabular-nums">
                  {formatMetricPct(benchmarks.foster_2d_pc_pct)}
                </div>
                <div className="text-[10px] text-slate-400">B-Plane Integral</div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Composite Risk</div>
                <div className="text-base font-semibold text-slate-100 mt-1 tabular-nums">
                  {caseData.risk_score != null ? `${caseData.risk_score} / 100` : '—'}
                </div>
                <div className="text-[10px] text-slate-400">{caseData.risk_level || 'Unrated'}</div>
              </div>
            </div>

            <div className="bg-space-950 rounded-md p-3 border border-space-800 text-xs space-y-2">
              <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider">
                Probability Estimator Cross-Check
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Foster-2D</span>
                  <strong className="text-slate-100 tabular-nums">{formatMetricPct(benchmarks.foster_2d_pc_pct)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Akella-Alfriend</span>
                  <strong className="text-slate-100 tabular-nums">{formatMetricPct(benchmarks.akella_alfriend_pc_pct)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Alfano Max-Pc</span>
                  <strong className="text-slate-100 tabular-nums">{formatMetricPct(benchmarks.alfano_max_pc_pct)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Monte Carlo (10k)</span>
                  <strong className="text-slate-100 tabular-nums">{formatMetricPct(benchmarks.monte_carlo_pc_pct)}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* CAM Candidate Comparison Matrix */}
          <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-space-800 flex-wrap gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>CAM Candidate Evaluation Matrix</span>
              </h2>
              <span className="text-[11px] text-slate-400">Impulsive Gauss Burn Solutions</span>
            </div>

            {camPlan?.strategies && camPlan.strategies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <caption className="sr-only">
                    Candidate collision avoidance maneuver burn options and projected miss distances
                  </caption>
                  <thead className="bg-space-950 text-slate-400 text-[11px] border-b border-space-700">
                    <tr>
                      <th scope="col" className="p-2.5 font-semibold">Strategy</th>
                      <th scope="col" className="p-2.5 font-semibold">Total Delta-V</th>
                      <th scope="col" className="p-2.5 font-semibold">Projected Miss</th>
                      <th scope="col" className="p-2.5 font-semibold">Fuel (N2H4)</th>
                      <th scope="col" className="p-2.5 font-semibold">Risk Reduction</th>
                      <th scope="col" className="p-2.5 font-semibold">Secondary Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-800">
                    {camPlan.strategies.map((st: any) => (
                      <tr key={st.strategy_type} className="hover:bg-space-800/40">
                        <td className="p-2.5 font-semibold text-slate-100">{st.title}</td>
                        <td className="p-2.5 text-accent-400 font-semibold tabular-nums">
                          {st.total_delta_v_m_s != null ? `${st.total_delta_v_m_s.toFixed(3)} m/s` : '—'}
                        </td>
                        <td className="p-2.5 text-emerald-300 font-semibold tabular-nums">
                          {st.projected_miss_distance_km != null ? `${st.projected_miss_distance_km.toFixed(2)} km` : '—'}
                        </td>
                        <td className="p-2.5 text-amber-300 tabular-nums">
                          {st.fuel_cost_kg != null ? `${st.fuel_cost_kg.toFixed(3)} kg` : '—'}
                        </td>
                        <td className="p-2.5 text-emerald-300 tabular-nums">
                          {st.risk_reduction_percent != null ? `${st.risk_reduction_percent.toFixed(1)}%` : '—'}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${
                              st.secondary_conjunctions_safe
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                                : 'bg-red-500/15 text-red-300 border-red-500/40'
                            }`}
                          >
                            {st.secondary_conjunctions_safe ? 'CLEAR' : 'ELEVATED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-space-950 border border-space-800 rounded-md text-xs text-slate-400">
                No CAM strategies returned for this case yet. Open CAM Planner to compute candidate burns.
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-4">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-space-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Flight Director Authorization</span>
            </h2>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleStateTransition('APPROVED', 'Operator approved minimum-fuel CAM option')
                }
                disabled={isTransitioning || caseData.state === 'APPROVED'}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 disabled:opacity-45 text-emerald-200 font-semibold rounded-md text-xs transition-colors"
              >
                <ThumbsUp className="w-4 h-4" aria-hidden="true" />
                <span>{caseData.state === 'APPROVED' ? 'Maneuver Approved' : 'Approve Maneuver'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStateTransition('REJECTED', 'Operator rejected CAM under active tracking')
                }
                disabled={isTransitioning || caseData.state === 'REJECTED'}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 disabled:opacity-45 text-red-200 font-semibold rounded-md text-xs transition-colors"
              >
                <ThumbsDown className="w-4 h-4" aria-hidden="true" />
                <span>{caseData.state === 'REJECTED' ? 'Maneuver Rejected' : 'Reject Maneuver'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStateTransition('VERIFIED', 'Post-CAM orbital clearance screening completed')
                }
                disabled={isTransitioning || caseData.state === 'VERIFIED'}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 disabled:opacity-45 text-sky-200 font-semibold rounded-md text-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>{caseData.state === 'VERIFIED' ? 'Post-CAM Verified' : 'Mark Post-CAM Verified'}</span>
              </button>
            </div>
          </section>

          <MissionTimeline events={caseData.timeline || []} caseNumber={caseData.case_number} />
        </div>
      </div>
    </div>
  );
};
