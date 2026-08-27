import React, { useState } from 'react';
import {
  X,
  Globe,
  Map,
  ShieldAlert,
  Zap,
  Flame,
  Radio,
  FileCode,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Layers,
  Activity,
  Rocket,
  Atom,
  Eye,
  Crosshair,
  Compass,
  Satellite,
  Sun,
  Bot
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
      title: 'ORBITGUARD SPACE SITUATIONAL AWARENESS',
      badge: 'OVERVIEW',
      tagline: 'Real-Time Orbital Safety, Catalog Monitoring & Conjunction Defense',
      description: 'ORBITGUARD is a Space Situational Awareness (SSA) platform engineered for real-time tracking, ephemeris propagation, orbital safety analysis, and autonomous collision avoidance for over 32,000+ cataloged space objects.',
      cards: [
        {
          icon: Activity,
          title: 'Live SGP4 / WGS-84 Mechanics',
          desc: 'Analytical orbital mechanics with direct Space-Track and CelesTrak ephemeris feeds updated continuously.',
          accent: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20'
        },
        {
          icon: ShieldAlert,
          title: '24h Conjunction Screening',
          desc: 'Continuous multi-object close approach analysis, calculating Time of Closest Approach (TCA) and miss distances.',
          accent: 'border-rose-500/40 text-rose-300 bg-rose-950/20'
        },
        {
          icon: Satellite,
          title: 'Real-Time Telemetry',
          desc: 'Instant access to velocity vectors, altitude, apogee/perigee, inclination, and object classifications.',
          accent: 'border-blue-500/40 text-blue-300 bg-blue-950/20'
        },
        {
          icon: Rocket,
          title: 'Autonomous CAM Planning',
          desc: 'Compute optimal impulsive ΔV maneuvers (Prograde, Retrograde, Cross-Track) to mitigate collision risks.',
          accent: 'border-amber-500/40 text-amber-300 bg-amber-950/20'
        }
      ]
    },
    {
      id: 'conjunctions',
      tabTitle: 'Conjunction',
      title: 'PROACTIVE CONJUNCTION ASSESSMENT',
      badge: 'COLLISION DEFENSE',
      tagline: 'Automated Close-Encounter Detection & Collision Risk Analysis',
      description: 'Continuous 24-hour screening algorithms detect close orbital passes between active spacecraft and space debris, computing miss distances, relative velocities, and collision probabilities.',
      cards: [
        {
          icon: Crosshair,
          title: 'Miss Distance Thresholding',
          desc: 'Filter close approaches by risk severity: Critical (< 1 km), High (< 5 km), Warning (< 10 km), and Monitor (< 25 km).',
          accent: 'border-rose-500/40 text-rose-300 bg-rose-950/20'
        },
        {
          icon: ShieldAlert,
          title: 'Collision Probability (Pc)',
          desc: '2D & 3D Gaussian error covariance ellipsoids projected onto the B-plane to estimate probability of collision.',
          accent: 'border-orange-500/40 text-orange-300 bg-orange-950/20'
        },
        {
          icon: Activity,
          title: 'Live TCA Countdowns',
          desc: 'Real-time countdown timers to the exact second of closest approach, highlighting critical response windows.',
          accent: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20'
        },
        {
          icon: Zap,
          title: 'Direct One-Click Response',
          desc: 'Every row connects directly to 3D Focus, 2D Ground Track, CCSDS CDM export, Breakup Simulator, and CAM Planner.',
          accent: 'border-purple-500/40 text-purple-300 bg-purple-950/20'
        }
      ]
    },
    {
      id: '3d-visualization',
      tabTitle: '3D',
      title: 'IMMERSIVE 3D VISUALIZATION',
      badge: '3D ORBITAL GLOBE',
      tagline: 'High-Fidelity WebGL Visualization in Earth-Centered Inertial Space',
      description: 'Users can rotate, zoom, and track satellites in real-time within 3D Earth-Centered Inertial (ECI/TEME) space, providing an intuitive, interactive view of the orbital environment.',
      cards: [
        {
          icon: Eye,
          title: 'Interactive Camera Controls',
          desc: 'Orbit, pan, and zoom effortlessly around Earth. Click any spacecraft to smoothly fly the camera and lock target tracking.',
          accent: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20'
        },
        {
          icon: Compass,
          title: 'Dynamic Trajectory Paths',
          desc: 'Renders dynamic orbital ribbon ellipses, future 24h orbital projections, and animated encounter vectors between conjunction pairs.',
          accent: 'border-blue-500/40 text-blue-300 bg-blue-950/20'
        },
        {
          icon: Layers,
          title: 'Regime Altitude Shells',
          desc: 'Filter objects by orbital regime: Low Earth Orbit (LEO < 2,000 km), Medium Earth Orbit (MEO), and Geostationary (GEO).',
          accent: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
        },
        {
          icon: Globe,
          title: 'Constellation Swarm Radar',
          desc: 'Instantly highlight Starlink, OneWeb, GPS/GNSS fleets, debris clouds, or rocket body fragments.',
          accent: 'border-indigo-500/40 text-indigo-300 bg-indigo-950/20'
        }
      ]
    },
    {
      id: '2d-ground-track',
      tabTitle: '2D',
      title: '2D GROUND TRACK & SENSOR FOOTPRINTS',
      badge: 'GROUND SEGMENT',
      tagline: 'Global Sub-Satellite Points, Sensor Footprints & Day/Night Terminator',
      description: 'Translates 3D orbital state vectors into precise geodetic coordinates (Lat, Lon, Alt) over an equirectangular world projection with real-time communications coverage.',
      cards: [
        {
          icon: Map,
          title: 'Multi-Orbit Ground Tracks',
          desc: 'Plots past 1 orbit and future 2 orbital periods with color-coded ground track ribbons and sub-satellite coordinates.',
          accent: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
        },
        {
          icon: Radio,
          title: 'Line-of-Sight Visibility Cones',
          desc: 'Calculates the instantaneous radio/optical horizon circle, showing real-time ground communications coverage.',
          accent: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20'
        },
        {
          icon: Globe,
          title: '41 Worldwide Ground Stations',
          desc: 'Ground network markers across ISRO, NASA DSN, ESA ESTRACK, KSAT, and JAXA tracking facilities.',
          accent: 'border-purple-500/40 text-purple-300 bg-purple-950/20'
        },
        {
          icon: Sun,
          title: 'Day / Night Solar Terminator',
          desc: 'Dynamic real-time sub-solar point and solar terminator illumination overlay across the globe.',
          accent: 'border-amber-500/40 text-amber-300 bg-amber-950/20'
        }
      ]
    },
    {
      id: 'quick-actions',
      tabTitle: 'Quick Actions',
      title: '5 INSTANT CONJUNCTION ACTION BUTTONS',
      badge: 'OPERATOR TOOLS',
      tagline: 'Deep Dive into the 5 Real-Time Encounter Action Buttons',
      description: 'Every detected conjunction row in the table provides 5 instant one-click analysis tools for rapid decision-making:',
      cards: [
        {
          icon: Globe,
          title: '1. FOCUS 3D',
          desc: 'Smoothly flies the 3D camera directly to the encounter location, locks onto the primary satellite, and renders a dynamic dashed distance vector.',
          accent: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20'
        },
        {
          icon: Map,
          title: '2. 2D GROUND TRACK',
          desc: 'Opens the 2D world map view and plots the exact sub-satellite orbital ground tracks, geographic coordinates, and coverage circles.',
          accent: 'border-purple-500/40 text-purple-300 bg-purple-950/20'
        },
        {
          icon: FileCode,
          title: '3. CCSDS CDM',
          desc: 'Generates and previews official CCSDS 508.0-B-1 Conjunction Data Messages (CDM) in KVN or XML format for inter-agency coordination.',
          accent: 'border-blue-500/40 text-blue-300 bg-blue-950/20'
        },
        {
          icon: Atom,
          title: '4. NASA BREAKUP',
          desc: 'Simulates catastrophic hypervelocity impact fragmentation (>5 cm debris count, characteristic length Lc) and generates Gabbard plots.',
          accent: 'border-amber-500/40 text-amber-300 bg-amber-950/20'
        },
        {
          icon: Rocket,
          title: '5. PLAN CAM',
          desc: 'Calculates the optimum impulsive maneuver thrust vector (ΔV: Prograde, Retrograde, Radial, or Cross-Track) to clear the keep-out ellipsoid.',
          accent: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
        }
      ]
    },
    {
      id: 'nasa-tools',
      tabTitle: 'NASA Tools',
      title: 'MISSION OPS & ADVANCED ANALYSIS TOOLS',
      badge: 'MISSION OPS',
      tagline: 'Fragmentation Modeling, Atmospheric Lifetime & Space Weather',
      description: 'Access enterprise-grade space situational awareness tools directly from the top navigation bar or satellite telemetry inspection panels.',
      cards: [
        {
          icon: Flame,
          title: 'NASA Standard Breakup Model',
          desc: 'Simulates kinetic energy fragmentation distributions, area-to-mass ratios (A/m), and Gabbard altitude clouds.',
          accent: 'border-rose-500/40 text-rose-300 bg-rose-950/20'
        },
        {
          icon: Radio,
          title: 'Atmospheric Re-entry & Decay',
          desc: 'Estimates orbital lifetime and ballistic re-entry decay using NRLMSISE-00 thermospheric drag models.',
          accent: 'border-amber-500/40 text-amber-300 bg-amber-950/20'
        },
        {
          icon: Sun,
          title: 'Live Space Weather & Solar Flux',
          desc: 'Real-time NOAA Space Weather feeds: Planetary Kp-index, Solar Flux F10.7, and geomagnetic storm alerts.',
          accent: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20'
        },
        {
          icon: Bot,
          title: 'AI Orbital Copilot & SITREP',
          desc: 'Intelligent AI assistant capable of parsing orbital parameters, answering safety questions, and generating executive SITREPs.',
          accent: 'border-purple-500/40 text-purple-300 bg-purple-950/20'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      {/* Main Glass Panel Modal Container */}
      <main className="w-full max-w-4xl glass-panel rounded-2xl border border-space-border shadow-2xl overflow-hidden flex flex-col relative z-10 max-h-[92vh]">
        
        {/* Header Section */}
        <header className="pt-6 px-6 sm:px-8 pb-3 bg-space-dark/60 border-b border-space-border/60">
          {/* Top Bar with Step counter and Close Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full bg-space-blue border border-cyan-400/40 text-cyan-stitch text-xs font-mono font-semibold tracking-wider uppercase">
                {current.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Step {activeStep + 1} of {steps.length}
              </span>
            </div>
            
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-space-blue/50 hover:bg-space-blue text-slate-400 hover:text-white border border-space-border/50 transition-colors"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Progress Bar */}
          <div className="flex items-center w-full gap-1 mb-5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`progress-segment cursor-pointer ${idx <= activeStep ? 'active' : ''}`}
                title={`Jump to Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center justify-between overflow-x-auto gap-2 scrollbar-none">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(idx)}
                className={`nav-tab text-xs sm:text-sm font-medium whitespace-nowrap px-2 pb-2 transition-all ${
                  activeStep === idx ? 'active font-bold' : ''
                }`}
              >
                {s.tabTitle}
              </button>
            ))}
          </nav>
        </header>

        {/* Content Section */}
        <section className="flex-grow px-6 sm:px-8 py-5 overflow-y-auto flex flex-col">
          {/* Step Header */}
          <div className="w-full text-left mb-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-white uppercase mb-1">
              {current.title}
            </h1>
            <p className="text-cyan-400 text-xs sm:text-sm font-mono font-medium mb-2">
              {current.tagline}
            </p>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
              {current.description}
            </p>
          </div>

          {/* Action / Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-auto pt-2">
            {current.cards.map((card, cIdx) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={cIdx}
                  className={`bg-space-blue/40 border rounded-xl p-4 flex items-start gap-3.5 hover:bg-space-blue/70 transition-all shadow-cyan-inner group text-left ${card.accent}`}
                >
                  <div className="w-10 h-10 rounded-lg border border-cyan-400/40 flex items-center justify-center bg-space-dark/80 flex-shrink-0 group-hover:shadow-cyan-glow transition-all">
                    <CardIcon className="w-5 h-5 text-cyan-stitch" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white mb-1">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer Section */}
        <footer className="px-6 sm:px-8 py-4 bg-space-dark/80 border-t border-space-border/60 flex flex-wrap justify-between items-center gap-3 mt-auto">
          <label className="flex items-center gap-2.5 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="custom-checkbox"
            />
            <span className="text-slate-300 text-xs group-hover:text-white transition-colors">
              Don't show this guide on startup
            </span>
          </label>

          <div className="flex items-center gap-2.5">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 rounded-xl bg-space-blue hover:bg-space-blue/80 border border-space-border text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="bg-cyan-stitch text-space-dark font-bold text-xs sm:text-sm py-2 px-5 rounded-full flex items-center gap-2 hover:bg-white hover:shadow-cyan-glow transition-all duration-300 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="bg-cyan-stitch text-space-dark font-bold text-xs sm:text-sm py-2 px-6 rounded-full flex items-center gap-2 hover:bg-white hover:shadow-cyan-glow transition-all duration-300 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Launch ORBITGUARD</span>
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
};
