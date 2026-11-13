import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Eye,
  Star,
  MapPin,
  Clock,
  RefreshCw,
  Compass,
  Globe2,
  Calendar,
  Navigation,
  LocateFixed,
  AlertTriangle,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { api } from '../services/api';
import {
  calculateDynamicPasses,
  SPOTTER_CITIES,
  SpotterCity,
  SpotterPass,
} from '../services/skySpotterEngine';
import { formatUtcTime } from '../utils/utcTime';

interface SkySpotterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkySpotterModal: React.FC<SkySpotterModalProps> = ({ isOpen, onClose }) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [passes, setPasses] = useState<SpotterPass[]>([]);
  const [availableCities, setAvailableCities] = useState<SpotterCity[]>(SPOTTER_CITIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [minElevationFilter, setMinElevationFilter] = useState<number>(10);
  const [customLocation, setCustomLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const loadPasses = useCallback(
    async (cityFilter?: string, customLoc?: { lat: number; lon: number; name: string } | null) => {
      try {
        setLoading(true);
        const queryCity = cityFilter && cityFilter !== 'ALL' ? cityFilter : undefined;
        const res = await api.getVisiblePasses(queryCity, {
          minElevation: minElevationFilter,
          lat: customLoc?.lat,
          lon: customLoc?.lon,
          locationName: customLoc?.name,
        });
        if (Array.isArray(res?.passes)) {
          setPasses(res.passes);
          if (res.available_cities && res.available_cities.length > 1) {
            setAvailableCities(res.available_cities);
          }
        } else {
          throw new Error('Unexpected response from live pass predictor');
        }
      } catch {
        const dynamicRes = calculateDynamicPasses(
          customLoc
            ? {
                lat: customLoc.lat,
                lon: customLoc.lon,
                name: customLoc.name,
                id: 'custom_gps',
              }
            : cityFilter && cityFilter !== 'ALL'
              ? cityFilter
              : undefined,
          minElevationFilter,
          48.0
        );
        setPasses(dynamicRes.passes);
        if (dynamicRes.available_cities.length > 1) {
          setAvailableCities(dynamicRes.available_cities);
        }
      } finally {
        setLoading(false);
      }
    },
    [minElevationFilter]
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Browser geolocation is unavailable. Select a station from the dropdown.');
      return;
    }
    setGeoError(null);
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false);
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: `GPS (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`,
        };
        setCustomLocation(loc);
        setSelectedCityId('custom_gps');
        loadPasses('custom_gps', loc);
      },
      (err) => {
        setIsGeolocating(false);
        setGeoError(`Location request declined (${err.message}). Select a hub city below.`);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      if (selectedCityId === 'custom_gps' && customLocation) {
        loadPasses('custom_gps', customLocation);
      } else {
        loadPasses(selectedCityId, null);
      }
    }
  }, [isOpen, selectedCityId, minElevationFilter, customLocation, loadPasses]);

  const activePasses = passes
    .filter((p) => {
      const isFuture = p.startTimeMs > nowMs - 600000;
      const matchesCity =
        selectedCityId === 'ALL' ||
        p.cityId === selectedCityId ||
        (selectedCityId === 'custom_gps' && p.cityId === 'custom_gps');
      const matchesElevation = (p.maxElevationDeg || 20) >= minElevationFilter;
      return isFuture && matchesCity && matchesElevation;
    })
    .sort((a, b) => a.startTimeMs - b.startTimeMs);

  const formatCountdown = (startMs: number) => {
    const diffMs = startMs - nowMs;
    if (diffMs <= 0 && diffMs > -600000) return 'ACTIVE OVERHEAD';
    if (diffMs <= -600000) return 'COMPLETED';

    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);

    if (hours > 0) {
      return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `T-${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="sky-spotter-title"
      maxWidthClass="max-w-4xl"
      className="bg-space-900 border border-space-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] font-mono text-slate-200"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-space-900 rounded-md border border-space-700 text-accent-400 shrink-0" aria-hidden="true">
            <Eye className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-sky-500/10 text-sky-300 rounded border border-sky-500/30">
                OPTICAL VISIBILITY PREDICTOR
              </span>
              <span className="text-[10px] text-slate-400">
                Sunlit Spacecraft Over Dark Ground
              </span>
            </div>
            <h2 id="sky-spotter-title" className="text-sm sm:text-base font-semibold text-slate-100 mt-1 truncate">
              Visual Satellite Overpass Schedule
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => loadPasses(selectedCityId, selectedCityId === 'custom_gps' ? customLocation : null)}
            disabled={loading}
            aria-label="Recalculate visible satellite passes"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-slate-100 rounded-md border border-space-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-400' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Optical Pass Spotter"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 sm:px-5 bg-space-950 border-b border-space-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="spotter-city-select" className="text-slate-400 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
            <span>Site:</span>
          </label>
          <select
            id="spotter-city-select"
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="bg-space-900 border border-space-700 rounded-md px-2.5 py-1.5 text-slate-100 text-xs max-w-[260px]"
          >
            <option value="ALL">All Observation Sites ({passes.length} passes)</option>
            {customLocation && <option value="custom_gps">{customLocation.name}</option>}
            {availableCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} ({city.lat.toFixed(1)}°N, {city.lon.toFixed(1)}°E)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isGeolocating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-space-900 hover:bg-space-800 text-accent-400 rounded-md border border-space-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isGeolocating ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isGeolocating ? 'Locating...' : 'Use GPS Location'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="spotter-min-el" className="text-slate-400">
            Min Elevation:
          </label>
          <select
            id="spotter-min-el"
            value={minElevationFilter}
            onChange={(e) => setMinElevationFilter(Number(e.target.value))}
            className="bg-space-900 border border-space-700 rounded-md px-2 py-1 text-slate-100"
          >
            <option value={10}>&ge; 10°</option>
            <option value={25}>&ge; 25°</option>
            <option value={50}>&ge; 50°</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
        {geoError && (
          <div role="alert" className="p-3 bg-amber-500/10 border border-amber-500/35 rounded-md text-amber-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{geoError}</span>
            </span>
            <button
              type="button"
              onClick={() => setGeoError(null)}
              aria-label="Dismiss location notice"
              className="p-1 rounded hover:bg-space-800 text-slate-300"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-accent-400" aria-hidden="true" />
            <span>Propagating SGP4 optical twilight visibility windows...</span>
          </div>
        ) : activePasses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-space-950 rounded-md border border-space-800 space-y-1">
            <p className="text-slate-100 font-semibold">No visible optical passes matched current criteria.</p>
            <p className="text-[11px] font-sans">
              Select All Observation Sites or lower the minimum culmination elevation threshold.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activePasses.map((p, idx) => {
              const isOverheadNow = p.startTimeMs <= nowMs && p.startTimeMs > nowMs - 600000;
              return (
                <article
                  key={`${p.noradId}-${p.cityId}-${idx}`}
                  className={`p-3.5 sm:p-4 bg-space-950 rounded-md border space-y-2.5 ${
                    isOverheadNow ? 'border-emerald-500/60' : 'border-space-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Star
                        className={`w-4 h-4 ${
                          p.brightnessRank === 'Extremely Bright' ? 'text-amber-400' : 'text-accent-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-xs sm:text-sm font-semibold text-slate-100">
                        {p.satelliteName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-900 text-slate-400 border border-space-700 tabular-nums">
                        #{p.noradId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-space-900 text-slate-200 border border-space-700 inline-flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-accent-400" aria-hidden="true" />
                        {p.cityName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 tabular-nums">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${
                          isOverheadNow
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                        {formatCountdown(p.startTimeMs)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-space-900 text-slate-200 border-space-700">
                        {p.magnitude.startsWith('Mag') ? p.magnitude : `Mag ${p.magnitude}`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-space-800 text-slate-300 tabular-nums">
                    <div className="p-2 bg-space-900 rounded border border-space-800">
                      <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-accent-400" aria-hidden="true" />
                        AOS (UTC)
                      </span>
                      <strong className="text-slate-100">{formatUtcTime(p.startTime, false)} UTC</strong>
                    </div>

                    <div className="p-2 bg-space-900 rounded border border-space-800">
                      <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                        <Globe2 className="w-2.5 h-2.5 text-emerald-400" aria-hidden="true" />
                        Max Elevation
                      </span>
                      <strong className="text-emerald-300">{p.maxElevation}</strong>
                    </div>

                    <div className="p-2 bg-space-900 rounded border border-space-800">
                      <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                        <Compass className="w-2.5 h-2.5 text-accent-400" aria-hidden="true" />
                        Azimuth Path
                      </span>
                      <strong className="text-slate-100 truncate block" title={p.skyPath || `${p.startDirection} to ${p.endDirection}`}>
                        {p.startDirection} &rarr; {p.endDirection}
                      </strong>
                    </div>

                    <div className="p-2 bg-space-900 rounded border border-space-800">
                      <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400" aria-hidden="true" />
                        Duration
                      </span>
                      <strong className="text-amber-300">{p.duration}</strong>
                    </div>
                  </div>

                  {p.skyPath && (
                    <div className="flex items-center justify-between text-[11px] bg-space-900 px-2.5 py-1.5 rounded border border-space-800 text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 text-accent-400" aria-hidden="true" />
                        <span>Track:</span>
                        <span className="text-slate-200 font-semibold">{p.skyPath}</span>
                      </span>
                      {p.minRangeKm && (
                        <span className="tabular-nums">
                          Range: <strong className="text-slate-100">{p.minRangeKm} km</strong>
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
