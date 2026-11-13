import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Rocket,
  Flame,
  Clock,
  RefreshCw,
  Calendar,
  Layers,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { DecayWatchlistItem } from '../types';
import { ModalDialog } from './ModalDialog';
import { formatUtcDateTime, parseUtcDate } from '../utils/utcTime';

interface LaunchRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LaunchEvent {
  id: string;
  name: string;
  vehicle: string;
  site: string;
  launchTimeUtc: string;
  targetOrbit: string;
  status: string;
  missionDescription: string;
  image?: string;
  _netMs?: number;
}

export const LaunchRadarModal: React.FC<LaunchRadarModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'launches' | 'reentries'>('launches');
  const [rawLaunches, setRawLaunches] = useState<LaunchEvent[]>([]);
  const [decayWatchlist, setDecayWatchlist] = useState<DecayWatchlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDecay, setLoadingDecay] = useState<boolean>(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [decayError, setDecayError] = useState<string | null>(null);
  const [feedSource, setFeedSource] = useState<string>('Launch Library 2');
  const [feedCached, setFeedCached] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchLaunches = useCallback(async () => {
    try {
      setLoading(true);
      setLaunchError(null);
      const res = await api.getUpcomingLaunches();
      if (res?.status === 'UNAVAILABLE') {
        setRawLaunches([]);
        setFeedCached(false);
        setFeedSource(res.source || 'Launch Feed Unavailable');
        setLaunchError(res.error || 'Launch Library 2 upstream feed is currently unreachable.');
        return;
      }
      if (res?.launches) {
        const parsed = res.launches.map((l: any) => ({
          ...l,
          _netMs: parseUtcDate(l.launchTimeUtc)?.getTime() ?? NaN,
        }));
        setRawLaunches(parsed);
        setFeedCached(Boolean(res.cached || res.status === 'CACHED'));
        setFeedSource(res.source || 'Launch Library 2');
      } else {
        setFeedCached(false);
        setRawLaunches([]);
      }
    } catch (err: any) {
      setRawLaunches([]);
      setLaunchError(err?.message || 'Unable to retrieve upcoming launch manifest.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDecayWatchlist = useCallback(async () => {
    try {
      setLoadingDecay(true);
      setDecayError(null);
      const res = await api.getDecayWatchlist(180.0);
      setDecayWatchlist(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setDecayWatchlist([]);
      setDecayError(err?.message || 'Unable to compute low-perigee re-entry watchlist.');
    } finally {
      setLoadingDecay(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLaunches();
      fetchDecayWatchlist();
    }
  }, [isOpen, fetchLaunches, fetchDecayWatchlist]);

  const upcomingLaunches = rawLaunches
    .filter((l) => {
      const net = l._netMs ?? parseUtcDate(l.launchTimeUtc)?.getTime() ?? NaN;
      return !Number.isNaN(net) && net + 30 * 60 * 1000 > nowMs;
    })
    .sort((a, b) => (a._netMs ?? 0) - (b._netMs ?? 0));

  const formatCountdown = (dateStr: string): string => {
    const parsed = parseUtcDate(dateStr);
    if (!parsed) return 'SCHEDULED';
    const diffMs = parsed.getTime() - nowMs;
    if (diffMs <= 0 && diffMs > -1800000) return 'IN WINDOW';
    if (diffMs <= -1800000) return 'COMPLETED';

    const days = Math.floor(diffMs / (86400 * 1000));
    const hours = Math.floor((diffMs % (86400 * 1000)) / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    const secs = Math.floor((diffMs % (60 * 1000)) / 1000);

    if (days > 0) {
      return `T-${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
    }
    return `T-${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="launch-radar-title"
      maxWidthClass="max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/35 text-sky-400 shrink-0">
            <Rocket className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="launch-radar-title" className="text-base sm:text-lg font-semibold text-slate-100">
                Launch Manifest & Re-Entry Watchlist
              </h2>
              <span
                className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                  launchError || feedCached
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                }`}
              >
                {feedSource}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upcoming orbital launch windows paired with low-perigee atmospheric decay predictions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchLaunches();
              fetchDecayWatchlist();
            }}
            disabled={loading || loadingDecay}
            aria-label="Refresh launch manifest and re-entry watchlist"
            className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading || loadingDecay ? 'animate-spin text-sky-400' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close launch and re-entry radar dialog"
            className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Launch and decay views"
        className="flex items-center gap-2 px-5 pt-2.5 bg-space-950/70 border-b border-space-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'launches'}
          onClick={() => setActiveTab('launches')}
          className={`pb-2.5 px-3 text-xs font-medium inline-flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'launches'
              ? 'border-sky-400 text-sky-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Upcoming Launches ({upcomingLaunches.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reentries'}
          onClick={() => setActiveTab('reentries')}
          className={`pb-2.5 px-3 text-xs font-medium inline-flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'reentries'
              ? 'border-amber-400 text-amber-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Re-Entry Watchlist ({decayWatchlist.length})</span>
        </button>
      </div>

      {/* Body */}
      <div className="p-5 overflow-y-auto flex-1 space-y-3">
        {activeTab === 'launches' ? (
          loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" aria-hidden="true" />
              <span>Fetching upcoming orbital launch manifest...</span>
            </div>
          ) : launchError ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/35 text-xs text-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-semibold">Launch Manifest Feed Unavailable</div>
                  <div className="text-amber-300/90 mt-0.5">{launchError}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLaunches}
                className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-100 font-medium shrink-0"
              >
                Retry
              </button>
            </div>
          ) : upcomingLaunches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-space-950 rounded-lg border border-space-800">
              No scheduled upcoming missions fall within the active Launch Library manifest window.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingLaunches.map((lch) => (
                <div
                  key={lch.id}
                  className="p-4 bg-space-950 rounded-lg border border-space-800 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100">{lch.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-space-900 border border-space-700 text-slate-300">
                        {lch.vehicle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/35 text-sky-300 inline-flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatCountdown(lch.launchTimeUtc)}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                          lch.status.includes('GO')
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/35'
                        }`}
                      >
                        {lch.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{lch.missionDescription}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-space-800 text-xs">
                    <div className="flex items-start gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                          NET Window
                        </span>
                        <span className="font-mono text-slate-200 tabular-nums">
                          {formatUtcDateTime(lch.launchTimeUtc)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                          Target Orbit
                        </span>
                        <span className="text-slate-200">{lch.targetOrbit}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                          Launch Site
                        </span>
                        <span className="text-slate-200 truncate block" title={lch.site}>
                          {lch.site}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loadingDecay ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" aria-hidden="true" />
            <span>Evaluating King-Hele atmospheric lifetime for low-perigee objects...</span>
          </div>
        ) : decayError ? (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/35 text-xs text-red-200 flex items-center justify-between gap-3">
            <span>{decayError}</span>
            <button
              type="button"
              onClick={fetchDecayWatchlist}
              className="px-3 py-1.5 rounded bg-red-500/20 border border-red-500/40 text-red-100 font-medium shrink-0"
            >
              Retry
            </button>
          </div>
        ) : decayWatchlist.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-space-950 rounded-lg border border-space-800">
            No cataloged objects currently meet the 180-day re-entry threshold.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-space-950 border border-space-800 rounded-lg text-xs text-slate-300">
              Orbital lifetime estimates computed using King-Hele analytical drag decay driven by
              current B* ballistic coefficients and atmospheric scale height.
            </div>

            {decayWatchlist.map((dec) => (
              <div
                key={dec.norad_id}
                className="p-4 bg-space-950 rounded-lg border border-space-800 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100">{dec.object_name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-space-900 border border-space-700 text-slate-300 tabular-nums">
                      NORAD #{dec.norad_id}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-space-900 border border-space-800 text-slate-400">
                      {dec.object_type}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded border ${
                      dec.risk_level === 'CRITICAL'
                        ? 'bg-red-500/10 text-red-300 border-red-500/35'
                        : dec.risk_level === 'HIGH'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/35'
                        : 'bg-space-800 text-slate-300 border-space-700'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    {dec.risk_level} Re-Entry Risk
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-space-800 text-xs font-mono tabular-nums">
                  <div>
                    <span className="block font-sans text-[10px] uppercase text-slate-500">
                      Est. Lifetime
                    </span>
                    <span className="text-amber-300 font-semibold">
                      {dec.estimated_lifetime_days < 1
                        ? `${Math.round(dec.estimated_lifetime_days * 24)} hrs`
                        : `${dec.estimated_lifetime_days.toFixed(1)} days`}
                    </span>
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] uppercase text-slate-500">
                      Perigee
                    </span>
                    <span className="text-red-300 font-semibold">{dec.perigee_km.toFixed(1)} km</span>
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] uppercase text-slate-500">
                      Apogee
                    </span>
                    <span className="text-sky-300 font-semibold">{dec.apogee_km.toFixed(1)} km</span>
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] uppercase text-slate-500">
                      Predicted Decay (UTC)
                    </span>
                    <span className="text-slate-200">
                      {formatUtcDateTime(dec.predicted_reentry_time, true)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
