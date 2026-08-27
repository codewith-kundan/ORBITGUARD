import React, { useState } from 'react';
import { 
  Globe, 
  Satellite, 
  ShieldAlert, 
  BarChart3, 
  RefreshCw, 
  Radio, 
  Sparkles, 
  Sun,
  Bot,
  Eye,
  Rocket,
  ChevronDown,
  Flame,
  FileText,
  Gamepad2
} from 'lucide-react';
import { DataStatus, SystemStatistics } from '../types';

export type NavTabKey = 'space' | 'map2d' | 'catalog' | 'conjunctions' | 'analytics';

interface NavbarProps {
  activeTab: NavTabKey;
  setActiveTab?: (tab: NavTabKey) => void;
  onSelectTab?: (tab: NavTabKey) => void;
  alertCount?: number;
  dataStatus?: DataStatus | null;
  stats?: SystemStatistics | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenUserGuide?: () => void;
  onOpenSystemHealth?: () => void;
  onOpenSpaceWeather?: () => void;
  onOpenLaunchRadar?: () => void;
  onOpenKesslerDensity?: () => void;
  onOpenAICopilot?: () => void;
  onOpenSITREP?: () => void;
  onOpenASAT?: () => void;
  onOpenGame?: () => void;
  onOpenSpotter?: () => void;
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
  onOpenUserGuide,
  onOpenSystemHealth,
  onOpenSpaceWeather,
  onOpenLaunchRadar,
  onOpenKesslerDensity,
  onOpenAICopilot,
  onOpenSITREP,
  onOpenASAT,
  onOpenGame,
  onOpenSpotter
}) => {
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState<boolean>(false);

  const handleSelectTab = (tab: NavTabKey) => {
    if (setActiveTab) setActiveTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const navItems: { key: NavTabKey; label: string; icon: React.FC<{ className?: string }>; count?: number; isAlert?: boolean }[] = [
    { key: 'space', label: '3D Globe', icon: Globe },
    { key: 'map2d', label: '2D Ground Track', icon: Radio },
    { key: 'catalog', label: 'Catalog', icon: Satellite },
    { key: 'conjunctions', label: 'Conjunctions', icon: ShieldAlert, count: alertCount > 0 ? alertCount : undefined, isAlert: alertCount > 0 },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isLive = dataStatus?.is_live || dataStatus?.mode === 'LIVE';
  const isLiveError = dataStatus?.is_live_error || dataStatus?.mode === 'LIVE ERROR';

  return (
    <header className="sticky top-0 z-40 bg-space-950/95 backdrop-blur-md border-b border-space-800 font-mono transition-all shadow-xl">
      {/* Tier 1: Clean Primary Header */}
      <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-3 max-w-[1920px] mx-auto">
        {/* Brand Logo */}
        <div 
          onClick={() => handleSelectTab('space')}
          className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
        >
          <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm md:text-base font-bold tracking-wider text-white group-hover:text-cyan-400 transition">
                ORBITGUARD
              </span>
            </div>
            <p className="text-[8px] sm:text-[9px] text-slate-400 hidden lg:block leading-none">
              Real-Time Orbital Tracking & Conjunction Screening
            </p>
          </div>
        </div>

        {/* Center: Primary Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-space-900/90 p-1 rounded-xl border border-space-800 text-xs shadow-inner flex-shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count != null && (
                  <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] flex items-center justify-center font-bold ${
                    item.isAlert ? 'bg-danger-500 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Alerts, Tracked Counter, System Diagnostics */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs flex-shrink-0">
          {/* Active Alerts Badge */}
          {(alertCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 bg-danger-500/10 px-2 py-1 rounded-lg border border-danger-500/30 text-[10px] sm:text-xs animate-pulse">
              <ShieldAlert className="w-3 h-3 text-danger-neon" />
              <span className="text-danger-neon font-bold">{alertCount}</span>
              <span className="text-slate-400 hidden md:inline">ALERTS</span>
            </div>
          )}

          {/* Tracked Count Counter */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-slate-400 text-[10px] sm:text-xs">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>TRACKED:</span>
            <span className="text-cyan-neon font-bold">
              {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (dataStatus?.total_objects ? dataStatus.total_objects.toLocaleString() : '32,340')}
            </span>
          </div>

          {/* User Guide Interactive Modal Trigger Button */}
          {onOpenUserGuide && (
            <button
              onClick={onOpenUserGuide}
              className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-1 rounded-lg border border-cyan-400/60 hover:border-cyan-300 text-[10px] sm:text-xs text-cyan-stitch hover:text-white transition shadow-cyan-inner hover:shadow-cyan-glow font-bold animate-pulse"
              title="Open Interactive Operator User Guide"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-stitch" />
              <span className="inline">GUIDE</span>
            </button>
          )}

          {/* Live Data Feed Mode Indicator */}
          <div 
            onClick={onOpenSystemHealth}
            className={`hidden md:flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition text-[10px] sm:text-xs ${
              isLiveError
                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                : isLive
                ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-warning-500/10 border-warning-500/30 hover:bg-warning-500/20'
            }`}
            title="Click to view System Diagnostics & Health"
          >
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
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
              {isLiveError ? 'FAILOVER' : isLive ? (dataStatus?.source?.includes('Space-Track') ? 'SPACE-TRACK' : 'LIVE') : 'CACHED'}
            </span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 sm:p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50"
            title="Refresh Orbital Positions & Screen Conjunctions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-neon' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tier 2: Streamlined Single-Line SSA Tactical Bar */}
      <div className="px-3 sm:px-5 py-1.5 bg-space-900/80 border-t border-space-800/80 text-[11px]">
        <div className="flex items-center justify-between gap-2 max-w-[1920px] mx-auto w-full">
          {/* Main 4 Primary SSA Tools (Always Visible and Neatly Fitted) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap">
            <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-bold pr-1.5 border-r border-space-800 flex items-center gap-1 flex-shrink-0">
              <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400" />
              SSA TOOLS:
            </span>

            {/* NOAA Space Weather Monitor */}
            {onOpenSpaceWeather && (
              <button
                onClick={onOpenSpaceWeather}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap flex-shrink-0"
                title="Open NOAA Space Weather & Solar Storm Monitor"
              >
                <Sun className="w-3 h-3 text-amber-400 animate-spin-slow" />
                <span>SPACE WEATHER</span>
              </button>
            )}

            {/* Autonomous AI Flight Copilot */}
            {onOpenAICopilot && (
              <button
                onClick={onOpenAICopilot}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap flex-shrink-0"
                title="Open Autonomous AI Flight Copilot"
              >
                <Bot className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>AI COPILOT</span>
              </button>
            )}

            {/* Citizen Sky Spotter */}
            {onOpenSpotter && (
              <button
                onClick={onOpenSpotter}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap flex-shrink-0"
                title="View Tonight's Visible Naked-Eye Satellite Passes"
              >
                <Eye className="w-3 h-3 text-blue-400" />
                <span>SKY SPOTTER</span>
              </button>
            )}

            {/* Global Launch & Reentry Radar */}
            {onOpenLaunchRadar && (
              <button
                onClick={onOpenLaunchRadar}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap flex-shrink-0"
                title="Open Global Upcoming Missions & Decaying Debris Tracker"
              >
                <Rocket className="w-3 h-3 text-purple-400" />
                <span>UPCOMING MISSIONS</span>
              </button>
            )}
          </div>

          {/* Right Side: Clean "More Ops / Simulators" Dropdown Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-space-950 hover:bg-space-800 text-slate-300 hover:text-white border border-space-700 font-bold transition shadow-sm"
            >
              <span>DEFENSE & SIMS</span>
              <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${isMoreToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isMoreToolsOpen && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-60 bg-space-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs animate-fade-in"
                onMouseLeave={() => setIsMoreToolsOpen(false)}
              >
                {onOpenKesslerDensity && (
                  <button
                    onClick={() => { onOpenKesslerDensity(); setIsMoreToolsOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition text-left"
                  >
                    <Flame className="w-4 h-4 text-red-400" />
                    <div>
                      <span className="font-bold block">Kessler Heatmap</span>
                      <span className="text-[10px] text-slate-500 block">Debris Spatial Density</span>
                    </div>
                  </button>
                )}

                {onOpenSITREP && (
                  <button
                    onClick={() => { onOpenSITREP(); setIsMoreToolsOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-bold block">Defense SITREP</span>
                      <span className="text-[10px] text-slate-500 block">Executive Threat Dossier</span>
                    </div>
                  </button>
                )}

                {onOpenASAT && (
                  <button
                    onClick={() => { onOpenASAT(); setIsMoreToolsOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 transition text-left"
                  >
                    <Flame className="w-4 h-4 text-orange-400" />
                    <div>
                      <span className="font-bold block">ASAT Missile Sim</span>
                      <span className="text-[10px] text-slate-500 block">Kinetic Intercept & Cascade</span>
                    </div>
                  </button>
                )}

                {onOpenGame && (
                  <button
                    onClick={() => { onOpenGame(); setIsMoreToolsOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition text-left"
                  >
                    <Gamepad2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block">Evasion Sandbox</span>
                      <span className="text-[10px] text-slate-500 block">Operator Thruster Challenge</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
