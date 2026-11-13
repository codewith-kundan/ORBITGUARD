import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Radio, MapPin, Compass, RefreshCw, AlertTriangle } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { OrbitalObject, GroundStation, OverpassResponse, OverpassEvent, SkyPoint } from '../types';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface OverpassModalProps {
  object: OrbitalObject;
  onClose: () => void;
}

export const OverpassModal: React.FC<OverpassModalProps> = ({
  object,
  onClose,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stations, setStations] = useState<GroundStation[]>([]);
  const [stationsLoaded, setStationsLoaded] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<GroundStation | null>(null);
  const [customLat, setCustomLat] = useState<string>('13.034');
  const [customLon, setCustomLon] = useState<string>('77.512');
  const [customAlt, setCustomAlt] = useState<string>('920');
  const [minElevation, setMinElevation] = useState<number>(10.0);
  const [predictionHours, setPredictionHours] = useState<number>(48.0);

  const [overpassData, setOverpassData] = useState<OverpassResponse | null>(null);
  const [selectedPass, setSelectedPass] = useState<OverpassEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPasses = useCallback(async (stationOverride?: GroundStation | null) => {
    if (!object) return;
    const stationToUse = stationOverride !== undefined ? stationOverride : selectedStation;
    try {
      setLoading(true);
      setError(null);
      const lat = stationToUse ? stationToUse.latitude_deg : parseFloat(customLat) || 0;
      const lon = stationToUse ? stationToUse.longitude_deg : parseFloat(customLon) || 0;
      const alt = stationToUse ? stationToUse.altitude_m : parseFloat(customAlt) || 0;
      const name = stationToUse ? stationToUse.name : 'Custom Coordinates';

      const data = await api.predictOverpasses({
        norad_id: object.norad_id,
        station_latitude: lat,
        station_longitude: lon,
        station_altitude_m: alt,
        station_name: name,
        min_elevation_deg: minElevation,
        prediction_hours: predictionHours,
        tle_line1: object.tle_line1,
        tle_line2: object.tle_line2,
        object_name: object.name,
      });

      setOverpassData(data);
      if (data.passes && data.passes.length > 0) {
        setSelectedPass(data.passes[0]);
      } else {
        setSelectedPass(null);
      }
    } catch (err: any) {
      setOverpassData(null);
      setSelectedPass(null);
      setError(err?.message || 'Failed to predict ground station overpasses.');
    } finally {
      setLoading(false);
    }
  }, [object, selectedStation, customLat, customLon, customAlt, minElevation, predictionHours]);

  // Fetch stations cleanly without ever stalling in infinite loading
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getGroundStations()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setStations(list);
        const first = list[0] || null;
        setSelectedStation(first);
        setStationsLoaded(true);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setStations([]);
        setSelectedStation(null);
        setStationsLoaded(true);
        setError(err?.message || 'Ground station catalog unavailable; using custom coordinates.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stationsLoaded) {
      fetchPasses(selectedStation);
    }
  }, [stationsLoaded, selectedStation, minElevation, predictionHours, object.norad_id]);

  // Render Topocentric Sky Polar Plot
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const maxRadius = size / 2 - 28;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, size, size);

    const elevations = [0, 30, 60];
    elevations.forEach((el) => {
      const r = maxRadius * (1.0 - el / 90.0);
      ctx.strokeStyle = el === 0 ? '#334155' : '#1e2836';
      ctx.lineWidth = el === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${el}°`, center + 4, center - r + 11);
    });

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e2836';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, center - maxRadius);
    ctx.lineTo(center, center + maxRadius);
    ctx.moveTo(center - maxRadius, center);
    ctx.lineTo(center + maxRadius, center);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText('N', center - 4, center - maxRadius - 8);
    ctx.fillText('S', center - 4, center + maxRadius + 15);
    ctx.fillText('E', center + maxRadius + 7, center + 3);
    ctx.fillText('W', center - maxRadius - 15, center + 3);

    if (selectedPass?.sky_trajectory && selectedPass.sky_trajectory.length > 0) {
      const convertSkyToXY = (az: number, el: number) => {
        const azRad = (az - 90) * (Math.PI / 180.0);
        const r = maxRadius * (1.0 - Math.max(0, el) / 90.0);
        return {
          x: center + r * Math.cos(azRad),
          y: center + r * Math.sin(azRad),
        };
      };

      ctx.strokeStyle =
        selectedPass.visibility_type === 'OPTICAL_VISIBLE' ? '#10b981' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      selectedPass.sky_trajectory.forEach((pt: SkyPoint, idx: number) => {
        const { x, y } = convertSkyToXY(pt.azimuth_deg, pt.elevation_deg);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const aosPt = selectedPass.sky_trajectory[0];
      const { x: ax, y: ay } = convertSkyToXY(aosPt.azimuth_deg, aosPt.elevation_deg);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('AOS', ax + 6, ay - 4);

      const peakPt = selectedPass.sky_trajectory.reduce(
        (max: SkyPoint, p: SkyPoint) => (p.elevation_deg > max.elevation_deg ? p : max),
        aosPt
      );
      const { x: px, y: py } = convertSkyToXY(peakPt.azimuth_deg, peakPt.elevation_deg);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`PEAK ${peakPt.elevation_deg.toFixed(0)}°`, px + 7, py + 3);

      const losPt = selectedPass.sky_trajectory[selectedPass.sky_trajectory.length - 1];
      const { x: lx, y: ly } = convertSkyToXY(losPt.azimuth_deg, losPt.elevation_deg);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('LOS', lx + 6, ly + 10);
    }
  }, [selectedPass]);

  return (
    <ModalDialog
      isOpen={true}
      onClose={onClose}
      titleId="overpass-modal-title"
      maxWidthClass="max-w-5xl"
      className="bg-space-900 border border-space-700 rounded-xl max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl font-mono text-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-5 py-3.5 bg-space-950 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-space-900 border border-space-700 flex items-center justify-center text-accent-400 shrink-0" aria-hidden="true">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 id="overpass-modal-title" className="text-sm sm:text-base font-semibold text-slate-100 truncate">
              Ground Station Overpass Predictor
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Target: {object.name} (#{object.norad_id}) • Topocentric ENU Azimuth/Elevation Geometry
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Overpass Predictor dialog"
          className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Controls */}
      <div className="bg-space-950 border-b border-space-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="overpass-station-select" className="text-slate-400 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
            <span>Station:</span>
          </label>

          <select
            id="overpass-station-select"
            value={selectedStation?.id || 'custom'}
            onChange={(e) => {
              const found = stations.find((s: GroundStation) => s.id === e.target.value) || null;
              setSelectedStation(found);
            }}
            className="bg-space-900 border border-space-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          >
            {stations.map((st: GroundStation) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
            <option value="custom">Custom Coordinates...</option>
          </select>

          {!selectedStation && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <input
                type="text"
                aria-label="Custom latitude degrees"
                placeholder="Lat"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-16 bg-space-900 border border-space-700 rounded px-2 py-1 text-slate-100 text-center tabular-nums"
              />
              <input
                type="text"
                aria-label="Custom longitude degrees"
                placeholder="Lon"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                className="w-16 bg-space-900 border border-space-700 rounded px-2 py-1 text-slate-100 text-center tabular-nums"
              />
              <input
                type="text"
                aria-label="Custom altitude meters"
                placeholder="Alt (m)"
                value={customAlt}
                onChange={(e) => setCustomAlt(e.target.value)}
                className="w-16 bg-space-900 border border-space-700 rounded px-2 py-1 text-slate-100 text-center tabular-nums"
              />
              <button
                type="button"
                onClick={() => fetchPasses(null)}
                className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-space-950 rounded font-semibold"
              >
                Calculate
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="overpass-min-el" className="text-slate-400">
              Min El:
            </label>
            <select
              id="overpass-min-el"
              value={minElevation}
              onChange={(e) => setMinElevation(parseFloat(e.target.value))}
              className="bg-space-900 border border-space-700 rounded-md px-2 py-1 text-xs text-slate-100"
            >
              <option value={5}>5°</option>
              <option value={10}>10°</option>
              <option value={20}>20°</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="overpass-window" className="text-slate-400">
              Window:
            </label>
            <select
              id="overpass-window"
              value={predictionHours}
              onChange={(e) => setPredictionHours(parseFloat(e.target.value))}
              className="bg-space-900 border border-space-700 rounded-md px-2 py-1 text-xs text-slate-100"
            >
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-accent-400 mx-auto" aria-hidden="true" />
            <div>Computing topocentric ENU pass geometry...</div>
          </div>
        ) : error ? (
          <div role="alert" className="p-4 bg-red-500/10 border border-red-500/35 rounded-md text-red-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={() => fetchPasses(selectedStation)}
              className="px-2.5 py-1 rounded bg-space-950 border border-red-500/40 hover:bg-space-800 text-slate-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Polar Sky Plot */}
            <div className="lg:col-span-5 bg-space-950 p-4 rounded-md border border-space-800 flex flex-col items-center justify-between space-y-3">
              <div className="w-full flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase">
                  <Compass className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
                  <span>Topocentric Sky Plot</span>
                </span>
                <span className="text-[10px] text-slate-400">Zenith Center</span>
              </div>

              <canvas
                ref={radarCanvasRef}
                width={320}
                height={320}
                aria-label="Polar azimuth and elevation sky plot"
                className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-space-800"
              />

              {selectedPass ? (
                <dl className="w-full bg-space-900 p-2.5 rounded-md border border-space-800 text-[11px] space-y-1 tabular-nums">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">AOS Time</dt>
                    <dd className="text-slate-100 font-semibold">
                      {formatUtcDateTime(selectedPass.aos_time, true)} UTC
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Peak Elevation</dt>
                    <dd className="text-amber-300 font-semibold">
                      {selectedPass.max_elevation_deg.toFixed(1)}° (Az {selectedPass.peak_azimuth_deg.toFixed(0)}°)
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Min Range / Dur</dt>
                    <dd className="text-accent-400 font-semibold">
                      {selectedPass.min_range_km.toFixed(0)} km / {Math.round(selectedPass.duration_seconds / 60)}m
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="text-xs text-slate-400 text-center py-2">
                  Select a pass row to inspect polar trajectory
                </div>
              )}
            </div>

            {/* Pass Schedule Table */}
            <div className="lg:col-span-7 bg-space-950 p-4 rounded-md border border-space-800 space-y-3">
              <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                <span className="font-semibold text-slate-100 uppercase tracking-wider">
                  Pass Schedule ({overpassData?.total_passes_found ?? 0} passes)
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">Next {predictionHours}h</span>
              </div>

              {!overpassData?.passes || overpassData.passes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No overpasses predicted above {minElevation}° elevation in the next {predictionHours} hours.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <caption className="sr-only">Predicted ground station overpass schedule</caption>
                    <thead className="bg-space-900 text-slate-400 border-b border-space-800 text-[10px] uppercase">
                      <tr>
                        <th scope="col" className="p-2 font-semibold">AOS (UTC)</th>
                        <th scope="col" className="p-2 font-semibold">Max El</th>
                        <th scope="col" className="p-2 font-semibold">Duration</th>
                        <th scope="col" className="p-2 font-semibold">Visibility</th>
                        <th scope="col" className="p-2 text-right font-semibold">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-space-800 text-[11px] tabular-nums">
                      {overpassData.passes.map((p: OverpassEvent, idx: number) => {
                        const isSelected = selectedPass?.aos_time === p.aos_time;
                        const isOptical = p.visibility_type === 'OPTICAL_VISIBLE';
                        return (
                          <tr
                            key={`${p.aos_time}-${idx}`}
                            className={isSelected ? 'bg-sky-500/10 text-slate-100' : 'hover:bg-space-900/60 text-slate-300'}
                          >
                            <td className="p-2 whitespace-nowrap">
                              {formatUtcDateTime(p.aos_time, true)}
                            </td>
                            <td className="p-2 font-semibold text-amber-300">
                              {p.max_elevation_deg.toFixed(1)}°
                            </td>
                            <td className="p-2">
                              {Math.floor(p.duration_seconds / 60)}m {Math.round(p.duration_seconds % 60)}s
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                  isOptical
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                                    : p.visibility_type === 'SUNLIT_DAYLIGHT'
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/35'
                                    : 'bg-space-900 text-slate-400 border-space-700'
                                }`}
                              >
                                {p.visibility_label}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedPass(p)}
                                aria-pressed={isSelected}
                                className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                  isSelected
                                    ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                                    : 'bg-space-900 hover:bg-space-800 text-slate-300 border-space-700'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Plot'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-space-800 px-4 sm:px-5 py-2.5 bg-space-950 flex items-center justify-between text-[11px] text-slate-400">
        <span>Topocentric Horizon Transform • SGP4 State Vectors</span>
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
