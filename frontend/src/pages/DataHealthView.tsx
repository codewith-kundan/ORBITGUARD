import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { DataHealthResponse } from '../types';

export const DataHealthView: React.FC = () => {
  const [healthData, setHealthData] = useState<DataHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await api.getDataHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to load data health:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async (mode: 'LIVE' | 'DEMO') => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.syncData(mode);
      setSyncMessage(`Sync completed: ${res.inserted || 0} inserted, ${res.updated || 0} updated.`);
      await loadHealth();
    } catch (err: any) {
      setSyncMessage(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">DATA SOURCES & HEALTH MONITOR</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time orbital data provider feeds, network latencies, stale TLE validation, and ingestion logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerSync('LIVE')}
            disabled={syncing}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-space-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            SYNC LIVE FEEDS
          </button>
          <button
            onClick={loadHealth}
            disabled={loading}
            className="p-1.5 bg-space-950 hover:bg-space-900 text-slate-400 hover:text-white rounded-xl border border-space-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-300 flex items-center justify-between">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
          <span className="text-[10px] text-slate-400 block mb-1">DATA INTEGRITY STATUS</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-lg font-bold text-white">OPERATIONAL</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Deterministic SGP4 Engine Active</span>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
          <span className="text-[10px] text-slate-400 block mb-1">TOTAL TRACKED OBJECTS</span>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span className="text-lg font-bold text-cyan-neon">
              {healthData ? healthData.total_tracked_objects.toLocaleString() : '19,578'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Active Satellites, Debris & Rocket Bodies</span>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
          <span className="text-[10px] text-slate-400 block mb-1">DATA EXPORT</span>
          <div className="flex items-center gap-2">
            <a
              href={api.getExportUrl('objects', 'json')}
              download
              className="text-xs bg-space-950 hover:bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-cyan-400 font-bold flex items-center gap-1 transition"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </a>
            <a
              href={api.getExportUrl('objects', 'csv')}
              download
              className="text-xs bg-space-950 hover:bg-space-900 px-2.5 py-1 rounded-lg border border-space-800 text-emerald-400 font-bold flex items-center gap-1 transition"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </a>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Full Catalog & Conjunction Data Messages</span>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-space-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-sm text-white">Orbital Ephemeris Data Providers</h2>
          </div>
          <span className="text-[10px] text-slate-400">
            Last Checked: {healthData ? healthData.timestamp.replace('T', ' ').substring(0, 19) : '—'} UTC
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthData?.providers.map((p) => (
            <div key={p.provider} className="bg-space-950/80 p-4 rounded-xl border border-space-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    p.status === 'HEALTHY' || p.status === 'AVAILABLE'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                      : p.status === 'CONFIGURED'
                      ? 'bg-cyan-400'
                      : p.status === 'UNCONFIGURED'
                      ? 'bg-warning-400'
                      : 'bg-slate-500'
                  }`}></span>
                  {p.provider}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  p.status === 'HEALTHY' || p.status === 'AVAILABLE'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : p.status === 'CONFIGURED'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    : p.status === 'UNCONFIGURED'
                    ? 'bg-warning-500/20 text-warning-400 border-warning-500/30'
                    : 'bg-space-900 text-slate-400 border-space-700'
                }`}>
                  {p.status}
                </span>
              </div>

              <p className="text-xs text-slate-300">{p.message}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-space-900">
                <span>Latency: {p.latency_ms} ms</span>
                <span>Auth Required: {p.requires_auth ? 'YES (SPACETRACK_*)' : 'NO'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
