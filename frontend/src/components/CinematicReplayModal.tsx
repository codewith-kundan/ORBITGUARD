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
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { formatUtcTime, formatUtcDateTime, parseUtcDate } from '../utils/utcTime';

interface CinematicReplayModalProps {
  conjunction: Conjunction | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCAM?: (conjunction: Conjunction) => void;
  onOpenCDM?: (conjunction: Conjunction) => void;
}

const WINDOW_MINUTES = 30;

export const CinematicReplayModal: React.FC<CinematicReplayModalProps> = ({
  conjunction,
  isOpen,
  onClose,
  onOpenCAM,
  onOpenCDM,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<number>(0.1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10);
  const [progress, setProgress] = useState<number>(0.1);
  const [isTcaReached, setIsTcaReached] = useState<boolean>(false);

  const updateProgress = (nextVal: number) => {
    progressRef.current = nextVal;
    setProgress(nextVal);
  };

  useEffect(() => {
    if (isOpen) {
      updateProgress(0.1);
      setIsPlaying(true);
      setIsTcaReached(false);
    }
  }, [isOpen, conjunction?.id]);

  // Animation loop updating progress safely outside any React updater function
  useEffect(() => {
    if (!isOpen || !conjunction || !isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const prev = progressRef.current;
      const step = (dt * playbackSpeed) / (WINDOW_MINUTES * 60 * 2);
      const next = Math.min(1.0, prev + step);
      updateProgress(next);

      if (prev < 0.5 && next >= 0.5) {
        setIsTcaReached(true);
      }
      if (next >= 1.0) {
        setIsPlaying(false);
        return;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, conjunction, isPlaying, playbackSpeed]);

  // Render B-Plane / LVLH relative encounter diagram
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

    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, width, height);

    const ringRadii = [40, 80, 130, 180];
    const ringKm = [5, 15, 30, 60];
    ringRadii.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 0 ? 'rgba(239, 68, 68, 0.35)' : '#1e2836';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${ringKm[idx]} km`, cx + r + 4, cy - 3);
    });

    ctx.strokeStyle = '#1e2836';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    const approachAngleRad = ((conjunction.approach_angle_deg || 45) * Math.PI) / 180;
    const missDistKm = conjunction.miss_distance_km;
    const missPx = Math.max(12, Math.min(165, (missDistKm / 50.0) * 150));

    // Primary reference path
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 240, cy);
    ctx.lineTo(cx + 240, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Secondary linearized encounter track
    const tcaSecX = cx + missPx * Math.cos(approachAngleRad);
    const tcaSecY = cy - missPx * Math.sin(approachAngleRad);
    const relVelDirX = -Math.sin(approachAngleRad);
    const relVelDirY = -Math.cos(approachAngleRad);
    const trajectoryLength = 300;

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tcaSecX - relVelDirX * trajectoryLength, tcaSecY - relVelDirY * trajectoryLength);
    ctx.lineTo(tcaSecX + relVelDirX * trajectoryLength, tcaSecY + relVelDirY * trajectoryLength);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tcaSecX, tcaSecY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.stroke();

    const curParam = (progress - 0.5) * 2.0;
    const curSecX = tcaSecX + relVelDirX * (curParam * trajectoryLength);
    const curSecY = tcaSecY + relVelDirY * (curParam * trajectoryLength);

    ctx.strokeStyle = Math.abs(progress - 0.5) < 0.05 ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = Math.abs(progress - 0.5) < 0.05 ? 2 : 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(curSecX, curSecY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(curSecX, curSecY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (Math.abs(progress - 0.5) < 0.03) {
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(conjunction.object_a?.name || 'Primary Asset', cx - 36, cy + 20);

    ctx.fillStyle = '#fca5a5';
    ctx.fillText(conjunction.object_b?.name || 'Secondary Object', curSecX + 10, curSecY + 4);
  }, [isOpen, conjunction, progress]);

  if (!conjunction) return null;

  const tcaDate = parseUtcDate(conjunction.tca) || new Date();
  const timeOffsetSec = (progress - 0.5) * WINDOW_MINUTES * 60 * 2;
  const currentSimDate = new Date(tcaDate.getTime() + timeOffsetSec * 1000);

  const relVel = conjunction.relative_velocity_km_s || 0;
  const missDist = conjunction.miss_distance_km || 0;
  const currentSepKm = Math.sqrt(missDist * missDist + Math.pow(relVel * timeOffsetSec, 2));

  const absSec = Math.round(Math.abs(timeOffsetSec));
  const offsetMinutes = Math.floor(absSec / 60);
  const offsetSeconds = absSec % 60;
  const countdownStr =
    absSec === 0
      ? 'T-00:00 (TCA)'
      : `${timeOffsetSec < 0 ? 'T-' : 'T+'}${offsetMinutes
          .toString()
          .padStart(2, '0')}:${offsetSeconds.toString().padStart(2, '0')}`;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="replay-modal-title"
      maxWidthClass="max-w-5xl"
      className="bg-space-900 border border-space-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] font-mono text-slate-200"
    >
      {/* Header */}
      <div className="p-4 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-md bg-space-900 border border-space-700 text-red-400 shrink-0" aria-hidden="true">
            <Crosshair className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                Encounter B-Plane Replay
              </span>
              <RiskBadge level={conjunction.risk_level} score={conjunction.risk_score} size="sm" />
              <span className="text-xs text-slate-400 tabular-nums">Event #{conjunction.id}</span>
            </div>
            <h2 id="replay-modal-title" className="text-sm sm:text-base font-semibold text-slate-100 truncate mt-0.5">
              {conjunction.object_a?.name || `Object #${conjunction.object_a_id}`} /{' '}
              {conjunction.object_b?.name || `Object #${conjunction.object_b_id}`}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Encounter Replay dialog"
          className="p-1.5 bg-space-900 hover:bg-space-800 rounded-md border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
        <div className="relative bg-space-950 border border-space-800 rounded-lg overflow-hidden flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={780}
            height={360}
            aria-label="Relative encounter motion visualization"
            className="w-full max-w-[780px] h-[320px] sm:h-[360px] block"
          />

          <div className="w-full grid grid-cols-3 gap-2 p-2.5 bg-space-900 border-t border-space-800 text-xs tabular-nums">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Replay Epoch</span>
              <span className="font-semibold text-accent-400 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {formatUtcTime(currentSimDate.toISOString())} UTC
              </span>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase block">Range Separation</span>
              <span
                className={`font-semibold text-sm ${
                  currentSepKm < 5.0
                    ? 'text-red-300'
                    : currentSepKm < 20.0
                    ? 'text-amber-300'
                    : 'text-slate-100'
                }`}
              >
                {currentSepKm.toFixed(2)} km
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Offset to TCA</span>
              <span className="font-semibold text-amber-300">{countdownStr}</span>
            </div>
          </div>

          {isTcaReached && Math.abs(progress - 0.5) < 0.05 && (
            <div className="w-full py-1.5 px-3 bg-red-500/15 border-t border-red-500/35 text-red-200 text-xs text-center font-semibold tabular-nums">
              Closest Approach Window Reached: {conjunction.miss_distance_km.toFixed(3)} km miss distance
            </div>
          )}
        </div>

        {/* Scrubber & Controls */}
        <div className="p-3.5 bg-space-950 rounded-md border border-space-800 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 w-12 text-right tabular-nums">-30 min</span>
            <input
              type="range"
              aria-label="Encounter replay time scrubber"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={(e) => {
                updateProgress(parseFloat(e.target.value));
                setIsPlaying(false);
              }}
              className="flex-1 h-2 bg-space-800 rounded-lg cursor-pointer accent-sky-400"
            />
            <span className="text-[10px] text-slate-400 w-12 tabular-nums">+30 min</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (progressRef.current >= 1.0) updateProgress(0.0);
                  setIsPlaying(!isPlaying);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                  isPlaying
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'
                    : 'bg-sky-500 hover:bg-sky-400 text-space-950 border-transparent'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateProgress(0.0);
                  setIsPlaying(true);
                  setIsTcaReached(false);
                }}
                aria-label="Rewind replay to start"
                className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 rounded-md border border-space-700"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => {
                  updateProgress(0.5);
                  setIsTcaReached(true);
                  setIsPlaying(false);
                }}
                className="px-2.5 py-1.5 bg-space-900 hover:bg-space-800 text-slate-200 rounded-md border border-space-700 text-xs font-semibold"
              >
                Jump to TCA
              </button>
            </div>

            <div className="flex items-center gap-1 bg-space-900 p-1 rounded-md border border-space-800 text-xs" role="group" aria-label="Replay speed">
              <span className="text-[10px] text-slate-400 px-1.5 uppercase font-semibold">Speed</span>
              {[1, 5, 10, 30, 60, 120].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s)}
                  aria-pressed={playbackSpeed === s}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors text-[11px] tabular-nums ${
                    playbackSpeed === s
                      ? 'bg-sky-500 text-space-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
          <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">Min Miss Distance</span>
            <span className="text-sm font-semibold text-slate-100">{conjunction.miss_distance_km.toFixed(3)} km</span>
          </div>

          <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">Relative Velocity</span>
            <span className="text-sm font-semibold text-slate-100">{conjunction.relative_velocity_km_s.toFixed(2)} km/s</span>
          </div>

          <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">Approach Angle</span>
            <span className="text-sm font-semibold text-slate-100">{(conjunction.approach_angle_deg ?? 0).toFixed(1)}°</span>
          </div>

          <div className="p-2.5 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">TCA (UTC)</span>
            <span className="text-xs font-semibold text-accent-400 truncate block">
              {formatUtcDateTime(conjunction.tca, true)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-space-800">
          {onOpenCAM && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCAM(conjunction);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold rounded-md text-xs transition-colors"
            >
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Plan Avoidance Maneuver</span>
            </button>
          )}

          {onOpenCDM && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCDM(conjunction);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-space-950 hover:bg-space-800 text-slate-200 rounded-md border border-space-700 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
              <span>Export CCSDS CDM</span>
            </button>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};
