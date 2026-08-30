import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Sparkles, 
  Globe, 
  ShieldAlert, 
  Crosshair, 
  Activity, 
  FileText, 
  ShieldCheck 
} from 'lucide-react';
import { Conjunction, OrbitalObject, SystemStatistics } from '../types';

interface JudgeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunctions: Conjunction[];
  objects: OrbitalObject[];
  stats?: SystemStatistics | null;
  onNavigateToTab: (tab: 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics') => void;
  onSelectConjunction: (conj: Conjunction) => void;
  onOpenConjunctionDetails: (conj: Conjunction) => void;
  onOpenReplay: (conj: Conjunction) => void;
  onOpenCAM: (conj: Conjunction) => void;
  onOpenCDM: (conj: Conjunction) => void;
  onOpenTrustCenter: () => void;
}

interface DemoStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  actionLabel: string;
  icon: React.FC<{ className?: string }>;
  execute: () => void;
}

export const JudgeDemoModal: React.FC<JudgeDemoModalProps> = ({
  isOpen,
  onClose,
  conjunctions,
  objects: _objects,
  stats: _stats,
  onNavigateToTab,
  onSelectConjunction,
  onOpenConjunctionDetails,
  onOpenReplay,
  onOpenCAM,
  onOpenCDM,
  onOpenTrustCenter
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  const targetConjunction = conjunctions.find(c => c.risk_level === 'CRITICAL' || c.risk_score >= 80.0) || conjunctions[0];

  const steps: DemoStep[] = [
    {
      stepNumber: 1,
      title: 'Mission Control & Global Catalog Ingestion',
      subtitle: 'Real-Time Space Catalog Tracking',
      badge: 'DETECT',
      description: 'OrbitGuard tracks over 32,000 active satellites, rocket bodies, and debris objects. All orbital state vectors are propagated continuously using vectorized SGP4 in an interactive 3D space environment with realistic solar illumination and day/night terminator.',
      actionLabel: 'View 3D Mission Control',
      icon: Globe,
      execute: () => {
        onNavigateToTab('space');
      }
    },
    {
      stepNumber: 2,
      title: 'Conjunction Screening Engine',
      subtitle: 'Vectorized Close Approach Detection',
      badge: 'ANALYZE',
      description: 'The SGP4 screening engine filters overlapping altitude shells and computes sub-second Time of Closest Approach (TCA) via orthogonal root-finding (r_rel · v_rel = 0). Active upcoming encounters are prioritized in the Conjunction Matrix.',
      actionLabel: 'Inspect Conjunction Matrix',
      icon: ShieldAlert,
      execute: () => {
        onNavigateToTab('conjunctions');
        if (targetConjunction) onSelectConjunction(targetConjunction);
      }
    },
    {
      stepNumber: 3,
      title: 'Explainable Collision Risk & Evidence',
      subtitle: 'Transparent Multi-Factor Decomposition',
      badge: 'PREDICT',
      description: 'Rather than showing an arbitrary score, OrbitGuard decomposes risk into physical contributors: Miss Distance, Relative Velocity, Crossing Geometry, Physical Size, Lead Time, and B-plane covariance ellipses with Foster-2D & Monte Carlo benchmarks.',
      actionLabel: 'Open Encounter Inspector',
      icon: Crosshair,
      execute: () => {
        if (targetConjunction) onOpenConjunctionDetails(targetConjunction);
      }
    },
    {
      stepNumber: 4,
      title: 'Cinematic Encounter Replay',
      subtitle: 'Time-Scrubbed Operator Telemetry',
      badge: 'INVESTIGATE',
      description: 'Operators can visually replay the encounter with speed controls (1x to 120x), live separation telemetry, and closest-approach pulse markers, verifying geometry before taking critical decisions.',
      actionLabel: 'Launch Cinematic Replay',
      icon: Crosshair,
      execute: () => {
        if (targetConjunction) onOpenReplay(targetConjunction);
      }
    },
    {
      stepNumber: 5,
      title: 'Collision Avoidance Maneuver (CAM) Planner',
      subtitle: 'Optimal Delta-V & Fuel Budget Calculation',
      badge: 'DECISION SUPPORT',
      description: 'Calculates optimal prograde, retrograde, and cross-track impulsive burn vectors using the Tsiolkovsky rocket equation, quantifying projected miss-distance gain and fuel trade-offs for satellite operators.',
      actionLabel: 'Open CAM Planner',
      icon: Activity,
      execute: () => {
        if (targetConjunction) onOpenCAM(targetConjunction);
      }
    },
    {
      stepNumber: 6,
      title: 'Aerospace Standards CDM Export',
      subtitle: 'CCSDS 508.0-B-1 Interoperability',
      badge: 'STANDARDS',
      description: 'Exports standardized Conjunction Data Messages (CDM) in KVN and XML formats, ready for immediate dispatch to civil space traffic coordinators and defense tracking networks.',
      actionLabel: 'Preview & Export CDM',
      icon: FileText,
      execute: () => {
        if (targetConjunction) onOpenCDM(targetConjunction);
      }
    },
    {
      stepNumber: 7,
      title: 'Trust Center & Scientific Verification',
      subtitle: '44 Automated Verification Tests',
      badge: 'VERIFICATION',
      description: 'Documents full mathematical derivations, SGP4/WGS84 benchmark accuracy, test suite results, and honest scientific caveats (e.g. TLE-only covariance bounds). Defensible during rigorous technical jury Q&A.',
      actionLabel: 'View Trust & Validation Center',
      icon: ShieldCheck,
      execute: () => {
        onOpenTrustCenter();
      }
    }
  ];

  // Auto-play timer
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          const next = prev + 1;
          steps[next].execute();
          return next;
        } else {
          setIsAutoPlaying(false);
          return prev;
        }
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [isOpen, isAutoPlaying, steps]);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      steps[next].execute();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      setCurrentStepIndex(prev);
      steps[prev].execute();
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsAutoPlaying(false);
    steps[0].execute();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-mono animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-space-950 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-space-900 border-b border-space-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  JUDGE & PRESENTATION MODE
                </span>
                <span className="text-xs text-slate-400">
                  Step {currentStep.stepNumber} of {steps.length}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                3–5 Minute High-Impact Product Narrative
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="flex items-center bg-space-950 px-4 py-2 border-b border-space-800 gap-1.5 overflow-x-auto">
          {steps.map((s, idx) => (
            <button
              key={s.stepNumber}
              onClick={() => {
                setCurrentStepIndex(idx);
                steps[idx].execute();
              }}
              className={`flex-1 min-w-[28px] h-1.5 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'bg-cyan-400 shadow-[0_0_8px_#00f2ff]'
                  : idx < currentStepIndex
                  ? 'bg-emerald-500/60'
                  : 'bg-space-800'
              }`}
              title={`Step ${s.stepNumber}: ${s.title}`}
            />
          ))}
        </div>

        {/* Content Card */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-space-900 border border-space-700 text-cyan-neon flex-shrink-0">
              <StepIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-space-800 text-cyan-300 border border-space-700">
                  {currentStep.badge}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{currentStep.subtitle}</span>
              </div>
              <h3 className="text-base font-bold text-white">{currentStep.title}</h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-space-900/80 p-4 rounded-xl border border-space-800">
            {currentStep.description}
          </p>

          {/* Action Trigger Button for this step */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={currentStep.execute}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-space-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center gap-2"
            >
              <StepIcon className="w-4 h-4" />
              <span>{currentStep.actionLabel}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  isAutoPlaying
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-space-800 text-slate-300 border-space-700 hover:text-white'
                }`}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoPlaying ? 'PAUSE AUTO' : 'AUTO TOUR'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-2 bg-space-800 hover:bg-space-700 text-slate-300 rounded-lg border border-space-700 transition"
                title="Reset to Step 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-space-900 border-t border-space-800 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-space-800 hover:bg-space-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 rounded-lg text-xs font-bold transition border border-space-700"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>PREVIOUS</span>
          </button>

          <span className="text-xs text-slate-500">
            {currentStepIndex + 1} / {steps.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentStepIndex === steps.length - 1}
            className="flex items-center gap-1 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-space-950 rounded-lg text-xs font-bold transition shadow-md"
          >
            <span>NEXT STEP</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
