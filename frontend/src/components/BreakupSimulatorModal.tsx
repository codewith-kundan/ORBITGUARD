import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Atom,
  Download,
  Sliders,
  BarChart2,
  Play,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Conjunction, BreakupResponse, BreakupSimulateRequest } from '../types';
import { api } from '../services/api';
import { ModalDialog } from './ModalDialog';

interface BreakupSimulatorModalProps {
  conjunction?: Conjunction | null;
  isOpen?: boolean;
  onClose: () => void;
}

interface BreakupParams {
  eventType: string;
  targetName: string;
  targetMass: number;
  impactorName: string;
  impactorMass: number;
  relVelocity: number;
  altitude: number;
  minFragmentSize: number;
  maxSample: number;
}

export const BreakupSimulatorModal: React.FC<BreakupSimulatorModalProps> = ({
  conjunction,
  isOpen = true,
  onClose,
}) => {
  const gabbardCanvasRef = useRef<HTMLCanvasElement>(null);

  const [eventType, setEventType] = useState<string>('CATASTROPHIC_COLLISION');
  const [targetName, setTargetName] = useState<string>(
    conjunction?.object_a?.name || 'Primary Spacecraft'
  );
  const [targetMass, setTargetMass] = useState<number>(1000.0);
  const [impactorName, setImpactorName] = useState<string>(
    conjunction?.object_b?.name || 'Secondary Object'
  );
  const [impactorMass, setImpactorMass] = useState<number>(
    conjunction?.relative_velocity_km_s ? 150.0 : 50.0
  );
  const [relVelocity, setRelVelocity] = useState<number>(
    conjunction?.relative_velocity_km_s || 11.2
  );
  const [altitude, setAltitude] = useState<number>(
    conjunction?.altitude_km || (conjunction?.object_a?.perigee_km ?? 650.0)
  );
  const [minFragmentSize, setMinFragmentSize] = useState<number>(0.05);
  const [maxSample, setMaxSample] = useState<number>(300);

  const [simResult, setSimResult] = useState<BreakupResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const executeSimulation = useCallback(async (override?: Partial<BreakupParams>) => {
    const payload: BreakupSimulateRequest = {
      event_type: override?.eventType ?? eventType,
      target_name: override?.targetName ?? targetName,
      target_mass_kg: override?.targetMass ?? targetMass,
      impactor_name: override?.impactorName ?? impactorName,
      impactor_mass_kg: override?.impactorMass ?? impactorMass,
      relative_velocity_km_s: override?.relVelocity ?? relVelocity,
      altitude_km: override?.altitude ?? altitude,
      inclination_deg: 74.0,
      min_fragment_size_m: override?.minFragmentSize ?? minFragmentSize,
      max_fragments_to_generate: override?.maxSample ?? maxSample,
    };

    try {
      setLoading(true);
      setError(null);
      const res = await api.simulateBreakup(payload);
      setSimResult(res);
    } catch (err: any) {
      setError(err?.message || 'Breakup simulation failed.');
    } finally {
      setLoading(false);
    }
  }, [
    altitude,
    eventType,
    impactorMass,
    impactorName,
    maxSample,
    minFragmentSize,
    relVelocity,
    targetMass,
    targetName,
  ]);

  useEffect(() => {
    if (isOpen) {
      executeSimulation();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (preset: 'IRIDIUM_COSMOS' | 'EXPLOSION' | 'ASAT' | 'GRAZING') => {
    let next: Partial<BreakupParams> = {};
    if (preset === 'IRIDIUM_COSMOS') {
      next = {
        eventType: 'CATASTROPHIC_COLLISION',
        targetName: 'Iridium 33 (Active)',
        targetMass: 560.0,
        impactorName: 'Cosmos 2251 (Derelict)',
        impactorMass: 900.0,
        relVelocity: 11.6,
        altitude: 780.0,
      };
    } else if (preset === 'EXPLOSION') {
      next = {
        eventType: 'EXPLOSION',
        targetName: 'Centaur Upper Stage',
        targetMass: 2200.0,
        impactorName: 'Internal Overpressure',
        impactorMass: 0.0,
        relVelocity: 0.0,
        altitude: 600.0,
      };
    } else if (preset === 'ASAT') {
      next = {
        eventType: 'ASAT_INTERCEPT',
        targetName: 'Kosmos-1408 Target',
        targetMass: 1750.0,
        impactorName: 'Kinetic Kill Vehicle',
        impactorMass: 20.0,
        relVelocity: 8.5,
        altitude: 480.0,
      };
    } else {
      next = {
        eventType: 'NON_CATASTROPHIC_COLLISION',
        targetName: 'Active Earth Observer',
        targetMass: 1200.0,
        impactorName: 'Centimeter Debris Fragment',
        impactorMass: 1.5,
        relVelocity: 14.0,
        altitude: 550.0,
      };
    }

    setEventType(next.eventType!);
    setTargetName(next.targetName!);
    setTargetMass(next.targetMass!);
    setImpactorName(next.impactorName!);
    setImpactorMass(next.impactorMass!);
    setRelVelocity(next.relVelocity!);
    setAltitude(next.altitude!);
    executeSimulation(next);
  };

  // Render Gabbard Diagram
  useEffect(() => {
    const canvas = gabbardCanvasRef.current;
    if (!canvas || !simResult) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padLeft = 60;
    const padRight = 24;
    const padTop = 28;
    const padBottom = 44;

    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, w, h);

    const points = simResult.gabbard_points.filter(
      (p) => !p.is_decayed && p.period_minutes < 180
    );
    if (points.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No surviving fragments within <180 min orbital period window', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    const minPeriod = Math.min(
      ...points.map((p) => p.period_minutes),
      simResult.parent_orbit.period_minutes - 10
    );
    const maxPeriod = Math.max(
      ...points.map((p) => p.period_minutes),
      simResult.parent_orbit.period_minutes + 15
    );
    const pRange = Math.max(10, maxPeriod - minPeriod);

    const minAlt = Math.max(-200, Math.min(...points.map((p) => p.perigee_altitude_km), 0));
    const maxAlt = Math.max(
      ...points.map((p) => p.apogee_altitude_km),
      simResult.parent_orbit.altitude_km + 500
    );
    const altRange = Math.max(500, maxAlt - minAlt);

    const mapX = (period: number) =>
      padLeft + ((period - minPeriod) / pRange) * (w - padLeft - padRight);
    const mapY = (alt: number) =>
      h - padBottom - ((alt - minAlt) / altRange) * (h - padTop - padBottom);

    // Subtle structural grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e2836';

    for (let alt = 0; alt <= maxAlt; alt += 250) {
      const y = mapY(alt);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`${alt} km`, 8, y + 3);
    }

    for (let p = Math.ceil(minPeriod); p <= maxPeriod; p += 5) {
      const x = mapX(p);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`${p}m`, x - 8, h - padBottom + 16);
    }

    // Earth atmospheric re-entry boundary (100 km)
    const y100 = mapY(100);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y100);
    ctx.lineTo(w - padRight, y100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ATMOSPHERIC RE-ENTRY (100 km)', w - padRight - 180, y100 - 5);

    // Parent orbit period line
    const xParent = mapX(simResult.parent_orbit.period_minutes);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(xParent, padTop);
    ctx.lineTo(xParent, h - padBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(`PARENT ${simResult.parent_orbit.period_minutes.toFixed(1)}m`, xParent + 5, padTop + 12);

    // Fragment points
    points.forEach((pt) => {
      const px = mapX(pt.period_minutes);
      const pyPeri = mapY(pt.perigee_altitude_km);
      const pyApo = mapY(pt.apogee_altitude_km);

      ctx.fillStyle = pt.is_decayed ? '#ef4444' : '#10b981';
      ctx.beginPath();
      ctx.arc(px, pyPeri, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, pyApo, 2.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Axis captions
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('ORBITAL PERIOD (MINUTES)', w / 2 - 75, h - 8);

    ctx.save();
    ctx.translate(14, h / 2 + 45);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ALTITUDE (KM)', 0, 0);
    ctx.restore();
  }, [simResult]);

  const handleExportJSON = () => {
    if (!simResult) return;
    const blob = new Blob([JSON.stringify(simResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbitguard_breakup_${simResult.event_id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="breakup-sim-title"
      maxWidthClass="max-w-5xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-400 shrink-0">
            <Atom className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="breakup-sim-title" className="text-base sm:text-lg font-semibold text-slate-100">
                NASA Standard Breakup & Fragmentation Model
              </h2>
              <span className="px-2 py-0.5 rounded bg-space-900 border border-space-700 text-[11px] font-mono text-amber-300">
                EVOLVE 4.0 • Gabbard Plot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kinetic collision and explosion fragment distribution via NASA power-law area-to-mass scaling.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close breakup simulator dialog"
          className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Presets & Run Control Bar */}
      <div className="bg-space-950/70 border-b border-space-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-slate-400">Reference Scenarios:</span>
          <button
            type="button"
            onClick={() => applyPreset('IRIDIUM_COSMOS')}
            className="px-2.5 py-1 rounded bg-space-900 hover:bg-space-800 border border-space-700 text-slate-200 text-[11px] font-medium transition-colors"
          >
            Iridium-Cosmos (2009)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('ASAT')}
            className="px-2.5 py-1 rounded bg-space-900 hover:bg-space-800 border border-space-700 text-slate-200 text-[11px] font-medium transition-colors"
          >
            Kosmos-1408 ASAT (2021)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('EXPLOSION')}
            className="px-2.5 py-1 rounded bg-space-900 hover:bg-space-800 border border-space-700 text-slate-200 text-[11px] font-medium transition-colors"
          >
            Stage Explosion
          </button>
          <button
            type="button"
            onClick={() => applyPreset('GRAZING')}
            className="px-2.5 py-1 rounded bg-space-900 hover:bg-space-800 border border-space-700 text-slate-200 text-[11px] font-medium transition-colors"
          >
            Grazing Debris Hit
          </button>
        </div>

        <button
          type="button"
          onClick={() => executeSimulation()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
          {loading ? 'Simulating...' : 'Run Breakup Model'}
        </button>
      </div>

      {/* Body */}
      <div className="p-5 overflow-y-auto flex-1 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/35 text-red-200 text-xs flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => executeSimulation()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-100 text-[11px] font-medium shrink-0"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {simResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-space-950 p-3.5 rounded-lg border border-space-800 text-xs">
            <div>
              <div className="text-[11px] text-slate-400">
                Predicted Fragments (&gt;{(minFragmentSize * 100).toFixed(0)} cm)
              </div>
              <div className="text-lg font-mono font-semibold text-amber-300 mt-0.5 tabular-nums">
                {simResult.total_predicted_fragments_gt_min_size.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Specific Energy (Ep/Mt)</div>
              <div
                className={`text-lg font-mono font-semibold mt-0.5 tabular-nums ${
                  simResult.is_catastrophic ? 'text-red-300' : 'text-sky-300'
                }`}
              >
                {(simResult.specific_energy_j_per_kg / 1000).toFixed(1)} kJ/kg
              </div>
              <div className="mt-0.5">
                {simResult.is_catastrophic ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-red-300 font-medium">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    Catastrophic Threshold Exceeded
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-300 font-medium">
                    Non-Catastrophic Crater Event
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Immediate Re-Entry Fraction</div>
              <div className="text-lg font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {simResult.cloud_dispersion_stats.immediate_reentry_percentage}%
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {simResult.cloud_dispersion_stats.immediate_reentry_count} fragments (&lt;100 km)
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Parent Orbital Period</div>
              <div className="text-lg font-mono font-semibold text-sky-300 mt-0.5 tabular-nums">
                {simResult.parent_orbit.period_minutes.toFixed(1)} min
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                {simResult.parent_orbit.altitude_km.toFixed(0)} km •{' '}
                {simResult.parent_orbit.velocity_km_s.toFixed(2)} km/s
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Parameters Panel */}
          <div className="lg:col-span-4 bg-space-950 p-4 rounded-lg border border-space-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-space-800 pb-2">
              <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                Collision Parameters
              </span>
              <span className="text-[10px] font-mono text-slate-400">{eventType}</span>
            </div>

            <div>
              <label htmlFor="breakup-target-mass" className="block text-[11px] text-slate-300 mb-1">
                Target Mass (kg) — {targetName}
              </label>
              <input
                id="breakup-target-mass"
                type="number"
                min={1}
                value={targetMass}
                onChange={(e) => setTargetMass(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full rounded bg-space-900 border border-space-700 px-2.5 py-1.5 font-mono text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="breakup-impactor-mass" className="block text-[11px] text-slate-300 mb-1">
                Impactor Mass (kg) — {impactorName}
              </label>
              <input
                id="breakup-impactor-mass"
                type="number"
                min={0}
                value={impactorMass}
                onChange={(e) => setImpactorMass(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded bg-space-900 border border-space-700 px-2.5 py-1.5 font-mono text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="breakup-rel-vel" className="block text-[11px] text-slate-300 mb-1">
                Relative Speed (km/s)
              </label>
              <input
                id="breakup-rel-vel"
                type="number"
                step="0.1"
                min={0}
                value={relVelocity}
                onChange={(e) => setRelVelocity(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded bg-space-900 border border-space-700 px-2.5 py-1.5 font-mono text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="breakup-alt" className="block text-[11px] text-slate-300 mb-1">
                Breakup Altitude (km)
              </label>
              <input
                id="breakup-alt"
                type="number"
                min={160}
                value={altitude}
                onChange={(e) => setAltitude(Math.max(160, parseFloat(e.target.value) || 160))}
                className="w-full rounded bg-space-900 border border-space-700 px-2.5 py-1.5 font-mono text-slate-100 tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="breakup-min-size" className="block text-[11px] text-slate-300 mb-1">
                  Min Size (m)
                </label>
                <select
                  id="breakup-min-size"
                  value={minFragmentSize}
                  onChange={(e) => setMinFragmentSize(parseFloat(e.target.value))}
                  className="w-full rounded bg-space-900 border border-space-700 px-2 py-1.5 font-mono text-slate-100 text-xs"
                >
                  <option value={0.01}>1 cm (Radar)</option>
                  <option value={0.05}>5 cm (Trackable)</option>
                  <option value={0.1}>10 cm (Catalog)</option>
                </select>
              </div>

              <div>
                <label htmlFor="breakup-sample" className="block text-[11px] text-slate-300 mb-1">
                  Sample Count
                </label>
                <select
                  id="breakup-sample"
                  value={maxSample}
                  onChange={(e) => setMaxSample(parseInt(e.target.value, 10))}
                  className="w-full rounded bg-space-900 border border-space-700 px-2 py-1.5 font-mono text-slate-100 text-xs"
                >
                  <option value={150}>150</option>
                  <option value={300}>300</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-space-800">
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={!simResult}
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-slate-100 font-medium text-xs transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                Export Fragment Ephemeris JSON
              </button>
            </div>
          </div>

          {/* Gabbard Canvas */}
          <div className="lg:col-span-8 bg-space-950 p-4 rounded-lg border border-space-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-space-800 pb-2 text-xs flex-wrap gap-2">
              <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-sky-400" aria-hidden="true" />
                Gabbard Diagram (Apogee & Perigee vs. Period)
              </span>
              <div className="flex items-center gap-3 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" aria-hidden="true" />
                  Perigee (hp)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" aria-hidden="true" />
                  Apogee (ha)
                </span>
              </div>
            </div>

            <div className="bg-space-950 rounded-lg border border-space-800 p-1">
              <canvas
                ref={gabbardCanvasRef}
                width={680}
                height={380}
                aria-label="Gabbard diagram plotting fragment apogee and perigee altitudes against orbital period"
                className="w-full h-auto block rounded"
              />
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
              <span>Asymmetric X-arms show forward and retrograde Delta-V ejection kicks.</span>
              <span className="font-mono text-sky-300 tabular-nums">
                Sampled {simResult?.sample_fragments_count || 0} fragments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-space-800 px-5 py-3 bg-space-950 flex items-center justify-between text-[11px] text-slate-400">
        <span>NASA EVOLVE 4.0 Breakup Model • Gauss Perturbation Impulse</span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-slate-100 text-xs font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </ModalDialog>
  );
};
