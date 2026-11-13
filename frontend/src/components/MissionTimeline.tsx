import React from 'react';
import {
  Clock,
  Activity,
  Cpu,
  ShieldCheck,
  Navigation,
  UserCheck,
  FileText,
  AlertOctagon
} from 'lucide-react';
import { formatUtcTime } from '../utils/utcTime';

export interface AuditEventItem {
  id: number;
  event_type: string;
  actor: string;
  title: string;
  description: string;
  payload?: Record<string, any>;
  timestamp_utc: string;
  time_str?: string;
}

interface MissionTimelineProps {
  events: AuditEventItem[];
  caseNumber?: string;
}

export const MissionTimeline: React.FC<MissionTimelineProps> = ({
  events = [],
  caseNumber,
}) => {
  const getEventIcon = (type: string) => {
    if (type.includes('CONJUNCTION')) return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
    if (type.includes('TCA') || type.includes('PC')) return <Activity className="w-3.5 h-3.5 text-accent-400" />;
    if (type.includes('AI')) return <Cpu className="w-3.5 h-3.5 text-sky-300" />;
    if (type.includes('CAM_GENERATED')) return <Navigation className="w-3.5 h-3.5 text-amber-400" />;
    if (type.includes('APPROVED')) return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
    if (type.includes('REJECTED') || type.includes('OVERRIDDEN')) return <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />;
    if (type.includes('VERIFIED')) return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    if (type.includes('CDM') || type.includes('SITREP')) return <FileText className="w-3.5 h-3.5 text-slate-300" />;
    return <Clock className="w-3.5 h-3.5 text-slate-400" />;
  };

  const getActorBadge = (actor: string) => {
    switch (actor.toUpperCase()) {
      case 'PHYSICS_ENGINE':
        return <span className="px-1.5 py-0.5 text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded">PHYSICS ENGINE</span>;
      case 'AI_COPILOT':
        return <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-200 border border-space-600 rounded">DECISION SUPPORT</span>;
      case 'OPERATOR':
        return <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">FLIGHT DIRECTOR</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] bg-space-800 text-slate-300 rounded">SYSTEM</span>;
    }
  };

  return (
    <div className="bg-space-900 border border-space-700 rounded-lg p-4 sm:p-5 font-mono space-y-4">
      <div className="flex items-center justify-between border-b border-space-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-400" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            Decision Timeline &amp; Audit Log
          </h3>
        </div>
        {caseNumber && (
          <span className="text-xs text-slate-400">
            CASE <strong className="text-slate-200 tabular-nums">{caseNumber}</strong>
          </span>
        )}
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-space-700">
        {events.length > 0 ? (
          events.map((ev, idx) => (
            <div key={ev.id || idx} className="relative">
              <div className="absolute -left-6 top-1 p-1 rounded-full bg-space-950 border border-space-700" aria-hidden="true">
                {getEventIcon(ev.event_type)}
              </div>

              <div className="bg-space-950 border border-space-800 rounded-lg p-3 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-100">{ev.title}</span>
                    {getActorBadge(ev.actor)}
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {ev.time_str || formatUtcTime(ev.timestamp_utc)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {ev.description}
                </p>

                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <div className="pt-2 border-t border-space-800 flex flex-wrap gap-2 text-[10px] text-slate-400">
                    {Object.entries(ev.payload).map(([k, v]) => (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-space-900 border border-space-800 tabular-nums">
                        {k}: <span className="text-slate-200">{typeof v === 'number' ? Number(v).toFixed(4).replace(/\.?0+$/, '') : String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No audit events recorded for this conjunction case yet.
          </div>
        )}
      </div>
    </div>
  );
};
