import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sun,
  Flame,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Wind,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface SpaceWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpaceWeatherPayload {
  status: 'LIVE' | 'DEGRADED' | 'CACHED' | 'UNAVAILABLE';
  cached?: boolean;
  source: string;
  fetched_utc?: string;
  kp_index?: number | null;
  kp_status?: string;
  kp_observed_utc?: string | null;
  f107_flux?: number | null;
  f107_observed_utc?: string | null;
  solar_wind_speed_km_s?: number | null;
  solar_wind_density_p_cm3?: number | null;
  solar_wind_observed_utc?: string | null;
  drag_multiplier?: number | null;
  errors?: string[];
}

export const SpaceWeatherModal: React.FC<SpaceWeatherModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SpaceWeatherPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaceWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSpaceWeather();
      setData(res);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Unable to query backend space weather endpoint.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSpaceWeather();
    }
  }, [isOpen, fetchSpaceWeather]);

  const statusConfig = (() => {
    const status = data?.status || (error ? 'UNAVAILABLE' : 'UNAVAILABLE');
    switch (status) {
      case 'LIVE':
        return {
          cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35',
          Icon: CheckCircle2,
          label: 'LIVE NOAA SWPC',
        };
      case 'DEGRADED':
        return {
          cls: 'bg-amber-500/10 text-amber-300 border-amber-500/35',
          Icon: AlertTriangle,
          label: 'PARTIAL FEED (DEGRADED)',
        };
      case 'CACHED':
        return {
          cls: 'bg-amber-500/10 text-amber-300 border-amber-500/35',
          Icon: AlertTriangle,
          label: 'CACHED FALLBACK (NOAA OFFLINE)',
        };
      default:
        return {
          cls: 'bg-red-500/10 text-red-300 border-red-500/35',
          Icon: AlertOctagon,
          label: 'FEED UNAVAILABLE',
        };
    }
  })();

  const StatusIcon = statusConfig.Icon;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="space-weather-title"
      maxWidthClass="max-w-2xl"
      className="bg-space-900 border border-space-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] font-mono text-slate-200"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-space-900 rounded-md border border-space-700 text-amber-400 shrink-0" aria-hidden="true">
            <Sun className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusConfig.cls}`}
              >
                <StatusIcon className="w-3 h-3" aria-hidden="true" />
                <span>{statusConfig.label}</span>
              </span>
              {data?.fetched_utc && (
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {formatUtcDateTime(data.fetched_utc, true)} UTC
                </span>
              )}
            </div>
            <h2 id="space-weather-title" className="text-sm sm:text-base font-semibold text-slate-100 mt-1 truncate">
              Space Weather &amp; Thermospheric Drag Telemetry
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchSpaceWeather}
            disabled={loading}
            aria-label="Refresh space weather telemetry"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-slate-100 rounded-md border border-space-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-400' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Space Weather dialog"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/35 rounded-md text-red-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={fetchSpaceWeather}
              className="px-2.5 py-1 rounded bg-space-950 border border-red-500/40 hover:bg-space-800 text-slate-200"
            >
              Retry
            </button>
          </div>
        )}

        {data?.errors && data.errors.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/35 rounded-md text-amber-200 text-[11px] space-y-1">
            <div className="font-semibold flex items-center gap-1.5 uppercase">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Partial Upstream Telemetry Warnings</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-300 font-sans">
              {data.errors.map((errMsg, i) => (
                <li key={i}>{errMsg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">Planetary Kp</span>
            <div className="text-xl font-semibold text-amber-300 mt-1 tabular-nums">
              {data?.kp_index != null ? data.kp_index.toFixed(2) : 'Unavailable'}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">0 - 9 Scale</span>
          </div>

          <div className="p-3 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">F10.7 Solar Flux</span>
            <div className="text-xl font-semibold text-slate-100 mt-1 tabular-nums">
              {data?.f107_flux != null ? `${data.f107_flux.toFixed(1)} sfu` : 'Unavailable'}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">2800 MHz Radio</span>
          </div>

          <div className="p-3 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">Solar Wind</span>
            <div className="text-xl font-semibold text-accent-400 mt-1 tabular-nums">
              {data?.solar_wind_speed_km_s != null
                ? `${data.solar_wind_speed_km_s.toFixed(0)} km/s`
                : 'Unavailable'}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {data?.solar_wind_density_p_cm3 != null
                ? `${data.solar_wind_density_p_cm3} p/cm³`
                : 'DSCOVR L1'}
            </span>
          </div>

          <div className="p-3 bg-space-950 rounded-md border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase block">LEO Drag Factor</span>
            <div className="text-xl font-semibold text-emerald-300 mt-1 tabular-nums">
              {data?.drag_multiplier != null ? `${data.drag_multiplier.toFixed(2)}x` : 'Unavailable'}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Model Multiplier</span>
          </div>
        </div>

        {/* Thermosphere & Drag Context */}
        <div className="p-4 bg-space-950 rounded-md border border-space-800 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-100 uppercase flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Thermospheric Drag Impact Assessment</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-space-900 text-slate-200 border border-space-700 font-semibold">
              {data?.kp_status || 'UNAVAILABLE'}
            </span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed font-sans">
            Elevated solar extreme ultraviolet (F10.7) irradiance and geomagnetic storms (Kp) heat Earth&apos;s
            thermosphere, increasing neutral atmospheric density between 200 km and 800 km altitude and
            accelerating orbital decay for high area-to-mass LEO objects.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 bg-space-900 rounded-md border border-space-800 flex items-center gap-2">
              <Wind className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" />
              <span className="text-slate-300">
                SGP4 Drag Term (B*):{' '}
                <strong className="text-slate-100">
                  {data?.drag_multiplier != null && data.drag_multiplier > 1.35
                    ? 'Elevated Perturbation'
                    : data?.drag_multiplier != null
                    ? 'Nominal Baseline'
                    : 'Unverified'}
                </strong>
              </span>
            </div>
            <div className="p-2.5 bg-space-900 rounded-md border border-space-800 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="text-slate-300">
                Source: <strong className="text-slate-100">{data?.source || 'NOAA SWPC'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};
