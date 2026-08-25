import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Atom, 
  Download, 
  Sliders, 
  BarChart2, 
  Play
} from 'lucide-react';
import { Conjunction, BreakupResponse, BreakupSimulateRequest } from '../types';
import { api } from '../services/api';

interface BreakupSimulatorModalProps {
  conjunction?: Conjunction | null;
  onClose: () => void;
}

export const BreakupSimulatorModal: React.FC<BreakupSimulatorModalProps> = ({
  conjunction,
  onClose
}) => {
  const gabbardCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Simulation parameters state
  const [eventType, setEventType] = useState<string>('CATASTROPHIC_COLLISION');
  const [targetName, setTargetName] = useState<string>(conjunction?.object_a?.name || 'Primary Satellite');
  const [targetMass, setTargetMass] = useState<number>(1000.0);
  const [impactorName, setImpactorName] = useState<string>(conjunction?.object_b?.name || 'Secondary Impactor');
  const [impactorMass, setImpactorMass] = useState<number>(conjunction?.relative_velocity_km_s ? 150.0 : 50.0);
  const [relVelocity, setRelVelocity] = useState<number>(conjunction?.relative_velocity_km_s || 11.2);
  const [altitude, setAltitude] = useState<number>(conjunction?.miss_distance_km ? 780.0 : 650.0);
  const [minFragmentSize, setMinFragmentSize] = useState<number>(0.05); // 5 cm
  const [maxSample, setMaxSample] = useState<number>(300);

  const [simResult, setSimResult] = useState<BreakupResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Preset Configurations
  const applyPreset = (preset: 'IRIDIUM_COSMOS' | 'EXPLOSION' | 'ASAT' | 'GRAZING') => {
    if (preset === 'IRIDIUM_COSMOS') {
      setEventType('CATASTROPHIC_COLLISION');
      setTargetName('Iridium 33 (Active)');
      setTargetMass(560.0);
      setImpactorName('Cosmos 2251 (Derelict)');
      setImpactorMass(900.0);
      setRelVelocity(11.6);
      setAltitude(780.0);
    } else if (preset === 'EXPLOSION') {
      setEventType('EXPLOSION');
      setTargetName('Centaur Upper Stage');
      setTargetMass(2200.0);
      setImpactorName('Internal Overpressure');
      setImpactorMass(0.0);
      setRelVelocity(0.0);
      setAltitude(600.0);
    } else if (preset === 'ASAT') {
      setEventType('ASAT_INTERCEPT');
      setTargetName('Kosmos-1408 Target');
      setTargetMass(1750.0);
      setImpactorName('Direct-Ascent Kinetic Kill Vehicle');
      setImpactorMass(20.0);
      setRelVelocity(8.5);
      setAltitude(480.0);
    } else if (preset === 'GRAZING') {
      setEventType('NON_CATASTROPHIC_COLLISION');
      setTargetName('Active Earth Observer');
      setTargetMass(1200.0);
      setImpactorName('Centimeter Debris Fragment');
      setImpactorMass(1.5);
      setRelVelocity(14.0);
      setAltitude(550.0);
    }
  };

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload: BreakupSimulateRequest = {
        event_type: eventType,
        target_name: targetName,
        target_mass_kg: targetMass,
        impactor_name: impactorName,
        impactor_mass_kg: impactorMass,
        relative_velocity_km_s: relVelocity,
        altitude_km: altitude,
        inclination_deg: 74.0,
        min_fragment_size_m: minFragmentSize,
        max_fragments_to_generate: maxSample
      };

      const res = await api.simulateBreakup(payload);
      setSimResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [eventType]);

  // Render Gabbard Diagram on Canvas
  useEffect(() => {
    const canvas = gabbardCanvasRef.current;
    if (!canvas || !simResult) return;
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

    const points = simResult.gabbard_points.filter(p => !p.is_decayed && p.period_minutes < 180);
    if (points.length === 0) return;

    // Period Range (X Axis)
    const minPeriod = Math.min(...points.map(p => p.period_minutes), simResult.parent_orbit.period_minutes - 10);
    const maxPeriod = Math.max(...points.map(p => p.period_minutes), simResult.parent_orbit.period_minutes + 15);
    const pRange = Math.max(10, maxPeriod - minPeriod);

    // Altitude Range (Y Axis)
    const minAlt = Math.max(-200, Math.min(...points.map(p => p.perigee_altitude_km), 0));
    const maxAlt = Math.max(...points.map(p => p.apogee_altitude_km), simResult.parent_orbit.altitude_km + 500);
    const altRange = Math.max(500, maxAlt - minAlt);

    const mapX = (period: number) => padLeft + ((period - minPeriod) / pRange) * (w - padLeft - padRight);
    const mapY = (alt: number) => h - padBottom - ((alt - minAlt) / altRange) * (h - padTop - padBottom);

    // 1. Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.4)';

    // Horizontal Altitude Grids
    for (let alt = 0; alt <= maxAlt; alt += 250) {
      const y = mapY(alt);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`${alt} km`, 8, y + 3);
    }

    // Vertical Period Grids
    for (let p = Math.ceil(minPeriod); p <= maxPeriod; p += 5) {
      const x = mapX(p);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`${p}m`, x - 8, h - padBottom + 16);
    }

    // 2. Earth Atmospheric Re-entry line (100 km)
    const y100 = mapY(100);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y100);
    ctx.lineTo(w - padRight, y100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ATMOSPHERIC RE-ENTRY (100 km)', w - padRight - 180, y100 - 4);

    // 3. Parent Orbit Period Vertical Line
    const xParent = mapX(simResult.parent_orbit.period_minutes);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(xParent, padTop);
    ctx.lineTo(xParent, h - padBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PARENT: ${simResult.parent_orbit.period_minutes.toFixed(1)}m`, xParent + 4, padTop + 12);

    // 4. Plot Gabbard Points
    // Perigees: Emerald Green Dots
    // Apogees: Amber / Crimson Dots
    points.forEach((pt) => {
      const px = mapX(pt.period_minutes);
      const pyPeri = mapY(pt.perigee_altitude_km);
      const pyApo = mapY(pt.apogee_altitude_km);

      // Perigee point
      ctx.fillStyle = pt.is_decayed ? '#ef4444' : '#10b981';
      ctx.beginPath();
      ctx.arc(px, pyPeri, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Apogee point
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, pyApo, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Axis Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ORBITAL PERIOD (MINUTES)', w / 2 - 80, h - 8);

    ctx.save();
    ctx.translate(14, h / 2 + 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ALTITUDE (KM)', 0, 0);
    ctx.restore();

  }, [simResult]);

  // Export Debris Ephemeris as JSON
  const handleExportJSON = () => {
    if (!simResult) return;
    const blob = new Blob([JSON.stringify(simResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORBITGUARD_${simResult.event_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono text-slate-200">
      <div className="bg-space-900 border border-amber-500/50 rounded-2xl max-w-6xl w-full max-h-[94vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-6 py-3.5 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Atom className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  NASA STANDARD SATELLITE BREAKUP SIMULATOR
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  NASA EVOLVE 4.0 & GABBARD DIAGRAM
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Kinetic Hypervelocity Collisions • Explosions • ASAT Intercepts • Debris Cloud Dispersion
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

        {/* Preset Selectors */}
        <div className="bg-space-950/60 border-b border-space-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-[11px] font-bold">EVENT PRESETS:</span>
            <button
              onClick={() => applyPreset('IRIDIUM_COSMOS')}
              className="px-2.5 py-1 bg-space-900 hover:bg-space-800 border border-space-700 rounded-lg text-white text-[11px] font-bold transition"
            >
              Iridium-Cosmos (2009)
            </button>
            <button
              onClick={() => applyPreset('ASAT')}
              className="px-2.5 py-1 bg-space-900 hover:bg-space-800 border border-space-700 rounded-lg text-white text-[11px] font-bold transition"
            >
              Kosmos-1408 ASAT (2021)
            </button>
            <button
              onClick={() => applyPreset('EXPLOSION')}
              className="px-2.5 py-1 bg-space-900 hover:bg-space-800 border border-space-700 rounded-lg text-white text-[11px] font-bold transition"
            >
              Booster Pressure Vessel Explosion
            </button>
            <button
              onClick={() => applyPreset('GRAZING')}
              className="px-2.5 py-1 bg-space-900 hover:bg-space-800 border border-space-700 rounded-lg text-white text-[11px] font-bold transition"
            >
              Centimeter Grazing Impact
            </button>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-space-950 rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            RE-RUN BREAKUP MODEL
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(94vh-170px)] space-y-4">
          {error && (
            <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-neon text-xs">
              {error}
            </div>
          )}

          {/* Top Summary Metrics Banner */}
          {simResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-space-950 p-3.5 rounded-xl border border-space-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">TOTAL PREDICTED FRAGMENTS (&gt;5cm):</span>
                <span className="text-xl font-bold text-amber-400">
                  {simResult.total_predicted_fragments_gt_min_size.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">NASA Power Law Scaling</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">SPECIFIC ENERGY (Ep/Mt):</span>
                <span className={`text-xl font-bold ${simResult.is_catastrophic ? 'text-red-400' : 'text-cyan-400'}`}>
                  {(simResult.specific_energy_j_per_kg / 1000).toFixed(1)} kJ/kg
                </span>
                <span className={`text-[10px] block mt-0.5 font-bold ${simResult.is_catastrophic ? 'text-red-400' : 'text-emerald-400'}`}>
                  {simResult.is_catastrophic ? '⚠️ CATASTROPHIC BREAKUP' : 'NON-CATASTROPHIC'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">IMMEDIATE ATMOSPHERIC RE-ENTRY:</span>
                <span className="text-xl font-bold text-white">
                  {simResult.cloud_dispersion_stats.immediate_reentry_percentage}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {simResult.cloud_dispersion_stats.immediate_reentry_count} fragments perigee &le; 100km
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">PARENT ORBIT PERIOD:</span>
                <span className="text-xl font-bold text-cyan-neon">
                  {simResult.parent_orbit.period_minutes.toFixed(1)} min
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Alt: {simResult.parent_orbit.altitude_km.toFixed(0)} km • {simResult.parent_orbit.velocity_km_s.toFixed(2)} km/s
                </span>
              </div>
            </div>
          )}

          {/* Main Grid: Parameters & Interactive Gabbard Diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* LEFT: Physics Controls Dock (4 cols) */}
            <div className="lg:col-span-4 bg-space-950 p-4 rounded-xl border border-space-800 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-space-800 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  COLLISION MECHANICS
                </span>
                <span className="text-[10px] text-slate-400">INPUT ASTRODYNAMICS</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Target Satellite Mass (kg)</label>
                <input
                  type="number"
                  value={targetMass}
                  onChange={(e) => setTargetMass(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Projectile / Impactor Mass (kg)</label>
                <input
                  type="number"
                  value={impactorMass}
                  onChange={(e) => setImpactorMass(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Relative Collision Speed (km/s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={relVelocity}
                  onChange={(e) => setRelVelocity(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Breakup Altitude (km)</label>
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(Math.max(160, parseFloat(e.target.value) || 160))}
                  className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Min Size (m)</label>
                  <select
                    value={minFragmentSize}
                    onChange={(e) => setMinFragmentSize(parseFloat(e.target.value))}
                    className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                  >
                    <option value={0.01}>1 cm (Radar)</option>
                    <option value={0.05}>5 cm (Trackable)</option>
                    <option value={0.10}>10 cm (Catalog)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Sample Count</label>
                  <select
                    value={maxSample}
                    onChange={(e) => setMaxSample(parseInt(e.target.value, 10))}
                    className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                  >
                    <option value={150}>150</option>
                    <option value={300}>300</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-space-800">
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-space-800 hover:bg-space-700 text-white rounded-lg font-bold text-xs transition border border-space-700"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  EXPORT DEBRIS EPHEMERIS
                </button>
              </div>
            </div>

            {/* RIGHT: Gabbard Diagram Canvas (8 cols) */}
            <div className="lg:col-span-8 bg-space-950 p-4 rounded-xl border border-space-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white uppercase">
                    Gabbard Diagram (Apogee & Perigee vs. Period)
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
                  ref={gabbardCanvasRef}
                  width={680}
                  height={380}
                  className="w-full h-auto block"
                />
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Classic "X" pattern illustrates forward/backward along-track Delta-V velocity kicks</span>
                <span className="text-cyan-neon font-bold">Sampled {simResult?.sample_fragments_count || 0} fragments</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-space-800 px-4 sm:px-6 py-2.5 bg-space-950/90 flex items-center justify-between text-[10px] text-slate-400">
          <div>NASA STANDARD SATELLITE BREAKUP MODEL (EVOLVE 4.0) • TWO-LINE GAUSS IMPULSE ASTRODYNAMICS</div>
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
