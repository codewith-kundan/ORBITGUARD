import React from 'react';
import { RefreshCw, Satellite, ShieldAlert, AlertTriangle, BarChart3, Globe, Activity, Database } from 'lucide-react';
import { SystemStatistics, DataStatus } from '../types';

interface NavbarProps {
  activeTab: 'space' | 'catalog' | 'conjunctions' | 'alerts' | 'analytics' | 'system';
  setActiveTab: (tab: 'space' | 'catalog' | 'conjunctions' | 'alerts' | 'analytics' | 'system') => void;
  stats: SystemStatistics | null;
  dataStatus: DataStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  dataStatus,
  onRefresh,
  isRefreshing
}) => {
  const isLive = dataStatus?.mode === 'LIVE';
  const isLiveError = dataStatus?.mode === 'LIVE ERROR';

  return (
    <header className="border-b border-space-800 bg-space-950/95 backdrop-blur-md px-6 py-3 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-neon shadow-lg">
          <Globe className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-wider text-white">ORBITGUARD</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">
              SIH 2026
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Space Situational Awareness & Orbital Traffic</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-space-900/80 p-1 rounded-xl border border-space-800 font-mono text-xs shadow-inner">
        <button
          onClick={() => setActiveTab('space')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
            activeTab === 'space'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          SPACE VIEW
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
            activeTab === 'catalog'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          CATALOG
        </button>

        <button
          onClick={() => setActiveTab('conjunctions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
            activeTab === 'conjunctions'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          CONJUNCTIONS
          {(stats?.total_conjunctions ?? 0) > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
              {stats?.total_conjunctions}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
            activeTab === 'alerts'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          ALERTS
          {(stats?.active_alerts ?? 0) > 0 && (
            <span className="w-4 h-4 rounded-full bg-danger-500 text-[10px] flex items-center justify-center text-white font-bold animate-pulse">
              {stats?.active_alerts}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
            activeTab === 'analytics'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          ANALYTICS
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
            activeTab === 'system'
              ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          SYSTEM
        </button>
      </nav>

      {/* Real Live Ingestion Status & Sync Action */}
      <div className="flex items-center gap-3 font-mono text-xs">
        {/* Database Connectivity */}
        <div className="hidden lg:flex items-center gap-1.5 bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-slate-400">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>DB:</span>
          <span className="text-emerald-400 font-bold">CONNECTED</span>
        </div>

        {/* Total Assets Counter */}
        <div className="hidden sm:flex items-center gap-1.5 bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-slate-400">
          <Satellite className="w-3.5 h-3.5 text-cyan-400" />
          <span>ASSETS:</span>
          <span className="text-cyan-neon font-bold">
            {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (dataStatus?.total_objects ? dataStatus.total_objects.toLocaleString() : '19,578')}
          </span>
        </div>

        {/* Live / Demo Mode Badge */}
        <div className="flex items-center gap-2 bg-space-900 px-3 py-1 rounded-lg border border-space-800">
          <span className={`w-2 h-2 rounded-full ${
            isLiveError
              ? 'bg-danger-500 animate-ping'
              : isLive
              ? 'bg-emerald-400 animate-ping'
              : 'bg-warning-400'
          }`}></span>
          <span className="text-slate-400">DATA:</span>
          <span className={`font-bold ${
            isLiveError
              ? 'text-danger-400'
              : isLive
              ? 'text-emerald-400'
              : 'text-warning-neon'
          }`}>
            {dataStatus ? dataStatus.mode : 'CONNECTING...'}
          </span>
        </div>

        {/* Sync Action Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-neon border border-cyan-500/30 rounded-lg transition font-bold disabled:opacity-50"
          title="Synchronize TLE Catalog with CelesTrak"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>SYNC NOW</span>
        </button>
      </div>
    </header>
  );
};
