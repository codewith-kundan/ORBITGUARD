import React, { useState } from 'react';
import { Alert } from '../types';
import { RiskBadge } from './RiskBadge';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
  onSelectConjunction?: (conjId: number) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  onAcknowledge,
  onSelectConjunction
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = alerts.filter((a) => {
    const matchesSev = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchesStat = filterStatus === 'all' || a.status === filterStatus;
    return matchesSev && matchesStat;
  });

  return (
    <div className="bg-space-900/80 border border-space-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-space-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger-neon animate-pulse" />
          <h2 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
            Collision Risk Alert Center
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-danger-500/20 text-danger-neon border border-danger-500/30">
            {filtered.filter((a) => a.status === 'ACTIVE').length} Active Alerts
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-700 text-xs font-mono">
            {['all', 'CRITICAL', 'HIGH'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded uppercase transition ${
                  filterSeverity === sev
                    ? 'bg-danger-500/20 text-danger-neon font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-700 text-xs font-mono">
            {['all', 'ACTIVE', 'ACKNOWLEDGED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded uppercase transition ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="divide-y divide-space-800 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            <CheckCircle className="w-8 h-8 text-success-neon mx-auto mb-2 opacity-80" />
            No active alerts matching the selected filter criteria.
          </div>
        ) : (
          filtered.map((alert) => {
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';
            return (
              <div
                key={alert.id}
                className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-danger-500/5 hover:bg-danger-500/10'
                    : 'hover:bg-space-850/50'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={alert.severity} size="sm" />
                    <span className="text-xs font-mono text-slate-400">
                      Alert ID: #{alert.id}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      • {new Date(alert.created_at).toLocaleTimeString()} UTC
                    </span>
                  </div>
                  <p className="text-sm font-mono text-white font-medium">
                    {alert.message}
                  </p>
                  {alert.acknowledged_at && (
                    <div className="text-[10px] font-mono text-success-neon flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Acknowledged at {new Date(alert.acknowledged_at).toLocaleTimeString()} UTC
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isAcknowledged && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-3 py-1.5 bg-space-800 hover:bg-space-700 text-slate-200 hover:text-white border border-space-700 rounded-lg text-xs font-mono transition flex items-center gap-1.5 shadow"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-success-neon" />
                      ACKNOWLEDGE
                    </button>
                  )}
                  {onSelectConjunction && (
                    <button
                      onClick={() => onSelectConjunction(alert.conjunction_id)}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-neon border border-cyan-500/30 rounded-lg text-xs font-mono transition flex items-center gap-1.5 shadow"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      INSPECT TCA
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
