import React, { useState, useEffect, useCallback } from 'react';
import {
  Conjunction,
  CAMPlanResponse,
  CAMStrategy,
  CAMSimulateResponse,
} from '../types';
import { api } from '../services/api';
import {
  X,
  Navigation,
  Fuel,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Download,
  RefreshCw,
  CheckCircle2,
  Edit3,
  Globe,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { formatUtcDateTime } from '../utils/utcTime';

interface CAMPlannerModalProps {
  conjunction: Conjunction;
  isOpen?: boolean;
  onClose: () => void;
  onSelectStrategyFor3D?: (strategy: CAMStrategy) => void;
}

interface PostCAMVerificationPayload {
  conjunction_id: number;
  before_cam?: {
    miss_distance_km: number;
    collision_probability: number;
    risk_score: number;
  };
  after_cam?: {
    miss_distance_km: number;
    collision_probability: number;
    risk_score: number;
    fuel_cost_kg?: number;
    secondary_conjunctions_safe?: boolean;
  };
  comparison?: {
    miss_distance_gain_km: number;
    pc_reduction_percent: number;
    risk_status: string;
  };
  error?: string;
}

export const CAMPlannerModal: React.FC<CAMPlannerModalProps> = ({
  conjunction,
  isOpen = true,
  onClose,
  onSelectStrategyFor3D,
}) => {
  const [plan, setPlan] = useState<CAMPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<CAMStrategy | null>(null);
  const [activeTab, setActiveTab] = useState<'strategies' | 'custom'>('strategies');

  // Post-CAM physical verification
  const [verification, setVerification] = useState<PostCAMVerificationPayload | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Session draft review status
  const [draftStatus, setDraftStatus] = useState<'PENDING' | 'APPROVED' | 'OVERRIDDEN'>('PENDING');
  const [showOverridePanel, setShowOverridePanel] = useState<boolean>(false);
  const [overrideNotes, setOverrideNotes] = useState<string>('');

  // Custom RTN maneuver simulator inputs
  const [deltaVR, setDeltaVR] = useState<number>(0);
  const [deltaVT, setDeltaVT] = useState<number>(0.5);
  const [deltaVW, setDeltaVW] = useState<number>(0);
  const [leadTimeHours, setLeadTimeHours] = useState<number>(12.0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<CAMSimulateResponse | null>(null);

  const formatPcPct = (pcPct?: number | null): string => {
    if (pcPct === null || pcPct === undefined || Number.isNaN(pcPct)) return 'Unavailable';
    if (pcPct === 0) return '0.0000%';
    if (pcPct < 0.0001) return `${pcPct.toExponential(2)}%`;
    return `${pcPct.toFixed(4)}%`;
  };

  const verifyStrategy = useCallback(
    async (strategy: CAMStrategy) => {
      try {
        setVerifying(true);
        setVerificationError(null);
        setVerification(null);
        const res = await api.verifyPostCAM({
          conjunction_id: conjunction.id,
          delta_v_m_s: strategy.total_delta_v_m_s,
          strategy_type: strategy.strategy_type,
        });
        if (res?.error) {
          setVerificationError(res.error);
          return;
        }
        setVerification(res);
      } catch (err: any) {
        setVerificationError(err?.message || 'Post-CAM trajectory verification failed.');
      } finally {
        setVerifying(false);
      }
    },
    [conjunction.id]
  );

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCAMPlan(conjunction.id);
      setPlan(data);
      const initial = data.strategies?.[0] || null;
      setSelectedStrategy(initial);
      if (initial) {
        verifyStrategy(initial);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to compute avoidance maneuver strategies.');
    } finally {
      setLoading(false);
    }
  }, [conjunction.id, verifyStrategy]);

  useEffect(() => {
    if (isOpen) {
      loadPlan();
    }
  }, [isOpen, loadPlan]);

  const handleSelectStrategy = (strategy: CAMStrategy) => {
    setSelectedStrategy(strategy);
    setDraftStatus('PENDING');
    verifyStrategy(strategy);
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      setSimError(null);
      const result = await api.simulateCAM({
        conjunction_id: conjunction.id,
        delta_v_radial_m_s: deltaVR,
        delta_v_in_track_m_s: deltaVT,
        delta_v_cross_track_m_s: deltaVW,
        lead_time_hours: leadTimeHours,
      });
      setSimResult(result);
    } catch (err: any) {
      setSimError(err?.message || 'Custom RTN burn simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportPlanJson = () => {
    if (!selectedStrategy) return;
    const payload = {
      conjunction_id: conjunction.id,
      primary_object: plan?.primary_object_name || conjunction.object_a?.name,
      secondary_object: plan?.secondary_object_name || conjunction.object_b?.name,
      tca_utc: conjunction.tca,
      session_review_status: draftStatus,
      override_rationale: overrideNotes || null,
      selected_strategy: selectedStrategy,
      post_cam_verification: verification,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cam_plan_conjunction_${conjunction.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const totalCustomDv = Math.sqrt(deltaVR * deltaVR + deltaVT * deltaVT + deltaVW * deltaVW);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="cam-planner-title"
      maxWidthClass="max-w-5xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/35 text-sky-400 shrink-0">
            <Navigation className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="cam-planner-title" className="text-base sm:text-lg font-semibold text-slate-100">
                Collision Avoidance Maneuver (CAM) Planner
              </h2>
              <span className="px-2 py-0.5 rounded bg-space-900 border border-space-700 text-[11px] font-mono text-slate-300">
                Event #{conjunction.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {conjunction.object_a?.name || `NORAD #${conjunction.object_a_id}`} vs{' '}
              {conjunction.object_b?.name || `NORAD #${conjunction.object_b_id}`} • TCA{' '}
              <span className="font-mono text-slate-300 tabular-nums">
                {formatUtcDateTime(conjunction.tca)}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close CAM planner dialog"
          className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Tabs & Actions */}
      <div className="border-b border-space-800 bg-space-950/70 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div role="tablist" aria-label="CAM planner views" className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'strategies'}
            onClick={() => setActiveTab('strategies')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'strategies'
                ? 'bg-sky-500 text-space-950 font-semibold'
                : 'bg-space-900 border border-space-800 text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Computed Burn Strategies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'custom'}
            onClick={() => setActiveTab('custom')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'custom'
                ? 'bg-sky-500 text-space-950 font-semibold'
                : 'bg-space-900 border border-space-800 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            Custom RTN Burn Builder
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedStrategy && onSelectStrategyFor3D && (
            <button
              type="button"
              onClick={() => onSelectStrategyFor3D(selectedStrategy)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-xs text-slate-200 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              Plot in 3D
            </button>
          )}
          <button
            type="button"
            onClick={handleExportPlanJson}
            disabled={!selectedStrategy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-xs text-slate-200 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            Export JSON Plan
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto p-5 flex-1 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono">
            Propagating perturbation strategies against current ephemeris...
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/35 text-xs text-red-200 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadPlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-100 font-medium shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : activeTab === 'strategies' ? (
          <div className="space-y-4">
            {/* Strategy Selection Cards */}
            {plan && plan.strategies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {plan.strategies.map((strat, index) => {
                  const isSelected = selectedStrategy?.strategy_type === strat.strategy_type;
                  return (
                    <button
                      type="button"
                      key={strat.strategy_type}
                      onClick={() => handleSelectStrategy(strat)}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-400'
                          : 'bg-space-950 border-space-800 hover:border-space-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono font-semibold text-sky-400">
                          {strat.strategy_type}
                        </span>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/35 text-emerald-300 text-[10px] font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-100">{strat.title}</div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {strat.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-space-800 text-[11px] font-mono tabular-nums">
                        <div>
                          <span className="text-slate-400 block">Total Delta-V</span>
                          <span className="text-slate-100 font-semibold">
                            {strat.total_delta_v_m_s.toFixed(3)} m/s
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Projected Miss</span>
                          <span className="text-emerald-300 font-semibold">
                            {strat.projected_miss_distance_km.toFixed(2)} km
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Propellant</span>
                          <span className="text-slate-200">{strat.fuel_cost_kg.toFixed(3)} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Secondary Check</span>
                          <span
                            className={
                              strat.secondary_conjunctions_safe
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                            }
                          >
                            {strat.secondary_conjunctions_safe
                              ? 'Clear'
                              : `${strat.secondary_conjunctions_count} close`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-space-950 border border-space-800 text-xs text-slate-400">
                No automated avoidance burn candidates returned for this conjunction geometry. Use
                the Custom RTN Burn Builder tab to evaluate a manual burn.
              </div>
            )}

            {/* Selected Strategy Detail & Post-CAM Verification */}
            {selectedStrategy && (
              <div className="bg-space-950 border border-space-800 rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap border-b border-space-800 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      {selectedStrategy.title} ({selectedStrategy.strategy_type})
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                      Ignition {formatUtcDateTime(selectedStrategy.burn_time)} • Lead{' '}
                      {selectedStrategy.lead_time_hours.toFixed(1)} hrs before TCA
                    </div>
                  </div>

                  {/* Session Draft Review Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded bg-space-900 border border-space-700 text-[11px] font-mono text-slate-300">
                      Draft: {draftStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftStatus('APPROVED');
                        setShowOverridePanel(false);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Approve Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOverridePanel((prev) => !prev)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-amber-300 text-xs font-medium transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      Override Rationale
                    </button>
                  </div>
                </div>

                {showOverridePanel && (
                  <div className="p-3 rounded-lg bg-space-900 border border-amber-500/35 space-y-2.5">
                    <label
                      htmlFor="cam-override-notes"
                      className="block text-xs font-medium text-amber-200"
                    >
                      Operator Override Rationale (saved to exported plan JSON)
                    </label>
                    <textarea
                      id="cam-override-notes"
                      rows={2}
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      placeholder="Enter mission constraints, station visibility window, or thruster limits..."
                      className="w-full rounded bg-space-950 border border-space-700 px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowOverridePanel(false)}
                        className="px-3 py-1 rounded bg-space-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftStatus('OVERRIDDEN');
                          setShowOverridePanel(false);
                        }}
                        className="px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium"
                      >
                        Record Override
                      </button>
                    </div>
                  </div>
                )}

                {/* RTN Vector & Post-Burn Orbital Elements */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                  <div className="p-2.5 rounded bg-space-900 border border-space-800">
                    <div className="text-[11px] text-slate-400">RTN Burn Vector (m/s)</div>
                    <div className="text-slate-100 mt-1">
                      R:{selectedStrategy.delta_v_vector.delta_v_r.toFixed(3)} T:
                      {selectedStrategy.delta_v_vector.delta_v_t.toFixed(3)} N:
                      {selectedStrategy.delta_v_vector.delta_v_w.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-space-900 border border-space-800">
                    <div className="text-[11px] text-slate-400">Clearance Gain</div>
                    <div className="text-emerald-300 mt-1 font-semibold">
                      +{selectedStrategy.miss_distance_gain_km.toFixed(2)} km
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-space-900 border border-space-800">
                    <div className="text-[11px] text-slate-400">Post-Burn Orbit</div>
                    <div className="text-slate-100 mt-1">
                      {selectedStrategy.new_perigee_km.toFixed(1)} ×{' '}
                      {selectedStrategy.new_apogee_km.toFixed(1)} km
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-space-900 border border-space-800">
                    <div className="text-[11px] text-slate-400">Propellant / Isp</div>
                    <div className="text-slate-100 mt-1 inline-flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {selectedStrategy.fuel_cost_kg.toFixed(3)} kg ({selectedStrategy.isp_seconds}s)
                    </div>
                  </div>
                </div>

                {/* Before vs After Physical Verification */}
                <div className="pt-3 border-t border-space-800">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xs font-semibold text-slate-200">
                      Before vs. After Physical Trajectory Verification
                    </h3>
                    {verifying && (
                      <span className="text-[11px] font-mono text-sky-400">
                        Running SGP4 re-screening...
                      </span>
                    )}
                  </div>

                  {verificationError ? (
                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/35 text-xs text-amber-200 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        Verification Unavailable: {verificationError}
                      </span>
                      <button
                        type="button"
                        onClick={() => verifyStrategy(selectedStrategy)}
                        className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-100 text-[11px] font-medium shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  ) : verification ? (
                    <div className="overflow-x-auto rounded border border-space-800">
                      <table className="w-full text-xs text-left font-mono tabular-nums">
                        <caption className="sr-only">
                          Before and after maneuver conjunction metrics from SGP4 verification
                        </caption>
                        <thead className="bg-space-900 border-b border-space-800 text-[11px] text-slate-400">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-sans">Metric</th>
                            <th scope="col" className="px-3 py-2 text-right font-sans">Baseline</th>
                            <th scope="col" className="px-3 py-2 text-right font-sans">Post-CAM</th>
                            <th scope="col" className="px-3 py-2 text-right font-sans">Delta / Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-space-800/80">
                          <tr>
                            <th scope="row" className="px-3 py-2 font-sans font-medium text-slate-300">
                              Miss Distance
                            </th>
                            <td className="px-3 py-2 text-right text-slate-300">
                              {verification.before_cam?.miss_distance_km?.toFixed(3) ?? 'Unavailable'} km
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-300 font-semibold">
                              {verification.after_cam?.miss_distance_km?.toFixed(3) ?? 'Unavailable'} km
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-300">
                              +{verification.comparison?.miss_distance_gain_km?.toFixed(2) ?? '0.00'} km
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="px-3 py-2 font-sans font-medium text-slate-300">
                              Collision Probability (Pc)
                            </th>
                            <td className="px-3 py-2 text-right text-red-300">
                              {formatPcPct(verification.before_cam?.collision_probability)}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-300 font-semibold">
                              {formatPcPct(verification.after_cam?.collision_probability)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-300">
                              {verification.comparison?.pc_reduction_percent !== undefined
                                ? `-${verification.comparison.pc_reduction_percent.toFixed(2)}%`
                                : '—'}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="px-3 py-2 font-sans font-medium text-slate-300">
                              Risk Score
                            </th>
                            <td className="px-3 py-2 text-right text-slate-300">
                              {verification.before_cam?.risk_score?.toFixed(1) ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-300 font-semibold">
                              {verification.after_cam?.risk_score?.toFixed(1) ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-200">
                              {verification.comparison?.risk_status || 'VERIFIED'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <p className="text-[11px] text-slate-500 mt-2">
                    Operational Note: Target Pc below 1e-5 (0.001%) represents typical satellite
                    red-threshold screening acceptance. Persist final command authorization in the
                    Cases workflow.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Custom RTN Burn Builder */
          <div className="bg-space-950 border border-space-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Interactive RTN Delta-V Burn Simulator
                </h3>
                <p className="text-xs text-slate-400">
                  Test arbitrary Radial (R), Along-Track (T), and Cross-Track (W) thruster burns
                  with live SGP4 propagation.
                </p>
              </div>
              <div className="font-mono text-xs text-sky-400 tabular-nums">
                |Delta-V| = {totalCustomDv.toFixed(3)} m/s
              </div>
            </div>

            {simError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/35 text-xs text-red-200 flex items-center justify-between gap-2">
                <span>{simError}</span>
                <button
                  type="button"
                  onClick={() => setSimError(null)}
                  className="text-red-300 hover:text-white underline text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="cam-dv-r" className="text-slate-300 font-medium">
                    Radial (R)
                  </label>
                  <span className="font-mono text-slate-100 tabular-nums">
                    {deltaVR.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  id="cam-dv-r"
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={deltaVR}
                  onChange={(e) => setDeltaVR(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="cam-dv-t" className="text-slate-300 font-medium">
                    Along-Track (T)
                  </label>
                  <span className="font-mono text-slate-100 tabular-nums">
                    {deltaVT.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  id="cam-dv-t"
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={deltaVT}
                  onChange={(e) => setDeltaVT(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="cam-dv-w" className="text-slate-300 font-medium">
                    Cross-Track (W)
                  </label>
                  <span className="font-mono text-slate-100 tabular-nums">
                    {deltaVW.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  id="cam-dv-w"
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={deltaVW}
                  onChange={(e) => setDeltaVW(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-space-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <label htmlFor="cam-lead-hours" className="text-xs text-slate-300 font-medium">
                  Maneuver Lead Time (hours before TCA)
                </label>
                <input
                  id="cam-lead-hours"
                  type="number"
                  min="1"
                  max="72"
                  step="0.5"
                  value={leadTimeHours}
                  onChange={(e) => setLeadTimeHours(parseFloat(e.target.value) || 12.0)}
                  className="w-20 rounded bg-space-900 border border-space-700 px-2.5 py-1 text-xs font-mono text-slate-100 tabular-nums"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isSimulating ? 'Simulating Trajectory...' : 'Run Custom Simulation'}
              </button>
            </div>

            {simResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-space-800 text-xs font-mono tabular-nums">
                <div className="p-2.5 rounded bg-space-900 border border-space-800">
                  <div className="text-[11px] font-sans text-slate-400">Projected Miss</div>
                  <div className="text-slate-100 font-semibold mt-0.5">
                    {simResult.projected_miss_distance_km.toFixed(2)} km
                  </div>
                </div>
                <div className="p-2.5 rounded bg-space-900 border border-space-800">
                  <div className="text-[11px] font-sans text-slate-400">Clearance Gain</div>
                  <div className="text-emerald-300 font-semibold mt-0.5">
                    +{simResult.miss_distance_gain_km.toFixed(2)} km
                  </div>
                </div>
                <div className="p-2.5 rounded bg-space-900 border border-space-800">
                  <div className="text-[11px] font-sans text-slate-400">Propellant Used</div>
                  <div className="text-slate-100 font-semibold mt-0.5">
                    {simResult.fuel_cost_kg.toFixed(3)} kg
                  </div>
                </div>
                <div className="p-2.5 rounded bg-space-900 border border-space-800">
                  <div className="text-[11px] font-sans text-slate-400">Secondary Conjunctions</div>
                  <div
                    className={`font-semibold mt-0.5 ${
                      simResult.secondary_conjunctions_safe ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {simResult.secondary_conjunctions_safe
                      ? 'Clear'
                      : `${simResult.secondary_conjunctions_count} flagged`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
