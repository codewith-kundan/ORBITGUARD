import React, { useState } from 'react';
import { 
  Globe, 
  Satellite, 
  ShieldAlert, 
  BarChart3, 
  RefreshCw, 
  Menu, 
  X, 
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab: NavTabKey) => {
    if (setActiveTab) setActiveTab(tab);
    if (onSelectTab) onSelectTab(tab);
    setMobileMenuOpen(false);
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
    <header className="fixed top-0 left-0 right-0 z-40 bg-space-950/95 backdrop-blur-md border-b border-space-800 px-3 sm:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-[1800px] mx-auto">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => handleSelectTab('space')}
          className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
        >
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-sm sm:text-base font-bold tracking-wider text-white group-hover:text-cyan-400 transition">
                ORBITGUARD
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Real-Time Orbital Tracking & Conjunction Screening
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs - Clean, no text overlapping */}
        <nav className="hidden md:flex items-center gap-1 bg-space-900/90 p-1 rounded-xl border border-space-800 font-mono text-xs shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count != null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    item.isAlert ? 'bg-danger-500 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs flex-nowrap justify-end">
          {/* Alert Indicator */}
          {(alertCount ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 bg-danger-500/10 px-2.5 py-1 rounded-lg border border-danger-500/30 text-[11px] sm:text-xs animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-danger-neon" />
              <span className="text-danger-neon font-bold">{alertCount}</span>
              <span className="text-slate-400 hidden sm:inline">ALERTS</span>
            </div>
          )}

          {/* Total Assets Counter */}
          <div className="hidden lg:flex items-center gap-1.5 bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-slate-400">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>TRACKED:</span>
            <span className="text-cyan-neon font-bold">
              {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (dataStatus?.total_objects ? dataStatus.total_objects.toLocaleString() : '32,283')}
            </span>
          </div>

          {/* NOAA Space Weather Trigger Button */}
          {onOpenSpaceWeather && (
            <button
              onClick={onOpenSpaceWeather}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-500/50 hover:border-amber-400 text-[11px] sm:text-xs text-amber-300 hover:text-white transition shadow-sm font-bold"
              title="Open NOAA Space Weather, Geomagnetic Storm & Solar Flux Monitor"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span>WEATHER</span>
            </button>
          )}

          {/* AI Flight Copilot */}
          {onOpenAICopilot && (
            <button
              onClick={onOpenAICopilot}
              className="hidden sm:flex items-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 px-2.5 py-1 rounded-lg border border-cyan-500/40 text-[11px] sm:text-xs text-cyan-300 hover:text-white transition shadow-sm font-bold"
              title="Open Autonomous AI Flight Copilot"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AI COPILOT</span>
            </button>
          )}

          {/* Citizen Sky Spotter */}
          {onOpenSpotter && (
            <button
              onClick={onOpenSpotter}
              className="hidden md:flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 px-2.5 py-1 rounded-lg border border-blue-500/40 text-[11px] sm:text-xs text-blue-300 hover:text-white transition shadow-sm font-bold"
              title="View Tonight's Visible Naked-Eye Satellite Passes"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>SPOTTER</span>
            </button>
          )}

          {/* Launch Radar Trigger Button */}
          {onOpenLaunchRadar && (
            <button
              onClick={onOpenLaunchRadar}
              className="hidden xl:flex items-center gap-1.5 bg-purple-500/15 hover:bg-purple-500/25 px-2.5 py-1 rounded-lg border border-purple-500/40 text-[11px] sm:text-xs text-purple-300 hover:text-white transition shadow-sm font-bold"
              title="Open Global Rocket Launch Radar & Decaying Debris Tracker"
            >
              <Rocket className="w-3.5 h-3.5 text-purple-400" />
              <span>LAUNCHES</span>
            </button>
          )}

          {/* Kessler Density Heatmap Trigger Button */}
          {onOpenKesslerDensity && (
            <button
              onClick={onOpenKesslerDensity}
              className="hidden xl:flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 px-2.5 py-1 rounded-lg border border-red-500/40 text-[11px] sm:text-xs text-red-300 hover:text-white transition shadow-sm font-bold"
              title="Open Kessler Syndrome Spatial Density Heatmap"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>KESSLER</span>
            </button>
          )}

          {/* Defense SITREP Dossier */}
          {onOpenSITREP && (
            <button
              onClick={onOpenSITREP}
              className="hidden 2xl:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] sm:text-xs text-slate-300 hover:text-white transition shadow-sm font-bold"
              title="Generate Formal Defense Situation Report (SITREP)"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>SITREP</span>
            </button>
          )}

          {/* ASAT Missile Trigger */}
          {onOpenASAT && (
            <button
              onClick={onOpenASAT}
              className="hidden 2xl:flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 px-2.5 py-1 rounded-lg border border-orange-500/40 text-[11px] sm:text-xs text-orange-300 hover:text-white transition shadow-sm font-bold"
              title="Open ASAT Kinetic Missile Intercept & Cascade Simulator"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>ASAT</span>
            </button>
          )}

          {/* Operator Sandbox Game */}
          {onOpenGame && (
            <button
              onClick={onOpenGame}
              className="hidden 2xl:flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-[11px] sm:text-xs text-emerald-300 hover:text-white transition shadow-sm font-bold"
              title="Play Satellite Operator Evasion Sandbox Challenge"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SIMULATOR</span>
            </button>
          )}

          {/* User Guide Interactive Modal Trigger Button */}
          {onOpenUserGuide && (
            <button
              onClick={onOpenUserGuide}
              className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 hover:border-cyan-400 text-[11px] sm:text-xs text-cyan-300 hover:text-white transition shadow-sm font-bold"
              title="Open Interactive Operator User Guide & Technical Manual"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">GUIDE</span>
            </button>
          )}

          {/* Data Mode / Live Feed Indicator */}
          <div 
            onClick={onOpenSystemHealth}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition ${
              isLiveError
                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                : isLive
                ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-warning-500/10 border-warning-500/30 hover:bg-warning-500/20'
            }`}
            title="Click to view full System Diagnostics & Feed Health"
          >
            <span className={`w-2 h-2 rounded-full ${
              isLiveError
                ? 'bg-amber-400 animate-pulse'
                : isLive
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-warning-neon'
            }`} />
            <span className={`text-[10px] sm:text-[11px] font-bold ${
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
            className="p-1.5 sm:p-2 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50"
            title="Refresh Orbital Positions & Screen Conjunctions"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-cyan-neon' : ''}`} />
          </button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 bg-space-900 text-slate-300 hover:text-white rounded-lg border border-space-800"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu with all feature buttons */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-space-800 mt-2.5 pt-2 pb-2 font-mono animate-fade-in space-y-2">
          <div className="flex flex-col gap-1 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectTab(item.key)}
                  className={`flex items-center justify-between p-2 rounded-lg transition ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                      : 'bg-space-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </div>
                  {item.count != null && (
                    <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full text-[10px] flex items-center justify-center font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-space-800 text-xs">
            {onOpenSpaceWeather && (
              <button
                onClick={() => { onOpenSpaceWeather(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Space Weather</span>
              </button>
            )}
            {onOpenAICopilot && (
              <button
                onClick={() => { onOpenAICopilot(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold"
              >
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Copilot</span>
              </button>
            )}
            {onOpenSpotter && (
              <button
                onClick={() => { onOpenSpotter(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Sky Spotter</span>
              </button>
            )}
            {onOpenLaunchRadar && (
              <button
                onClick={() => { onOpenLaunchRadar(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold"
              >
                <Rocket className="w-3.5 h-3.5 text-purple-400" />
                <span>Launch Radar</span>
              </button>
            )}
            {onOpenKesslerDensity && (
              <button
                onClick={() => { onOpenKesslerDensity(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>Kessler Density</span>
              </button>
            )}
            {onOpenSITREP && (
              <button
                onClick={() => { onOpenSITREP(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>SITREP Report</span>
              </button>
            )}
            {onOpenASAT && (
              <button
                onClick={() => { onOpenASAT(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>ASAT Missile</span>
              </button>
            )}
            {onOpenGame && (
              <button
                onClick={() => { onOpenGame(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulator Game</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
