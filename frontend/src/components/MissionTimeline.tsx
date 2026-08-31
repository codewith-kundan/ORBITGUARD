import React from 'react';
import { 
  Clock, 
  Activity, 
  Bot, 
  ShieldCheck, 
  Rocket, 
  UserCheck, 
  FileText, 
  AlertOctagon
} from 'lucide-react';

export interface AuditEventItem {
  id: number;
  event_type: string;
  actor: string;
  title: string;
  description: string;
  payload?: any;
  timestamp_utc: string;
  time_str?: string;
}

interface MissionTimelineProps {
  events: AuditEventItem[];
  caseNumber?: string;
}

export const MissionTimeline: React.FC<MissionTimelineProps> = ({
  events = [],
  caseNumber
}) => {
  const getEventIcon = (type: string) => {
    if (type.includes('CONJUNCTION')) return <AlertOctagon className="w-4 h-4 text-rose-400" />;
    if (type.includes('TCA') || type.includes('PC')) return <Activity className="w-4 h-4 text-cyan-400" />;
    if (type.includes('AI')) return <Bot className="w-4 h-4 text-purple-400" />;
    if (type.includes('CAM_GENERATED')) return <Rocket className="w-4 h-4 text-amber-400" />;
    if (type.includes('APPROVED')) return <UserCheck className="w-4 h-4 text-emerald-400" />;
    if (type.includes('REJECTED') || type.includes('OVERRIDDEN')) return <AlertOctagon className="w-4 h-4 text-amber-400" />;
    if (type.includes('VERIFIED')) return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    if (type.includes('CDM') || type.includes('SITREP')) return <FileText className="w-4 h-4 text-indigo-400" />;
    return <Clock className="w-4 h-4 text-space-400" />;
  };

  const getActorBadge = (actor: string) => {
    switch (actor.toUpperCase()) {
      case 'PHYSICS_ENGINE':
        return <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded">PHYSICS ENGINE</span>;
      case 'AI_COPILOT':
        return <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">AI COPILOT</span>;
      case 'OPERATOR':
        return <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">FLIGHT DIRECTOR</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] bg-space-800 text-space-400 rounded">SYSTEM</span>;
    }
  };

  return (
    <div className="bg-space-900/90 border border-space-800 rounded-xl p-4 sm:p-5 font-mono shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-space-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            MISSION DECISION TIMELINE & AUDIT LOG
          </h3>
        </div>
        {caseNumber && (
          <span className="text-xs text-space-400 font-bold">
            CASE: <strong className="text-white">{caseNumber}</strong>
          </span>
        )}
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-space-800">
        {events.length > 0 ? (
          events.map((ev, idx) => (
            <div key={ev.id || idx} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-space-950 border border-space-700 shadow-md">
                {getEventIcon(ev.event_type)}
              </div>

              <div className="bg-space-950/80 border border-space-800/80 rounded-lg p-3 space-y-1.5 hover:border-space-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{ev.title}</span>
                    {getActorBadge(ev.actor)}
                  </div>
                  <span className="text-[10px] text-space-400">
                    {ev.time_str || new Date(ev.timestamp_utc).toUTCString().slice(17, 25) + ' UTC'}
                  </span>
                </div>

                <p className="text-xs text-space-300 leading-relaxed">
                  {ev.description}
                </p>

                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-space-900 flex flex-wrap gap-2 text-[10px] text-space-400">
                    {Object.entries(ev.payload).map(([k, v]) => (
                      <span key={k} className="px-1.5 py-0.5 bg-space-900 rounded border border-space-800/60">
                        {k}: <strong className="text-cyan-300">{typeof v === 'number' ? v.toFixed(3) : String(v)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-space-500 italic py-4">
            No audit events recorded yet for this operational case.
          </div>
        )}
      </div>
    </div>
  );
};
