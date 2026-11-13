import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Flame, AlertTriangle, Sliders, TrendingDown, RotateCcw } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { OrbitalObject, ReentryPrediction, DecayWatchlistItem } from '../types';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface ReentryTrackerModalProps {
  object: OrbitalObject;
  onClose: () => void;
}

export const ReentryTrackerModal: React.FC<ReentryTrackerModalProps> = ({
  object,
  onClose,
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  const [solarFlux, setSolarFlux] = useState<number>(150.0);
  const [geomagneticAp, setGeomagneticAp] = useState<number>(15.0);
  const [dryMass, setDryMass] = useState<number>(
    object.object_type === 'ROCKET_BODY' ? 2500.0 : object.object_type === 'DEBRIS' ? 15.0 : 850.0
  );
  const [dragArea, setDragArea] = useState<number>(
    object.object_type === 'ROCKET_BODY' ? 12.0 : object.object_type === 'DEBRIS' ? 0.2 : 3.0
  );

  const [prediction, setPrediction] = useState<ReentryPrediction | null>(null);
  const [watchlist, setWatchlist] = useState<DecayWatchlistItem[]>([]);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'watchlist'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.simulateDecay({
        norad_id: object.norad_id,
        dry_mass_kg: dryMass,
        drag_area_m2: dragArea,
        solar_flux_f107: solarFlux,
        geomagnetic_ap: geomagneticAp,
      });
      setPrediction(res);
    } catch (err: any) {
      setPrediction(null);
      setError(err?.message || 'Failed to compute re-entry decay prediction.');
    } finally {
      setLoading(false);
    }
  }, [object.norad_id, dryMass, dragArea, solarFlux, geomagneticAp]);

  useEffect(() => {
    fetchAssessment();
    api
      .getDecayWatchlist(90.0)
      .then((list) => {
        setWatchlist(Array.isArray(list) ? list : []);
        setWatchlistError(null);
      })
      .catch((err: any) => {
        setWatchlist([]);
        setWatchlistError(err?.message || 'Unable to load decay watchlist.');
      });
  }, [object.norad_id, fetchAssessment]);

  const hasProfile = Boolean(prediction?.decay_profile && prediction.decay_profile.length > 0);

  // Render Altitude Decay Curve on Canvas
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || !prediction?.decay_profile || prediction.decay_profile.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padLeft = 60;
    const padRight = 24;
    const padTop = 28;
    const padBottom = 42;

    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, w, h);

    const profile = prediction.decay_profile;
    const maxDays = Math.max(1, profile[profile.length - 1].days_from_epoch || 1);
    const maxAlt = Math.max(400, ...profile.map((p) => p.apogee_altitude_km || 0));

    const mapX = (days: number) => padLeft + (days / maxDays) * (w - padLeft - padRight);
    const mapY = (alt: number) =>
      h - padBottom - (alt / maxAlt) * (h - padTop - padBottom);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e2836';

    const altStep = maxAlt > 1200 ? 300 : maxAlt > 700 ? 200 : 100;
    for (let alt = 0; alt <= maxAlt; alt += altStep) {
      const y = mapY(alt);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${alt} km`, 8, y + 3);
    }

    const timeStep = maxDays > 30 ? Math.ceil(maxDays / 6) : maxDays > 5 ? 5 : 1;
    for (let d = 0; d <= maxDays; d += timeStep) {
      const x = mapX(d);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${Math.round(d)}d`, x - 8, h - padBottom + 16);
    }

    // Re-entry Interface Line (85 km)
    const y85 = mapY(85);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y85);
    ctx.lineTo(w - padRight, y85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText('RE-ENTRY INTERFACE (85 km)', w - padRight - 175, y85 - 5);

    // Apogee Curve
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

    // Perigee Curve
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

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText('DAYS FROM EPOCH', w / 2 - 55, h - 10);
  }, [prediction]);

  const riskBadgeCls =
    prediction?.risk_level === 'CRITICAL'
      ? 'bg-red-500/15 text-red-300 border-red-500/40'
      : prediction?.risk_level === 'HIGH'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35';

  return (
    <ModalDialog
      isOpen={true}
      onClose={onClose}
      titleId="reentry-tracker-title"
      maxWidthClass="max-w-5xl"
      className="bg-space-900 border border-space-700 rounded-xl max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl font-mono text-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-5 py-3.5 bg-space-950 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-space-900 border border-space-700 flex items-center justify-center text-amber-400 shrink-0" aria-hidden="true">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="reentry-tracker-title" className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                Orbital Lifetime &amp; Atmospheric Re-Entry Model
              </h2>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${riskBadgeCls}`}>
                {prediction?.risk_level ? `${prediction.risk_level} DECAY` : 'ASSESSING'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {object.name} (#{object.norad_id}) • King-Hele Secular Drag Integration
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Re-Entry Tracker dialog"
          className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Tabs & Re-entry Timestamp */}
      <div className="bg-space-950 border-b border-space-800 px-4 sm:px-5 py-2 flex items-center justify-between gap-3 text-xs flex-wrap">
        <div role="tablist" aria-label="Decay views" className="flex items-center gap-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
              activeTab === 'profile'
                ? 'bg-sky-500/15 text-sky-200 border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-space-800'
            }`}
          >
            Decay Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'watchlist'}
            onClick={() => setActiveTab('watchlist')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
              activeTab === 'watchlist'
                ? 'bg-sky-500/15 text-sky-200 border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-space-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>90-Day Watchlist ({watchlist.length})</span>
          </button>
        </div>

        {prediction?.predicted_reentry_time && (
          <div className="flex items-center gap-2 text-[11px] tabular-nums">
            <span className="text-slate-400">PREDICTED RE-ENTRY:</span>
            <span className="text-amber-300 font-semibold">
              {formatUtcDateTime(prediction.predicted_reentry_time, true)} UTC
              {prediction.uncertainty_window_hours != null ? ` (±${prediction.uncertainty_window_hours}h)` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/35 rounded-md text-red-200 text-xs flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchAssessment}
              className="px-2.5 py-1 rounded bg-space-950 border border-red-500/40 hover:bg-space-800 text-slate-200"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'profile' ? (
          <>
            {prediction && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-space-950 p-3.5 rounded-md border border-space-800 text-xs tabular-nums">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Remaining Lifetime</span>
                  <span className="text-xl font-semibold text-amber-300">
                    {prediction.estimated_lifetime_days != null
                      ? prediction.estimated_lifetime_days > 365
                        ? `${(prediction.estimated_lifetime_days / 365.25).toFixed(1)} Years`
                        : `${prediction.estimated_lifetime_days} Days`
                      : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {prediction.uncertainty_window_hours != null ? `±${prediction.uncertainty_window_hours}h window` : 'Epoch horizon'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Latitude Band</span>
                  <span className="text-lg font-semibold text-slate-100">
                    {prediction.reentry_latitude_band || '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Inclination envelope</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Surviving Mass</span>
                  <span className="text-lg font-semibold text-slate-100">
                    {prediction.estimated_surviving_mass_kg != null ? `${prediction.estimated_surviving_mass_kg} kg` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {prediction.estimated_dry_mass_kg != null ? `of ${prediction.estimated_dry_mass_kg} kg dry mass` : 'Model estimate'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Casualty Expectation</span>
                  <span className="text-xs font-semibold text-red-300">
                    {prediction.casualty_risk_score || '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">NASA-STD-8719.14 ref</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Controls */}
              <div className="lg:col-span-4 bg-space-950 p-4 rounded-md border border-space-800 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-space-800 pb-2">
                  <span className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase">
                    <Sliders className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
                    <span>Atmosphere &amp; Ballistics</span>
                  </span>
                  <span className="text-[10px] text-slate-400">INPUTS</span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <label htmlFor="decay-f107" className="text-slate-300 font-semibold">
                      Solar Flux (F10.7)
                    </label>
                    <span className="text-accent-400 font-semibold tabular-nums">{solarFlux} SFU</span>
                  </div>
                  <input
                    id="decay-f107"
                    type="range"
                    min="65"
                    max="280"
                    step="5"
                    value={solarFlux}
                    onChange={(e) => setSolarFlux(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <label htmlFor="decay-ap" className="text-slate-300 font-semibold">
                      Geomagnetic Index (Ap)
                    </label>
                    <span className="text-accent-400 font-semibold tabular-nums">{geomagneticAp}</span>
                  </div>
                  <input
                    id="decay-ap"
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={geomagneticAp}
                    onChange={(e) => setGeomagneticAp(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label htmlFor="decay-mass" className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Dry Mass (kg)
                    </label>
                    <input
                      id="decay-mass"
                      type="number"
                      min={1}
                      value={dryMass}
                      onChange={(e) => setDryMass(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full bg-space-900 border border-space-700 rounded-md p-2 text-slate-100 font-semibold text-xs tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor="decay-area" className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Drag Area (m²)
                    </label>
                    <input
                      id="decay-area"
                      type="number"
                      min={0.01}
                      step="0.1"
                      value={dragArea}
                      onChange={(e) => setDragArea(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                      className="w-full bg-space-900 border border-space-700 rounded-md p-2 text-slate-100 font-semibold text-xs tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-space-800">
                  <button
                    type="button"
                    onClick={fetchAssessment}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 bg-sky-500 hover:bg-sky-400 text-space-950 rounded-md font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{loading ? 'Propagating...' : 'Recalculate Decay Profile'}</span>
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="lg:col-span-8 bg-space-950 p-4 rounded-md border border-space-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-accent-400" aria-hidden="true" />
                    <span className="font-semibold text-slate-100 uppercase">
                      Altitude Decay Curve
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" aria-hidden="true" />
                      Perigee (hp)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block" aria-hidden="true" />
                      Apogee (ha)
                    </span>
                  </div>
                </div>

                <div className="relative flex items-center justify-center p-1 bg-space-900 rounded-md border border-space-800 min-h-[260px]">
                  {hasProfile ? (
                    <canvas
                      ref={chartCanvasRef}
                      width={680}
                      height={340}
                      aria-label="Orbital altitude decay profile over time"
                      className="w-full h-auto block"
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      {loading
                        ? 'Computing atmospheric decay integration curve...'
                        : 'No decay profile points available for current orbital regime.'}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
                  <span>US Standard Atmosphere 1976 &amp; King-Hele scale height model</span>
                  <span className="text-accent-400 font-semibold tabular-nums">
                    B* = {prediction?.bstar != null ? prediction.bstar.toExponential(3) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-space-950 p-4 rounded-md border border-space-800 space-y-3">
            <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs">
              <span className="font-semibold text-slate-100 uppercase tracking-wider">
                Imminent Re-Entry Watchlist (&lt; 90 Days)
              </span>
              <span className="text-[11px] text-amber-300 font-semibold tabular-nums">
                {watchlist.length} objects
              </span>
            </div>

            {watchlistError ? (
              <div className="p-4 text-center text-xs text-red-200 bg-red-500/10 border border-red-500/35 rounded-md">
                {watchlistError}
              </div>
            ) : watchlist.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No cataloged objects predicted to decay within the next 90 days.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <caption className="sr-only">Tracked objects predicted to re-enter within 90 days</caption>
                  <thead className="bg-space-900 text-slate-400 border-b border-space-800 text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="p-2 font-semibold">NORAD</th>
                      <th scope="col" className="p-2 font-semibold">Object Name</th>
                      <th scope="col" className="p-2 font-semibold">Type</th>
                      <th scope="col" className="p-2 font-semibold">Perigee / Apogee</th>
                      <th scope="col" className="p-2 font-semibold">Lifetime</th>
                      <th scope="col" className="p-2 font-semibold">Predicted Re-Entry</th>
                      <th scope="col" className="p-2 font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-800 text-[11px] tabular-nums">
                    {watchlist.map((item) => (
                      <tr key={item.norad_id} className="hover:bg-space-900/60 text-slate-300">
                        <td className="p-2 text-accent-400 font-semibold">#{item.norad_id}</td>
                        <td className="p-2 text-slate-100 font-semibold">{item.object_name}</td>
                        <td className="p-2 text-slate-400">{item.object_type}</td>
                        <td className="p-2">
                          {item.perigee_km != null && item.apogee_km != null
                            ? `${item.perigee_km.toFixed(0)} / ${item.apogee_km.toFixed(0)} km`
                            : '—'}
                        </td>
                        <td className="p-2 font-semibold text-amber-300">
                          {item.estimated_lifetime_days != null ? `${item.estimated_lifetime_days} d` : '—'}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {item.predicted_reentry_time
                            ? `${formatUtcDateTime(item.predicted_reentry_time, true)} UTC`
                            : '—'}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                              item.risk_level === 'CRITICAL'
                                ? 'bg-red-500/15 text-red-300 border-red-500/40'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            }`}
                          >
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
      <div className="border-t border-space-800 px-4 sm:px-5 py-2.5 bg-space-950 flex items-center justify-between text-[11px] text-slate-400">
        <span>SGP4 B* Ballistic Coefficient &amp; Secular Decay Model</span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 bg-space-800 hover:bg-space-700 text-slate-100 rounded-md text-xs font-semibold border border-space-700"
        >
          Close
        </button>
      </div>
    </ModalDialog>
  );
};
