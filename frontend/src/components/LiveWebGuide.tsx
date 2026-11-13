import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Globe,
  ShieldAlert,
  Crosshair,
  FileText,
  ShieldCheck,
  Minimize2,
  Maximize2,
  Compass,
  Map,
  Database,
  Rocket,
  Sun,
  Bot,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { Conjunction, OrbitalObject, SystemStatistics } from '../types';

export interface LiveWebGuideProps {
  isOpen: boolean;
  onClose: () => void;
  conjunctions: Conjunction[];
  objects: OrbitalObject[];
  stats?: SystemStatistics | null;
  onNavigateToTab: (tab: 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics') => void;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
  onOpenConjunctionDetails: (conj: Conjunction) => void;
  onOpenReplay: (conj: Conjunction) => void;
  onOpenCAM: (conj: Conjunction) => void;
  onOpenCDM: (conj: Conjunction) => void;
  onOpenTrustCenter: () => void;
  onOpenOrbitAI: () => void;
  onOpenSpaceWeather?: () => void;
  onOpenBreakup?: (conj: Conjunction) => void;
  onTriggerScreening?: () => void;
}

interface GuideStep {
  id: string;
  stepNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  actionLabel: string;
  actionHint: string;
  icon: React.FC<{ className?: string }>;
  execute: () => void;
}

export const LiveWebGuide: React.FC<LiveWebGuideProps> = ({
  isOpen,
  onClose,
  conjunctions,
  objects,
  onNavigateToTab,
  onSelectObject,
  onSelectConjunction,
  onOpenConjunctionDetails,
  onOpenReplay,
  onOpenCAM,
  onOpenCDM,
  onOpenTrustCenter,
  onOpenOrbitAI,
  onOpenSpaceWeather,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'docked' | 'modal' | 'minimized'>('docked');
  const [progress, setProgress] = useState<number>(0);
  const progressRef = useRef<number>(0);

  const targetConjunction =
    conjunctions.find((c) => c.risk_level === 'CRITICAL' || c.risk_score >= 80.0) ||
    conjunctions[0] ||
    null;
  const targetObject =
    objects.find((o) => o.name?.includes('ISS') || o.object_type === 'ACTIVE_SATELLITE') ||
    objects[0] ||
    null;

  const steps: GuideStep[] = useMemo(
    () => [
      {
        id: '3d-mission-control',
        stepNumber: 1,
        badge: '3D SCENE',
        title: '3D Orbital Viewport & State Propagation',
        subtitle: 'Earth-Centered Inertial (TEME / ECI) Rendering',
        description:
          'Propagates cataloged payloads, rocket bodies, and debris in Three.js with day/night illumination, orbital shell filters, camera locks, and epoch scrubbing.',
        keyFeatures: [
          'Live SGP4 orbital trajectory curves and horizon scrubbing (-12h to +24h)',
          'Category filters for active satellites, debris, rocket stages, and GNSS',
          'Sub-satellite ground vectors and conjunction pair geometry',
          'Real-time inertial position and altitude inspection',
        ],
        actionLabel: 'Open 3D Viewport',
        actionHint: 'Focuses the 3D astrodynamics canvas',
        icon: Globe,
        execute: () => {
          onNavigateToTab('space');
          if (targetObject) onSelectObject(targetObject);
        },
      },
      {
        id: '2d-ground-track',
        stepNumber: 2,
        badge: 'GROUND TRACK',
        title: '2D Geodetic Sub-Satellite Track & Cones',
        subtitle: 'Sub-Satellite Projection & Ground Station Visibility',
        description:
          'Projects SGP4 orbital ground tracks over a WGS84 equirectangular map alongside solar terminator boundaries and tracking station horizon cones.',
        keyFeatures: [
          'Multi-orbit past and future ground track ribbons',
          'Station line-of-sight acquisition visibility cones',
          'Real-time sub-satellite latitude, longitude, and velocity telemetry',
          'Solar sub-point and twilight terminator shading',
        ],
        actionLabel: 'Open 2D Ground Map',
        actionHint: 'Switches to the 2D geodetic track workspace',
        icon: Map,
        execute: () => {
          onNavigateToTab('map2d');
          if (targetObject) onSelectObject(targetObject);
        },
      },
      {
        id: 'catalog-search',
        stepNumber: 3,
        badge: 'CATALOG',
        title: 'Space Object Catalog & Element Filtering',
        subtitle: 'Searchable Keplerian & TLE Inventory',
        description:
          'Browse, sort, and filter all ingested catalog objects by NORAD identifier, object classification, inclination, perigee, and apogee altitude.',
        keyFeatures: [
          'Multi-column semantic table sorting and text filtering',
          'Object classification filter (Satellites, Rocket Bodies, Debris)',
          'Orbital element readout (semi-major axis, eccentricity, inclination)',
          'Direct modal inspection for pass prediction and decay profiling',
        ],
        actionLabel: 'Explore Catalog',
        actionHint: 'Opens the Space Object Database table',
        icon: Database,
        execute: () => onNavigateToTab('catalog'),
      },
      {
        id: 'conjunction-screening',
        stepNumber: 4,
        badge: 'SCREENING',
        title: 'Conjunction Screening Queue',
        subtitle: 'Orthogonal Root Solving for TCA (r_rel · v_rel = 0)',
        description:
          'Screens close approaches across altitude shells over configurable lookahead horizons and ranks encounters by miss distance, probability, and composite score.',
        keyFeatures: [
          'On-demand backend conjunction screening pass',
          'Live UTC countdowns to Time of Closest Approach (TCA)',
          'Sortable severity, miss distance, velocity, and Foster-2D Pc columns',
          'Direct triggers into Case Dossier, Replay, CAM, and CDM workflows',
        ],
        actionLabel: 'Open Conjunctions',
        actionHint: 'Opens active close-approach screening queue',
        icon: ShieldAlert,
        execute: () => {
          onNavigateToTab('conjunctions');
          if (targetConjunction) onSelectConjunction(targetConjunction);
        },
      },
      {
        id: 'risk-decomposition',
        stepNumber: 5,
        badge: 'ASSESSMENT',
        title: 'Conjunction Telemetry & Risk Decomposition',
        subtitle: 'Physical Breakdown & Collision Probability Comparison',
        description:
          'Inspect encounter miss distance, relative velocity, crossing angle geometry, combined hard-body radius, and comparative Pc estimators.',
        keyFeatures: [
          'Structured breakdown of individual risk contributors',
          'Foster-2D B-plane integral and comparative probability bounds',
          'Primary vs. secondary TLE epoch and source provenance',
          'Direct links to Replay simulation, CAM planning, and CDM export',
        ],
        actionLabel: 'Inspect Encounter',
        actionHint: 'Opens detail inspector for the highest-priority conjunction',
        icon: Crosshair,
        execute: () => {
          if (targetConjunction) onOpenConjunctionDetails(targetConjunction);
        },
      },
      {
        id: 'cinematic-replay',
        stepNumber: 6,
        badge: 'REPLAY',
        title: 'LVLH Close-Approach Time Scrubber',
        subtitle: 'Interactive ±30 Minute Relative Motion Playback',
        description:
          'Scrub relative encounter geometry around TCA with variable speed multipliers and range rings in the relative encounter frame.',
        keyFeatures: [
          'Interactive timeline scrubber from T-30m to T+30m',
          'Playback speed controls from 1x to 120x',
          'Instant separation range computation in kilometers',
          'Direct handoff to Avoidance Maneuver planning',
        ],
        actionLabel: 'Open Encounter Replay',
        actionHint: 'Launches time-scrubbed relative encounter diagram',
        icon: Play,
        execute: () => {
          if (targetConjunction) onOpenReplay(targetConjunction);
        },
      },
      {
        id: 'cam-planner',
        stepNumber: 7,
        badge: 'MANEUVERS',
        title: 'Collision Avoidance Maneuver (CAM) Planner',
        subtitle: 'Gauss Variational Burn & Tsiolkovsky Propellant Trade Space',
        description:
          'Evaluate impulsive prograde, retrograde, cross-track, and radial burn options with projected miss-distance expansion and secondary risk clearance.',
        keyFeatures: [
          'Delta-V trade matrix comparing maneuver vectors and lead times',
          'Hydrazine fuel expenditure estimated via the Tsiolkovsky equation',
          'Custom interactive Delta-V simulation slider',
          'Secondary conjunction safety screening check',
        ],
        actionLabel: 'Open CAM Planner',
        actionHint: 'Opens burn evaluation matrix for active encounter',
        icon: Rocket,
        execute: () => {
          if (targetConjunction) onOpenCAM(targetConjunction);
        },
      },
      {
        id: 'cdm-standards',
        stepNumber: 8,
        badge: 'CDM EXPORT',
        title: 'CCSDS 508.0-B-1 CDM Generator',
        subtitle: 'Standard KVN & XML Inter-Operator Dispatch',
        description:
          'Generate formatted CCSDS 508.0-B-1 Conjunction Data Messages containing state vectors, covariance metadata, and TCA telemetry.',
        keyFeatures: [
          'KVN and XML standards-compliant schema export',
          'One-click clipboard copy and local file download',
          'Metadata and relative encounter summary payload verification',
          'Audit webhook dispatch option',
        ],
        actionLabel: 'Open CDM Export',
        actionHint: 'Previews formatted CCSDS CDM message',
        icon: FileText,
        execute: () => {
          if (targetConjunction) onOpenCDM(targetConjunction);
        },
      },
      {
        id: 'trust-validation',
        stepNumber: 9,
        badge: 'VERIFICATION',
        title: 'Verification & Physics Documentation',
        subtitle: 'SGP4 Conventions, Coordinate Frames & Validation Benchmarks',
        description:
          'Inspect documented mathematical equations, geodetic frame standards (TEME / WGS84), and live backend verification benchmark results.',
        keyFeatures: [
          'Documented Foster-2D, Tsiolkovsky, and orthogonal TCA equations',
          'Coordinate frame conventions and model boundaries',
          'Live validation suite trigger in the Validation workspace',
          'Encounter-level data provenance audit',
        ],
        actionLabel: 'Open Physics Trust Center',
        actionHint: 'Opens equations and frame documentation',
        icon: ShieldCheck,
        execute: () => onOpenTrustCenter(),
      },
      {
        id: 'nasa-physics',
        stepNumber: 10,
        badge: 'ENVIRONMENT',
        title: 'Space Weather & Atmospheric Drag Models',
        subtitle: 'NOAA SWPC Feeds, Orbital Decay & Breakup Simulation',
        description:
          'Monitor observed planetary Kp and F10.7 solar radio flux alongside catalog shell density, orbital decay models, and fragmentation simulation.',
        keyFeatures: [
          'Backend-proxied NOAA SWPC Kp, F10.7, and DSCOVR solar wind telemetry',
          'Database-driven altitude shell spatial density breakdown',
          'King-Hele secular atmospheric drag lifetime projection',
          'NASA Standard Breakup Model fragment dispersion simulation',
        ],
        actionLabel: 'Open Space Weather',
        actionHint: 'Opens Space Weather & drag monitor',
        icon: Sun,
        execute: () => {
          if (onOpenSpaceWeather) onOpenSpaceWeather();
          else onNavigateToTab('analytics');
        },
      },
      {
        id: 'orbit-ai',
        stepNumber: 11,
        badge: 'COPILOT',
        title: 'Telemetry Decision Assistant',
        subtitle: 'Natural Language Conjunction & Catalog Queries',
        description:
          'Query loaded catalog statistics, highest-risk conjunctions, maneuver tradeoffs, and verification metrics grounded in backend API responses.',
        keyFeatures: [
          'Grounded queries over live database objects and encounters',
          'Quick telemetry prompts for situational briefings',
          'Direct encounter focus handoff into 3D viewport',
          'Clear attribution of computed values and timestamps',
        ],
        actionLabel: 'Open Copilot',
        actionHint: 'Launches the OrbitGuard telemetry assistant',
        icon: Bot,
        execute: () => onOpenOrbitAI(),
      },
    ],
    [
      onNavigateToTab,
      onSelectObject,
      onSelectConjunction,
      onOpenConjunctionDetails,
      onOpenReplay,
      onOpenCAM,
      onOpenCDM,
      onOpenTrustCenter,
      onOpenOrbitAI,
      onOpenSpaceWeather,
      targetObject,
      targetConjunction,
    ]
  );

  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev < steps.length - 1) {
        const next = prev + 1;
        progressRef.current = 0;
        setProgress(0);
        steps[next].execute();
        return next;
      }
      setIsAutoPlaying(false);
      return prev;
    });
  }, [steps]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev > 0) {
        const next = prev - 1;
        progressRef.current = 0;
        setProgress(0);
        steps[next].execute();
        return next;
      }
      return prev;
    });
  }, [steps]);

  const handleSelectStep = (index: number) => {
    setCurrentStepIndex(index);
    progressRef.current = 0;
    setProgress(0);
    steps[index].execute();
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    progressRef.current = 0;
    setProgress(0);
    setIsAutoPlaying(false);
    steps[0].execute();
  };

  useEffect(() => {
    if (!isOpen || viewMode === 'modal') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, handleNext, handlePrev, onClose]);

  useEffect(() => {
    if (!isOpen || !isAutoPlaying) {
      progressRef.current = 0;
      setProgress(0);
      return;
    }

    const stepDuration = 8000;
    const intervalMs = 100;
    const increment = (intervalMs / stepDuration) * 100;

    const interval = setInterval(() => {
      const next = progressRef.current + increment;
      if (next >= 100) {
        progressRef.current = 0;
        setProgress(0);
        handleNext();
      } else {
        progressRef.current = next;
        setProgress(next);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isOpen, isAutoPlaying, handleNext]);

  if (!isOpen) return null;

  if (viewMode === 'minimized') {
    return (
      <aside
        aria-label="Operator walkthrough minimized bar"
        className="fixed bottom-4 right-4 z-40 font-mono"
      >
        <div className="bg-space-900 border border-space-600 rounded-lg shadow-2xl p-2.5 flex items-center gap-3 text-slate-100">
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-md bg-space-950 border border-space-700 flex items-center justify-center text-accent-400" aria-hidden="true">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="uppercase font-semibold text-accent-400">Guide</span>
                <span className="text-slate-400 tabular-nums">
                  ({currentStepIndex + 1}/{steps.length})
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-100 truncate max-w-[180px]">
                {currentStep.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-space-800 pl-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              aria-label="Previous guide step"
              className="p-1.5 rounded-md bg-space-950 hover:bg-space-800 disabled:opacity-30 text-slate-300 border border-space-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1}
              aria-label="Next guide step"
              className="p-1.5 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-30 text-space-950"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('docked')}
              aria-label="Expand docked guide"
              className="p-1.5 rounded-md bg-space-950 hover:bg-space-800 text-slate-300 border border-space-700"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close operator guide"
              className="p-1.5 rounded-md bg-space-950 hover:bg-space-800 text-slate-400 hover:text-slate-100 border border-space-700"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (viewMode === 'docked') {
    return (
      <aside
        aria-label="Operator walkthrough docked bar"
        className="fixed bottom-3 inset-x-3 sm:inset-x-6 md:inset-x-12 lg:inset-x-20 z-40 font-mono"
      >
        <div className="bg-space-900 border border-space-600 rounded-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col">
          <div className="bg-space-950 border-b border-space-800 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-space-900 border border-space-700 text-accent-400 shrink-0" aria-hidden="true">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  Operator Manual
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  aria-label={`Jump to step ${s.stepNumber}: ${s.title}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'w-6 bg-sky-400'
                      : idx < currentStepIndex
                      ? 'w-2 bg-emerald-500/70'
                      : 'w-2 bg-space-700 hover:bg-space-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('modal')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-space-900 hover:bg-space-800 text-slate-200 border border-space-700 text-[11px]"
              >
                <Layers className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
                <span className="hidden sm:inline">Details</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('minimized')}
                aria-label="Minimize guide"
                className="p-1.5 rounded-md bg-space-900 hover:bg-space-800 text-slate-300 border border-space-700"
              >
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close guide"
                className="p-1.5 rounded-md bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 border border-space-700"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {isAutoPlaying && (
            <div className="w-full bg-space-950 h-1">
              <div className="bg-sky-400 h-1" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-md bg-space-950 border border-space-800 text-accent-400 shrink-0 mt-0.5" aria-hidden="true">
                <StepIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border bg-space-950 text-sky-300 border-sky-500/30">
                    {currentStep.badge}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">{currentStep.subtitle}</span>
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{currentStep.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2 md:line-clamp-1 font-sans">
                  {currentStep.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-space-800">
              <button
                type="button"
                onClick={currentStep.execute}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold rounded-md text-xs transition-colors whitespace-nowrap"
                title={currentStep.actionHint}
              >
                <StepIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{currentStep.actionLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                aria-pressed={isAutoPlaying}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold ${
                  isAutoPlaying
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    : 'bg-space-950 text-slate-300 border-space-700 hover:text-slate-100'
                }`}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
                <span className="hidden sm:inline">{isAutoPlaying ? 'Pause' : 'Auto'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset guide to step 1"
                className="p-1.5 bg-space-950 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-1 pl-1.5 border-l border-space-800">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  aria-label="Previous step"
                  className="p-1.5 bg-space-950 hover:bg-space-800 disabled:opacity-35 text-slate-200 rounded-md border border-space-700"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStepIndex === steps.length - 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-space-800 hover:bg-space-700 disabled:opacity-35 text-slate-100 rounded-md border border-space-600 text-xs font-semibold"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <ModalDialog
      isOpen={isOpen && viewMode === 'modal'}
      onClose={() => setViewMode('docked')}
      titleId="operator-manual-modal-title"
      maxWidthClass="max-w-3xl"
      className="bg-space-900 border border-space-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] font-mono text-slate-200"
    >
      <div className="p-4 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-space-900 border border-space-700 text-accent-400" aria-hidden="true">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                Operator Manual
              </span>
              <span className="text-slate-400 tabular-nums">
                Step {currentStep.stepNumber} of {steps.length}
              </span>
            </div>
            <h2 id="operator-manual-modal-title" className="text-sm sm:text-base font-semibold text-slate-100 mt-0.5">
              OrbitGuard Operational Reference Walkthrough
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('docked')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-space-900 hover:bg-space-800 rounded-md border border-space-700 text-slate-200 text-xs"
          >
            <Minimize2 className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
            <span>Dock Bar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close operator manual"
            className="p-1.5 bg-space-900 hover:bg-space-800 rounded-md border border-space-700 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center bg-space-950 px-4 py-2.5 border-b border-space-800 gap-1.5 overflow-x-auto">
        {steps.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelectStep(idx)}
            aria-label={`Step ${s.stepNumber}: ${s.title}`}
            className={`flex-1 min-w-[28px] h-2 rounded-full transition-colors ${
              idx === currentStepIndex
                ? 'bg-sky-400'
                : idx < currentStepIndex
                ? 'bg-emerald-500/70'
                : 'bg-space-800 hover:bg-space-700'
            }`}
          />
        ))}
      </div>

      <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-md bg-space-950 border border-space-700 text-accent-400 shrink-0" aria-hidden="true">
            <StepIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border bg-sky-500/10 text-sky-300 border-sky-500/30">
                {currentStep.badge}
              </span>
              <span className="text-xs text-slate-400">{currentStep.subtitle}</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-100">{currentStep.title}</h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-space-950 p-4 rounded-md border border-space-800 font-sans">
          {currentStep.description}
        </p>

        <div className="space-y-2 bg-space-950 p-4 rounded-md border border-space-800">
          <h4 className="text-xs font-semibold text-accent-400 uppercase tracking-wider">
            Key Module Capabilities
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-300 font-sans">
            {currentStep.keyFeatures.map((feat, fIdx) => (
              <li key={fIdx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" aria-hidden="true" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              currentStep.execute();
              setViewMode('docked');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold rounded-md text-xs transition-colors"
          >
            <StepIcon className="w-4 h-4" aria-hidden="true" />
            <span>{currentStep.actionLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              aria-pressed={isAutoPlaying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-space-700 bg-space-950 hover:bg-space-800 text-slate-200 text-xs font-semibold"
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" /> : <Play className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />}
              <span>{isAutoPlaying ? 'Pause Auto' : 'Auto Walkthrough'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset guide to step 1"
              className="p-2 bg-space-950 hover:bg-space-800 text-slate-300 rounded-md border border-space-700"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-space-950 border-t border-space-800 flex items-center justify-between mt-auto">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-space-900 hover:bg-space-800 disabled:opacity-35 text-slate-200 rounded-md text-xs font-semibold border border-space-700"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>Previous</span>
        </button>

        <span className="text-xs text-slate-400 tabular-nums">
          {currentStepIndex + 1} / {steps.length}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentStepIndex === steps.length - 1}
          className="inline-flex items-center gap-1 px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-35 text-space-950 rounded-md text-xs font-semibold"
        >
          <span>Next Step</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </ModalDialog>
  );
};
