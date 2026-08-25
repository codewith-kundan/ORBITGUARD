import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Flame, 
  AlertTriangle, 
  Sliders, 
  TrendingDown, 
  RotateCcw
} from 'lucide-react';
import { OrbitalObject, ReentryPrediction, DecayWatchlistItem } from '../types';
import { api } from '../services/api';

interface ReentryTrackerModalProps {
  object: OrbitalObject;
  onClose: () => void;
}

export const ReentryTrackerModal: React.FC<ReentryTrackerModalProps> = ({
  object,
  onClose
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  const [solarFlux, setSolarFlux] = useState<number>(150.0);
  const [geomagneticAp, setGeomagneticAp] = useState<number>(15.0);
  const [dryMass, setDryMass] = useState<number>(object.object_type === 'ROCKET_BODY' ? 2500.0 : object.object_type === 'DEBRIS' ? 15.0 : 850.0);
  const [dragArea, setDragArea] = useState<number>(object.object_type === 'ROCKET_BODY' ? 12.0 : object.object_type === 'DEBRIS' ? 0.2 : 3.0);

  const [prediction, setPrediction] = useState<ReentryPrediction | null>(null);
  const [watchlist, setWatchlist] = useState<DecayWatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'watchlist'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.simulateDecay({
        norad_id: object.norad_id,
        dry_mass_kg: dryMass,
        drag_area_m2: dragArea,
        solar_flux_f107: solarFlux,
        geomagnetic_ap: geomagneticAp
      });
      setPrediction(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compute re-entry prediction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
    api.getDecayWatchlist(90.0).then(setWatchlist).catch(() => {});
  }, [object.norad_id]);

  // Render Altitude Decay Curve on Canvas
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || !prediction || !prediction.decay_profile || prediction.decay_profile.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 45;

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    const profile = prediction.decay_profile;
    const maxDays = Math.max(1, profile[profile.length - 1].days_from_epoch);
    const maxAlt = Math.max(400, ...profile.map(p => p.apogee_altitude_km));
    const minAlt = 0;

    const mapX = (days: number) => padLeft + (days / maxDays) * (w - padLeft - padRight);
    const mapY = (alt: number) => h - padBottom - ((alt - minAlt) / (maxAlt - minAlt)) * (h - padTop - padBottom);

    // 1. Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.4)';

    // Altitude Grids
    for (let alt = 0; alt <= maxAlt; alt += 100) {
      const y = mapY(alt);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`${alt} km`, 10, y + 3);
    }

    // Time Grids
    const timeStep = maxDays > 30 ? Math.ceil(maxDays / 6) : maxDays > 5 ? 5 : 1;
    for (let d = 0; d <= maxDays; d += timeStep) {
      const x = mapX(d);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`${d}d`, x - 8, h - padBottom + 16);
    }

    // 2. Atmospheric Re-entry Threshold Line (85-100 km)
    const y85 = mapY(85);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y85);
    ctx.lineTo(w - padRight, y85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('BREAKUP & CASUALTY INTERFACE (85 km)', w - padRight - 220, y85 - 4);

    // 3. Draw Apogee Altitude Curve (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    profile.forEach((pt, idx) => {
      const x = mapX(pt.days_from_epoch);
      const y = mapY(pt.apogee_altitude_km);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 4. Draw Perigee Altitude Curve (Emerald -> Crimson Gradient)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    profile.forEach((pt, idx) => {
      const x = mapX(pt.days_from_epoch);
      const y = mapY(pt.perigee_altitude_km);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('TIME ELAPSED (DAYS TO RE-ENTRY)', w / 2 - 90, h - 8);

    ctx.save();
    ctx.translate(14, h / 2 + 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ALTITUDE (KM)', 0, 0);
    ctx.restore();

  }, [prediction]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono text-slate-200">
      <div className="bg-space-900 border border-orange-500/50 rounded-2xl max-w-6xl w-full max-h-[94vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-6 py-3.5 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  ATMOSPHERIC RE-ENTRY & ORBITAL LIFETIME TRACKER
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  prediction?.risk_level === 'CRITICAL' 
                    ? 'bg-red-500/20 text-red-400 border-red-500/40' 
                    : prediction?.risk_level === 'HIGH'
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {prediction?.risk_level || 'ASSESSING'} DECAY
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Target: {object.name} (#{object.norad_id}) • King-Hele Drag Model & NASA CASUALTY STANDARDS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white rounded-lg border border-space-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-space-950/60 border-b border-space-800 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'profile' 
                  ? 'bg-orange-500 text-space-950 shadow-md' 
                  : 'bg-space-900 text-slate-400 hover:text-white'
              }`}
            >
              DECAY LIFETIME & PROFILE
            </button>
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'watchlist' 
                  ? 'bg-orange-500 text-space-950 shadow-md' 
                  : 'bg-space-900 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              GLOBAL RE-ENTRY WATCHLIST ({watchlist.length})
            </button>
          </div>

          {prediction && (
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-slate-400">PREDICTED RE-ENTRY:</span>
              <span className="text-orange-400 font-bold">
                {new Date(prediction.predicted_reentry_time).toISOString().replace('T', ' ').slice(0, 16)} UTC (±{prediction.uncertainty_window_hours}h)
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(94vh-170px)] space-y-4">
          {error && (
            <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-neon text-xs">
              {error}
            </div>
          )}

          {activeTab === 'profile' ? (
            <>
              {/* Summary KPIs */}
              {prediction && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-space-950 p-3.5 rounded-xl border border-space-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ESTIMATED REMAINING LIFETIME:</span>
                    <span className="text-2xl font-bold text-orange-400">
                      {prediction.estimated_lifetime_days > 365 
                        ? `${(prediction.estimated_lifetime_days / 365.25).toFixed(1)} Years` 
                        : `${prediction.estimated_lifetime_days} Days`}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Uncertainty: ±{prediction.uncertainty_window_hours} Hours
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">LATITUDE HAZARD BAND:</span>
                    <span className="text-xl font-bold text-white">
                      {prediction.reentry_latitude_band}
                    </span>
                    <span className="text-[10px] text-cyan-400 block mt-0.5">
                      Bound by orbital inclination
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">ESTIMATED SURVIVING DEBRIS MASS:</span>
                    <span className="text-xl font-bold text-amber-400">
                      {prediction.estimated_surviving_mass_kg} kg
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      of {prediction.estimated_dry_mass_kg} kg total dry mass
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">HUMAN CASUALTY EXPECTATION:</span>
                    <span className="text-xs font-bold text-red-400">
                      {prediction.casualty_risk_score}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      NASA-STD-8719.14 Compliance
                    </span>
                  </div>
                </div>
              )}

              {/* Main Grid: Parameters Dock & Decay Canvas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* LEFT: Physics & Space Weather Controls (4 cols) */}
                <div className="lg:col-span-4 bg-space-950 p-4 rounded-xl border border-space-800 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-space-800 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-orange-400" />
                      SPACE WEATHER & BALLISTICS
                    </span>
                    <span className="text-[10px] text-slate-400">ATMOSPHERIC DRAG</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400 font-bold uppercase">Solar Radio Flux (F10.7)</span>
                      <span className="text-orange-400 font-bold">{solarFlux} SFU</span>
                    </div>
                    <input
                      type="range"
                      min="65"
                      max="280"
                      step="5"
                      value={solarFlux}
                      onChange={(e) => setSolarFlux(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400 font-bold uppercase">Geomagnetic Activity (Ap)</span>
                      <span className="text-orange-400 font-bold">{geomagneticAp}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      step="5"
                      value={geomagneticAp}
                      onChange={(e) => setGeomagneticAp(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Dry Mass (kg)</label>
                      <input
                        type="number"
                        value={dryMass}
                        onChange={(e) => setDryMass(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Drag Area (m²)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={dragArea}
                        onChange={(e) => setDragArea(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                        className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-space-800">
                    <button
                      onClick={fetchAssessment}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500 hover:bg-orange-400 text-space-950 rounded-lg font-bold text-xs transition shadow-md disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      RE-CALCULATE DECAY PROFILE
                    </button>
                  </div>
                </div>

                {/* RIGHT: Altitude Decay Curve Canvas (8 cols) */}
                <div className="lg:col-span-8 bg-space-950 p-4 rounded-xl border border-space-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-white uppercase">
                        Orbital Altitude Decay Curve
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Perigee (hp)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Apogee (ha)
                      </span>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center p-1 bg-black rounded-lg border border-space-900">
                    <canvas
                      ref={chartCanvasRef}
                      width={680}
                      height={360}
                      className="w-full h-auto block"
                    />
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>King-Hele secular drag rates & US Standard Atmosphere scale heights</span>
                    <span className="text-orange-400 font-bold">B* = {prediction?.bstar.toExponential(3)}</span>
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Global Re-entry Watchlist Table */
            <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-3">
              <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                <span className="font-bold text-white uppercase tracking-wider">
                  Urgent Global Re-entry Watchlist (Decaying within 90 Days)
                </span>
                <span className="text-[10px] text-orange-400 font-bold">
                  {watchlist.length} Tracked Decaying Objects
                </span>
              </div>

              {watchlist.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  No objects currently cataloged with imminent atmospheric decay under 90 days.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-space-900/80 text-slate-400 border-b border-space-800 text-[10px]">
                      <tr>
                        <th className="p-2">NORAD ID</th>
                        <th className="p-2">OBJECT NAME</th>
                        <th className="p-2">TYPE</th>
                        <th className="p-2">PERIGEE / APOGEE</th>
                        <th className="p-2">REMAINING LIFETIME</th>
                        <th className="p-2">PREDICTED RE-ENTRY</th>
                        <th className="p-2">RISK LEVEL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-space-800/60 font-mono text-[11px]">
                      {watchlist.map((item) => (
                        <tr key={item.norad_id} className="hover:bg-space-900/40 text-slate-300">
                          <td className="p-2 text-cyan-400 font-bold">#{item.norad_id}</td>
                          <td className="p-2 text-white font-bold">{item.object_name}</td>
                          <td className="p-2 text-slate-400">{item.object_type}</td>
                          <td className="p-2 text-slate-300">{item.perigee_km.toFixed(0)} / {item.apogee_km.toFixed(0)} km</td>
                          <td className="p-2 font-bold text-orange-400">{item.estimated_lifetime_days} Days</td>
                          <td className="p-2 whitespace-nowrap">
                            {new Date(item.predicted_reentry_time).toISOString().replace('T', ' ').slice(0, 16)} UTC
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.risk_level === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            }`}>
                              {item.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-space-800 px-4 sm:px-6 py-2.5 bg-space-950/90 flex items-center justify-between text-[10px] text-slate-400">
          <div>US STANDARD ATMOSPHERE 1976 • SGP4 B* BALLISTIC COEFFICIENT INTEGRATION</div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-space-800 hover:bg-space-700 text-white rounded text-xs transition font-bold"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
