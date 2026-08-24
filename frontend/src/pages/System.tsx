import React, { useState, useEffect } from 'react';
import { Database, Activity, RefreshCw, CheckCircle2, ShieldCheck, Cpu, UploadCloud, FileText } from 'lucide-react';
import { api } from '../services/api';
import { DataStatus, SystemHealth } from '../types';

interface SystemProps {
  dataStatus: DataStatus | null;
  onSync: (mode: 'LIVE' | 'DEMO') => void;
  isSyncing: boolean;
}

export const System: React.FC<SystemProps> = ({
  dataStatus,
  onSync,
  isSyncing
}) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [screeningLoading, setScreeningLoading] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [customTleText, setCustomTleText] = useState<string>('');

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const h = await api.getHealth();
      setHealth(h);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRunScreening = async () => {
    setScreeningLoading(true);
    setActionMessage(null);
    try {
      const res = await api.triggerConjunctionScreening(24, 50.0, 5);
      setActionMessage(`Screening complete: ${res.conjunctions_detected} candidate conjunctions analyzed.`);
      fetchHealth();
    } catch (err: any) {
      setActionMessage(`Screening failed: ${err.message}`);
    } finally {
      setScreeningLoading(false);
    }
  };

  const handleCustomUpload = async () => {
    if (!customTleText.trim()) return;
    setUploadLoading(true);
    setActionMessage(null);
    try {
      const res = await api.uploadCustomTle(customTleText, 'User Custom TLE');
      setActionMessage(`Uploaded successfully: ${res.inserted} inserted, ${res.updated} updated. Total in catalog: ${res.total_objects}`);
      setCustomTleText('');
      fetchHealth();
    } catch (err: any) {
      setActionMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setCustomTleText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-neon" />
            <h1 className="text-xl font-bold text-white tracking-wide">SYSTEM & OPERATIONS CONTROL</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time backend architecture health, database connectivity, and SGP4 ephemeris engine status.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-space-950 hover:bg-space-800 text-cyan-400 border border-space-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH HEALTH
        </button>
      </div>

      {actionMessage && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3.5 text-xs text-cyan-300 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Database Status */}
        <div className="bg-space-900 border border-space-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Database className="w-4 h-4 text-cyan-neon" />
                <span>PERSISTENT DATABASE</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                CONNECTED
              </span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">ENGINE:</span>
                <span className="text-white font-bold">PostgreSQL / SQLite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SCHEMA:</span>
                <span className="text-white">SQLAlchemy Relational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TOTAL OBJECTS:</span>
                <span className="text-cyan-400 font-bold">{health?.object_count ?? dataStatus?.total_objects ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TABLES:</span>
                <span className="text-slate-300 text-[11px]">objects, tle, conj, alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Data Provider & Ingestion */}
        <div className="bg-space-900 border border-space-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <RefreshCw className="w-4 h-4 text-cyan-neon" />
                <span>ORBITAL PROVIDER</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                dataStatus?.mode === 'LIVE ERROR'
                  ? 'bg-danger-500/20 text-danger-400 border border-danger-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {dataStatus?.source ?? 'CelesTrak'}
              </span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">PROVIDERS:</span>
                <span className="text-white">CelesTrak / Space-Track</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">STATUS MODE:</span>
                <span className="text-emerald-400 font-bold">{dataStatus?.mode ?? 'LIVE'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">LAST SYNC:</span>
                <span className="text-slate-300 text-[11px]">
                  {dataStatus?.last_updated || dataStatus?.last_sync ? new Date(dataStatus.last_updated || dataStatus.last_sync || '').toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SYNC INTERVAL:</span>
                <span className="text-slate-300">30 minutes</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-space-800 flex gap-2">
            <button
              onClick={() => onSync('LIVE')}
              disabled={isSyncing}
              className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-neon border border-cyan-500/40 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {isSyncing ? 'SYNCING...' : 'LIVE SYNC'}
            </button>
            <button
              onClick={() => onSync('DEMO')}
              disabled={isSyncing}
              className="py-1.5 px-3 bg-space-950 hover:bg-space-800 text-warning-neon border border-warning-500/40 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              DEMO
            </button>
          </div>
        </div>

        {/* 3. SGP4 & Conjunction Engine */}
        <div className="bg-space-900 border border-space-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Cpu className="w-4 h-4 text-cyan-neon" />
                <span>PROPAGATION ENGINE</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ONLINE
              </span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">PROPAGATOR:</span>
                <span className="text-white font-bold">SGP4 / Skyfield (WGS84)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SCREENING DISTANCE:</span>
                <span className="text-cyan-400 font-bold">50.0 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PREDICTION HORIZON:</span>
                <span className="text-white">24 Hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">LAST SCAN:</span>
                <span className="text-slate-300 text-[11px]">
                  {health?.last_conjunction_scan ? new Date(health.last_conjunction_scan).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-space-800">
            <button
              onClick={handleRunScreening}
              disabled={screeningLoading}
              className="w-full py-1.5 bg-danger-500/20 hover:bg-danger-500/30 text-danger-300 border border-danger-500/40 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {screeningLoading ? 'SCREENING...' : 'RUN CONJUNCTION SCREEN'}
            </button>
          </div>
        </div>
      </div>

      {/* Custom TLE Ingestion & File Upload */}
      <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-neon" />
            <h3 className="font-bold text-sm text-white">CUSTOM TLE DATASET INGESTION</h3>
          </div>
          <label className="cursor-pointer px-3 py-1 bg-space-950 hover:bg-space-800 text-cyan-400 border border-space-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Choose .tle / .txt File</span>
            <input type="file" accept=".tle,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <textarea
          rows={4}
          value={customTleText}
          onChange={(e) => setCustomTleText(e.target.value)}
          placeholder="Paste 2-line or 3-line TLE dataset here from Space-Track, ISRO, NASA, or research catalogs..."
          className="w-full bg-space-950 border border-space-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 mb-3"
        />

        <div className="flex justify-end">
          <button
            onClick={handleCustomUpload}
            disabled={uploadLoading || !customTleText.trim()}
            className="px-4 py-2 bg-cyan-500 text-space-950 font-bold rounded-xl text-xs hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploadLoading ? 'PARSING & INGESTING...' : 'INGEST CUSTOM TLE DATASET'}
          </button>
        </div>
      </div>

      {/* Architecture Specs */}
      <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>SCIENTIFIC IMPLEMENTATION & SPECIFICATIONS</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-space-950 p-4 rounded-xl border border-space-800">
            <div className="font-bold text-cyan-400 mb-1">Coordinate Transformations</div>
            <p className="text-slate-400">
              SGP4 evaluates state vectors in the True Equator Mean Equinox (TEME) frame. 
              The system calculates Greenwich Mean Sidereal Time (GMST) to convert TEME to Earth-Centered Earth-Fixed (ECEF), 
              and executes Bowring&apos;s closed-form algorithm for WGS84 Geodetic Latitude, Longitude, and Altitude.
            </p>
          </div>
          <div className="bg-space-950 p-4 rounded-xl border border-space-800">
            <div className="font-bold text-cyan-400 mb-1">Conjunction Risk Model (0–100)</div>
            <p className="text-slate-400">
              Deterministic multi-factor risk engine:
              <br />• <strong>Miss Distance Factor:</strong> 55% weight (miss distance &le; 5 km is CRITICAL)
              <br />• <strong>Relative Velocity Factor:</strong> 25% weight (velocity &ge; 14 km/s)
              <br />• <strong>Time-to-TCA Lead Urgency:</strong> 20% weight (TCA &le; 6h)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
