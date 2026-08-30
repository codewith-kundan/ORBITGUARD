import React, { useState, useEffect, useCallback } from 'react';
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
  Layers
} from 'lucide-react';
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
  badgeColor: string;
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
  stats: _stats,
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
  onOpenBreakup: _onOpenBreakup,
  onTriggerScreening: _onTriggerScreening
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'docked' | 'modal' | 'minimized'>('docked');
  const [progress, setProgress] = useState<number>(0);

  const targetConjunction = conjunctions.find(c => c.risk_level === 'CRITICAL' || c.risk_score >= 80.0) || conjunctions[0];
  const targetObject = objects.find(o => o.name?.includes('ISS') || o.object_type === 'ACTIVE_SATELLITE') || objects[0];

  const steps: GuideStep[] = [
    {
      id: '3d-mission-control',
      stepNumber: 1,
      badge: 'MISSION CONTROL',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      title: '3D Space Mission Control & Orbital Mechanics',
      subtitle: 'Earth-Centered Inertial (ECI / TEME) Propagation',
      description: 'OrbitGuard propagates over 32,000+ satellites, rocket bodies, and debris objects in real time. The 3D globe features realistic day/night solar illumination, customizable constellation filters (Starlink, GPS, Debris, Payloads), and smooth camera locks on any spacecraft.',
      keyFeatures: [
        'Vectorized SGP4 orbital propagation at 60 FPS',
        'Real-time solar terminator & night-side city lights',
        'Orbital altitude shells: LEO (<2000 km), MEO, and GEO',
        'Click any satellite to lock camera & inspect live state vector'
      ],
      actionLabel: 'Launch 3D Mission Control',
      actionHint: 'Switches to the 3D globe and focuses on live orbital space',
      icon: Globe,
      execute: () => {
        onNavigateToTab('space');
        if (targetObject) onSelectObject(targetObject);
      }
    },
    {
      id: '2d-ground-track',
      stepNumber: 2,
      badge: 'GROUND SEGMENT',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      title: '2D Ground Track & Geodetic Coverage',
      subtitle: 'Sub-Satellite Points & Deep Space Network Station Cones',
      description: 'Translates 3D inertial coordinates into geodetic latitude/longitude over an equirectangular world map. Displays past and future orbital track ribbons, live ground station communication cones (NASA DSN, ESA ESTRACK, ISRO ISTRAC), and solar sub-point tracking.',
      keyFeatures: [
        'Multi-orbit ground track ribbons (Past 1 + Future 2 orbits)',
        '41+ real-time Ground Station Line-of-Sight visibility cones',
        'Dynamic day/night solar terminator with twilight gradient',
        'Live sub-satellite coordinate telemetry readout'
      ],
      actionLabel: 'Open 2D Ground Map',
      actionHint: 'Switches to the 2D world map with ground stations',
      icon: Map,
      execute: () => {
        onNavigateToTab('map2d');
        if (targetObject) onSelectObject(targetObject);
      }
    },
    {
      id: 'catalog-search',
      stepNumber: 3,
      badge: 'SPACE CATALOG',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      title: 'Global Space Object Catalog & Ingestion',
      subtitle: '32,000+ Tracked Satellites, Payloads & Debris Objects',
      description: 'Search, filter, and inspect the entire catalog ingested directly from Space-Track (18th Space Defense Squadron) and CelesTrak. Filter by object classification, apogee, perigee, inclination, country of origin, and radar cross-section (RCS).',
      keyFeatures: [
        'Instant multi-parameter search & column sorting',
        'Filter by Object Type (Payload, Rocket Body, Debris)',
        'Real-time orbital elements (semi-major axis, eccentricity, RAAN)',
        'One-click fly-to and telemetry modal inspection'
      ],
      actionLabel: 'Explore Catalog Matrix',
      actionHint: 'Opens the full Space Object Database',
      icon: Database,
      execute: () => {
        onNavigateToTab('catalog');
      }
    },
    {
      id: 'conjunction-screening',
      stepNumber: 4,
      badge: 'COLLISION SCREENING',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: 'Real-Time Conjunction Screening Engine',
      subtitle: 'Sub-Second Time of Closest Approach (TCA) Detection',
      description: 'Continuous 24-hour lookahead screening filters overlapping altitude shells and performs orthogonal root-finding (r_rel · v_rel = 0) to compute exact sub-second close approaches between operational satellites and dangerous debris.',
      keyFeatures: [
        'Automated 24h lookahead screening engine with threshold tuning',
        'Real-time TCA countdown timers and distance warning levels',
        'Risk severity categorization (Critical <1 km, High <5 km, Warning <10 km)',
        'Immediate notification integration with alert banners'
      ],
      actionLabel: 'Inspect Conjunction Matrix',
      actionHint: 'Opens active conjunctions and selects the highest-risk encounter',
      icon: ShieldAlert,
      execute: () => {
        onNavigateToTab('conjunctions');
        if (targetConjunction) onSelectConjunction(targetConjunction);
      }
    },
    {
      id: 'risk-decomposition',
      stepNumber: 5,
      badge: 'RISK EXPLAINABILITY',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      title: 'Explainable Collision Risk & Encounter Telemetry',
      subtitle: 'Multi-Factor Physical Breakdown & B-Plane Covariance',
      description: 'OrbitGuard moves beyond opaque "black box" scores by providing a complete 6-factor physical decomposition: Miss Distance, Relative Velocity, Crossing Angle Geometry, Combined Hard-Body Radius, Lead Time, and B-plane covariance ellipse alignment with Foster-2D & Monte Carlo collision probability (Pc).',
      keyFeatures: [
        'Transparent 6-factor physical risk score weighting',
        'Foster-2D & Monte Carlo collision probability (Pc) estimation',
        'Encounter B-plane coordinate frame error covariance mapping',
        'Actionable guidance on whether maneuver intervention is mandatory'
      ],
      actionLabel: 'Open Encounter Inspector',
      actionHint: 'Opens deep telemetry & risk decomposition for the critical encounter',
      icon: Crosshair,
      execute: () => {
        if (targetConjunction) onOpenConjunctionDetails(targetConjunction);
      }
    },
    {
      id: 'cinematic-replay',
      stepNumber: 6,
      badge: '3D TIME-WARP',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      title: 'Cinematic 3D Close-Approach Replay',
      subtitle: 'Time-Scrubbed Operator Telemetry & Trajectory Analysis',
      description: 'Operators can visually simulate and scrub through the encounter in full 3D space with variable playback speeds (1x to 120x). The replay renders dynamic separation distance vectors, relative velocity arrows, and keep-out safety spheres as the objects pass TCA.',
      keyFeatures: [
        'Interactive time scrubber with play, pause, and speed multiplier',
        'Real-time separation distance readout down to single meters',
        'Dynamic 3D velocity vectors and relative crossing geometry',
        'Closest Approach (TCA) visual pulse and warning indicators'
      ],
      actionLabel: 'Launch 3D Replay Simulator',
      actionHint: 'Opens the interactive 3D encounter time-scrubber',
      icon: Play,
      execute: () => {
        if (targetConjunction) onOpenReplay(targetConjunction);
      }
    },
    {
      id: 'cam-planner',
      stepNumber: 7,
      badge: 'DECISION SUPPORT',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'Collision Avoidance Maneuver (CAM) Planner',
      subtitle: 'Optimal Delta-V & Thruster Burn Fuel Optimization',
      description: 'Calculates the optimal impulsive burn vector (Prograde, Retrograde, Cross-Track, Radial) to clear keep-out safety ellipsoids. Uses the Tsiolkovsky rocket equation to quantify delta-V requirements, hydrazine fuel consumption, and projected miss distance gain.',
      keyFeatures: [
        'Optimal burn strategy calculation (Prograde vs Retrograde vs Out-of-Plane)',
        'Tsiolkovsky rocket equation fuel mass & lifetime penalty estimation',
        'Interactive delta-V adjustment with live clearance projection',
        'One-click maneuver execution plan export'
      ],
      actionLabel: 'Open CAM Maneuver Planner',
      actionHint: 'Opens the optimal thruster burn calculation panel',
      icon: Rocket,
      execute: () => {
        if (targetConjunction) onOpenCAM(targetConjunction);
      }
    },
    {
      id: 'cdm-standards',
      stepNumber: 8,
      badge: 'AEROSPACE STANDARDS',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      title: 'CCSDS 508.0-B-1 Conjunction Data Message (CDM) Export',
      subtitle: 'Inter-Agency Interoperability for Civil & Defense Operators',
      description: 'Generates and validates official Conjunction Data Messages (CDM) adhering strictly to CCSDS 508.0-B-1 Blue Book standards. Exportable in both Key-Value Notation (KVN) and XML formats, ready for immediate dispatch to Space-Track, ESA, NASA CARA, and satellite owner-operators.',
      keyFeatures: [
        'Strict CCSDS 508.0-B-1 compliant KVN & XML formatting',
        'Full state vector, covariance matrix, and encounter metadata export',
        'One-click clipboard copy and downloadable .cdm / .xml files',
        'Standardized integration with international SSA coordination networks'
      ],
      actionLabel: 'Preview & Export CDM',
      actionHint: 'Opens the official CDM generator & message viewer',
      icon: FileText,
      execute: () => {
        if (targetConjunction) onOpenCDM(targetConjunction);
      }
    },
    {
      id: 'trust-validation',
      stepNumber: 9,
      badge: 'SCIENTIFIC VERIFICATION',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'Trust Center & Mathematical Verification',
      subtitle: 'Astrodynamics Derivations, Benchmark Tests & Error Bounds',
      description: 'Review full analytical formulas for Foster-2D collision probability, coordinate frame transformations (TEME to ITRF/WGS-84), SGP4 propagator limits, and our 44-test automated verification suite.',
      keyFeatures: [
        'Complete mathematical proofs and formulas displayed in LaTeX',
        'WGS-84 Earth gravitation constants and atmospheric assumptions',
        'Transparent error bounds and covariance matrix limitations',
        '44/44 automated continuous integration test suite passing'
      ],
      actionLabel: 'Open Trust & Validation Center',
      actionHint: 'Opens verified derivations, accuracy benchmarks, and test suites',
      icon: ShieldCheck,
      execute: () => {
        onOpenTrustCenter();
      }
    },
    {
      id: 'nasa-physics',
      stepNumber: 10,
      badge: 'SPACE PHYSICS',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: 'NASA Standards & Space Weather Physics',
      subtitle: 'Atmospheric Drag, NOAA Solar Flux & Breakup Models',
      description: 'OrbitGuard integrates real-time NOAA Space Weather (Planetary Kp Index, Solar Radio Flux F10.7) to model thermospheric density variations and orbital drag decay. Also includes the NASA Standard Breakup Model to simulate hypervelocity fragmentation clouds.',
      keyFeatures: [
        'NOAA SWPC real-time solar flux & geomagnetic storm monitoring',
        'NRLMSISE-00 atmospheric drag density & orbital lifetime decay',
        'NASA Standard Breakup Model & Gabbard cloud dispersion',
        'Kessler Syndrome critical orbital shell density analytics'
      ],
      actionLabel: 'Open Space Weather & Physics',
      actionHint: 'Opens real-time NOAA space weather and drag models',
      icon: Sun,
      execute: () => {
        if (onOpenSpaceWeather) onOpenSpaceWeather();
        else onNavigateToTab('analytics');
      }
    },
    {
      id: 'orbit-ai',
      stepNumber: 11,
      badge: 'AI COPILOT',
      badgeColor: 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/50',
      title: 'Orbit AI Autonomous Space Situational Copilot',
      subtitle: 'Natural Language Astrodynamics & Conjunction Intelligence',
      description: 'Interact with Orbit AI, our specialized Gemini-powered space copilot. Ask natural language questions regarding orbital ephemeris, analyze complex conjunction geometries, generate maneuver recommendations, and inspect system telemetry with AI assistance.',
      keyFeatures: [
        'Natural language astrodynamics reasoning and telemetry explanation',
        'Context-aware knowledge of all live catalog objects & encounters',
        'Instant calculations for orbital periods, ground passes, and burns',
        'Interactive quick-prompt cards for rapid operational analysis'
      ],
      actionLabel: 'Launch Orbit AI Copilot',
      actionHint: 'Opens the specialized AI assistant window',
      icon: Bot,
      execute: () => {
        onOpenOrbitAI();
      }
    }
  ];

  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      setProgress(0);
      steps[next].execute();
    } else {
      setIsAutoPlaying(false);
    }
  }, [currentStepIndex, steps]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      setCurrentStepIndex(prev);
      setProgress(0);
      steps[prev].execute();
    }
  }, [currentStepIndex, steps]);

  const handleSelectStep = (index: number) => {
    setCurrentStepIndex(index);
    setProgress(0);
    steps[index].execute();
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setProgress(0);
    setIsAutoPlaying(false);
    steps[0].execute();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (viewMode === 'modal') {
          setViewMode('docked');
        } else {
          onClose();
        }
      } else if (e.key === ' ' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsAutoPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose, viewMode]);

  // Auto-play timer with smooth progress bar
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) {
      setProgress(0);
      return;
    }

    const stepDuration = 8000; // 8 seconds per step
    const intervalMs = 100;
    const progressIncrement = (intervalMs / stepDuration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + progressIncrement;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isOpen, isAutoPlaying, handleNext]);

  // Execute first step on open if at step 0
  useEffect(() => {
    if (isOpen && currentStepIndex === 0) {
      steps[0].execute();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // MINIMIZED FLOATING PILL
  if (viewMode === 'minimized') {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300 font-mono">
        <div className="bg-space-950/95 border border-cyan-500/60 rounded-2xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-xl text-white">
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-cyan-300">LIVE GUIDE</span>
                <span className="text-[10px] text-slate-400">({currentStepIndex + 1}/{steps.length})</span>
              </div>
              <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{currentStep.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-space-800 pl-2">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 text-slate-300 hover:text-white border border-space-700"
              title={isAutoPlaying ? 'Pause Auto Tour' : 'Start Auto Tour'}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 disabled:opacity-30 text-slate-300"
              title="Previous Step"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1}
              className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-space-950 font-bold"
              title="Next Step"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('docked')}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 text-slate-300 hover:text-white border border-space-700"
              title="Expand Guide"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white"
              title="Close Guide"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DOCKED COMPANION MODE (Bottom Bar - Non-intrusive, allows operating web app)
  if (viewMode === 'docked') {
    return (
      <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 md:inset-x-12 lg:inset-x-20 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 font-mono">
        <div className="bg-space-950/95 border-2 border-cyan-500/60 rounded-2xl shadow-[0_10px_35px_rgba(0,242,255,0.15)] overflow-hidden backdrop-blur-2xl text-white flex flex-col">
          {/* Top Progress & Quick Navigation Strip */}
          <div className="bg-space-900/90 border-b border-space-800 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex-shrink-0">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  LIVE PLATFORM GUIDE
                </span>
                <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
            </div>

            {/* Step Pills Quick Navigation */}
            <div className="hidden md:flex items-center gap-1 overflow-x-auto max-w-md scrollbar-none">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'w-6 bg-cyan-400 shadow-[0_0_8px_#00f2ff]'
                      : idx < currentStepIndex
                      ? 'w-2 bg-emerald-500/70 hover:bg-emerald-400'
                      : 'w-2 bg-space-800 hover:bg-space-700'
                  }`}
                  title={`Step ${s.stepNumber}: ${s.title}`}
                />
              ))}
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('modal')}
                className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white border border-space-700 transition text-[10px] flex items-center gap-1"
                title="Full Detailed Walkthrough View"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">DETAILS</span>
              </button>
              <button
                onClick={() => setViewMode('minimized')}
                className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white border border-space-700 transition"
                title="Minimize Guide into Floating Pill"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white transition"
                title="Exit Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto-Play Progress Bar */}
          {isAutoPlaying && (
            <div className="w-full bg-space-900 h-1">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1 transition-all duration-100 ease-linear shadow-[0_0_8px_#00f2ff]"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Main Docked Body */}
          <div className="p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 rounded-xl bg-space-900 border border-space-700 text-cyan-400 flex-shrink-0 mt-0.5">
                <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${currentStep.badgeColor}`}>
                    {currentStep.badge}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold truncate">{currentStep.subtitle}</span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">{currentStep.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2 md:line-clamp-1 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>
            </div>

            {/* Action Buttons & Navigation */}
            <div className="flex items-center justify-between w-full md:w-auto gap-2.5 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-space-800">
              {/* Step Live Action Trigger */}
              <button
                onClick={currentStep.execute}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-space-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                title={currentStep.actionHint}
              >
                <StepIcon className="w-3.5 h-3.5" />
                <span>{currentStep.actionLabel}</span>
              </button>

              {/* Auto Tour Toggle */}
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-semibold transition ${
                  isAutoPlaying
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-space-900 text-slate-300 border-space-700 hover:text-white'
                }`}
                title={isAutoPlaying ? 'Pause Automated Tour' : 'Start Automated Live Tour (8s per step)'}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                <span className="hidden sm:inline">{isAutoPlaying ? 'PAUSE' : 'AUTO'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-2 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-xl border border-space-700 transition"
                title="Restart Tour from Step 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Step Navigation Arrows */}
              <div className="flex items-center gap-1 pl-1 border-l border-space-800">
                <button
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="p-2 bg-space-900 hover:bg-space-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 rounded-xl border border-space-700 transition"
                  title="Previous Step (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentStepIndex === steps.length - 1}
                  className="flex items-center gap-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-space-950 rounded-xl text-xs font-bold transition shadow-md"
                  title="Next Step (Right Arrow)"
                >
                  <span className="hidden sm:inline">NEXT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODAL / EXPANDED DETAILED WALKTHROUGH MODE
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-mono animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-space-950 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-space-900 border-b border-space-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  LIVE INTERACTIVE PLATFORM GUIDE
                </span>
                <span className="text-xs text-slate-400">
                  Step {currentStep.stepNumber} of {steps.length}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Real-Time Space Situational Awareness Walkthrough
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('docked')}
              className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-cyan-300 transition flex items-center gap-1 text-xs"
              title="Dock Guide to Bottom Bar to interact with live page"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Dock View</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Navigation Pill Strip */}
        <div className="flex items-center bg-space-950 px-4 py-2.5 border-b border-space-800 gap-1.5 overflow-x-auto">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => handleSelectStep(idx)}
              className={`flex-1 min-w-[28px] h-2 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'bg-cyan-400 shadow-[0_0_8px_#00f2ff]'
                  : idx < currentStepIndex
                  ? 'bg-emerald-500/60'
                  : 'bg-space-800 hover:bg-space-700'
              }`}
              title={`Step ${s.stepNumber}: ${s.title}`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3.5">
            <div className="p-3.5 rounded-xl bg-space-900 border border-space-700 text-cyan-neon flex-shrink-0">
              <StepIcon className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${currentStep.badgeColor}`}>
                  {currentStep.badge}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{currentStep.subtitle}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{currentStep.title}</h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-space-900/80 p-4 rounded-xl border border-space-800">
            {currentStep.description}
          </p>

          {/* Key Operational Features Checklist */}
          <div className="space-y-2 bg-space-900/40 p-4 rounded-xl border border-space-800">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Core Capabilities & Astrodynamics Tools</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {currentStep.keyFeatures.map((feat, fIdx) => (
                <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  currentStep.execute();
                  setViewMode('docked');
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-space-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center gap-2"
              >
                <StepIcon className="w-4 h-4" />
                <span>{currentStep.actionLabel}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (Docks guide and applies this view live)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
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
        <div className="p-4 bg-space-900 border-t border-space-800 flex items-center justify-between mt-auto">
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
