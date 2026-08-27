import React from 'react';
import { 
  Radio, 
  Satellite, 
  LineChart, 
  Cpu, 
  ArrowRight,
  Shield
} from 'lucide-react';

interface MarketingLandingPageProps {
  onEnterApp?: () => void;
  onLogin?: () => void;
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onEnterApp,
  onLogin
}) => {
  return (
    <div className="min-h-screen bg-[#050914] text-white flex flex-col font-sans relative selection:bg-cyan-500 selection:text-space-950 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="relative z-30 px-6 sm:px-12 py-4 flex items-center justify-between border-b border-slate-800/60 bg-space-950/80 backdrop-blur-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={onEnterApp}>
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 shadow-cyan-inner group-hover:shadow-cyan-glow transition-all">
            <Radio className="w-4 h-4 text-cyan-stitch animate-pulse" />
          </div>
          <span className="text-base sm:text-lg font-bold font-mono tracking-wider text-white group-hover:text-cyan-stitch transition">
            ORBITGUARD
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono tracking-wider text-slate-300">
          <a href="#solutions" className="hover:text-cyan-stitch transition">SOLUTIONS</a>
          <a href="#platform" className="hover:text-cyan-stitch transition">PLATFORM</a>
          <a href="#about" className="hover:text-cyan-stitch transition">ABOUT</a>
          <a href="#contact" className="hover:text-cyan-stitch transition">CONTACT</a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin || onEnterApp}
            className="px-5 py-1.5 rounded-full bg-space-blue/80 hover:bg-space-blue border border-cyan-500/40 hover:border-cyan-300 text-xs font-mono font-bold text-cyan-stitch hover:text-white transition shadow-sm"
          >
            LOGIN
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-grow flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center overflow-hidden">
        {/* Deep Space & Orbital Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-40 mix-blend-screen"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 40%, rgba(0, 242, 255, 0.15), transparent 60%), radial-gradient(circle at 50% 50%, rgba(10, 25, 60, 0.8), transparent 80%)`
          }}
        />

        {/* Stylized Earth Wireframe / Orbital Halo Graphic */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] h-[700px] sm:h-[900px] rounded-full border border-cyan-500/10 pointer-events-none animate-spin" style={{ animationDuration: '120s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] sm:w-[750px] h-[550px] sm:h-[750px] rounded-full border border-blue-500/15 pointer-events-none" />

        {/* Central Glassmorphic Card (Stitch Design) */}
        <div className="relative z-20 w-full max-w-3xl glass-panel bg-space-dark/85 border border-space-border/80 rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl shadow-cyan-inner">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-blue border border-cyan-400/40 text-cyan-stitch text-xs font-mono font-semibold tracking-wider uppercase mb-6">
            <Shield className="w-3.5 h-3.5 text-cyan-stitch" />
            <span>SPACE SITUATIONAL AWARENESS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase leading-tight mb-4">
            SECURE YOUR ORBITAL ASSETS.<br />
            WELCOME TO <span className="text-cyan-stitch drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]">MISSION CONTROL</span>.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8 font-mono leading-relaxed">
            Advanced Space Situational Awareness, real-time SGP4 orbital propagation, and automated conjunction defense.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-cyan-stitch text-space-dark font-bold font-mono text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-white hover:shadow-cyan-glow transition-all duration-300 shadow-lg cursor-pointer"
            >
              <span>REQUEST ACCESS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-5">
            <button
              onClick={onLogin || onEnterApp}
              className="text-xs font-mono text-slate-400 hover:text-cyan-stitch transition underline underline-offset-4"
            >
              ALREADY A MEMBER? <span className="text-cyan-stitch font-bold">LOGIN</span>
            </button>
          </div>
        </div>
      </section>

      {/* Lower Curved Feature Dock (Stitch Design) */}
      <section className="relative z-20 bg-slate-900/90 border-t border-space-border/60 py-12 px-6 sm:px-12 backdrop-blur-md text-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-space-dark/60 border border-space-border/50 hover:border-cyan-400/40 transition-all shadow-sm group">
            <div className="w-14 h-14 rounded-2xl bg-space-blue/60 border border-cyan-400/40 flex items-center justify-center mb-4 group-hover:shadow-cyan-glow transition-all">
              <Satellite className="w-7 h-7 text-cyan-stitch" />
            </div>
            <h3 className="text-base font-bold font-mono text-white tracking-wider uppercase mb-2">
              REAL-TIME SSA
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-mono">
              Continuous monitoring of 32,000+ cataloged space objects and debris for collision avoidance and threat detection.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-space-dark/60 border border-space-border/50 hover:border-cyan-400/40 transition-all shadow-sm group">
            <div className="w-14 h-14 rounded-2xl bg-space-blue/60 border border-cyan-400/40 flex items-center justify-center mb-4 group-hover:shadow-cyan-glow transition-all">
              <LineChart className="w-7 h-7 text-cyan-stitch" />
            </div>
            <h3 className="text-base font-bold font-mono text-white tracking-wider uppercase mb-2">
              PRECISION ANALYTICS
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-mono">
              Leverage AI-driven insights and predictive modeling to optimize orbital maneuvers, Gabbard plots, and asset health.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-space-dark/60 border border-space-border/50 hover:border-cyan-400/40 transition-all shadow-sm group">
            <div className="w-14 h-14 rounded-2xl bg-space-blue/60 border border-cyan-400/40 flex items-center justify-center mb-4 group-hover:shadow-cyan-glow transition-all">
              <Cpu className="w-7 h-7 text-cyan-stitch" />
            </div>
            <h3 className="text-base font-bold font-mono text-white tracking-wider uppercase mb-2">
              GLOBAL API INTEGRATION
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-mono">
              Seamlessly integrate our extensive space data stream, CCSDS CDMs, and webhooks into your existing operations.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 py-6 px-6 border-t border-slate-800/80 bg-space-950 text-center font-mono text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto w-full gap-4">
        <div className="flex items-center gap-6">
          <a href="#privacy" className="hover:text-slate-300 transition">PRIVACY POLICY</a>
          <a href="#terms" className="hover:text-slate-300 transition">TERMS OF SERVICE</a>
          <a href="#support" className="hover:text-slate-300 transition">SUPPORT</a>
        </div>
        <div>
          © 2026 ORBITGUARD. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
};
