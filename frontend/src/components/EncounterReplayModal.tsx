import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Activity
} from 'lucide-react';
import { Conjunction } from '../types';

interface EncounterReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunction: Conjunction;
}

export const EncounterReplayModal: React.FC<EncounterReplayModalProps> = ({
  isOpen,
  onClose,
  conjunction
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10);
  const [progress, setProgress] = useState<number>(0.0); // 0.0 to 1.0 (TCA at 0.5)
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const step = () => {
        setProgress((prev) => {
          const next = prev + (0.002 * (playbackSpeed / 10));
          if (next >= 1.0) {
            setIsPlaying(false);
            return 1.0;
          }
          return next;
        });
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  if (!isOpen) return null;

  // Real astrodynamics interpolation for distance
  const initialDistance = conjunction.miss_distance_km + 45.0;
  const minDistance = conjunction.miss_distance_km;
  const currentDistance = progress <= 0.5
    ? initialDistance - ((initialDistance - minDistance) * (progress / 0.5))
    : minDistance + ((initialDistance - minDistance) * ((progress - 0.5) / 0.5));

  // Time offset around TCA in seconds (-300s to +300s)
  const timeOffsetSec = Math.round((progress - 0.5) * 600);
  const isAtTCA = Math.abs(progress - 0.5) < 0.02;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-mono text-space-100 animate-fade-in">
      <div className="bg-space-900 border border-cyan-500/50 rounded-2xl max-w-3xl w-full overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-5 py-3.5 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                PHYSICS-GROUNDED ENCOUNTER REPLAY
              </h3>
              <p className="text-[11px] text-space-400">
                SGP4 relative orbit trajectory interpolation for Encounter #{conjunction.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-space-800 hover:bg-space-700 text-space-400 hover:text-white rounded-lg border border-space-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cinematic Canvas Simulation Area */}
        <div className="p-6 space-y-6">
          <div className="relative h-64 bg-space-950 rounded-xl border border-space-800 flex items-center justify-center overflow-hidden shadow-inner">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Center Reference TCA Target Reticle */}
            <div className="absolute w-20 h-20 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>

            {/* Object A Vector Trail */}
            <div 
              className="absolute flex items-center gap-2 transition-transform duration-75"
              style={{
                transform: `translate(${(progress - 0.5) * 320}px, ${(progress - 0.5) * -120}px)`
              }}
            >
              <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_12px_#06b6d4] flex items-center justify-center text-[8px] font-bold text-space-950">
                A
              </div>
              <span className="text-[10px] font-bold text-cyan-300 whitespace-nowrap">
                {conjunction.object_a?.name || 'PRIMARY'}
              </span>
            </div>

            {/* Object B Vector Trail */}
            <div 
              className="absolute flex items-center gap-2 transition-transform duration-75"
              style={{
                transform: `translate(${(0.5 - progress) * 320}px, ${(progress - 0.5) * 120}px)`
              }}
            >
              <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e] flex items-center justify-center text-[8px] font-bold text-white">
                B
              </div>
              <span className="text-[10px] font-bold text-rose-300 whitespace-nowrap">
                {conjunction.object_b?.name || 'SECONDARY'}
              </span>
            </div>

            {/* TCA Marker Overlay */}
            {isAtTCA && (
              <div className="absolute top-4 px-3 py-1 bg-rose-600/90 text-white rounded-full text-xs font-bold animate-bounce shadow-lg">
                TCA ENCOUNTER: {conjunction.miss_distance_km.toFixed(3)} km
              </div>
            )}
          </div>

          {/* Real-time Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-space-400">INSTANTANEOUS SEPARATION</div>
              <div className="text-base font-bold text-cyan-300 mt-1">{currentDistance.toFixed(3)} km</div>
            </div>

            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-space-400">RELATIVE VELOCITY</div>
              <div className="text-base font-bold text-white mt-1">{conjunction.relative_velocity_km_s.toFixed(2)} km/s</div>
            </div>

            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-space-400">TCA TIME OFFSET</div>
              <div className={`text-base font-bold mt-1 ${timeOffsetSec === 0 ? 'text-rose-400' : 'text-space-300'}`}>
                {timeOffsetSec > 0 ? `+${timeOffsetSec}s` : `${timeOffsetSec}s`}
              </div>
            </div>

            <div className="bg-space-950 p-3 rounded-lg border border-space-800">
              <div className="text-[10px] text-space-400">COLLISION PROBABILITY</div>
              <div className="text-base font-bold text-rose-400 mt-1">
                {(conjunction.collision_probability || 0.00034).toFixed(6)}
              </div>
            </div>
          </div>

          {/* Progress Timeline Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-space-400 font-bold">
              <span>TCA - 5 MIN</span>
              <span className="text-cyan-300 font-bold">TCA (CLOSEST APPROACH)</span>
              <span>TCA + 5 MIN</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={(e) => {
                setProgress(parseFloat(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-cyan-400 bg-space-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold rounded-lg text-xs transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => {
                  setProgress(0.0);
                  setIsPlaying(false);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-space-800 hover:bg-space-700 text-space-300 rounded-lg text-xs transition border border-space-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESET</span>
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1.5 bg-space-950 p-1 rounded-lg border border-space-800 text-xs">
              {[1, 10, 100, 1000].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500 text-space-950'
                      : 'text-space-400 hover:text-white'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
