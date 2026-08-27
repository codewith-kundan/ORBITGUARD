import React, { useState } from 'react';
import {
  X,
  Map,
  ShieldAlert,
  Flame,
  Radio,
  FileCode,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Activity,
  Rocket,
  Crosshair,
  Compass,
  Sun,
  Eye
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'welcome',
      tabTitle: 'Welcome',
      title: 'WELCOME TO ORBITGUARD',
      subtitle: 'Space Situational Awareness (SSA) & Real-Time Collision Risk Defense',
      description: 'ORBITGUARD is an advanced SSA platform engineered for real-time tracking, SGP4 orbital propagation, close approach screening, and autonomous collision avoidance for over 32,000+ cataloged space objects.',
      badge: 'OVERVIEW',
      heroTag: 'LIVE SGP4 / WGS-84 ORBITAL ENGINE',
      heroDetails: {
        stat1: '32,340',
        label1: 'Cataloged Objects',
        stat2: '24 Hours',
        label2: 'Lookahead Screening',
        stat3: 'Live SGP4',
        label3: 'Analytical Mechanics'
      },
      cards: [
        {
          icon: Activity,
          title: 'Live Analytical Mechanics',
          desc: 'Direct ephemeris ingestion from Space-Track and CelesTrak with continuous orbital state propagation.'
        },
        {
          icon: ShieldAlert,
          title: 'Continuous Conjunction Defense',
          desc: 'Multi-object 24-hour crossing analysis, calculating Time of Closest Approach (TCA) and miss distance.'
        }
      ]
    },
    {
      id: 'conjunction',
      tabTitle: 'Conjunction',
      title: 'PROACTIVE CONJUNCTION ASSESSMENT',
      subtitle: 'Automated Close-Encounter Detection & Collision Risk Management',
      description: 'Continuous 24-hour screening algorithms detect close orbital passes between active spacecraft and space debris, computing miss distances, relative velocities, and collision probabilities.',
      badge: 'COLLISION DEFENSE',
      heroTag: 'KEEP-OUT ELLIPSOIDS & PROBABILITY OF COLLISION (Pc)',
      heroDetails: {
        stat1: '< 1.0 km',
        label1: 'Critical Threshold',
        stat2: '10⁻⁴',
        label2: 'Maneuver Trigger (Pc)',
        stat3: 'Real-Time',
        label3: 'TCA Countdown Clock'
      },
      cards: [
        {
          icon: Crosshair,
          title: 'Miss Distance Thresholding',
          desc: 'Filter close approaches by risk severity: Critical (< 1 km), High (< 5 km), Warning (< 10 km), and Monitor (< 25 km).'
        },
        {
          icon: ShieldAlert,
          title: '2D/3D Covariance Ellipsoids',
          desc: 'Gaussian error covariance projected onto the encounter B-plane to estimate accurate collision probability.'
        }
      ]
    },
    {
      id: '3d',
      tabTitle: '3D',
      title: 'IMMERSIVE 3D VISUALIZATION',
      subtitle: 'Earth-Centered Inertial (ECI/TEME) Orbital Space & Swarm Radar',
      description: 'Users can rotate, zoom, and track satellites in real-time within a 3D space, providing a comprehensive view of the orbital environment.',
      badge: '3D VISUALIZER',
      heroTag: 'GPU INSTANCED REAL-TIME 3D GLOBE',
      heroDetails: {
        stat1: 'ECI/TEME',
        label1: 'Coordinate System',
        stat2: '60 FPS',
        label2: 'GPU Instancing',
        stat3: '360° Free',
        label3: 'Orbit Camera'
      },
      cards: [
        {
          icon: Compass,
          title: 'Interactive Camera',
          desc: 'Orbit, pan, and zoom effortlessly around Earth. Click any spacecraft to smoothly lock camera tracking.'
        },
        {
          icon: Eye,
          title: 'Trajectory Prediction',
          desc: 'Dynamic multi-orbit ephemeris ribbons, future 24h path projections, and animated distance vectors.'
        }
      ]
    },
    {
      id: '2d',
      tabTitle: '2D',
      title: '2D GROUND TRACK & SENSOR COVERAGE',
      subtitle: 'Global Sub-Satellite Points, Sensor Footprints & Day/Night Terminator',
      description: 'Translates 3D orbital state vectors into precise geodetic coordinates (Lat, Lon, Alt) over an equirectangular world map with real-time ground communications coverage.',
      badge: 'GROUND SEGMENT',
      heroTag: 'EQUIRECTANGULAR GEODETIC PROJECTION',
      heroDetails: {
        stat1: '41 Stations',
        label1: 'DSN / ESTRACK / ISRO',
        stat2: '3 Orbits',
        label2: 'Past 1 + Future 2',
        stat3: 'Real-Time',
        label3: 'Solar Terminator'
      },
      cards: [
        {
          icon: Map,
          title: 'Multi-Orbit Ribbon Tracks',
          desc: 'Plots past 1 orbit and future 2 orbital periods with color-coded ground track ribbons and sub-satellite coordinates.'
        },
        {
          icon: Radio,
          title: 'Line-of-Sight Visibility Cones',
          desc: 'Calculates the instantaneous radio/optical horizon circle, showing real-time ground station communications access.'
        }
      ]
    },
    {
      id: 'conjunction-analysis',
      tabTitle: 'Conjunction (Analysis)',
      title: 'CONJUNCTION ANALYSIS & ACTION TOOLS',
      subtitle: 'Deep Dive into the 5 Real-Time Encounter Action Buttons',
      description: 'Every detected encounter in the Conjunction Assessment table provides 5 instant one-click analysis tools for rapid operational decision-making and collision avoidance.',
      badge: 'QUICK ACTIONS',
      heroTag: '5 INSTANT ENCOUNTER RESPONSE TOOLS',
      heroDetails: {
        stat1: 'Focus 3D',
        label1: 'Camera Fly-To',
        stat2: 'CCSDS CDM',
        label2: 'Official Messages',
        stat3: 'Plan CAM',
        label3: 'Impulsive ΔV Burn'
      },
      cards: [
        {
          icon: FileCode,
          title: 'CCSDS 508.0-B-1 CDM Export',
          desc: 'Generates and previews official Conjunction Data Messages (CDM) in KVN or XML format for inter-agency coordination.'
        },
        {
          icon: Rocket,
          title: 'Collision Avoidance (CAM) Planner',
          desc: 'Calculates optimum impulsive thrust vectors (ΔV: Prograde, Retrograde, Cross-Track) to clear keep-out volumes.'
        }
      ]
    },
    {
      id: 'nasa',
      tabTitle: 'NASA',
      title: 'NASA TOOLS & MISSION OPERATIONS',
      subtitle: 'NASA Standard Breakup Model, Atmospheric Lifetime & Space Weather',
      description: 'Enterprise-grade space situational awareness tools accessible from the top navigation bar or satellite telemetry inspection panels.',
      badge: 'MISSION OPS',
      heroTag: 'NASA STANDARDS & ATMOSPHERIC PHYSICS',
      heroDetails: {
        stat1: 'NASA SBM',
        label1: 'Fragmentation Model',
        stat2: 'NRLMSISE-00',
        label2: 'Thermospheric Drag',
        stat3: 'NOAA SWPC',
        label3: 'Solar Flux & Kp Index'
      },
      cards: [
        {
          icon: Flame,
          title: 'NASA Standard Breakup Model',
          desc: 'Simulates hypervelocity fragmentation (>5 cm debris count, characteristic length Lc, and orbital Gabbard clouds).'
        },
        {
          icon: Sun,
          title: 'Space Weather & Decay Lifetime',
          desc: 'Real-time NOAA planetary Kp-index, solar flux F10.7, and ballistic atmospheric drag lifetime predictions.'
        }
      ]
    }
  ];

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('orbitguard_welcome_modal_stitch_v1', 'true');
    }
    onClose(dontShowAgain);
  };

  const current = steps[activeStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-dark/85 backdrop-blur-md animate-fade-in font-sans text-white">
      {/* BEGIN: Main Modal Container */}
      <main className="w-full max-w-4xl glass-panel rounded-2xl border border-space-border shadow-2xl overflow-hidden flex flex-col relative z-10 max-h-[92vh]">
        
        {/* BEGIN: Header Section */}
        <header className="pt-7 px-6 sm:px-8 pb-3 bg-space-dark/40">
          
          {/* Progress Bar & Counter */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center w-full max-w-lg">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`progress-segment cursor-pointer ${idx <= activeStep ? 'active' : ''}`}
                  title={`Step ${idx + 1}: ${steps[idx].tabTitle}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                Step {activeStep + 1} of {steps.length}
              </span>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg bg-space-blue/50 hover:bg-space-blue text-slate-400 hover:text-white border border-space-border/50 transition-colors"
                title="Close Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex justify-between items-center border-b border-space-border pb-1 overflow-x-auto gap-2 scrollbar-none">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(idx)}
                className={`nav-tab text-xs sm:text-sm font-medium whitespace-nowrap px-1 pb-2 transition-all ${
                  activeStep === idx ? 'active font-bold' : ''
                }`}
              >
                {s.tabTitle}
              </button>
            ))}
          </nav>
        </header>
        {/* END: Header Section */}

        {/* BEGIN: Content Section */}
        <section className="flex-grow px-6 sm:px-8 py-4 overflow-y-auto flex flex-col items-center">
          
          {/* Step Header */}
          <div className="w-full text-left mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-full bg-space-blue border border-cyan-400/50 text-cyan-stitch text-[10px] font-mono font-bold uppercase tracking-wider">
                {current.badge}
              </span>
              <span className="text-xs text-cyan-400 font-mono font-semibold">
                {current.subtitle}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-white uppercase mb-2">
              {current.title}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Central Visualization Hero Container */}
          <div className="w-full max-w-3xl h-44 sm:h-52 relative mb-5 rounded-xl overflow-hidden border border-space-border/60 bg-gradient-to-br from-space-blue/60 via-space-dark to-[#050b1a] flex flex-col justify-between p-4 shadow-inner relative group">
            {/* Ambient Starry / Grid Background */}
            <div className="absolute inset-0 radar-grid opacity-30 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Top Bar of Hero */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-stitch animate-pulse" />
                <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-stitch uppercase">
                  {current.heroTag}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-space-dark/80 border border-space-border/60">
                ORBITGUARD ENGINE v1.0
              </span>
            </div>

            {/* Central Visual Graphic */}
            <div className="my-auto flex items-center justify-around z-10 w-full py-2">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                  {current.heroDetails.stat1}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 font-mono">
                  {current.heroDetails.label1}
                </div>
              </div>
              
              <div className="h-8 w-px bg-space-border/60" />
              
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-stitch tracking-tight">
                  {current.heroDetails.stat2}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 font-mono">
                  {current.heroDetails.label2}
                </div>
              </div>
              
              <div className="h-8 w-px bg-space-border/60" />
              
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                  {current.heroDetails.stat3}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 font-mono">
                  {current.heroDetails.label3}
                </div>
              </div>
            </div>

            {/* Bottom Status Ticker */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 z-10 border-t border-space-border/40 pt-2">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                <span>ACTIVE TELEMETRY & PROPAGATION ACTIVE</span>
              </div>
              <span className="text-slate-500">18TH SDS SPACE-TRACK SYNCED</span>
            </div>
          </div>

          {/* Action Cards (Stitch Design) */}
          <div className="w-full flex flex-col md:flex-row gap-4 justify-center">
            {current.cards.map((card, cIdx) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={cIdx}
                  className="flex-1 bg-space-blue/50 border border-cyan-400/30 rounded-xl p-4 flex items-center gap-4 hover:bg-space-blue hover:border-cyan-stitch transition-all shadow-cyan-inner group cursor-pointer text-left"
                >
                  <div className="w-12 h-12 rounded-lg border border-cyan-400/50 flex items-center justify-center bg-space-dark/60 flex-shrink-0 group-hover:shadow-cyan-glow transition-all">
                    <CardIcon className="w-6 h-6 text-cyan-stitch" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm sm:text-base text-white block mb-0.5">
                      {card.title}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {/* END: Content Section */}

        {/* BEGIN: Footer Section */}
        <footer className="px-6 sm:px-8 py-4 bg-space-dark/80 border-t border-space-border/60 flex justify-between items-center mt-auto">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="custom-checkbox"
            />
            <span className="text-slate-300 text-xs sm:text-sm group-hover:text-white transition-colors">
              Don't show this guide on startup
            </span>
          </label>

          <div className="flex items-center gap-3">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 rounded-full bg-space-blue hover:bg-space-blue/80 border border-space-border text-slate-200 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="bg-cyan-stitch text-space-dark font-bold py-2 sm:py-2.5 px-6 rounded-full flex items-center gap-2 hover:bg-white hover:shadow-cyan-glow transition-all duration-300 cursor-pointer text-xs sm:text-sm"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4 text-space-dark" />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="bg-cyan-stitch text-space-dark font-bold py-2 sm:py-2.5 px-6 rounded-full flex items-center gap-2 hover:bg-white hover:shadow-cyan-glow transition-all duration-300 cursor-pointer text-xs sm:text-sm"
              >
                <CheckCircle className="w-4 h-4 text-space-dark" />
                <span>Launch ORBITGUARD</span>
              </button>
            )}
          </div>
        </footer>
        {/* END: Footer Section */}
      </main>
      {/* END: Main Modal Container */}
    </div>
  );
};
