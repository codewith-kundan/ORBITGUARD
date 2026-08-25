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
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  const sections = [
    {
      id: 'welcome',
      title: 'Welcome to ORBITGUARD',
      icon: Sparkles,
      color: 'from-cyan-500 to-blue-600',
      badge: 'OVERVIEW',
      tagline: 'Real-Time Space Situational Awareness (SSA) & Collision Risk Management',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            <strong className="text-white">ORBITGUARD</strong> is an enterprise-grade SSA platform designed for real-time tracking, ephemeris propagation, orbital safety analysis, and autonomous collision avoidance for over <strong className="text-cyan-400">32,000+ cataloged space objects</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-space-950/80 rounded-xl border border-cyan-500/20 flex items-start gap-2.5">
              <Activity className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Live SGP4 / WGS-84</h4>
                <p className="text-[11px] text-slate-400">Analytical orbital mechanics with direct Space-Track and CelesTrak feeds.</p>
              </div>
            </div>
            <div className="p-3 bg-space-950/80 rounded-xl border border-danger-500/20 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Conjunction Screening</h4>
                <p className="text-[11px] text-slate-400">Continuous 24-hour crossing analysis and TCA miss-distance calculation.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: '3d-radar',
      title: '3D Orbital Globe & Swarm Radar',
      icon: Globe,
      color: 'from-blue-500 to-indigo-600',
      badge: 'VISUALIZATION',
      tagline: 'High-Fidelity 3D WebGL Visualization of Satellites & Debris',
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            The <strong className="text-white">3D Orbit Tracker</strong> renders active space assets in Earth-Centered Inertial (<strong className="text-cyan-400">ECI/TEME</strong>) space, updated in real time via GPU instancing.
          </p>
          <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
            <li><strong className="text-white">Fleet Filters:</strong> Use the left <em>Orbital Radar</em> panel to isolate Starlink, OneWeb, GPS/GNSS, Debris Clouds, or Rocket Bodies.</li>
            <li><strong className="text-white">Regime Altitude Shells:</strong> Filter by LEO (&lt;2,000 km), MEO (2,000–35,000 km), or GEO (&gt;35,000 km).</li>
            <li><strong className="text-white">Interactive Object Selection:</strong> Click on any satellite dot to view its live telemetry, velocity vector, apogee/perigee, and orbital altitude.</li>
            <li><strong className="text-white">Time Simulation:</strong> Use the bottom time scrubber to fast-forward orbits up to 24 hours into the future.</li>
          </ul>
        </div>
      )
    },
    {
      id: '2d-ground-track',
      title: '2D Ground Track & Coverage Footprints',
      icon: Map,
      color: 'from-emerald-500 to-teal-600',
      badge: 'GROUND SEGMENT',
      tagline: 'Global Sub-Satellite Points, Sensor Footprints & Day/Night Terminator',
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            The <strong className="text-white">2D Ground Track Map</strong> converts 3D orbital state vectors into precise geodetic coordinates (<strong className="text-emerald-400">Lat, Lon, Alt</strong>) over an equirectangular projection.
          </p>
          <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
            <li><strong className="text-white">Multi-Orbit Track Ribbons:</strong> Displays the past 1 orbit and future 2 orbits of any active spacecraft.</li>
            <li><strong className="text-white">Line-of-Sight Footprints:</strong> Renders the instantaneous geometric horizon circle for radio or optical communications.</li>
            <li><strong className="text-white">41 Worldwide Ground Stations:</strong> Displays stations across ISRO, NASA DSN, ESA ESTRACK, KSAT, and JAXA facilities.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'conjunctions',
      title: 'Conjunction Assessment & CAM Planner',
      icon: ShieldAlert,
      color: 'from-red-500 to-rose-600',
      badge: 'COLLISION DEFENSE',
      tagline: 'Proactive Close-Encounter Detection & Maneuver Burn Computation',
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            ORBITGUARD screens potential crossing orbits to identify close approaches and calculate collision risk factors.
          </p>
          <div className="p-3 bg-space-950/80 rounded-xl border border-red-500/20 text-xs space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-warning-400" />
              <span>Collision Avoidance Maneuvers (CAM)</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Click the <strong className="text-cyan-300 font-mono">⚡ CAM</strong> button on any high-risk conjunction row to calculate optimum delta-V (<strong className="text-white font-mono">&Delta;V</strong>) burns (Prograde, Retrograde, Radial, or Cross-Track) to clear the keep-out ellipsoid.
            </p>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
            <li><strong className="text-white">TCA Countdowns:</strong> Displays live time-to-closest-approach timers.</li>
            <li><strong className="text-white">Direct 3D & 2D Focus:</strong> Jump directly to visual encounter paths with one click.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'advanced-tools',
      title: 'NASA Breakup, Decay & CDM Compliance',
      icon: Layers,
      color: 'from-purple-500 to-pink-600',
      badge: 'MISSION OPS',
      tagline: 'Fragmentation Modeling, Atmospheric Lifetime & CCSDS Compliance',
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-space-950/80 rounded-xl border border-space-800">
              <Flame className="w-4 h-4 text-warning-400 mb-1" />
              <h5 className="font-bold text-white">NASA Breakup</h5>
              <p className="text-[10px] text-slate-400">Simulates catastrophic hypervelocity collisions and debris Gabbard plots.</p>
            </div>
            <div className="p-2.5 bg-space-950/80 rounded-xl border border-space-800">
              <Radio className="w-4 h-4 text-cyan-400 mb-1" />
              <h5 className="font-bold text-white">Re-entry & Decay</h5>
              <p className="text-[10px] text-slate-400">Atmospheric drag lifetime estimation using NRLMSISE-00 density models.</p>
            </div>
            <div className="p-2.5 bg-space-950/80 rounded-xl border border-space-800">
              <FileCode className="w-4 h-4 text-emerald-400 mb-1" />
              <h5 className="font-bold text-white">CDM & Webhooks</h5>
              <p className="text-[10px] text-slate-400">Exports official CCSDS 508.0-B-1 XML/KVN Conjunction Data Messages.</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Access these tools anytime from the top navigation bar or directly within satellite telemetry modals.
          </p>
        </div>
      )
    }
  ];

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('orbitguard_user_guide_seen', 'true');
    }
    onClose(dontShowAgain);
  };

  const currentSection = sections[activeSection];
  const IconComponent = currentSection.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-2xl bg-space-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-5 bg-gradient-to-r ${currentSection.color} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/30 backdrop-blur-sm rounded-xl border border-white/20">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/40 rounded-full border border-white/20">
                  {currentSection.badge}
                </span>
                <span className="text-[10px] text-white/80">
                  Step {activeSection + 1} of {sections.length}
                </span>
              </div>
              <h3 className="text-lg font-bold tracking-wide mt-0.5">{currentSection.title}</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-space-800 bg-space-950 overflow-x-auto text-xs scrollbar-none">
          {sections.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(idx)}
              className={`px-4 py-2.5 whitespace-nowrap transition border-b-2 flex items-center gap-1.5 ${
                activeSection === idx
                  ? 'border-cyan-400 text-cyan-neon font-bold bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{idx + 1}. {s.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="text-xs text-cyan-400 uppercase tracking-wider font-semibold">
            {currentSection.tagline}
          </div>
          {currentSection.content}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-space-800 bg-space-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-space-900 border-space-700 text-cyan-500 focus:ring-cyan-500/30"
            />
            <span>Don't show this guide on startup</span>
          </label>

          <div className="flex items-center gap-2">
            {activeSection > 0 && (
              <button
                onClick={() => setActiveSection(activeSection - 1)}
                className="px-3.5 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white transition"
              >
                Previous
              </button>
            )}

            {activeSection < sections.length - 1 ? (
              <button
                onClick={() => setActiveSection(activeSection + 1)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Get Started</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
