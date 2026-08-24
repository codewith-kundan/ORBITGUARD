import React, { useState, useEffect } from 'react';
import { OrbitalObject, OrbitalPosition } from '../types';
import { api } from '../services/api';
import { X, Satellite, Compass, Activity, Terminal } from 'lucide-react';

interface ObjectDetailsModalProps {
  object: OrbitalObject | null;
  onClose: () => void;
}

export const ObjectDetailsModal: React.FC<ObjectDetailsModalProps> = ({ object, onClose }) => {
  const [livePos, setLivePos] = useState<OrbitalPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!object) return;
    let isMounted = true;

    const fetchPos = async () => {
      setLoading(true);
      try {
        const pos = await api.getObjectPosition(object.norad_id);
        if (isMounted) setLivePos(pos);
      } catch (e) {
        console.error('Failed to get position:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPos();
    const interval = setInterval(fetchPos, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [object]);

  if (!object) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-space-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-space-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-neon glow-cyan">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">{object.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-space-800 text-cyan-400 border border-space-700">
                  NORAD #{object.norad_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize">
                Classification: <span className="text-slate-200 font-semibold">{object.object_type.replace('_', ' ')}</span> • Source: {object.source}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Ephemeris Telemetry Grid */}
        <div className="mb-4">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            Real-Time SGP4 Analytical Telemetry {loading && <span className="text-[10px] text-slate-400">(Updating...)</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-slate-400">LATITUDE</div>
              <div className="text-sm font-bold text-white">{livePos ? `${livePos.lat.toFixed(4)}°` : '—'}</div>
            </div>
            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-slate-400">LONGITUDE</div>
              <div className="text-sm font-bold text-white">{livePos ? `${livePos.lon.toFixed(4)}°` : '—'}</div>
            </div>
            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-slate-400">ALTITUDE</div>
              <div className="text-sm font-bold text-cyan-neon">{livePos ? `${livePos.alt_km.toFixed(1)} km` : '—'}</div>
            </div>
            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-slate-400">ORBITAL SPEED</div>
              <div className="text-sm font-bold text-cyan-neon">{livePos ? `${livePos.velocity_km_s.toFixed(3)} km/s` : '—'}</div>
            </div>
          </div>
        </div>

        {/* Keplerian Orbital Parameters */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Keplerian Orbital Elements
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-space-950/60 p-3 rounded-lg border border-space-800">
            <div>
              <span className="text-slate-400">Perigee:</span>{' '}
              <span className="text-white font-bold">{object.perigee_km?.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-slate-400">Apogee:</span>{' '}
              <span className="text-white font-bold">{object.apogee_km?.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-slate-400">Inclination:</span>{' '}
              <span className="text-white font-bold">{object.inclination_deg?.toFixed(2)}°</span>
            </div>
            <div>
              <span className="text-slate-400">Period:</span>{' '}
              <span className="text-white font-bold">{object.period_min?.toFixed(1)} min</span>
            </div>
          </div>
        </div>

        {/* Raw Two-Line Element Set */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Raw Two-Line Element (TLE) Record
          </div>
          <div className="bg-space-950 p-3 rounded-lg border border-space-800 font-mono text-[11px] text-slate-300 overflow-x-auto select-all">
            <div className="text-cyan-400">{object.name}</div>
            <div>{object.tle_line1}</div>
            <div>{object.tle_line2}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
