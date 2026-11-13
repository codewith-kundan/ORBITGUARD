import React from 'react';
import {
  Database,
  Radar,
  Activity,
  Bot,
  Sliders,
  CheckSquare,
  ShieldCheck,
  FileText,
  ChevronRight
} from 'lucide-react';

export type WorkflowStageKey =
  | 'DATA'
  | 'DETECT'
  | 'ASSESS'
  | 'INVESTIGATE'
  | 'SIMULATE'
  | 'DECIDE'
  | 'VERIFY'
  | 'REPORT';

interface WorkflowStepperProps {
  currentStage?: WorkflowStageKey;
  onSelectStage?: (stage: WorkflowStageKey) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStage = 'DATA',
  onSelectStage,
}) => {
  const stages: { key: WorkflowStageKey; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    { key: 'DATA', label: '1. Telemetry', icon: Database, description: 'TLE Catalog Sync & Checksum Validation' },
    { key: 'DETECT', label: '2. Screen', icon: Radar, description: '3-Tier Spatial Sieve & Shell Pruning' },
    { key: 'ASSESS', label: '3. Assess', icon: Activity, description: 'Orthogonal TCA & Foster-2D Pc' },
    { key: 'INVESTIGATE', label: '4. Investigate', icon: Bot, description: 'Evidence Grounding & Verification' },
    { key: 'SIMULATE', label: '5. Maneuver', icon: Sliders, description: 'Gauss CAM Trade Space' },
    { key: 'DECIDE', label: '6. Authorize', icon: CheckSquare, description: 'Flight Director Decision' },
    { key: 'VERIFY', label: '7. Verify', icon: ShieldCheck, description: 'Post-Burn Clearance Screening' },
    { key: 'REPORT', label: '8. Export', icon: FileText, description: 'CCSDS CDM KVN/XML & SITREP' },
  ];

  const currentIdx = stages.findIndex(s => s.key === currentStage);

  return (
    <div className="w-full bg-space-950 border-b border-space-800 px-3 sm:px-5 py-2 font-mono text-xs overflow-x-auto">
      <div className="flex items-center justify-between min-w-[780px] gap-1 max-w-[1600px] mx-auto">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          const isActive = st.key === currentStage;
          const isCompleted = idx < currentIdx;

          return (
            <React.Fragment key={st.key}>
              <button
                type="button"
                onClick={() => onSelectStage?.(st.key)}
                aria-current={isActive ? 'step' : undefined}
                title={st.description}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-left transition-colors ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-200 border-sky-500/40'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/15'
                    : 'bg-space-900 text-slate-400 border-space-800 hover:text-slate-200 hover:border-space-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-[11px] whitespace-nowrap">{st.label}</span>
              </button>

              {idx < stages.length - 1 && (
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 ${
                    idx < currentIdx ? 'text-emerald-500/70' : 'text-space-700'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
