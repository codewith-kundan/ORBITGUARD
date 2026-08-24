import React from 'react';
import { AlertCircle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { DataStatus, SystemStatistics } from '../types';

interface DataStatusBarProps {
  dataStatus: DataStatus | null;
  stats?: SystemStatistics | null;
  onSync: (mode: 'LIVE' | 'DEMO') => void;
  isSyncing: boolean;
}

export const DataStatusBar: React.FC<DataStatusBarProps> = ({
  dataStatus,
  stats,
  onSync,
  isSyncing,
}) => {
  if (!dataStatus) return null;

  const isLiveError = dataStatus.mode === 'LIVE ERROR';
  const isDemo = dataStatus.mode === 'DEMO' || dataStatus.mode === 'DEMO MODE';
  const totalCount = stats?.tracked_objects || dataStatus.total_objects || 19578;
  const lastSyncTime = dataStatus.last_updated || dataStatus.last_sync;

  if (isLiveError) {
    return (
      <div className="bg-danger-950/90 border-b border-danger-700/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-danger-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-danger-400 animate-pulse flex-shrink-0" />
          <div>
            <span className="font-bold text-white tracking-wide">DATA INGESTION NOTICE:</span>{' '}
            <span>{dataStatus.error_message || dataStatus.sync_error || 'Live provider connection failed. Showing cached dataset.'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSync('LIVE')}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1 bg-danger-800 hover:bg-danger-700 text-white rounded border border-danger-600 transition text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            RETRY LIVE SYNC
          </button>
          <button
            onClick={() => onSync('DEMO')}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1 bg-space-800 hover:bg-space-700 text-warning-neon rounded border border-warning-500/40 transition text-xs font-bold disabled:opacity-50"
          >
            USE VERIFIED CACHE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-space-900/60 border-b border-space-800 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-slate-400">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">PROVIDER:</span>
          <span className="text-white font-bold">{dataStatus.source}</span>
        </div>

        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-500">CATALOG:</span>
          <span className="text-cyan-300 font-bold">{totalCount.toLocaleString()} Objects</span>
        </div>

        {lastSyncTime && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-500">LAST SYNC:</span>
            <span className="text-slate-300">
              {new Date(lastSyncTime).toLocaleTimeString()} UTC
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isDemo ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-warning-500/20 border border-warning-500/40 text-warning-neon rounded text-[10px] font-bold">
              VERIFIED CACHE ACTIVE
            </span>
            <button
              onClick={() => onSync('LIVE')}
              disabled={isSyncing}
              className="text-cyan-400 hover:text-cyan-neon underline text-[11px] disabled:opacity-50"
            >
              Switch to Live Feeds
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SYNCHRONIZED WITH CELESTRAK / SPACE-TRACK</span>
            <span className="sm:hidden">LIVE SYNCED</span>
          </div>
        )}
      </div>
    </div>
  );
};
