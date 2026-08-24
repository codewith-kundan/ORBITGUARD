import React, { useState } from 'react';
import { RefreshCw, Satellite, ShieldAlert, AlertTriangle, BarChart3, Globe, Activity, Menu, X, LucideIcon } from 'lucide-react';
import { SystemStatistics, DataStatus } from '../types';

interface NavbarProps {
  activeTab: 'space' | 'catalog' | 'conjunctions' | 'alerts' | 'analytics' | 'system';
  setActiveTab: (tab: 'space' | 'catalog' | 'conjunctions' | 'alerts' | 'analytics' | 'system') => void;
  stats: SystemStatistics | null;
  dataStatus: DataStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

interface NavItemConfig {
  key: 'space' | 'catalog' | 'conjunctions' | 'alerts' | 'analytics' | 'system';
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
  onRefresh,
  isRefreshing
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const isLive = dataStatus?.mode === 'LIVE';
  const isLiveError = dataStatus?.mode === 'LIVE ERROR';

  const navItems: NavItemConfig[] = [
    { key: 'space', label: 'SPACE VIEW', icon: Globe, count: null },
    { key: 'catalog', label: 'CATALOG', icon: Satellite, count: null },
    { key: 'conjunctions', label: 'CONJUNCTIONS', icon: ShieldAlert, count: (stats?.total_conjunctions ?? 0) > 0 ? stats?.total_conjunctions ?? null : null },
    { key: 'alerts', label: 'ALERTS', icon: AlertTriangle, count: (stats?.active_alerts ?? 0) > 0 ? stats?.active_alerts ?? null : null, isAlert: true },
    { key: 'analytics', label: 'ANALYTICS', icon: BarChart3, count: null },
    { key: 'system', label: 'SYSTEM', icon: Activity, count: null },
  ];

  const handleSelectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-space-800 bg-space-950/95 backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-50">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-neon shadow-lg">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base tracking-wider text-white">ORBITGUARD</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">
                SIH 2026
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono hidden sm:block">Space Situational Awareness</p>
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
                className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-lg transition font-medium text-xs ${
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
          {/* Total Assets Counter */}
          <div className="hidden lg:flex items-center gap-1.5 bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-slate-400">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>ASSETS:</span>
            <span className="text-cyan-neon font-bold">
              {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (dataStatus?.total_objects ? dataStatus.total_objects.toLocaleString() : '19,578')}
            </span>
          </div>

          {/* Live Mode Badge */}
          <div className="flex items-center gap-1.5 bg-space-900 px-2 sm:px-2.5 py-1 rounded-lg border border-space-800 text-[11px] sm:text-xs">
            <span className={`w-2 h-2 rounded-full ${
              isLiveError
                ? 'bg-danger-500 animate-ping'
                : isLive
                ? 'bg-emerald-400 animate-ping'
                : 'bg-warning-400'
            }`}></span>
            <span className="hidden sm:inline text-slate-400">DATA:</span>
            <span className={`font-bold ${
              isLiveError
                ? 'text-danger-400'
                : isLive
                ? 'text-emerald-400'
                : 'text-warning-neon'
            }`}>
              {dataStatus ? dataStatus.mode : 'LIVE'}
            </span>
          </div>

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-neon border border-cyan-500/30 rounded-lg transition font-bold disabled:opacity-50 text-[11px] sm:text-xs shadow-sm"
            title="Synchronize Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">SYNC</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 bg-space-900 text-slate-300 hover:text-white border border-space-800 rounded-lg transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-space-800 flex flex-col gap-1.5 font-mono text-xs bg-space-950/98 p-2 rounded-xl border border-cyan-500/20 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition font-medium text-xs ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-space-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </div>
                {item.count != null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.isAlert ? 'bg-danger-500 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
