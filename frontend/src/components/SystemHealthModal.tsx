import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Database,
  Activity,
  Radio,
  AlertTriangle,
  RefreshCw,
  Layers,
  Cpu,
  Clock,
  Server,
  Zap,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { SystemHealthDiagnostics } from '../types';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (mode: 'LIVE' | 'DEMO') => Promise<void>;
  isSyncing: boolean;
  onScreenConjunctions?: () => Promise<void>;
  isScreening?: boolean;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  isOpen,
  onClose,
  onSync,
  isSyncing,
  onScreenConjunctions,
  isScreening,
}) => {
  const [diagnostics, setDiagnostics] = useState<SystemHealthDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'providers' | 'database' | 'astrodynamics' | 'logs'>('providers');

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDataHealth();
      setDiagnostics(data);
    } catch (err: any) {
      setDiagnostics(null);
      setError(err?.message || 'Backend diagnostics endpoint unreachable (/api/data/health).');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen, fetchDiagnostics]);

  const handleAction = async (fn: () => Promise<void>) => {
    try {
      setActionMessage(null);
      await fn();
      await fetchDiagnostics();
    } catch (err: any) {
      setActionMessage(err?.message || 'Operation failed.');
    }
  };

  const db = diagnostics?.database;
  const providers = diagnostics?.providers || [];
  const astro = diagnostics?.astrodynamics;
  const history = diagnostics?.sync_history || [];

  const overallBadge = (() => {
    if (error || !diagnostics) {
      return {
        label: 'OFFLINE / UNREACHABLE',
        cls: 'bg-red-500/15 text-red-300 border-red-500/40',
        Icon: XCircle,
      };
    }
    const status = String(diagnostics.overall_status || '').toUpperCase();
    if (status === 'OPERATIONAL' || status === 'HEALTHY') {
      return {
        label: status,
        cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35',
        Icon: CheckCircle2,
      };
    }
    return {
      label: status || 'DEGRADED',
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      Icon: AlertTriangle,
    };
  })();

  const OverallIcon = overallBadge.Icon;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="system-health-title"
      maxWidthClass="max-w-4xl"
      className="bg-space-900 border border-space-700 rounded-xl max-h-[90dvh] overflow-hidden flex flex-col font-mono shadow-2xl text-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-5 py-3.5 bg-space-950 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-space-900 border border-space-700 flex items-center justify-center text-accent-400 shrink-0" aria-hidden="true">
            <Server className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="system-health-title" className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                System &amp; Database Diagnostics
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${overallBadge.cls}`}>
                <OverallIcon className="w-3 h-3" aria-hidden="true" />
                <span>{overallBadge.label}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans truncate">
              Upstream TLE providers, catalog persistence pool, SGP4 engine status, and ingestion audit history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchDiagnostics}
            disabled={loading}
            aria-label="Refresh system diagnostics"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-slate-100 rounded-md border border-space-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-400' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close System Diagnostics dialog"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="System diagnostic views"
        className="flex items-center gap-1 px-4 sm:px-5 pt-2.5 pb-2 bg-space-950 border-b border-space-800 text-xs overflow-x-auto"
      >
        {[
          { id: 'providers', label: 'Data Providers', icon: Radio },
          { id: 'database', label: 'Database Storage', icon: Database },
          { id: 'astrodynamics', label: 'SGP4 & Screening', icon: Activity },
          { id: 'logs', label: 'Sync Audit', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors text-[11px] whitespace-nowrap border ${
                isActive
                  ? 'bg-sky-500/15 text-sky-200 border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-space-800 border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div role="tabpanel" className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/35 rounded-md text-red-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={fetchDiagnostics}
              className="px-2.5 py-1 rounded bg-space-950 border border-red-500/40 hover:bg-space-800 text-slate-200"
            >
              Retry
            </button>
          </div>
        )}

        {actionMessage && (
          <div role="alert" className="p-2.5 bg-amber-500/10 border border-amber-500/35 rounded-md text-amber-200 text-xs">
            {actionMessage}
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-4">
            {providers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providers.map((p) => {
                  const isHealthy = p.status === 'HEALTHY' || p.status === 'AVAILABLE';
                  const isUnconfigured = p.status === 'UNCONFIGURED';
                  return (
                    <div
                      key={p.provider}
                      className="p-3.5 rounded-md border border-space-800 bg-space-950 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Radio className={`w-4 h-4 ${isHealthy ? 'text-accent-400' : 'text-slate-500'}`} aria-hidden="true" />
                          <span className="font-semibold text-slate-100 text-xs sm:text-sm">{p.provider}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                            isHealthy
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                              : isUnconfigured
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/35'
                              : 'bg-red-500/10 text-red-300 border-red-500/35'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-sans">
                        {p.message || 'No provider diagnostic message returned.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-space-800">
                        <div>
                          <span className="text-slate-400">LATENCY: </span>
                          <span className="text-accent-400 font-semibold tabular-nums">
                            {p.latency_ms > 0 ? `${p.latency_ms.toFixed(1)} ms` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">AUTH: </span>
                          <span className="text-slate-200">{p.requires_auth ? 'Credentials Configured' : 'Open Feed'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !error ? (
              <div className="p-5 text-center bg-space-950 border border-space-800 rounded-md text-xs text-slate-400">
                {loading ? 'Probing upstream TLE data providers...' : 'No provider diagnostic telemetry available.'}
              </div>
            ) : null}

            <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-2.5">
              <div className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
                <span>Manual Ephemeris Synchronization</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Pull fresh GP orbital elements from live upstream feeds or reload the verified offline TLE cache.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAction(() => onSync('LIVE'))}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-space-950 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>Sync Live Feed</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(() => onSync('DEMO'))}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-space-900 hover:bg-space-800 text-amber-300 rounded-md border border-amber-500/35 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <HardDrive className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Load Verified Local Cache</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Tracked Objects</div>
                <div className="text-lg font-semibold text-slate-100 mt-1 tabular-nums">
                  {db?.tables?.orbital_objects != null ? db.tables.orbital_objects.toLocaleString() : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">orbital_objects</div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Ephemeris TLEs</div>
                <div className="text-lg font-semibold text-accent-400 mt-1 tabular-nums">
                  {db?.tables?.tle_records != null ? db.tables.tle_records.toLocaleString() : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">tle_records</div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Conjunctions</div>
                <div className="text-lg font-semibold text-amber-300 mt-1 tabular-nums">
                  {db?.tables?.conjunctions != null ? db.tables.conjunctions.toLocaleString() : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">conjunctions</div>
              </div>

              <div className="bg-space-950 p-3 rounded-md border border-space-800">
                <div className="text-[10px] text-slate-400 uppercase">Active Alerts</div>
                <div className="text-lg font-semibold text-red-300 mt-1 tabular-nums">
                  {db?.tables?.active_alerts != null ? db.tables.active_alerts.toLocaleString() : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">alerts</div>
              </div>
            </div>

            <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-3">
              <div className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
                <span>Database Engine State</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">ENGINE</div>
                  <div className="font-semibold text-slate-100 mt-0.5">{db?.engine || 'Unavailable'}</div>
                </div>
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">CONNECTION</div>
                  <div className={`font-semibold mt-0.5 ${db?.connected ? 'text-emerald-300' : 'text-red-300'}`}>
                    {db?.connected ? 'CONNECTED' : 'DISCONNECTED'}
                  </div>
                </div>
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">LATEST TLE EPOCH AGE</div>
                  <div className="font-semibold text-accent-400 mt-0.5 tabular-nums">
                    {diagnostics?.data_age_hours != null ? `${diagnostics.data_age_hours.toFixed(1)} hours` : 'Unavailable'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'astrodynamics' && (
          <div className="space-y-4">
            <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-3">
              <div className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
                <span>Propagator Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">PROPAGATOR ALGORITHM</div>
                  <div className="font-semibold text-slate-100 mt-0.5">{astro?.propagation_engine || 'Unavailable'}</div>
                </div>
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">REFERENCE DATUM</div>
                  <div className="font-semibold text-slate-100 mt-0.5">{astro?.ellipsoid_model || 'Unavailable'}</div>
                </div>
              </div>
            </div>

            <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-3">
              <div className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Conjunction Screening Parameters</span>
                </span>
                <span className="text-[10px] text-slate-300 font-semibold">
                  {astro?.conjunction_screening?.status || (diagnostics ? 'CONFIGURED' : 'UNAVAILABLE')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">HORIZON</div>
                  <div className="font-semibold text-slate-100 mt-0.5">
                    {astro?.conjunction_screening?.window_hours != null
                      ? `${astro.conjunction_screening.window_hours} Hours`
                      : '—'}
                  </div>
                </div>
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">SCREEN RADIUS</div>
                  <div className="font-semibold text-slate-100 mt-0.5">
                    {astro?.conjunction_screening?.threshold_km != null
                      ? `${astro.conjunction_screening.threshold_km} km`
                      : '—'}
                  </div>
                </div>
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">CRITICAL CUTOFF</div>
                  <div className="font-semibold text-red-300 mt-0.5">
                    {astro?.conjunction_screening?.critical_threshold_km != null
                      ? `< ${astro.conjunction_screening.critical_threshold_km} km`
                      : '—'}
                  </div>
                </div>
                <div className="p-2.5 bg-space-900 rounded-md border border-space-800">
                  <div className="text-[10px] text-slate-400">COARSE STEP</div>
                  <div className="font-semibold text-slate-100 mt-0.5">
                    {astro?.conjunction_screening?.coarse_step_minutes != null
                      ? `${astro.conjunction_screening.coarse_step_minutes} min`
                      : '—'}
                  </div>
                </div>
              </div>

              {onScreenConjunctions && (
                <div className="pt-2 border-t border-space-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAction(onScreenConjunctions)}
                    disabled={isScreening}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-space-900 hover:bg-space-800 text-accent-400 rounded-md border border-space-700 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>Run Conjunction Screening</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span>Ephemeris Sync History</span>
              <span className="text-[11px] text-slate-400 tabular-nums">{history.length} operations</span>
            </div>

            {history.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-space-950 rounded-md border border-space-800">
                No catalog synchronization runs recorded yet.
              </div>
            ) : (
              <div className="bg-space-950 rounded-md border border-space-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <caption className="sr-only">Catalog synchronization audit log</caption>
                  <thead className="bg-space-900 text-slate-400 border-b border-space-800 text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="p-2.5 font-semibold">Timestamp (UTC)</th>
                      <th scope="col" className="p-2.5 font-semibold">Provider</th>
                      <th scope="col" className="p-2.5 font-semibold">Status</th>
                      <th scope="col" className="p-2.5 font-semibold">Fetched</th>
                      <th scope="col" className="p-2.5 font-semibold">Inserted</th>
                      <th scope="col" className="p-2.5 font-semibold">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-800 text-[11px] tabular-nums">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-space-900/50">
                        <td className="p-2.5 text-slate-300 whitespace-nowrap">
                          {h.started_at ? `${formatUtcDateTime(h.started_at, true)} UTC` : '—'}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-100">{h.source}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                              h.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                                : 'bg-red-500/10 text-red-300 border-red-500/35'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-accent-400">{h.records_fetched?.toLocaleString() ?? '0'}</td>
                        <td className="p-2.5 text-emerald-300">{h.records_inserted?.toLocaleString() ?? '0'}</td>
                        <td className="p-2.5 text-slate-300">{h.records_updated?.toLocaleString() ?? '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-space-800 px-4 sm:px-5 py-2.5 bg-space-950 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
          <span>Snapshot: {diagnostics?.timestamp ? `${formatUtcDateTime(diagnostics.timestamp, true)} UTC` : 'Unavailable'}</span>
        </div>
        <div>OrbitGuard SGP4 Diagnostics</div>
      </div>
    </ModalDialog>
  );
};
