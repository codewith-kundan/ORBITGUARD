import React, { useState, useEffect } from 'react';
import { Globe, Compass, Search, Satellite } from 'lucide-react';
import { api } from '../services/api';
import { OrbitalObject, GroundTrackResponse } from '../types';
import { OrbitViewer2D } from '../components/OrbitViewer2D';

interface GroundTrackViewProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
}

export const GroundTrackView: React.FC<GroundTrackViewProps> = ({
  objects,
  selectedObject,
  onSelectObject
}) => {
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trackData, setTrackData] = useState<GroundTrackResponse | null>(null);

  // Set default selected object to ISS if none selected
  const activeObj = selectedObject || objects.find((o) => o.norad_id === 25544) || objects[0];

  useEffect(() => {
    if (activeObj) {
      loadTrack(activeObj.id, durationMinutes);
    }
  }, [activeObj?.id, durationMinutes]);

  const loadTrack = async (id: number, duration: number) => {
    try {
      const data = await api.getObjectGroundTrack(id, duration, 2);
      setTrackData(data);
    } catch (err) {
      console.error('Failed to load ground track:', err);
    }
  };

  const filteredObjects = objects.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.norad_id.toString().includes(searchQuery)
  ).slice(0, 20);

  return (
    <div className="space-y-6 font-mono animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">2D MERCATOR GROUND TRACK ANALYZER</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sub-satellite geodetic ground trace projected across standard Mercator world coordinates
          </p>
        </div>

        {/* Duration Selectors */}
        <div className="flex bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
          {[
            { label: '1 Orbit (~90m)', value: 90 },
            { label: '3 Hours', value: 180 },
            { label: '6 Hours', value: 360 },
            { label: '12 Hours', value: 720 },
            { label: '24 Hours', value: 1440 }
          ].map((d) => (
            <button
              key={d.value}
              onClick={() => setDurationMinutes(d.value)}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                durationMinutes === d.value
                  ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Object Selector */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-space-800 pb-3">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-sm text-white">Target Satellite</h2>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search satellite or NORAD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="max-h-[calc(100vh-380px)] overflow-y-auto space-y-1 pr-1">
            {filteredObjects.map((obj) => (
              <button
                key={obj.id}
                onClick={() => onSelectObject(obj)}
                className={`w-full text-left p-2 rounded-lg text-xs transition border flex flex-col ${
                  activeObj?.id === obj.id
                    ? 'bg-cyan-500/20 text-white font-bold border-cyan-500/40'
                    : 'bg-space-950/60 text-slate-300 hover:bg-space-900 border-space-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate">{obj.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">#{obj.norad_id}</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {obj.object_type} • {obj.perigee_km ? `${Math.round(obj.perigee_km)} km` : 'LEO'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2D Map & Telemetry */}
        <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-space-800 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm text-white">
                {activeObj ? `${activeObj.name} (NORAD #${activeObj.norad_id}) Trace` : 'Ground Track Map'}
              </h2>
            </div>
            {trackData && (
              <span className="text-[10px] bg-space-950 text-slate-400 px-2.5 py-1 rounded-lg border border-space-800">
                {trackData.points.length} Trace Points ({durationMinutes / 60}h window)
              </span>
            )}
          </div>

          {activeObj && (
            <div className="h-[480px] rounded-xl overflow-hidden border border-space-800 bg-space-950">
              <OrbitViewer2D
                selectedObject={activeObj}
                durationMinutes={durationMinutes}
              />
            </div>
          )}

          {activeObj && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <span className="text-[10px] text-slate-400 block">INCLINATION</span>
                <span className="font-bold text-white">{activeObj.inclination ? `${activeObj.inclination}°` : '51.6°'}</span>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <span className="text-[10px] text-slate-400 block">ORBITAL PERIOD</span>
                <span className="font-bold text-cyan-400">{activeObj.period_minutes ? `${activeObj.period_minutes} min` : '92.8 min'}</span>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <span className="text-[10px] text-slate-400 block">ALTITUDE (PERIGEE/APOGEE)</span>
                <span className="font-bold text-white">
                  {activeObj.perigee_km ? `${Math.round(activeObj.perigee_km)} / ${Math.round(activeObj.apogee_km || 0)} km` : '415 / 422 km'}
                </span>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <span className="text-[10px] text-slate-400 block">REGIME</span>
                <span className="font-bold text-emerald-400">
                  {activeObj.perigee_km && activeObj.perigee_km > 2000 ? 'MEO / GEO' : 'LEO (Low Earth Orbit)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
