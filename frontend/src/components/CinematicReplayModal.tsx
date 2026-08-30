import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Crosshair, 
  Clock, 
  Activity, 
  FileText, 
  Sparkles
} from 'lucide-react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';

interface CinematicReplayModalProps {
  conjunction: Conjunction | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCAM?: (conjunction: Conjunction) => void;
  onOpenCDM?: (conjunction: Conjunction) => void;
}

export const CinematicReplayModal: React.FC<CinematicReplayModalProps> = ({
  conjunction,
  isOpen,
  onClose,
  onOpenCAM,
  onOpenCDM
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10);
  const [progress, setProgress] = useState<number>(0.5); // 0.0 = -30m, 0.5 = TCA (0m), 1.0 = +30m
  const [isTcaReached, setIsTcaReached] = useState<boolean>(false);

  // Time window: +/- 30 minutes around TCA
  const WINDOW_MINUTES = 30;

  useEffect(() => {
    if (!isOpen) {
      setProgress(0.1);
      setIsPlaying(true);
      setIsTcaReached(false);
    }
  }, [isOpen, conjunction]);

  // Animation Loop for Encounter Simulation
  useEffect(() => {
    if (!isOpen || !conjunction || !isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setProgress((prev) => {
        const step = (dt * playbackSpeed) / (WINDOW_MINUTES * 60 * 2);
        const next = prev + step;
        if (next >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        if (prev < 0.5 && next >= 0.5) {
          setIsTcaReached(true);
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, conjunction, isPlaying, playbackSpeed]);

  // 2D Tactical Vector & 3D Relative Plane Rendering on Canvas
  useEffect(() => {
    if (!isOpen || !conjunction) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Dark space tactical background with faint coordinate grid
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Concentric range rings around Primary Asset
    const ringRadii = [40, 80, 130, 190];
    const ringKm = [5, 15, 30, 60];
    ringRadii.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 211, 238, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(`${ringKm[idx]} km`, cx + r + 3, cy - 3);
    });

    // B-plane coordinate axes
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Relative angle in radians
    const approachAngleRad = ((conjunction.approach_angle_deg || 45) * Math.PI) / 180;
    const missDistKm = conjunction.miss_distance_km;
    const missPx = Math.max(12, Math.min(180, (missDistKm / 50.0) * 160));

    // Primary Satellite Path (Straight horizontal reference in LVLH frame)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 240, cy);
    ctx.lineTo(cx + 240, cy);
    ctx.stroke();

    // Primary Satellite Position (Fixed center of encounter frame)
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Secondary Threat Trajectory (Hyperbolic relative encounter line)
    // Closest approach vector is at (cx + missPx * cos(angle), cy - missPx * sin(angle))
    const tcaSecX = cx + missPx * Math.cos(approachAngleRad);
    const tcaSecY = cy - missPx * Math.sin(approachAngleRad);

    const relVelDirX = -Math.sin(approachAngleRad);
    const relVelDirY = -Math.cos(approachAngleRad);

    const trajectoryLength = 320;
    const startSecX = tcaSecX - relVelDirX * trajectoryLength;
    const startSecY = tcaSecY - relVelDirY * trajectoryLength;
    const endSecX = tcaSecX + relVelDirX * trajectoryLength;
    const endSecY = tcaSecY + relVelDirY * trajectoryLength;

    // Draw secondary path line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startSecX, startSecY);
    ctx.lineTo(endSecX, endSecY);
    ctx.stroke();

    // Closest Approach Point Marker on secondary path
    ctx.beginPath();
    ctx.arc(tcaSecX, tcaSecY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Current position of Secondary along trajectory based on progress [0..1]
    const curParam = (progress - 0.5) * 2.0; // [-1.0 .. +1.0]
    const curSecX = tcaSecX + relVelDirX * (curParam * trajectoryLength);
    const curSecY = tcaSecY + relVelDirY * (curParam * trajectoryLength);

    // Current separation line
    ctx.strokeStyle = Math.abs(progress - 0.5) < 0.05 ? 'rgba(255, 51, 68, 0.9)' : 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = Math.abs(progress - 0.5) < 0.05 ? 2 : 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(curSecX, curSecY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Secondary Threat Marker
    ctx.beginPath();
    ctx.arc(curSecX, curSecY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3344';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // TCA Pulse Highlight when at closest approach
    if (Math.abs(progress - 0.5) < 0.03) {
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 51, 68, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tcaSecX, tcaSecY, 22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 51, 68, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Name Labels
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(conjunction.object_a?.name || 'Primary Satellite', cx - 40, cy + 22);

    ctx.fillStyle = '#f87171';
    ctx.fillText(conjunction.object_b?.name || 'Secondary Threat', curSecX + 10, curSecY + 4);

  }, [isOpen, conjunction, progress]);

  if (!isOpen || !conjunction) return null;

  // Calculate current interpolated time and separation distance
  const tcaDate = new Date(conjunction.tca);
  const timeOffsetSec = (progress - 0.5) * WINDOW_MINUTES * 60 * 2;
  const currentSimDate = new Date(tcaDate.getTime() + timeOffsetSec * 1000);

  // Compute current separation distance based on hyperbolic relative motion
  const relVel = conjunction.relative_velocity_km_s;
  const missDist = conjunction.miss_distance_km;
  const currentSepKm = Math.sqrt(Math.pow(missDist, 2) + Math.pow(relVel * timeOffsetSec, 2));

  const offsetMinutes = Math.floor(Math.abs(timeOffsetSec) / 60);
  const offsetSeconds = Math.floor(Math.abs(timeOffsetSec) % 60);
  const tSign = timeOffsetSec < 0 ? 'T-' : timeOffsetSec === 0 ? 'T-00:00 (TCA)' : 'T+';
  const countdownStr = timeOffsetSec === 0 ? 'AT TCA' : `${tSign}${offsetMinutes.toString().padStart(2, '0')}:${offsetSeconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-mono animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-space-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 bg-space-900 border-b border-space-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-danger-500/20 border border-danger-500/40 text-danger-neon">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  CINEMATIC ENCOUNTER REPLAY
                </span>
                <RiskBadge level={conjunction.risk_level} score={conjunction.risk_score} size="sm" />
                <span className="text-xs text-slate-400">
                  Event ID #{conjunction.id}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                {conjunction.object_a?.name || `Object #${conjunction.object_a_id}`} ↔ {conjunction.object_b?.name || `Object #${conjunction.object_b_id}`}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Main Visual Encounter Canvas */}
          <div className="relative bg-space-950 border border-space-800 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[340px] sm:min-h-[400px]">
            <canvas
              ref={canvasRef}
              width={780}
              height={380}
              className="w-full max-w-[780px] h-[340px] sm:h-[380px] block"
            />

            {/* Floating Top Telemetry Overlay */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none flex-wrap">
              <div className="bg-space-900/90 backdrop-blur-md border border-space-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-lg">
                <span className="text-[10px] text-slate-400 uppercase block">SIMULATION CLOCK</span>
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  {currentSimDate.toUTCString().substring(17, 25)} UTC
                </span>
              </div>

              <div className="bg-space-900/90 backdrop-blur-md border border-space-700/80 rounded-xl px-3.5 py-1.5 text-center text-xs shadow-lg">
                <span className="text-[10px] text-slate-400 uppercase block">REL SEPARATION</span>
                <span className={`font-extrabold text-sm sm:text-base ${currentSepKm < 5.0 ? 'text-red-400 animate-pulse' : currentSepKm < 20.0 ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {currentSepKm.toFixed(2)} km
                </span>
              </div>

              <div className="bg-space-900/90 backdrop-blur-md border border-space-700/80 rounded-xl px-3 py-1.5 text-right text-xs shadow-lg">
                <span className="text-[10px] text-slate-400 uppercase block">ENCOUNTER STATE</span>
                <span className="font-bold text-amber-400">
                  {countdownStr}
                </span>
              </div>
            </div>

            {/* Target TCA Indicator Callout */}
            {isTcaReached && Math.abs(progress - 0.5) < 0.05 && (
              <div className="absolute bottom-4 bg-danger-500/20 border border-danger-500/60 text-danger-neon px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-xl flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>CLOSEST APPROACH REACHED: {conjunction.miss_distance_km.toFixed(2)} KM</span>
              </div>
            )}
          </div>

          {/* Interactive Playback Scrub & Speed Controls */}
          <div className="p-3.5 bg-space-900/90 rounded-xl border border-space-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 w-12 text-right">-30 min</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={progress}
                onChange={(e) => {
                  setProgress(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="flex-1 h-2 bg-space-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[10px] text-slate-400 w-12">+30 min</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    isPlaying 
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40' 
                      : 'bg-cyan-500 hover:bg-cyan-400 text-space-950 shadow-md'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'PAUSE' : 'PLAY REPLAY'}
                </button>

                <button
                  onClick={() => {
                    setProgress(0.0);
                    setIsPlaying(true);
                    setIsTcaReached(false);
                  }}
                  className="p-1.5 bg-space-800 hover:bg-space-700 text-slate-300 rounded-lg border border-space-700 text-xs transition"
                  title="Rewind to Start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setProgress(0.5);
                    setIsPlaying(false);
                  }}
                  className="px-2.5 py-1.5 bg-space-800 hover:bg-space-700 text-slate-300 rounded-lg border border-space-700 text-xs font-semibold transition"
                >
                  JUMP TO TCA
                </button>
              </div>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-800 text-xs">
                <span className="text-[10px] text-slate-500 px-1.5 uppercase font-bold">SPEED:</span>
                {[1, 5, 10, 30, 60, 120].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 rounded font-bold transition text-[11px] ${
                      playbackSpeed === s
                        ? 'bg-cyan-500 text-space-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Encounter Parameters Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 bg-space-900 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 uppercase block">MIN MISS DISTANCE</span>
              <span className="text-sm font-bold text-white">{conjunction.miss_distance_km.toFixed(3)} km</span>
            </div>

            <div className="p-2.5 bg-space-900 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 uppercase block">RELATIVE VELOCITY</span>
              <span className="text-sm font-bold text-white">{conjunction.relative_velocity_km_s.toFixed(2)} km/s</span>
            </div>

            <div className="p-2.5 bg-space-900 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 uppercase block">APPROACH GEOMETRY</span>
              <span className="text-sm font-bold text-white">{(conjunction.approach_angle_deg || 45.0).toFixed(1)}° Crossing</span>
            </div>

            <div className="p-2.5 bg-space-900 rounded-xl border border-space-800">
              <span className="text-[10px] text-slate-400 uppercase block">TCA TIMESTAMP</span>
              <span className="text-xs font-bold text-cyan-300 truncate block">
                {new Date(conjunction.tca).toUTCString().substring(5, 22)}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-space-800">
            {onOpenCAM && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCAM(conjunction);
                }}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                AVOIDANCE MANEUVER (CAM)
              </button>
            )}

            {onOpenCDM && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCDM(conjunction);
                }}
                className="px-3 py-1.5 bg-space-800 hover:bg-space-700 text-slate-200 rounded-xl border border-space-700 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                EXPORT CCSDS CDM
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
