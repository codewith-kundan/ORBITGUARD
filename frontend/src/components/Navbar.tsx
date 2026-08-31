import React, { useState, useRef, useEffect } from 'react';
import { 
  Globe, 
  Satellite, 
  ShieldAlert, 
  BarChart3, 
  RefreshCw, 
  Radio, 
  Sun,
  Eye,
  Rocket,
  Flame,
  FileText,
  ChevronDown,
  Sparkles,
  Layers,
  Crosshair,
  Compass,
  Activity,
  Award,
  ShieldCheck
} from 'lucide-react';
import { DataStatus, SystemStatistics } from '../types';

export type NavTabKey = 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics' | 'validation' | 'case';

interface NavbarProps {
  activeTab: NavTabKey;
  setActiveTab?: (tab: NavTabKey) => void;
  onSelectTab?: (tab: NavTabKey) => void;
  alertCount?: number;
  dataStatus?: DataStatus | null;
  stats?: SystemStatistics | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenOrbitAI?: () => void;
  onOpenSystemHealth?: () => void;
  onOpenSpaceWeather?: () => void;
  onOpenLaunchRadar?: () => void;
  onOpenKesslerDensity?: () => void;
  onOpenSITREP?: () => void;
  onOpenASAT?: () => void;
  onOpenSpotter?: () => void;
  onOpenTrustCenter?: () => void;
  onOpenLiveGuide?: () => void;
  onOpenJudgeDemo?: () => void;
  onOpenPresentationMode?: () => void;
  onOpenPerformanceTelemetry?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  alertCount = 0,
  dataStatus,
  stats,
  onRefresh,
  isRefreshing = false,
  onOpenOrbitAI,
  onOpenSystemHealth,
  onOpenSpaceWeather,
  onOpenLaunchRadar,
  onOpenKesslerDensity,
  onOpenSITREP,
  onOpenASAT,
  onOpenSpotter,
  onOpenTrustCenter,
  onOpenLiveGuide,
  onOpenJudgeDemo,
  onOpenPresentationMode,
  onOpenPerformanceTelemetry
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTab = (tab: NavTabKey) => {
    if (setActiveTab) setActiveTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const navItems: { key: NavTabKey; label: string; shortLabel: string; icon: React.FC<{ className?: string }>; count?: number; isAlert?: boolean }[] = [
    { key: 'space', label: '3D Globe', shortLabel: '3D', icon: Globe },
    { key: 'map2d', label: '2D Track', shortLabel: '2D', icon: Radio },
    { key: 'catalog', label: 'Catalog', shortLabel: 'Catalog', icon: Satellite },
    { key: 'conjunctions', label: 'Conjunctions', shortLabel: 'Conjunctions', icon: ShieldAlert, count: alertCount > 0 ? alertCount : undefined, isAlert: alertCount > 0 },
    { key: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3 },
    { key: 'validation', label: 'Live Validation', shortLabel: 'Validation', icon: ShieldCheck },
  ];

  const isLive = dataStatus?.is_live || dataStatus?.mode === 'LIVE';
  const isLiveError = dataStatus?.is_live_error || dataStatus?.mode === 'LIVE ERROR';

  return (
    <header className="sticky top-0 z-40 bg-space-950/95 backdrop-blur-md border-b border-space-800 font-mono transition-all shadow-2xl">
      {/* Fluid, fully visible mission control header */}
      <div className="w-full px-2 sm:px-4 py-2 flex items-center justify-between gap-2 max-w-[1920px] mx-auto">
        
        {/* 1. Left: Brand Logo & Title */}
        <div 
          onClick={() => handleSelectTab('space')}
          className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
        >
          <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-wider text-white group-hover:text-cyan-400 transition">
                ORBITGUARD
              </span>
              <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hidden xl:inline">
                SSA 2.1
              </span>
            </div>
          </div>
        </div>

        {/* 2. Center: Primary Navigation Tabs & Tools Dropdown */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-space-900/90 p-0.5 sm:p-1 rounded-xl border border-space-800 text-[11px] sm:text-xs shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectTab(item.key)}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/80'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.shortLabel}</span>
                  {item.count != null && (
                    <span className={`px-1 py-0.2 rounded-full text-[9px] flex items-center justify-center font-bold ${
                      item.isAlert ? 'bg-danger-500 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Compact Tools Dropdown Menu */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition font-bold text-[11px] sm:text-xs whitespace-nowrap ${
                  isToolsOpen
                    ? 'bg-space-800 text-white border border-space-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/80'
                }`}
                title="Access secondary mission modules & simulators"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="hidden sm:inline">TOOLS</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-space-950/98 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl z-50 p-2 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[9px] text-slate-500 uppercase tracking-widest font-bold border-b border-space-800">
                    MISSION MODULES & TELEMETRY
                  </div>

                  {onOpenPresentationMode && (
                    <button
                      onClick={() => {
                        onOpenPresentationMode();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-purple-950/40 border border-transparent hover:border-purple-500/30 transition"
                    >
                      <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">SIH Presentation Mode</div>
                        <div className="text-[9px] text-purple-300">8-Stage Guided Demo Script</div>
                      </div>
                    </button>
                  )}

                  {onOpenPerformanceTelemetry && (
                    <button
                      onClick={() => {
                        onOpenPerformanceTelemetry();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Subsystem Profiler</div>
                        <div className="text-[9px] text-slate-400">Microsecond Run Telemetry</div>
                      </div>
                    </button>
                  )}

                  {onOpenTrustCenter && (
                    <button
                      onClick={() => {
                        onOpenTrustCenter();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Trust Center & Proofs</div>
                        <div className="text-[9px] text-slate-400">Scientific Reference Vectors</div>
                      </div>
                    </button>
                  )}

                  {onOpenSITREP && (
                    <button
                      onClick={() => {
                        onOpenSITREP();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Defense SITREP</div>
                        <div className="text-[9px] text-slate-400">Executive Threat Dossier</div>
                      </div>
                    </button>
                  )}

                  {onOpenSpaceWeather && (
                    <button
                      onClick={() => {
                        onOpenSpaceWeather();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        <Sun className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Space Weather</div>
                        <div className="text-[9px] text-slate-400">NOAA Solar Storms & Kp</div>
                      </div>
                    </button>
                  )}

                  {onOpenSpotter && (
                    <button
                      onClick={() => {
                        onOpenSpotter();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Sky Spotter</div>
                        <div className="text-[9px] text-slate-400">Visible Naked-Eye Passes</div>
                      </div>
                    </button>
                  )}

                  {onOpenLaunchRadar && (
                    <button
                      onClick={() => {
                        onOpenLaunchRadar();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        <Rocket className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Launch Radar</div>
                        <div className="text-[9px] text-slate-400">Global Space Launches</div>
                      </div>
                    </button>
                  )}

                  {onOpenKesslerDensity && (
                    <button
                      onClick={() => {
                        onOpenKesslerDensity();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Kessler Heatmap</div>
                        <div className="text-[9px] text-slate-400">Debris Density Altitude</div>
                      </div>
                    </button>
                  )}

                  {onOpenASAT && (
                    <button
                      onClick={() => {
                        onOpenASAT();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-space-900 transition"
                    >
                      <div className="p-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40">
                        <Crosshair className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">ASAT Missile Sim</div>
                        <div className="text-[9px] text-slate-400">Kinetic Intercept & Cascade</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* 3. Right: High-Priority Action Buttons (Orbit AI, Live Guide, Presentation, Telemetry, Status) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 text-xs">
          
          {/* Ask Orbit AI Trigger */}
          {onOpenOrbitAI && (
            <button
              onClick={onOpenOrbitAI}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 hover:from-cyan-500/30 hover:to-purple-600/30 border border-cyan-500/50 text-cyan-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Open Orbit AI Specialized Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
              <span>ORBIT AI</span>
            </button>
          )}

          {/* Live Web Tour & Interactive Platform Guide */}
          {(onOpenLiveGuide || onOpenJudgeDemo) && (
            <button
              onClick={onOpenLiveGuide || onOpenJudgeDemo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-indigo-600/20 hover:from-cyan-500/30 hover:to-indigo-600/30 border border-cyan-500/50 text-cyan-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Launch Live Interactive Web Platform Tour & Feature Guide"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>LIVE GUIDE</span>
            </button>
          )}

          {/* SIH Presentation Mode Button */}
          {onOpenPresentationMode && (
            <button
              onClick={onOpenPresentationMode}
              className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="SIH 2026 Presentation Mode & Guided Walkthrough"
            >
              <Award className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="hidden lg:inline">DEMO</span>
            </button>
          )}

          {/* Live Data Feed Mode Indicator */}
          <div 
            onClick={onOpenSystemHealth}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border cursor-pointer transition text-[10px] sm:text-xs whitespace-nowrap ${
              isLiveError
                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                : isLive
                ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-warning-500/10 border-warning-500/30 hover:bg-warning-500/20'
            }`}
            title="Click to view System Diagnostics & Health"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isLiveError
                ? 'bg-amber-400 animate-pulse'
                : isLive
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-warning-neon'
            }`} />
            <span className={`font-bold ${
              isLiveError
                ? 'text-amber-400'
                : isLive
                ? 'text-emerald-400'
                : 'text-warning-neon'
            }`}>
              {isLiveError ? 'FAILOVER' : isLive ? 'LIVE' : 'DEMO'}
            </span>
            {stats?.tracked_objects && (
              <span className="text-space-400 text-[9px] hidden 2xl:inline">
                ({stats.tracked_objects.toLocaleString()})
              </span>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50 flex-shrink-0"
            title="Refresh Orbital Positions & Screen Conjunctions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-neon' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
