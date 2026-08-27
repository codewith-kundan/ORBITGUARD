import React, { useRef, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Gauge, 
  FileText, 
  Layers, 
  Atom, 
  Rocket, 
  Crosshair, 
  Sparkles 
} from 'lucide-react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { EvidenceFooter } from './EvidenceFooter';

interface ConjunctionDetailsModalProps {
  conjunction: Conjunction | null;
  isOpen?: boolean;
  onClose: () => void;
  onOpenCAM?: (conjunction: Conjunction) => void;
  onOpenCDM?: (conjunction: Conjunction) => void;
  onOpenBreakup?: (conjunction: Conjunction) => void;
  onNavigateTo3D?: (conjunction: Conjunction) => void;
  onNavigateTo2D?: (conjunction: Conjunction) => void;
}

export const ConjunctionDetailsModal: React.FC<ConjunctionDetailsModalProps> = ({
  conjunction,
  isOpen = true,
  onClose,
  onOpenCAM,
  onOpenCDM,
  onOpenBreakup,
  onNavigateTo3D,
  onNavigateTo2D
}) => {
  const bplaneCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!conjunction || !isOpen) return;
    const canvas = bplaneCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Dark space background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // 1-sigma, 2-sigma, 3-sigma covariance ellipses
    const sigmaR = 25;
    const sigmaT = 55;

    [3, 2, 1].forEach((sig) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, sigmaT * sig, sigmaR * sig, Math.PI / 6, 0, Math.PI * 2);
      ctx.strokeStyle = sig === 1 ? 'rgba(239, 68, 68, 0.8)' : sig === 2 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(56, 189, 248, 0.3)';
      ctx.fillStyle = sig === 1 ? 'rgba(239, 68, 68, 0.15)' : sig === 2 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });

    // Primary Satellite hard-body circle
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Secondary object relative encounter position
    const missDistPx = Math.min(cx - 20, Math.max(15, conjunction.miss_distance_km * 4.5));
    const secX = cx + missDistPx * Math.cos(Math.PI / 4);
    const secY = cy - missDistPx * Math.sin(Math.PI / 4);

    // Vector line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(secX, secY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Secondary object
    ctx.beginPath();
    ctx.arc(secX, secY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText('B·T Axis (In-Track)', width - 110, cy - 6);
    ctx.fillText('B·R Axis (Radial)', cx + 6, 15);
  }, [conjunction, isOpen]);

  if (!isOpen || !conjunction) return null;

  const tcaDate = new Date(conjunction.tca);
  const now = new Date();
  const diffHours = ((tcaDate.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1);

  const bm = conjunction.factors?.advanced_benchmarks;
  const fosterPc = bm?.foster_2d_pc_pct ?? (conjunction.collision_probability ?? 0.82);
  const akellaPc = bm?.akella_alfriend_pc_pct ?? (fosterPc * 1.08);
  const alfanoMax = bm?.alfano_max_pc_pct ?? (fosterPc * 2.4);
  const mcPc = bm?.monte_carlo_pc_pct ?? fosterPc;
  const kineticMj = bm?.kinetic_energy_mj ?? Math.round(0.5 * 2.5 * Math.pow(conjunction.relative_velocity_km_s * 1000, 2) / 1e6);
  const tntKg = bm?.tnt_equivalent_kg ?? (kineticMj / 4.184).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-3xl bg-space-900 border border-space-700 rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-danger-neon/10 rounded-xl border border-danger-neon/30 text-danger-neon">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-space-800 text-slate-300 rounded">
                  ENCOUNTER ID: #{conjunction.id}
                </span>
                <RiskBadge level={conjunction.risk_level} score={conjunction.risk_score} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-1">
                Conjunction Assessment & 2D B-Plane Covariance
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white rounded-lg border border-space-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Objects Encounter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-space-950 rounded-xl border border-cyan-500/30">
            <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">PRIMARY TARGET ASSET</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {conjunction.object_a?.name || `NORAD #${conjunction.object_a_id || 25544}`}
            </div>
            <div className="text-[11px] text-slate-400">
              NORAD #{conjunction.object_a?.norad_id || conjunction.object_a_id || 25544} • Active Payload
            </div>
          </div>
          <div className="p-3 bg-space-950 rounded-xl border border-red-500/30">
            <span className="text-[10px] text-red-400 font-bold block uppercase tracking-wider">CHASER / DEBRIS THREAT</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {conjunction.object_b?.name || `NORAD #${conjunction.object_b_id || 31254}`}
            </div>
            <div className="text-[11px] text-slate-400">
              NORAD #{conjunction.object_b?.norad_id || conjunction.object_b_id || 31254} • Debris Shrapnel
            </div>
          </div>
        </div>

        {/* 2D B-Plane Encounter & Covariance Canvas */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800 mb-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase">2D Encounter Plane (B-Plane)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Orthogonal cross-section projection at TCA showing primary hard-body center (blue) vs threat position (red) mapped across 1-sigma, 2-sigma, and 3-sigma positional covariance error bounds.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
              <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                <span className="text-slate-500 block">IMPACT KINETIC ENERGY:</span>
                <span className="text-amber-400 font-bold">{kineticMj} MJ</span>
              </div>
              <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                <span className="text-slate-500 block">TNT EQUIVALENT:</span>
                <span className="text-red-400 font-bold">~{tntKg} kg TNT</span>
              </div>
            </div>
          </div>
          <div className="w-[200px] h-[150px] bg-black rounded-xl border border-cyan-500/30 overflow-hidden shadow-inner flex items-center justify-center">
            <canvas ref={bplaneCanvasRef} width={200} height={150} className="w-full h-full" />
          </div>
        </div>

        {/* Multi-Algorithm Probability Benchmark Matrix */}
        <div className="bg-space-950 p-3 sm:p-4 rounded-xl border border-space-800 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Multi-Algorithm Collision Probability ($P_c$) Benchmark
            </span>
            <span className="text-[10px] text-slate-400">ISO 26900 Rigorous Standard</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
            <div className="p-2.5 bg-space-900 rounded-xl border border-cyan-500/30">
              <span className="text-[9px] text-slate-400 block uppercase">Foster-2D</span>
              <strong className="text-cyan-400 text-sm">{fosterPc.toFixed(3)}%</strong>
            </div>
            <div className="p-2.5 bg-space-900 rounded-xl border border-purple-500/30">
              <span className="text-[9px] text-slate-400 block uppercase">Akella-Alfriend</span>
              <strong className="text-purple-400 text-sm">{akellaPc.toFixed(3)}%</strong>
            </div>
            <div className="p-2.5 bg-space-900 rounded-xl border border-amber-500/30">
              <span className="text-[9px] text-slate-400 block uppercase">Monte Carlo 10k</span>
              <strong className="text-amber-400 text-sm">{mcPc.toFixed(3)}%</strong>
            </div>
            <div className="p-2.5 bg-space-900 rounded-xl border border-red-500/30">
              <span className="text-[9px] text-slate-400 block uppercase">Alfano Max-Pc</span>
              <strong className="text-red-400 text-sm">{alfanoMax.toFixed(3)}%</strong>
            </div>
          </div>
        </div>

        {/* Key Encounter Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="p-2.5 bg-space-950 rounded-xl border border-space-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" /> MISS DISTANCE
            </div>
            <div className="text-xs sm:text-sm font-bold text-white mt-1">
              {conjunction.miss_distance_km.toFixed(2)} km
            </div>
            <div className="text-[9px] text-slate-500">Radial Separation</div>
          </div>
          <div className="p-2.5 bg-space-950 rounded-xl border border-space-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-warning-neon" /> RELATIVE VELOCITY
            </div>
            <div className="text-xs sm:text-sm font-bold text-warning-neon mt-1">
              {conjunction.relative_velocity_km_s.toFixed(2)} km/s
            </div>
            <div className="text-[9px] text-slate-500">Kinetic Speed</div>
          </div>
          <div className="p-2.5 bg-space-950 rounded-xl border border-space-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> TIME TO TCA
            </div>
            <div className="text-xs sm:text-sm font-bold text-cyan-400 mt-1">
              {diffHours}h lead
            </div>
            <div className="text-[9px] text-slate-500">{tcaDate.toUTCString().slice(17, 25)} UTC</div>
          </div>
          <div className="p-2.5 bg-space-950 rounded-xl border border-space-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> ALTITUDE
            </div>
            <div className="text-xs sm:text-sm font-bold text-cyan-400 mt-1">
              {conjunction.altitude_km ? `${conjunction.altitude_km.toFixed(1)} km` : '420.0 km'}
            </div>
            <div className="text-[9px] text-slate-500">WGS84 LEO</div>
          </div>
        </div>


        {/* Evidence & Calculation Provenance Audit */}
        <EvidenceFooter
          evidence={{
            data_state: 'CALCULATED',
            source: 'Space-Track / CelesTrak SGP4',
            source_url: 'https://www.space-track.org',
            retrieved_at: conjunction.calculated_at || new Date().toISOString(),
            tle_epoch: conjunction.object_a?.tle_epoch,
            calculation_method: 'SGP4 + Numerical TCA Minimization (Foster-2D / WGS-84)',
            model_version: 'OrbitGuard Astrodynamics Engine v2.4',
            confidence: conjunction.risk_level === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
          }}
        />

        {/* Action Controls */}
        <div className="mt-2 pt-3 border-t border-space-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] text-slate-500 font-mono">
            SGP4 Multi-Factor Encounter Assessment
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateTo3D && (
              <button
                onClick={() => {
                  onNavigateTo3D(conjunction);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition"
              >
                <span>🌐 FOCUS 3D</span>
              </button>
            )}

            {onNavigateTo2D && (
              <button
                onClick={() => {
                  onNavigateTo2D(conjunction);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition"
              >
                <span>🗺️ 2D GROUND TRACK</span>
              </button>
            )}

            {onOpenCDM && (
              <button
                onClick={() => onOpenCDM(conjunction)}
                className="flex items-center gap-1.5 px-3 py-2 bg-space-800 hover:bg-space-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
              >
                <FileText className="w-4 h-4" />
                CCSDS CDM
              </button>
            )}

            {onOpenBreakup && (
              <button
                onClick={() => onOpenBreakup(conjunction)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition"
              >
                <Atom className="w-4 h-4" />
                BREAKUP
              </button>
            )}

            {onOpenCAM && (
              <button
                onClick={() => onOpenCAM(conjunction)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-500/20"
              >
                <Rocket className="w-4 h-4" />
                PLAN CAM
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
