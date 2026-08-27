import React from 'react';
import { 
  Globe, 
  Satellite, 
  ShieldAlert, 
  BarChart3, 
  RefreshCw, 
  Radio, 
  Sparkles, 
  Sun,
  Flame,
  Bot,
  FileText,
  Gamepad2,
  Eye,
  Rocket
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
    <header className="fixed top-0 left-0 right-0 z-40 bg-space-950/95 backdrop-blur-md border-b border-space-800 font-mono transition-all">
      {/* Tier 1: Main Brand Bar with Primary Navigation Tabs & Live Tracked Counter */}
      <div className="px-2 sm:px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 max-w-[1920px] mx-auto">
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

        {/* Center: Main Primary Navigation Tabs (Flex-wrap so it never gets cut off when tab is small) */}
        <nav className="flex items-center gap-1 bg-space-900/90 p-1 rounded-xl border border-space-800 text-[11px] sm:text-xs shadow-inner flex-wrap justify-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/80'
                }`}
              >
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

        {/* Right Side: Alerts, Tracked Assets, Diagnostics & Refresh */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs flex-wrap justify-end">
          {/* Alert Indicator */}
          {(alertCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 bg-danger-500/10 px-2 py-1 rounded-lg border border-danger-500/30 text-[10px] sm:text-xs animate-pulse">
              <ShieldAlert className="w-3 h-3 text-danger-neon" />
              <span className="text-danger-neon font-bold">{alertCount}</span>
              <span className="text-slate-400 hidden md:inline">ALERTS</span>
            </div>
          )}

          {/* Total Assets Counter */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-space-900 px-2 py-1 rounded-lg border border-space-800 text-slate-400 text-[10px] sm:text-xs">
            <Satellite className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">TRACKED:</span>
            <span className="text-cyan-neon font-bold">
              {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (dataStatus?.total_objects ? dataStatus.total_objects.toLocaleString() : '32,340')}
            </span>
          </div>

          {/* User Guide Interactive Modal Trigger Button */}
          {onOpenUserGuide && (
            <button
              onClick={onOpenUserGuide}
              className="flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded-lg border border-cyan-500/30 hover:border-cyan-400 text-[10px] sm:text-xs text-cyan-300 hover:text-white transition shadow-sm font-bold"
              title="Open Interactive Operator User Guide"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">GUIDE</span>
            </button>
          )}

          {/* Live Data Feed Mode Indicator */}
          <div 
            onClick={onOpenSystemHealth}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition text-[10px] sm:text-xs ${
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

      {/* Tier 2: Dedicated SSA Tactical Operations Sub-Bar (Flex-wrap so ALL buttons stay visible on small/resized tabs) */}
      <div className="px-2 sm:px-4 lg:px-6 py-1.5 bg-space-900/70 border-t border-space-800/80 text-[10px] sm:text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[1920px] mx-auto w-full">
          <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-bold pr-1.5 border-r border-space-800 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400" />
            SSA TOOLS:
          </span>

          {/* NOAA Space Weather Monitor */}
          {onOpenSpaceWeather && (
            <button
              onClick={onOpenSpaceWeather}
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
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
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
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
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
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
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Open Global Upcoming Missions & Decaying Debris Tracker"
            >
              <Rocket className="w-3 h-3 text-purple-400" />
              <span>UPCOMING MISSIONS</span>
            </button>
          )}

          {/* Kessler Density Heatmap */}
          {onOpenKesslerDensity && (
            <button
              onClick={onOpenKesslerDensity}
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Open Kessler Syndrome Spatial Density Heatmap"
            >
              <Flame className="w-3 h-3 text-red-400" />
              <span>KESSLER HEATMAP</span>
            </button>
          )}

          {/* Defense SITREP Dossier */}
          {onOpenSITREP && (
            <button
              onClick={onOpenSITREP}
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Generate Formal Defense Situation Report (SITREP)"
            >
              <FileText className="w-3 h-3 text-slate-400" />
              <span>DEFENSE SITREP</span>
            </button>
          )}

          {/* ASAT Missile Simulator */}
          {onOpenASAT && (
            <button
              onClick={onOpenASAT}
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Open ASAT Kinetic Missile Intercept & Cascade Simulator"
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span>ASAT MISSILE</span>
            </button>
          )}

          {/* Operator Sandbox Game */}
          {onOpenGame && (
            <button
              onClick={onOpenGame}
              className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white transition shadow-sm font-bold whitespace-nowrap"
              title="Play Satellite Operator Evasion Sandbox Challenge"
            >
              <Gamepad2 className="w-3 h-3 text-emerald-400" />
              <span>EVASION GAME</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
