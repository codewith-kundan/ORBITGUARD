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
  onSelectStage
}) => {
  const stages: { key: WorkflowStageKey; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    { key: 'DATA', label: '1. DATA', icon: Database, description: 'Live CelesTrak Ingestion & Modulo-10 Checksums' },
    { key: 'DETECT', label: '2. DETECT', icon: Radar, description: '3-Tier Spatial Sieve & Altitude Shell Pruning' },
    { key: 'ASSESS', label: '3. ASSESS', icon: Activity, description: 'Orthogonal TCA & Foster-2D Pc Integration' },
    { key: 'INVESTIGATE', label: '4. INVESTIGATE', icon: Bot, description: 'Physics AI Tool Calling & Digit Validation' },
    { key: 'SIMULATE', label: '5. SIMULATE', icon: Sliders, description: 'Gauss Variational CAM Candidate Evaluation' },
    { key: 'DECIDE', label: '6. DECIDE', icon: CheckSquare, description: 'Human-in-the-Loop Flight Director Approval' },
    { key: 'VERIFY', label: '7. VERIFY', icon: ShieldCheck, description: 'Post-CAM Orbit Clearance & Secondary Screening' },
    { key: 'REPORT', label: '8. REPORT', icon: FileText, description: 'CCSDS CDM XML/KVN & Aerospace Defense SITREP' }
  ];

  const currentIdx = stages.findIndex(s => s.key === currentStage);

  return (
    <div className="w-full bg-space-950/90 border-b border-space-800/90 px-3 sm:px-6 py-2 font-mono text-xs overflow-x-auto scrollbar-none backdrop-blur-md">
      <div className="flex items-center justify-between min-w-[860px] gap-1 max-w-[1920px] mx-auto">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          const isActive = st.key === currentStage;
          const isCompleted = idx < currentIdx;

          return (
            <React.Fragment key={st.key}>
              <button
                onClick={() => onSelectStage && onSelectStage(st.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-left group ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : isCompleted
                    ? 'text-emerald-400 hover:bg-space-900/60'
                    : 'text-space-500 hover:text-space-300 hover:bg-space-900/40'
                }`}
                title={st.description}
              >
                <div className={`p-1 rounded flex items-center justify-center ${
                  isActive
                    ? 'bg-cyan-500/30 text-cyan-300'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-space-900 text-space-500'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[10px] sm:text-[11px] tracking-wider leading-none">
                    {st.label}
                  </div>
                  <div className="text-[8px] text-space-400 truncate max-w-[90px] hidden xl:block mt-0.5">
                    {st.description.split('&')[0]}
                  </div>
                </div>
              </button>

              {idx < stages.length - 1 && (
                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${
                  idx < currentIdx ? 'text-emerald-500/60' : 'text-space-800'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
