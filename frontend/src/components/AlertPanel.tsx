import React, { useState } from 'react';
import { Alert } from '../types';
import { RiskBadge } from './RiskBadge';
import { AlertTriangle, CheckCircle, ShieldAlert, Download, CheckCheck } from 'lucide-react';

const formatTcaCountdown = (tcaStr: string) => {
  const tca = new Date(tcaStr);
  const now = new Date();
  const diffMs = tca.getTime() - now.getTime();
  if (diffMs <= 0) return 'PASSED';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

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

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(alerts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `orbitguard_alerts_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAcknowledgeAll = () => {
    filtered.filter(a => a.status === 'ACTIVE').forEach(a => onAcknowledge(a.id));
  };

  return (
    <div className="bg-space-900/90 border border-space-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
      {/* Header */}
      <div className="p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-neon">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-wider flex items-center gap-2">
                <span>SPACE COLLISION ALERT & MITIGATION CENTER</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-danger-500/20 text-danger-neon border border-danger-500/30">
                  {filtered.filter((a) => a.status === 'ACTIVE').length} ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">Automated Proximity Warnings & Orbital Safety Protocol Recommendations</p>
            </div>
          </div>
        </div>

        {/* Batch Operations & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-space-950 hover:bg-space-800 text-slate-300 border border-space-700 rounded-xl text-xs font-bold transition shadow-sm"
            title="Export Alert Log"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT LOG</span>
          </button>

          {filtered.some(a => a.status === 'ACTIVE') && (
            <button
              onClick={handleAcknowledgeAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>ACKNOWLEDGE ALL</span>
            </button>
          )}

          {/* Severity Filters */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
            {['all', 'CRITICAL', 'HIGH'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 rounded-lg uppercase transition font-medium ${
                  filterSeverity === sev
                    ? 'bg-danger-500/20 text-danger-neon font-bold border border-danger-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
            {['all', 'ACTIVE', 'ACKNOWLEDGED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg uppercase transition font-medium ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40 shadow-sm'
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
      <div className="divide-y divide-space-800 max-h-[520px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            No active collision alerts matching the selected filter criteria.
          </div>
        ) : (
          filtered.map((alert) => {
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';
            return (
              <div
                key={alert.id}
                className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-danger-500/5 hover:bg-danger-500/10 animate-pulse'
                    : 'hover:bg-space-850/50'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={alert.severity} size="sm" />
                    <span className="text-xs text-slate-400">
                      Alert ID: #{alert.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      • {new Date(alert.created_at).toLocaleTimeString()} UTC
                    </span>
                    {alert.conjunction?.tca && (
                      <span className="text-xs font-bold text-amber-400 ml-2">
                        TCA: {formatTcaCountdown(alert.conjunction.tca)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white font-medium">
                    {alert.message}
                  </p>
                  {alert.acknowledged_at && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Acknowledged at {new Date(alert.acknowledged_at).toLocaleTimeString()} UTC
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isAcknowledged && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-3 py-1.5 bg-space-800 hover:bg-space-700 text-slate-200 hover:text-white border border-space-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ACKNOWLEDGE
                    </button>
                  )}
                  {onSelectConjunction && (
                    <button
                      onClick={() => onSelectConjunction(alert.conjunction_id)}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-neon border border-cyan-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
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
