import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  Star, 
  MapPin 
} from 'lucide-react';

interface SkySpotterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VisiblePass {
  satelliteName: string;
  noradId: number;
  magnitude: string;
  startTime: string;
  peakTime: string;
  duration: string;
  maxElevation: string;
  startDirection: string;
  endDirection: string;
  brightnessRank: 'Extremely Bright' | 'Bright' | 'Moderate';
}

export const SkySpotterModal: React.FC<SkySpotterModalProps> = ({ isOpen, onClose }) => {
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru, India');

  if (!isOpen) return null;

  const passes: VisiblePass[] = [
    {
      satelliteName: 'International Space Station (ISS)',
      noradId: 25544,
      magnitude: '-3.8 (Brighter than Venus)',
      startTime: 'Tonight, 19:42:15',
      peakTime: '19:45:30 (Max 78° Overhead)',
      duration: '6 mins 12 secs',
      maxElevation: '78° (Direct Zenith)',
      startDirection: 'South-West (220°)',
      endDirection: 'North-East (45°)',
      brightnessRank: 'Extremely Bright'
    },
    {
      satelliteName: 'Tiangong Chinese Space Station (CSS)',
      noradId: 48274,
      magnitude: '-1.4 (Bright as Sirius)',
      startTime: 'Tonight, 20:18:40',
      peakTime: '20:21:10 (Max 54°)',
      duration: '5 mins 20 secs',
      maxElevation: '54°',
      startDirection: 'West (275°)',
      endDirection: 'South-East (135°)',
      brightnessRank: 'Bright'
    },
    {
      satelliteName: 'Hubble Space Telescope (HST)',
      noradId: 20580,
      magnitude: '+1.8 (Visible with binoculars / dark sky)',
      startTime: 'Tonight, 21:05:00',
      peakTime: '21:08:20 (Max 42°)',
      duration: '4 mins 40 secs',
      maxElevation: '42°',
      startDirection: 'South (180°)',
      endDirection: 'East (90°)',
      brightnessRank: 'Moderate'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-3xl bg-space-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950/80 to-space-900 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
                CITIZEN SKY WATCH
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Tonight's Naked-Eye Satellite Passes
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

        {/* Location Selector */}
        <div className="p-4 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>OBSERVER LOCATION:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-space-900 border border-space-700 rounded-lg px-2.5 py-1 text-white font-bold"
            >
              <option value="Bengaluru, India">Bengaluru, India (13.03° N, 77.51° E)</option>
              <option value="London, UK">London, UK (51.50° N, 0.12° W)</option>
              <option value="New York, USA">New York, USA (40.71° N, 74.00° W)</option>
              <option value="Tokyo, Japan">Tokyo, Japan (35.67° N, 139.65° E)</option>
            </select>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/30">
            Sunlit / Dark Sky Window Active
          </span>
        </div>

        {/* Passes List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {passes.map((p) => (
            <div key={p.noradId} className="p-4 bg-space-950 rounded-xl border border-space-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">{p.satelliteName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">#{p.noradId}</span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  p.brightnessRank === 'Extremely Bright' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {p.brightnessRank} (Mag {p.magnitude})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-1">
                <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                  <span className="text-slate-500 block text-[9px]">START TIME:</span>
                  <strong className="text-cyan-300">{p.startTime}</strong>
                </div>
                <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                  <span className="text-slate-500 block text-[9px]">MAX ELEVATION:</span>
                  <strong className="text-emerald-400">{p.maxElevation}</strong>
                </div>
                <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                  <span className="text-slate-500 block text-[9px]">TRAJECTORY:</span>
                  <strong className="text-white">{p.startDirection} → {p.endDirection}</strong>
                </div>
                <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                  <span className="text-slate-500 block text-[9px]">VISIBLE DURATION:</span>
                  <strong className="text-amber-300">{p.duration}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
