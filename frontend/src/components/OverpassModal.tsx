import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Radio, 
  MapPin, 
  Compass, 
  Activity
} from 'lucide-react';
import { OrbitalObject, GroundStation, OverpassResponse, OverpassEvent, SkyPoint } from '../types';
import { api } from '../services/api';

interface OverpassModalProps {
  object: OrbitalObject;
  onClose: () => void;
}

export const OverpassModal: React.FC<OverpassModalProps> = ({
  object,
  onClose
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stations, setStations] = useState<GroundStation[]>([]);
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

  // Fetch stations on load
  useEffect(() => {
    api.getGroundStations()
      .then((data) => {
        setStations(data);
        if (data.length > 0) setSelectedStation(data[0]);
      })
      .catch(() => {});
  }, []);

  // Fetch pass prediction when station or object changes
  const fetchPasses = async () => {
    if (!object) return;
    try {
      setLoading(true);
      setError(null);
      const lat = selectedStation ? selectedStation.latitude_deg : parseFloat(customLat) || 0;
      const lon = selectedStation ? selectedStation.longitude_deg : parseFloat(customLon) || 0;
      const alt = selectedStation ? selectedStation.altitude_m : parseFloat(customAlt) || 0;
      const name = selectedStation ? selectedStation.name : 'Custom Station';

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
        object_name: object.name
      });

      setOverpassData(data);
      if (data.passes && data.passes.length > 0) {
        setSelectedPass(data.passes[0]);
      } else {
        setSelectedPass(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to predict ground station overpasses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStation) {
      fetchPasses();
    }
  }, [object.norad_id, selectedStation, minElevation, predictionHours]);

  // Render Topocentric Sky Radar Polar Plot (Zenith at center, Horizon at outer circle)
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const maxRadius = (size / 2) - 24;

    ctx.clearRect(0, 0, size, size);

    // 1. Radar Background (Dark Space)
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, size, size);

    // 2. Concentric Elevation Rings (0 deg, 30 deg, 60 deg, 90 deg)
    const elevations = [0, 30, 60];
    elevations.forEach((el) => {
      const r = maxRadius * (1.0 - el / 90.0);
      ctx.strokeStyle = el === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(30, 58, 95, 0.5)';
      ctx.lineWidth = el === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
      ctx.font = '9px monospace';
      ctx.fillText(`${el}°`, center + 3, center - r + 10);
    });

    // Zenith Center Dot
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('ZENITH (90°)', center - 28, center - 6);

    // 3. Cardinal Direction Crosshairs (N, E, S, W)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, center - maxRadius);
    ctx.lineTo(center, center + maxRadius);
    ctx.moveTo(center - maxRadius, center);
    ctx.lineTo(center + maxRadius, center);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('N (0°)', center - 14, center - maxRadius - 6);
    ctx.fillText('S (180°)', center - 18, center + maxRadius + 16);
    ctx.fillText('E (90°)', center + maxRadius + 6, center + 4);
    ctx.fillText('W (270°)', center - maxRadius - 48, center + 4);

    // 4. Plot Selected Pass Sky Trajectory
    if (selectedPass && selectedPass.sky_trajectory && selectedPass.sky_trajectory.length > 0) {
      ctx.strokeStyle = selectedPass.visibility_type === 'OPTICAL_VISIBLE' ? '#10b981' : '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const convertSkyToXY = (az: number, el: number) => {
        const azRad = (az - 90) * (Math.PI / 180.0); // 0 deg North is up
        const r = maxRadius * (1.0 - Math.max(0, el) / 90.0);
        const x = center + r * Math.cos(azRad);
        const y = center + r * Math.sin(azRad);
        return { x, y };
      };

      selectedPass.sky_trajectory.forEach((pt: SkyPoint, idx: number) => {
        const { x, y } = convertSkyToXY(pt.azimuth_deg, pt.elevation_deg);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw AOS marker (Start)
      const aosPt = selectedPass.sky_trajectory[0];
      const { x: ax, y: ay } = convertSkyToXY(aosPt.azimuth_deg, aosPt.elevation_deg);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('AOS', ax + 6, ay - 4);

      // Draw Peak Max Elevation marker
      const peakPt = selectedPass.sky_trajectory.reduce((max: SkyPoint, p: SkyPoint) => p.elevation_deg > max.elevation_deg ? p : max, aosPt);
      const { x: px, y: py } = convertSkyToXY(peakPt.azimuth_deg, peakPt.elevation_deg);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`PEAK (${peakPt.elevation_deg.toFixed(1)}°)`, px + 8, py + 4);

      // Draw LOS marker (End)
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono text-slate-200">
      <div className="bg-space-900 border border-cyan-500/50 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-6 py-3.5 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-neon">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  GROUND STATION OVERPASS PREDICTOR
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  TOPOCENTRIC RADAR & OPTICAL SENSOR
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Target: {object.name} (#{object.norad_id}) • AOS, Peak, LOS, Az/El Polar Tracks & Optical Windows
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

        {/* Station Selection Controls */}
        <div className="bg-space-950/60 border-b border-space-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              GROUND STATION:
            </span>

            <select
              value={selectedStation?.id || 'custom'}
              onChange={(e) => {
                const found = stations.find((s: GroundStation) => s.id === e.target.value);
                setSelectedStation(found || null);
              }}
              className="bg-space-900 border border-space-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400 transition"
            >
              {stations.map((st: GroundStation) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
              <option value="custom">Custom Coordinates...</option>
            </select>

            {!selectedStation && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <input
                  type="text"
                  placeholder="Lat"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-16 bg-space-900 border border-space-700 rounded px-1.5 py-1 text-white text-center font-bold"
                />
                <input
                  type="text"
                  placeholder="Lon"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-16 bg-space-900 border border-space-700 rounded px-1.5 py-1 text-white text-center font-bold"
                />
                <input
                  type="text"
                  placeholder="Alt (m)"
                  value={customAlt}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  className="w-16 bg-space-900 border border-space-700 rounded px-1.5 py-1 text-white text-center font-bold"
                />
                <button
                  onClick={fetchPasses}
                  className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded font-bold text-[10px]"
                >
                  CALC
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">HORIZON CUTOFF:</span>
              <select
                value={minElevation}
                onChange={(e) => setMinElevation(parseFloat(e.target.value))}
                className="bg-space-900 border border-space-700 rounded-lg px-2 py-1 text-xs text-cyan-neon font-bold"
              >
                <option value={5}>5° (Low)</option>
                <option value={10}>10° (Standard)</option>
                <option value={20}>20° (High Obstruction)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">WINDOW:</span>
              <select
                value={predictionHours}
                onChange={(e) => setPredictionHours(parseFloat(e.target.value))}
                className="bg-space-900 border border-space-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-bold"
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={72}>72 Hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Body (Radar + Passes Table) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(92vh-170px)] space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Activity className="w-6 h-6 animate-spin text-cyan-neon mx-auto" />
              <div>Computing topocentric ENU horizon angles and optical solar illumination...</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-neon text-xs">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* LEFT: Sky-Track Radar Polar Plot (5 cols) */}
              <div className="lg:col-span-5 bg-space-950 p-4 rounded-xl border border-space-800 flex flex-col items-center justify-between space-y-3">
                <div className="w-full flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    SKY-TRACK POLAR RADAR PLOT
                  </span>
                  <span className="text-[10px] text-slate-400">TOPOCENTRIC HORIZON</span>
                </div>

                <div className="relative flex items-center justify-center p-2">
                  <canvas
                    ref={radarCanvasRef}
                    width={340}
                    height={340}
                    className="w-72 h-72 rounded-full border border-space-800 shadow-inner"
                  />
                </div>

                {selectedPass ? (
                  <div className="w-full bg-space-900/80 p-2.5 rounded-lg border border-space-800 text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">SELECTED PASS:</span>
                      <span className="text-white font-bold">{new Date(selectedPass.aos_time).toISOString().replace('T', ' ').slice(0, 16)} UTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PEAK ELEVATION:</span>
                      <span className="text-amber-400 font-bold">{selectedPass.max_elevation_deg.toFixed(1)}° (Az {selectedPass.peak_azimuth_deg.toFixed(0)}°)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MIN RANGE / DURATION:</span>
                      <span className="text-cyan-neon font-bold">{selectedPass.min_range_km.toFixed(0)} km • {Math.round(selectedPass.duration_seconds / 60)} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-2">Select a pass from the schedule table</div>
                )}
              </div>

              {/* RIGHT: Overpass Events Table (7 cols) */}
              <div className="lg:col-span-7 bg-space-950 p-4 rounded-xl border border-space-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                  <span className="font-bold text-white uppercase tracking-wider">
                    Upcoming Pass Schedule ({overpassData?.total_passes_found || 0} passes)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">NEXT {predictionHours}H</span>
                </div>

                {overpassData?.passes.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    No visible overpasses found for this satellite over {selectedStation?.name} above {minElevation}° elevation in the next {predictionHours} hours.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-space-900/80 text-slate-400 border-b border-space-800 text-[10px]">
                        <tr>
                          <th className="p-2">AOS TIME (UTC)</th>
                          <th className="p-2">MAX ELEV</th>
                          <th className="p-2">DURATION</th>
                          <th className="p-2">VISIBILITY / OPTICAL</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-space-800/60 font-mono text-[11px]">
                        {overpassData?.passes.map((p: OverpassEvent, idx: number) => {
                          const isSelected = selectedPass?.aos_time === p.aos_time;
                          const isOptical = p.visibility_type === 'OPTICAL_VISIBLE';
                          return (
                            <tr
                              key={idx}
                              onClick={() => setSelectedPass(p)}
                              className={`cursor-pointer transition ${
                                isSelected ? 'bg-cyan-950/40 text-white' : 'hover:bg-space-900/40 text-slate-300'
                              }`}
                            >
                              <td className="p-2 whitespace-nowrap">
                                {new Date(p.aos_time).toISOString().replace('T', ' ').slice(0, 16)}
                              </td>
                              <td className="p-2 font-bold text-amber-400">
                                {p.max_elevation_deg.toFixed(1)}°
                              </td>
                              <td className="p-2 text-slate-300">
                                {Math.floor(p.duration_seconds / 60)}m {Math.round(p.duration_seconds % 60)}s
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  isOptical 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                    : p.visibility_type === 'SUNLIT_DAYLIGHT'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-space-800 text-slate-400'
                                }`}>
                                  {p.visibility_label}
                                </span>
                              </td>
                              <td className="p-2 text-right">
                                <span className="text-[10px] text-cyan-neon font-bold">
                                  {isSelected ? 'ACTIVE' : 'VIEW'}
                                </span>
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
        <div className="border-t border-space-800 px-4 sm:px-6 py-2.5 bg-space-950/90 flex items-center justify-between text-[10px] text-slate-400">
          <div>TOPOCENTRIC HORIZON TRANSFORMATION • SGP4 PROPAGATION ENGINE</div>
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
