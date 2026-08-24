import { useState, useEffect } from 'react';
import { Radio, ShieldAlert, Activity, Database, Satellite, RefreshCw } from 'lucide-react';

export default function App() {
  const [healthStatus, setHealthStatus] = useState<{ status: string; service: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/health');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealthStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend');
      setHealthStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans radar-grid">
      {/* Top Navbar */}
      <header className="border-b border-space-800 bg-space-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-neon glow-cyan">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white">ORBITGUARD</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">SIH 2026</span>
            </div>
            <p className="text-xs text-slate-400">Accessible Space Situational Awareness & Collision Risk Prediction</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-space-850 px-3 py-1.5 rounded-full border border-space-700 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${healthStatus?.status === 'ok' ? 'bg-success-500 animate-ping' : 'bg-warning-500'}`}></span>
            <span className="text-slate-300">SYSTEM:</span>
            <span className={healthStatus?.status === 'ok' ? 'text-success-neon font-semibold' : 'text-warning-500'}>
              {healthStatus?.status === 'ok' ? 'OPERATIONAL' : 'CONNECTING...'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-space-850 px-3 py-1.5 rounded-full border border-space-700 text-xs font-mono">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">DATA:</span>
            <span className="text-cyan-neon">READY</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-space-900 via-space-850 to-space-900 border border-space-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                <Activity className="w-3.5 h-3.5" /> PHASE 1: CORE ARCHITECTURE & FOUNDATION INITIALIZED
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Mission Control Center</h1>
              <p className="text-sm text-slate-400 max-w-2xl">
                Real-time orbital tracking, SGP4 analytical propagation, multi-object conjunction detection, and deterministic collision risk screening.
              </p>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-space-800 hover:bg-space-700 text-cyan-400 rounded-lg border border-space-700 hover:border-cyan-500/40 transition font-mono text-xs shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              PING API
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-space-900/60 border border-space-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">API Backend</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mb-1">
              {healthStatus ? healthStatus.service : (loading ? 'Connecting...' : 'Offline')}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Status: <span className={healthStatus?.status === 'ok' ? 'text-success-neon' : 'text-danger-neon'}>{healthStatus?.status || (error ? 'Unreachable' : 'Pending')}</span>
            </div>
          </div>

          <div className="bg-space-900/60 border border-space-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Orbital Mechanics Engine</span>
              <Satellite className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mb-1">SGP4 / Skyfield</div>
            <div className="text-xs text-slate-400 font-mono">
              Analytical Propagation: <span className="text-cyan-neon">Active</span>
            </div>
          </div>

          <div className="bg-space-900/60 border border-space-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Conjunction Screener</span>
              <ShieldAlert className="w-4 h-4 text-warning-neon" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mb-1">Broad-to-Narrow</div>
            <div className="text-xs text-slate-400 font-mono">
              Thresholds: <span className="text-slate-300">50km screening / 5km critical</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
