import React, { useState } from 'react';
import { Compass, Eye, MapPin, RefreshCw, Satellite, Radio, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { VisibilityPassesResponse } from '../types';

const PRESET_STATIONS = [
  { name: 'New Delhi, India', lat: 28.6139, lon: 77.2090, alt: 216 },
  { name: 'Bengaluru / ISRO ISTRAC', lat: 12.9716, lon: 77.5946, alt: 920 },
  { name: 'Kennedy Space Center, USA', lat: 28.5729, lon: -80.6490, alt: 3 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278, alt: 11 },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, alt: 44 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, alt: 58 }
];

export const PassPredictor: React.FC = () => {
  const [noradId, setNoradId] = useState<number>(25544); // Default ISS
  const [stationName, setStationName] = useState<string>('Bengaluru / ISRO ISTRAC');
  const [lat, setLat] = useState<number>(12.9716);
  const [lon, setLon] = useState<number>(77.5946);
  const [altM, setAltM] = useState<number>(920);
  const [hours, setHours] = useState<number>(48);
  const [minEl, setMinEl] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<VisibilityPassesResponse | null>(null);
  const [selectedPassIndex, setSelectedPassIndex] = useState<number | null>(null);

  const handleSelectPreset = (preset: typeof PRESET_STATIONS[0]) => {
    setStationName(preset.name);
    setLat(preset.lat);
    setLon(preset.lon);
    setAltM(preset.alt);
  };

  const handleCalculatePasses = async () => {
    setLoading(true);
    try {
      const res = await api.getSatellitePasses(noradId, lat, lon, altM, hours, minEl);
      setResult(res);
      if (res.passes.length > 0) setSelectedPassIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">SATELLITE PASS & VISIBILITY PREDICTOR</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Topocentric look-angle ephemeris (Azimuth, Elevation, Slant Range) and optical/RF ground station visibility windows
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-space-800 pb-3">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-sm text-white">Observer Ground Station</h2>
          </div>

          {/* Presets */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Ground Station Presets:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_STATIONS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-[11px] p-1.5 rounded text-left border transition ${
                    stationName === preset.name
                      ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40 font-bold'
                      : 'bg-space-950 text-slate-400 hover:text-white border-space-800'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-xs pt-2">
            <div>
              <label className="text-slate-400 block mb-1">Target Satellite NORAD ID:</label>
              <input
                type="number"
                value={noradId}
                onChange={(e) => setNoradId(Number(e.target.value))}
                className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">25544 (ISS), 44713 (Starlink), 20580 (HST)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Latitude (°N):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Longitude (°E):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Lookahead Window:</label>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Min Elevation:</label>
                <select
                  value={minEl}
                  onChange={(e) => setMinEl(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value={5}>5° (Horizon)</option>
                  <option value={10}>10° (Standard)</option>
                  <option value={20}>20° (High Pass)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleCalculatePasses}
              disabled={loading}
              className="w-full mt-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-space-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              COMPUTE OVERHEAD PASSES
            </button>
          </div>
        </div>

        {/* Passes Table & Details */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-space-800 pb-3">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm text-white">
                {result ? `${result.satellite.name} (NORAD #${result.satellite.norad_id}) Passes` : 'Overhead Visibility Schedule'}
              </h2>
            </div>
            {result && (
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                {result.total_passes} PASSES DETECTED
              </span>
            )}
          </div>

          {result ? (
            <div className="space-y-4">
              {/* Passes List Table */}
              <div className="max-h-72 overflow-y-auto border border-space-800 rounded-xl bg-space-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-space-900 text-slate-400 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Pass #</th>
                      <th className="p-2.5">Rise (AOS)</th>
                      <th className="p-2.5">Max Elevation</th>
                      <th className="p-2.5">Set (LOS)</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Min Range</th>
                      <th className="p-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-800 text-slate-300">
                    {result.passes.map((p, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedPassIndex(idx)}
                        className={`cursor-pointer transition ${selectedPassIndex === idx ? 'bg-cyan-500/20 text-white font-bold' : 'hover:bg-space-900/50'}`}
                      >
                        <td className="p-2.5 font-bold">#{idx + 1}</td>
                        <td className="p-2.5">{p.aos_time.replace('T', ' ').substring(0, 16)} UTC</td>
                        <td className="p-2.5">
                          <span className={`font-bold ${p.max_elevation_deg >= 45 ? 'text-emerald-400' : p.max_elevation_deg >= 20 ? 'text-cyan-400' : 'text-slate-400'}`}>
                            {p.max_elevation_deg}°
                          </span> (Az {p.max_elevation_azimuth_deg}°)
                        </td>
                        <td className="p-2.5">{p.los_time.replace('T', ' ').substring(11, 16)} UTC</td>
                        <td className="p-2.5">{p.duration_minutes} min</td>
                        <td className="p-2.5">{p.min_range_km} km</td>
                        <td className="p-2.5 text-right">
                          <ChevronRight className="w-3.5 h-3.5 inline text-cyan-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Pass Detailed Trajectory */}
              {selectedPassIndex !== null && result.passes[selectedPassIndex] && (
                <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-space-800 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      Look Angles: Pass #{selectedPassIndex + 1} (Max El: {result.passes[selectedPassIndex].max_elevation_deg}°)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Duration: {result.passes[selectedPassIndex].duration_minutes} min ({result.passes[selectedPassIndex].track_points.length} track points)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                      <span className="text-[10px] text-slate-400 block">RISE AZIMUTH</span>
                      <span className="font-bold text-white">{result.passes[selectedPassIndex].aos_azimuth_deg}°</span>
                    </div>
                    <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                      <span className="text-[10px] text-slate-400 block">CULMINATION AZ</span>
                      <span className="font-bold text-cyan-400">{result.passes[selectedPassIndex].max_elevation_azimuth_deg}°</span>
                    </div>
                    <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                      <span className="text-[10px] text-slate-400 block">SET AZIMUTH</span>
                      <span className="font-bold text-white">{result.passes[selectedPassIndex].los_azimuth_deg}°</span>
                    </div>
                    <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                      <span className="text-[10px] text-slate-400 block">SLANT RANGE</span>
                      <span className="font-bold text-emerald-400">{result.passes[selectedPassIndex].min_range_km} km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <Radio className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Select ground station and click "COMPUTE OVERHEAD PASSES" to calculate look angles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
