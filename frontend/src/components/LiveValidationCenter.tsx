import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Database,
  Activity,
  FileCode,
  Clock,
  Layers,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Conjunction } from '../types';
import { StatCard } from './StatCard';
import { formatUtcTime, formatUtcDateTime } from '../utils/utcTime';

interface LiveValidationCenterProps {
  conjunctions?: Conjunction[];
  onSelectConjunction?: (conj: Conjunction) => void;
  onOpenCAM?: (conj: Conjunction) => void;
}

export const LiveValidationCenter: React.FC<LiveValidationCenterProps> = ({
  conjunctions = [],
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRunningValidation, setIsRunningValidation] = useState<boolean>(false);
  const [pipelineLogs, setPipelineLogs] = useState<any[]>([]);
  const [selectedConjId, setSelectedConjId] = useState<number | null>(null);
  const [provenanceData, setProvenanceData] = useState<any>(null);
  const [provenanceError, setProvenanceError] = useState<string | null>(null);
  const [loadingProvenance, setLoadingProvenance] = useState<boolean>(false);

  const fetchProvenance = useCallback(async (conjId: number) => {
    try {
      setLoadingProvenance(true);
      setProvenanceError(null);
      setSelectedConjId(conjId);
      const data = await api.getConjunctionProvenance(conjId);
      setProvenanceData(data);
    } catch (e: any) {
      setProvenanceData(null);
      setProvenanceError(e?.message || 'Unable to load conjunction provenance');
    } finally {
      setLoadingProvenance(false);
    }
  }, []);

  const loadStatusAndReport = useCallback(async () => {
    setLoadError(null);
    const [statusRes, reportRes] = await Promise.allSettled([
      api.getValidationStatus(),
      api.getValidationReport(),
    ]);

    if (statusRes.status === 'fulfilled' && statusRes.value) {
      setStatusData(statusRes.value);
    } else if (statusRes.status === 'rejected') {
      setLoadError(statusRes.reason?.message || 'Validation service unreachable');
    }

    if (reportRes.status === 'fulfilled' && reportRes.value) {
      setReportData(reportRes.value);
    } else if (reportRes.status === 'rejected') {
      setLoadError((prev) => prev || reportRes.reason?.message || 'Validation report unavailable');
    }
  }, []);

  useEffect(() => {
    loadStatusAndReport();
  }, [loadStatusAndReport]);

  useEffect(() => {
    if (conjunctions.length > 0 && selectedConjId === null) {
      fetchProvenance(conjunctions[0].id);
    }
  }, [conjunctions, selectedConjId, fetchProvenance]);

  const handleRunValidation = async () => {
    try {
      setIsRunningValidation(true);
      setLoadError(null);
      setPipelineLogs([
        {
          step: 1,
          message: 'Initiating live computational pipeline validation...',
          timestamp: new Date().toISOString(),
        },
      ]);

      const res = await api.runLiveValidation();
      if (Array.isArray(res?.pipeline_logs)) {
        setPipelineLogs(res.pipeline_logs);
      }
      if (res?.benchmark_validation) {
        setReportData(res.benchmark_validation);
      }
      const updatedStatus = await api.getValidationStatus().catch(() => null);
      if (updatedStatus) setStatusData(updatedStatus);
    } catch (e: any) {
      setPipelineLogs((prev) => [
        ...prev,
        {
          step: 'ERR',
          message: `Validation execution failed: ${e?.message || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setLoadError(e?.message || 'Live validation failed');
    } finally {
      setIsRunningValidation(false);
    }
  };

  const subsystems = reportData?.subsystems || {};
  const passRate = reportData?.pass_rate_percent;
  const passedCount = reportData?.passed;
  const totalTests = reportData?.total_tests;
  const isPassHealthy = typeof passRate === 'number' && passRate === 100;

  return (
    <div className="max-w-[1600px] mx-auto font-mono text-slate-200 space-y-4">
      {/* Header */}
      <div className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-space-950 border border-space-700 text-emerald-400 shrink-0" aria-hidden="true">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide">
                Verification &amp; Astrodynamics Benchmark Suite
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                  reportData
                    ? isPassHealthy
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/35'
                    : 'bg-space-950 text-slate-400 border-space-700'
                }`}
              >
                {reportData ? (
                  isPassHealthy ? (
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <Info className="w-3 h-3" aria-hidden="true" />
                  )
                ) : null}
                {reportData ? `${passRate ?? 0}% Pass Rate` : 'Awaiting Report'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-1">
              SGP4 propagation tolerances, orthogonal TCA convergence checks, Foster-2D collision probability benchmarks, and provenance audit telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={loadStatusAndReport}
            disabled={isRunningValidation}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-space-950 hover:bg-space-800 border border-space-700 text-xs text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Reload</span>
          </button>
          <button
            type="button"
            onClick={handleRunValidation}
            disabled={isRunningValidation}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-xs transition-colors bg-sky-500 hover:bg-sky-400 disabled:bg-space-800 disabled:text-slate-400 text-space-950 border border-transparent"
          >
            {isRunningValidation ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Running Benchmarks...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Run Live Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="p-3 bg-red-500/10 border border-red-500/35 rounded-lg text-xs text-red-200 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </span>
          <button
            type="button"
            onClick={loadStatusAndReport}
            className="px-2.5 py-1 rounded border border-red-500/40 bg-space-950 hover:bg-space-800 text-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Ephemeris Source"
          value={statusData?.data_source || 'Unavailable'}
          subtitle={`Mode: ${statusData?.mode || 'OFFLINE'}`}
          icon={Database}
          variant="cyan"
        />
        <StatCard
          title="Loaded Objects"
          value={
            statusData?.total_objects != null
              ? statusData.total_objects.toLocaleString()
              : '—'
          }
          subtitle={
            statusData?.validated_objects != null
              ? `${statusData.validated_objects.toLocaleString()} checksum verified`
              : 'No verification count'
          }
          icon={Layers}
          variant="default"
        />
        <StatCard
          title="Screening Horizon"
          value={
            statusData?.prediction_window_hours != null
              ? `${statusData.prediction_window_hours} Hours`
              : '—'
          }
          subtitle={
            statusData?.time_step_coarse_minutes != null
              ? `Coarse step: ${statusData.time_step_coarse_minutes} min`
              : 'Step configuration unavailable'
          }
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="Benchmark Pass Rate"
          value={typeof passRate === 'number' ? `${passRate}%` : '—'}
          subtitle={
            typeof passedCount === 'number' && typeof totalTests === 'number'
              ? `${passedCount}/${totalTests} benchmarks passed`
              : 'No benchmark report loaded'
          }
          icon={ShieldCheck}
          variant={isPassHealthy ? 'cyan' : 'warning'}
        />
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Subsystem Benchmark Matrix */}
          <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-space-800 flex-wrap gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-accent-400" aria-hidden="true" />
                <span>Numerical Subsystem Benchmark Matrix</span>
              </h2>
              <span className="text-xs text-slate-400 tabular-nums">
                Runtime: {reportData?.runtime_seconds != null ? `${reportData.runtime_seconds}s` : '—'}
              </span>
            </div>

            {Object.keys(subsystems).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(subsystems).map(([subName, sub]: [string, any]) => {
                  const subPassed = String(sub.status || '').toUpperCase() === 'PASS' || String(sub.status || '').toUpperCase() === 'PASSED';
                  return (
                    <div key={subName} className="bg-space-950 border border-space-800 rounded-lg p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-100">{subName}</span>
                          {sub.runtime_ms != null && (
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              ({sub.runtime_ms} ms)
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border ${
                            subPassed
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                              : 'bg-red-500/10 text-red-300 border-red-500/35'
                          }`}
                        >
                          {subPassed ? (
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{sub.status || 'UNKNOWN'}</span>
                        </span>
                      </div>

                      {Array.isArray(sub.tests) && sub.tests.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <caption className="sr-only">
                              {subName} verification tests and numerical tolerances
                            </caption>
                            <thead className="text-[10px] uppercase text-slate-400 border-b border-space-800">
                              <tr>
                                <th scope="col" className="py-1.5 pr-2 font-semibold">Check</th>
                                <th scope="col" className="py-1.5 px-2 font-semibold">Tolerance / Delta</th>
                                <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-space-800/70">
                              {sub.tests.map((t: any) => {
                                const passed = t.passed !== false;
                                return (
                                  <tr key={t.test_id || t.name} className="hover:bg-space-900/60">
                                    <td className="py-1.5 pr-2 text-slate-200">{t.name}</td>
                                    <td className="py-1.5 px-2 text-slate-300 tabular-nums whitespace-nowrap">
                                      {t.position_error_km != null && `Δr ${t.position_error_km.toFixed(4)} km `}
                                      {t.miss_error_km != null && `Δmiss ${t.miss_error_km.toFixed(4)} km `}
                                      {t.fuel_error_kg != null && `Δfuel ${t.fuel_error_kg.toFixed(4)} kg`}
                                      {t.position_error_km == null && t.miss_error_km == null && t.fuel_error_kg == null && '—'}
                                    </td>
                                    <td className="py-1.5 pl-2 text-right">
                                      <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                          passed ? 'text-emerald-300' : 'text-red-300'
                                        }`}
                                      >
                                        {passed ? (
                                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                        ) : (
                                          <XCircle className="w-3 h-3" aria-hidden="true" />
                                        )}
                                        {passed ? 'PASS' : 'FAIL'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-space-950 border border-space-800 rounded-md text-slate-400 text-xs">
                No benchmark matrix loaded. Click &ldquo;Run Live Suite&rdquo; to execute verification checks.
              </div>
            )}
          </section>

          {/* Live Pipeline Execution Stream */}
          <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-3">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-space-800">
              <Activity className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Pipeline Execution Log</span>
            </h2>

            <div className="bg-space-950 rounded-md p-3 font-mono text-xs space-y-1.5 border border-space-800 max-h-52 overflow-y-auto">
              {pipelineLogs.length > 0 ? (
                pipelineLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <span className="text-accent-400 font-semibold tabular-nums shrink-0">
                      [{log.step ?? idx + 1}]
                    </span>
                    <span className="text-slate-300 flex-1">{log.message}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                      {formatUtcTime(log.timestamp)} UTC
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 font-sans">
                  Run the validation suite to inspect live step-by-step execution timing and benchmark tolerances.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Conjunction Provenance Inspector */}
        <section className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between pb-2.5 border-b border-space-800">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Encounter Provenance Inspector</span>
            </h2>
          </div>

          <div>
            <label htmlFor="provenance-conj-select" className="text-xs text-slate-400 block mb-1.5">
              Select Screened Encounter
            </label>
            <select
              id="provenance-conj-select"
              value={selectedConjId ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) fetchProvenance(val);
              }}
              disabled={conjunctions.length === 0}
              className="w-full bg-space-950 border border-space-700 rounded-md px-3 py-2 text-xs text-slate-100 disabled:opacity-50"
            >
              {conjunctions.length === 0 ? (
                <option value="">No encounters in screening queue</option>
              ) : (
                conjunctions.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.object_a?.name || c.object_a_id} / {c.object_b?.name || c.object_b_id} (Score {c.risk_score})
                  </option>
                ))
              )}
            </select>
          </div>

          {loadingProvenance ? (
            <div className="text-center py-8 text-slate-400 text-xs space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-accent-400" aria-hidden="true" />
              <div>Loading provenance audit record...</div>
            </div>
          ) : provenanceError ? (
            <div className="p-3 bg-red-500/10 border border-red-500/35 rounded-md text-xs text-red-200">
              {provenanceError}
            </div>
          ) : provenanceData ? (
            <div className="space-y-3 text-xs">
              <div className="bg-space-950 p-3 rounded-md border border-space-800 space-y-1">
                <div className="text-[10px] font-semibold uppercase text-accent-400">
                  Upstream Ephemeris Source
                </div>
                <div className="text-slate-100 font-semibold">
                  {provenanceData.data_provenance?.upstream_source || 'Unavailable'}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  Ingested:{' '}
                  {provenanceData.data_provenance?.ingestion_timestamp_utc
                    ? `${formatUtcDateTime(provenanceData.data_provenance.ingestion_timestamp_utc)} UTC`
                    : '—'}
                </div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase text-slate-300">
                  Astrodynamics &amp; Coordinate Standards
                </div>
                <dl className="space-y-1 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Propagator</dt>
                    <dd className="text-slate-100 font-medium text-right">{provenanceData.data_provenance?.propagation_model || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Frame</dt>
                    <dd className="text-slate-100 font-medium text-right">{provenanceData.data_provenance?.coordinate_frame || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Geodetic Datum</dt>
                    <dd className="text-slate-100 font-medium text-right">{provenanceData.data_provenance?.geodetic_ellipsoid || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Pc Model</dt>
                    <dd className="text-slate-100 font-medium text-right">{provenanceData.data_provenance?.collision_probability_model || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Algorithm</dt>
                    <dd className="text-slate-100 font-medium text-right">{provenanceData.data_provenance?.algorithm_version || '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase text-emerald-400">
                  Computed Encounter Parameters
                </div>
                <dl className="space-y-1 text-[11px] tabular-nums">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">TCA</dt>
                    <dd className="text-slate-100 font-medium text-right">
                      {provenanceData.encounter_metrics?.tca_utc
                        ? `${formatUtcDateTime(provenanceData.encounter_metrics.tca_utc)} UTC`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Miss Distance</dt>
                    <dd className="text-emerald-300 font-semibold">
                      {provenanceData.encounter_metrics?.miss_distance_km != null
                        ? `${provenanceData.encounter_metrics.miss_distance_km.toFixed(3)} km`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Rel Velocity</dt>
                    <dd className="text-slate-100 font-medium">
                      {provenanceData.encounter_metrics?.relative_velocity_km_s != null
                        ? `${provenanceData.encounter_metrics.relative_velocity_km_s.toFixed(2)} km/s`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Collision Pc</dt>
                    <dd className="text-slate-100 font-medium">
                      {provenanceData.encounter_metrics?.collision_probability != null
                        ? `${provenanceData.encounter_metrics.collision_probability.toFixed(4)}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Risk Rating</dt>
                    <dd className="text-slate-100 font-semibold">
                      {provenanceData.encounter_metrics?.risk_level || '—'} ({provenanceData.encounter_metrics?.risk_score ?? '—'}/100)
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-space-950 border border-space-800 rounded-md text-xs text-slate-400">
              Select a conjunction event to inspect its orbital provenance and ephemeris metadata.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
