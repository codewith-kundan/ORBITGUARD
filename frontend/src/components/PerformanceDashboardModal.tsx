import React, { useState, useEffect, useCallback } from 'react';
import { X, Cpu, Activity, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface PerformanceDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fmtMs = (val: number | null | undefined): string => {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return `${val.toFixed(2)} ms`;
};

export const PerformanceDashboardModal: React.FC<PerformanceDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTelemetry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPerformanceTelemetry();
      setTelemetry(data);
    } catch (e: any) {
      setTelemetry(null);
      setError(e?.message || 'Unable to load pipeline performance metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTelemetry();
    }
  }, [isOpen, loadTelemetry]);

  const hasRuns = Boolean(telemetry?.has_runs && telemetry?.current_run);
  const current = telemetry?.current_run || null;
  const previous = telemetry?.previous_run || null;
  const best = telemetry?.best_run || null;
  const runHistory: any[] = Array.isArray(telemetry?.run_history) ? telemetry.run_history : [];

  const stages = current
    ? [
      { name: '1. Upstream Catalog Ingestion', value: current.ingestion_ms },
      { name: '2. TLE Checksum & Element Parsing', value: current.parsing_checksum_ms },
      { name: '3. Vectorized SGP4 Propagation', value: current.sgp4_propagation_ms },
      { name: '4. Spatial Altitude Shell Sieve', value: current.spatial_screening_ms },
      { name: '5. Orthogonal TCA Root Refinement', value: current.tca_refinement_ms },
      { name: '6. Foster-2D Collision Probability', value: current.pc_calculation_ms },
      { name: '7. Composite Risk Scoring', value: current.risk_scoring_ms },
    ]
    : [];

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="perf-telemetry-title"
      maxWidthClass="max-w-4xl"
      className="bg-space-900 border border-space-700 rounded-xl max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl text-slate-200 font-mono"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-5 py-3.5 bg-space-950 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-space-900 border border-space-700 flex items-center justify-center text-accent-400 shrink-0" aria-hidden="true">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="perf-telemetry-title" className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                Pipeline Execution &amp; Latency Profiler
              </h2>
              <span className="px-2 py-0.5 rounded bg-space-900 border border-space-700 text-slate-300 text-[10px] font-semibold">
                {hasRuns ? 'MEASURED RUNS' : 'NO RUNS RECORDED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans truncate">
              Measured stage durations from database telemetry logs during sync and screening runs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={loadTelemetry}
            disabled={loading}
            aria-label="Refresh performance telemetry"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-slate-100 rounded-md border border-space-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-400' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Performance Profiler dialog"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs flex-1">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/35 rounded-md text-red-200 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={loadTelemetry}
              className="px-2.5 py-1 rounded bg-space-950 border border-red-500/40 hover:bg-space-800 text-slate-200"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !telemetry ? (
          <div className="p-8 text-center text-slate-400">Loading pipeline run logs...</div>
        ) : !hasRuns ? (
          <div className="p-6 bg-space-950 border border-space-800 rounded-md space-y-2 text-center">
            <Info className="w-5 h-5 text-accent-400 mx-auto" aria-hidden="true" />
            <div className="text-slate-100 font-semibold">No Recorded Pipeline Runs Yet</div>
            <p className="text-slate-400 font-sans max-w-lg mx-auto leading-relaxed">
              Run a conjunction screening pass or catalog synchronization to capture real wall-clock
              stage latencies in the telemetry database.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-space-950 p-3.5 rounded-md border border-space-700 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Latest Pipeline Run</div>
                <div className="text-xl font-semibold text-accent-400 tabular-nums">
                  {fmtMs(current?.total_pipeline_ms)}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {(current?.total_objects ?? 0).toLocaleString()} objects • {(current?.candidate_pairs ?? 0).toLocaleString()} candidate pairs
                </div>
              </div>

              <div className="bg-space-950 p-3.5 rounded-md border border-space-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Previous Run</div>
                <div className="text-xl font-semibold text-slate-100 tabular-nums">
                  {fmtMs(previous?.total_pipeline_ms)}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {(previous?.total_objects ?? 0).toLocaleString()} objects
                </div>
              </div>

              <div className="bg-space-950 p-3.5 rounded-md border border-space-800 space-y-1">
                <div className="text-[10px] text-emerald-400 font-semibold uppercase">Fastest Recorded Run</div>
                <div className="text-xl font-semibold text-emerald-300 tabular-nums">
                  {fmtMs(best?.total_pipeline_ms)}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {best?.timestamp_utc ? `${formatUtcDateTime(best.timestamp_utc, true)} UTC` : '—'}
                </div>
              </div>
            </div>

            {/* Stage Latency Breakdown */}
            <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-3">
              <div className="flex items-center justify-between border-b border-space-800 pb-2">
                <h3 className="text-xs font-semibold text-slate-100 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent-400" aria-hidden="true" />
                  <span>Subsystem Stage Latencies (Latest Run)</span>
                </h3>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  Mode: {current?.mode || '—'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <caption className="sr-only">Pipeline execution stage timing breakdown</caption>
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-space-800">
                    <tr>
                      <th scope="col" className="py-1.5 pr-3 font-semibold">Pipeline Stage</th>
                      <th scope="col" className="py-1.5 text-right font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-800/70">
                    {stages.map((st) => (
                      <tr key={st.name} className="hover:bg-space-900/60">
                        <td className="py-2 pr-3 text-slate-300">{st.name}</td>
                        <td className="py-2 text-right font-semibold text-accent-400 tabular-nums">
                          {fmtMs(st.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent History */}
            {runHistory.length > 0 && (
              <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-100 uppercase">Recent Recorded Runs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <caption className="sr-only">Recent pipeline execution history</caption>
                    <thead className="text-[10px] uppercase text-slate-400 border-b border-space-800">
                      <tr>
                        <th scope="col" className="py-1.5 pr-2 font-semibold">Time</th>
                        <th scope="col" className="py-1.5 px-2 font-semibold">Objects</th>
                        <th scope="col" className="py-1.5 px-2 font-semibold">Pairs</th>
                        <th scope="col" className="py-1.5 px-2 font-semibold">Conjunctions</th>
                        <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Total Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-space-800/70 tabular-nums">
                      {runHistory.map((r) => (
                        <tr key={r.id}>
                          <td className="py-1.5 pr-2 text-slate-300">{r.timestamp}</td>
                          <td className="py-1.5 px-2 text-slate-200">{r.objects?.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-slate-300">{r.pairs?.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-amber-300">{r.conjunctions?.toLocaleString()}</td>
                          <td className="py-1.5 pl-2 text-right font-semibold text-accent-400">{fmtMs(r.total_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalDialog>
  );
};
