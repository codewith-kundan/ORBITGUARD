import React from 'react';
import { Radio, RefreshCw, Satellite, ShieldAlert, AlertTriangle, BarChart3, Globe } from 'lucide-react';
import { SystemStatistics } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'objects' | 'conjunctions' | 'alerts' | 'analytics' | '3d';
  setActiveTab: (tab: 'dashboard' | 'objects' | 'conjunctions' | 'alerts' | 'analytics' | '3d') => void;
  stats: SystemStatistics | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onRefresh,
  isRefreshing
}) => {
  const isLive = stats?.status_mode === 'LIVE';

  return (
    <header className="border-b border-space-800 bg-space-900/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-neon glow-cyan">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wider text-white">ORBITGUARD</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              SIH 2026
            </span>
          </div>
          <p className="text-xs text-slate-400">Space Situational Awareness & Collision Risk</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-space-950/80 p-1 rounded-xl border border-space-800 font-mono text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
            activeTab === 'dashboard'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-850'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('objects')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
            activeTab === 'objects'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-850'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          Orbital Objects
        </button>

        <button
          onClick={() => setActiveTab('conjunctions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
            activeTab === 'conjunctions'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-850'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Conjunctions
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
            activeTab === 'alerts'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-850'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Alerts
          {(stats?.active_alerts ?? 0) > 0 && (
            <span className="w-4 h-4 rounded-full bg-danger-500 text-[10px] flex items-center justify-center text-white font-bold">
              {stats?.active_alerts}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
            activeTab === 'analytics'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-850'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analytics
        </button>

        <button
          onClick={() => setActiveTab('3d')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
            activeTab === '3d'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-850'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          3D Globe
        </button>
      </nav>

      {/* Status & Live/Demo Indicator */}
      <div className="flex items-center gap-3">
        {/* Source Badge */}
        <div className="flex items-center gap-2 bg-space-850 px-3 py-1.5 rounded-full border border-space-700 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-success-500 animate-ping' : 'bg-warning-500'}`}></span>
          <span className="text-slate-400">DATA:</span>
          <span className={isLive ? 'text-success-neon font-bold' : 'text-warning-neon font-bold'}>
            {stats ? stats.status_mode : 'FETCHING...'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-space-800 hover:bg-space-700 text-cyan-400 hover:text-cyan-neon border border-space-700 hover:border-cyan-500/40 rounded-lg transition font-mono text-xs disabled:opacity-50"
          title="Refresh TLE Catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>SYNC TLE</span>
        </button>
      </div>
    </header>
  );
};
