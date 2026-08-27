import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  Star, 
  MapPin,
  Clock,
  RefreshCw,
  Compass,
  Sparkles,
  Globe2,
  Calendar,
  Navigation,
} from 'lucide-react';
import { api } from '../services/api';

interface SkySpotterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VisiblePass {
  satelliteName: string;
  noradId: number;
  cityName: string;
  cityId: string;
  magnitude: string;
  magValue?: number;
  startTime: string;
  peakTime?: string;
  endTime?: string;
  startTimeMs: number;
  maxElevation: string;
  maxElevationDeg?: number;
  duration: string;
  durationSec?: number;
  startDirection: string;
  peakDirection?: string;
  endDirection: string;
  skyPath?: string;
  brightnessRank: 'Extremely Bright' | 'Bright' | 'Moderate';
  visibilityCondition?: string;
  minRangeKm?: number;
}

interface AvailableCity {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alt_m: number;
}

export const SkySpotterModal: React.FC<SkySpotterModalProps> = ({ isOpen, onClose }) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [passes, setPasses] = useState<VisiblePass[]>([]);
  const [availableCities, setAvailableCities] = useState<AvailableCity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [minElevationFilter, setMinElevationFilter] = useState<number>(15);

  // 1-second live countdown ticker
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const loadPasses = async (cityFilter?: string) => {
    try {
      setLoading(true);
      const queryCity = cityFilter && cityFilter !== 'ALL' ? cityFilter : undefined;
      const res = await api.getVisiblePasses(queryCity);
      if (res && res.passes) {
        setPasses(res.passes);
        if (res.available_cities && res.available_cities.length > 0) {
          setAvailableCities(res.available_cities);
        }
      }
    } catch (e) {
      console.error('Sky Spotter load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPasses(selectedCityId);
    }
  }, [isOpen, selectedCityId]);

  if (!isOpen) return null;

  // Filter out expired passes and filter by location and elevation
  const activePasses = passes
    .filter((p) => {
      const isFuture = p.startTimeMs > nowMs - 600000; // Keep for 10 min past start while in transit
      const matchesCity = selectedCityId === 'ALL' || p.cityId === selectedCityId;
      const matchesElevation = (p.maxElevationDeg || 20) >= minElevationFilter;
      return isFuture && matchesCity && matchesElevation;
    })
    .sort((a, b) => a.startTimeMs - b.startTimeMs);

  const formatCountdown = (startMs: number) => {
    const diffMs = startMs - nowMs;
    if (diffMs <= 0 && diffMs > -600000) {
      return 'OVERHEAD NOW (LOOK UP)';
    }
    if (diffMs <= -600000) {
      return 'PASS COMPLETED';
    }

    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);

    if (hours > 0) {
      return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `T-${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-4xl bg-space-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-950/90 via-space-900 to-space-950 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
                  CITIZEN SKY SPOTTER & OPTICAL RADAR
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  SGP4 WGS-84 Ephemeris Active
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-bold text-white tracking-wide mt-0.5">
                Naked-Eye & Optical Satellite Overpasses
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadPasses(selectedCityId)}
              disabled={loading}
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-white rounded-lg border border-space-800 transition disabled:opacity-50 cursor-pointer"
              title="Recalculate Passes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg border border-space-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Location & Elevation Controls Bar */}
        <div className="p-3 bg-space-900/90 border-b border-space-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-400 font-bold">OBSERVATION HUB:</span>
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="bg-space-950 border border-cyan-500/40 rounded-lg px-3 py-1 text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
            >
              <option value="ALL">🌐 All Global Visible Passes ({passes.length} Overpasses)</option>
              {availableCities.map((city) => (
                <option key={city.id} value={city.id}>
                  📍 {city.name} ({city.lat.toFixed(1)}°N, {city.lon.toFixed(1)}°E)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <div className="flex items-center gap-1 bg-space-950 px-2 py-0.5 rounded border border-space-800">
              <span className="text-slate-400">Min Culmination:</span>
              <select
                value={minElevationFilter}
                onChange={(e) => setMinElevationFilter(Number(e.target.value))}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value={10}>≥ 10° (Horizon to Zenith)</option>
                <option value={25}>≥ 25° (Clear Obstructed View)</option>
                <option value={50}>≥ 50° (High Zenith Only)</option>
              </select>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Sunlit in Dark/Twilight Sky
            </span>
          </div>
        </div>

        {/* Main List of Real Visible Passes */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Propagating live SGP4 optical visibility vectors over chosen ground sites...</span>
            </div>
          ) : activePasses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-space-900 rounded-xl border border-space-800 space-y-1">
              <p className="text-white font-bold">No naked-eye satellite passes predicted in the next 48 hours matching current filters.</p>
              <p className="text-[11px] text-slate-500">Try selecting "All Global Visible Passes" or lowering the minimum elevation cutoff.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePasses.map((p, idx) => {
                const isOverheadNow = p.startTimeMs <= nowMs && p.startTimeMs > nowMs - 600000;
                return (
                  <div 
                    key={`${p.noradId}-${p.cityId}-${idx}`} 
                    className={`p-3.5 sm:p-4 bg-space-900/90 rounded-xl border transition space-y-2.5 ${
                      isOverheadNow 
                        ? 'border-emerald-500/80 bg-emerald-950/30 shadow-[0_0_25px_rgba(16,185,129,0.25)] animate-pulse' 
                        : 'border-space-800 hover:border-cyan-500/40 hover:bg-space-900'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Star className={`w-4 h-4 ${p.brightnessRank === 'Extremely Bright' ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-cyan-400'}`} />
                        <span className="text-xs sm:text-sm font-bold text-white">{p.satelliteName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-950 text-slate-400 font-mono border border-space-800">
                          #{p.noradId}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {p.cityName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 tabular-nums ${
                          isOverheadNow 
                            ? 'bg-emerald-500 text-space-950 border-emerald-400 animate-bounce' 
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}>
                          <Clock className="w-2.5 h-2.5" />
                          {formatCountdown(p.startTimeMs)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          p.brightnessRank === 'Extremely Bright'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : p.brightnessRank === 'Bright'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          Mag {p.magnitude}
                        </span>
                      </div>
                    </div>

                    {/* Flight Overpass Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-space-800/80 text-slate-300">
                      <div className="p-2 bg-space-950 rounded-lg border border-space-800">
                        <span className="text-slate-500 block text-[9px] flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                          AOS START (UTC):
                        </span>
                        <strong className="text-cyan-300">
                          {new Date(p.startTime).toUTCString().substring(17, 22)} UTC
                        </strong>
                      </div>

                      <div className="p-2 bg-space-950 rounded-lg border border-space-800">
                        <span className="text-slate-500 block text-[9px] flex items-center gap-1">
                          <Globe2 className="w-2.5 h-2.5 text-emerald-400" />
                          PEAK CULMINATION:
                        </span>
                        <strong className="text-emerald-400">{p.maxElevation}</strong>
                      </div>

                      <div className="p-2 bg-space-950 rounded-lg border border-space-800">
                        <span className="text-slate-500 block text-[9px] flex items-center gap-1">
                          <Compass className="w-2.5 h-2.5 text-purple-400" />
                          TRAJECTORY COMPASS:
                        </span>
                        <strong className="text-white truncate block" title={p.skyPath || `${p.startDirection} → ${p.endDirection}`}>
                          {p.startDirection} → {p.endDirection}
                        </strong>
                      </div>

                      <div className="p-2 bg-space-950 rounded-lg border border-space-800">
                        <span className="text-slate-500 block text-[9px] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          VISIBLE DURATION:
                        </span>
                        <strong className="text-amber-300">{p.duration}</strong>
                      </div>
                    </div>

                    {/* Sky Vector Ribbon */}
                    {p.skyPath && (
                      <div className="flex items-center justify-between text-[10px] bg-space-950/60 px-2.5 py-1 rounded border border-space-800/60 text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-cyan-400" />
                          <span className="text-slate-400">Sky Path:</span>
                          <span className="text-cyan-300 font-bold">{p.skyPath}</span>
                        </span>
                        {p.minRangeKm && (
                          <span className="text-slate-400">
                            Slant Range: <span className="text-white font-bold">{p.minRangeKm} km</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
