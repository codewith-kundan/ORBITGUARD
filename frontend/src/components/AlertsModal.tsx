import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Crosshair,
  Info,
  X,
} from 'lucide-react';
import { Alert, Conjunction } from '../types';
import { api } from '../services/api';
import { ModalDialog } from './ModalDialog';
import { formatUtcDateTime } from '../utils/utcTime';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  conjunctions: Conjunction[];
  onAlertUpdated: (updated: Alert) => void;
  onInspectConjunction: (conj: Conjunction) => void;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const getSeverityMeta = (severity: string) => {
  const s = (severity || 'MEDIUM').toUpperCase();
  if (s === 'CRITICAL') {
    return {
      label: 'CRITICAL',
      Icon: AlertOctagon,
      badge: 'bg-red-500/15 border-red-500/40 text-red-300',
    };
  }
  if (s === 'HIGH') {
    return {
      label: 'HIGH',
      Icon: AlertTriangle,
      badge: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
    };
  }
  if (s === 'LOW') {
    return {
      label: 'LOW',
      Icon: Info,
      badge: 'bg-slate-700/40 border-slate-600/40 text-slate-300',
    };
  }
  return {
    label: 'MEDIUM',
    Icon: AlertTriangle,
    badge: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  };
};

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  conjunctions,
  onAlertUpdated,
  onInspectConjunction,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedAlerts = useMemo(() => {
    return alerts
      .filter((a) => (filterStatus === 'ACTIVE' ? a.status === 'ACTIVE' : true))
      .sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
        const sevDiff =
          (SEVERITY_ORDER[a.severity?.toUpperCase()] ?? 9) -
          (SEVERITY_ORDER[b.severity?.toUpperCase()] ?? 9);
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [alerts, filterStatus]);

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const handleAcknowledge = async (alertId: number) => {
    try {
      setErrorMessage(null);
      setAcknowledgingId(alertId);
      const updated = await api.acknowledgeAlert(alertId);
      onAlertUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to acknowledge alert.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="alerts-modal-title"
      maxWidthClass="max-w-3xl"
    >
      <div className="flex flex-col max-h-[85dvh] font-sans text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-space-800 bg-space-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded border border-space-700 bg-space-900 flex items-center justify-center text-sky-400 shrink-0">
              <Bell className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="alerts-modal-title" className="text-sm font-semibold text-slate-100">
                Orbital Conjunction Alerts
              </h2>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                {activeCount} active · {alerts.length} total recorded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded border border-space-800 bg-space-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'ACTIVE'
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-400/35'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'ALL'
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-400/35'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                All ({alerts.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close alerts modal"
              className="p-1.5 rounded border border-space-700 bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded border border-red-500/40 bg-red-950/40 text-xs text-red-200 flex items-center justify-between gap-2"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-300 hover:text-white underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {sortedAlerts.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-space-800 rounded-lg space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-200">
                {filterStatus === 'ACTIVE'
                  ? 'No active orbital alerts require attention.'
                  : 'No orbital alerts have been recorded yet.'}
              </p>
              <p className="text-xs text-slate-400">
                Run conjunction screening from the Conjunctions workspace to refresh active threat alerts.
              </p>
            </div>
          ) : (
            sortedAlerts.map((alert) => {
              const sev = getSeverityMeta(alert.severity);
              const SevIcon = sev.Icon;
              const linkedConjunction = alert.conjunction_id
                ? conjunctions.find((c) => c.id === alert.conjunction_id)
                : undefined;

              return (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-space-800 bg-space-950/70 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${sev.badge}`}
                      >
                        <SevIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{sev.label}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded border border-space-800 bg-space-900">
                        {alert.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {formatUtcDateTime(alert.created_at)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-space-800/70">
                    {linkedConjunction && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onInspectConjunction(linkedConjunction);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-xs text-slate-200 transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                        <span>Inspect Conjunction</span>
                      </button>
                    )}

                    {alert.status === 'ACTIVE' && (
                      <button
                        type="button"
                        disabled={acknowledgingId === alert.id}
                        onClick={() => handleAcknowledge(alert.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-xs text-sky-300 font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {acknowledgingId === alert.id ? 'Acknowledging...' : 'Acknowledge'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModalDialog>
  );
};

