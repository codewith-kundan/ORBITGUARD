import React, { useState } from 'react';
import { 
  RefreshCw, 
  Satellite, 
  ShieldAlert, 
  Globe, 
  Menu, 
  X, 
  LucideIcon,
  Activity,
  MapPin
} from 'lucide-react';
import { SystemStatistics, DataStatus } from '../types';

export type NavTabKey = 'space' | 'map2d' | 'catalog' | 'conjunctions';

interface NavbarProps {
  activeTab: NavTabKey;
  setActiveTab: (tab: NavTabKey) => void;
  stats: SystemStatistics | null;
  dataStatus: DataStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  alertCount?: number;
  onOpenSystemHealth?: () => void;
}

interface NavItemConfig {
  key: NavTabKey;
  label: string;
  icon: LucideIcon;
  count: number | null;
  isAlert?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  dataStatus,
  alertCount,
  onRefresh,
  isRefreshing,
  onOpenSystemHealth
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const isLive = dataStatus?.mode === 'LIVE';
  const isLiveError = dataStatus?.mode === 'LIVE ERROR';

  const navItems: NavItemConfig[] = [
    { key: 'space', label: '3D ORBIT TRACKER', icon: Globe, count: null },
    { key: 'map2d', label: '2D GROUND TRACK', icon: MapPin, count: null },
    { key: 'catalog', label: 'OBJECTS CATALOG', icon: Satellite, count: null },
    { key: 'conjunctions', label: 'CONJUNCTIONS', icon: ShieldAlert, count: (stats?.total_conjunctions ?? 0) > 0 ? stats?.total_conjunctions ?? null : null, isAlert: (stats?.risk_breakdown?.critical ?? 0) > 0 },
  ];

  const handleSelectTab = (tab: NavTabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-space-800 bg-space-950/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sticky top-0 z-50">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => handleSelectTab('space')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-neon shadow-lg">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base tracking-wider text-white">SPACE SENTINEL</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono hidden sm:block">
              Real-Time Orbital Tracking & Conjunction Screening
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-space-900/80 p-1 rounded-xl border border-space-800 font-mono text-xs shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium text-xs ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count != null && (
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
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
        <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs">
          {/* Alert Indicator */}
          {(alertCount ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 bg-danger-500/10 px-2.5 py-1 rounded-lg border border-danger-500/30 text-[11px] sm:text-xs animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-danger-neon" />
              <span className="text-danger-neon font-bold">{alertCount}</span>
              <span className="text-slate-400 hidden sm:inline">ALERTS</span>
            </div>
          )}

          {/* Total Assets Counter */}
          <div className="hidden sm:flex items-center gap-1.5 bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-slate-400">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>TRACKED:</span>
            <span className="text-cyan-neon font-bold">
              {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (dataStatus?.total_objects ? dataStatus.total_objects.toLocaleString() : '—')}
            </span>
          </div>

          {/* System & Database Diagnostics Trigger Button */}
          {onOpenSystemHealth && (
            <button
              onClick={onOpenSystemHealth}
              className="flex items-center gap-1.5 bg-space-900 hover:bg-space-800 px-2.5 py-1 rounded-lg border border-space-700 hover:border-cyan-500/40 text-[11px] sm:text-xs text-slate-300 hover:text-white transition shadow-sm"
              title="Open System, Database & Provider Diagnostics Center"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">SYSTEM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          )}

          {/* Live Mode Badge */}
          <div className="flex items-center gap-1.5 bg-space-900 px-2 sm:px-2.5 py-1 rounded-lg border border-space-800 text-[11px] sm:text-xs">
            <span className={`w-2 h-2 rounded-full ${
              isLiveError
                ? 'bg-danger-500 animate-ping'
                : isLive
                ? 'bg-emerald-400 animate-ping'
                : 'bg-warning-400'
            }`}></span>
            <span className="hidden sm:inline text-slate-400">FEED:</span>
            <span className={`font-bold ${
              isLiveError
                ? 'text-danger-400'
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-space-800 mt-2.5 pt-2 pb-1 font-mono animate-fade-in">
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
                    <span className="bg-cyan-500/20 text-cyan-400 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
