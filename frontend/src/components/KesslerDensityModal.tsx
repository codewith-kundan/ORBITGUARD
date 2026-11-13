import React, { useState, useEffect, useCallback } from 'react';
import { X, Layers, RefreshCw, AlertTriangle } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { SystemStatistics } from '../types';
import { api } from '../services/api';

interface DensityBin {
  altitude_range_km: string;
  min_alt_km: number;
  max_alt_km: number;
  count: number;
  satellites: number;
  debris: number;
  rocket_bodies: number;
}

interface KesslerDensityModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SystemStatistics | null;
}

export const KesslerDensityModal: React.FC<KesslerDensityModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  const [bins, setBins] = useState<DensityBin[]>([]);
  const [totalCatalogObjects, setTotalCatalogObjects] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDensity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDensityProfile();
      setBins(Array.isArray(res?.bins) ? res.bins : []);
      setTotalCatalogObjects(res?.total_catalog_objects ?? 0);
    } catch (e: any) {
      setBins([]);
      setError(e?.message || 'Unable to retrieve catalog altitude shell density.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDensity();
    }
  }, [isOpen, fetchDensity]);

  const maxBinCount = Math.max(1, ...bins.map((b) => b.count));
  const peakBin = bins.reduce<DensityBin | null>(
    (best, cur) => (!best || cur.count > best.count ? cur : best),
    null
  );

  const classifyCongestion = (count: number) => {
    const share = totalCatalogObjects > 0 ? count / totalCatalogObjects : 0;
    if (share >= 0.3) {
      return {
        label: 'DENSE',
        badgeCls: 'bg-red-500/15 text-red-300 border-red-500/40',
        barCls: 'bg-red-500',
      };
    }
    if (share >= 0.15) {
      return {
        label: 'MODERATE-HIGH',
        badgeCls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        barCls: 'bg-amber-400',
      };
    }
    if (count > 0) {
      return {
        label: 'NOMINAL',
        badgeCls: 'bg-sky-500/10 text-sky-300 border-sky-500/35',
        barCls: 'bg-sky-400',
      };
    }
    return {
      label: 'EMPTY',
      badgeCls: 'bg-space-900 text-slate-400 border-space-700',
      barCls: 'bg-slate-600',
    };
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="kessler-density-title"
      maxWidthClass="max-w-3xl"
      className="bg-space-900 border border-space-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] font-mono text-slate-200"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-space-900 rounded-md border border-space-700 text-accent-400 shrink-0" aria-hidden="true">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-sky-500/10 text-sky-300 rounded border border-sky-500/30">
                CATALOG SPATIAL DENSITY
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {(totalCatalogObjects || stats?.tracked_objects || 0).toLocaleString()} indexed objects
              </span>
            </div>
            <h2 id="kessler-density-title" className="text-sm sm:text-base font-semibold text-slate-100 mt-1 truncate">
              Altitude Shell Congestion &amp; Debris Distribution
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchDensity}
            disabled={loading}
            aria-label="Refresh altitude shell density"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-slate-100 rounded-md border border-space-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-400' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Shell Density dialog"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/35 rounded-md text-xs text-red-200 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={fetchDensity}
              className="px-2.5 py-1 rounded bg-space-950 border border-red-500/40 hover:bg-space-800 text-slate-200"
            >
              Retry
            </button>
          </div>
        )}

        {peakBin && peakBin.count > 0 && (
          <div className="p-3 bg-space-950 border border-space-800 rounded-md text-xs text-slate-300 font-sans">
            <strong className="text-slate-100">Peak Catalog Concentration:</strong>{' '}
            <span className="font-mono text-accent-400">{peakBin.altitude_range_km}</span> currently holds{' '}
            <span className="font-mono text-slate-100 tabular-nums">{peakBin.count.toLocaleString()}</span> tracked
            objects ({peakBin.satellites.toLocaleString()} payloads, {peakBin.debris.toLocaleString()} debris,{' '}
            {peakBin.rocket_bodies.toLocaleString()} rocket bodies).
          </div>
        )}

        {loading && bins.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading shell distribution from database...</div>
        ) : bins.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-space-950 border border-space-800 rounded-md">
            No catalog altitude shell density records available. Synchronize the catalog to compute shell density.
          </div>
        ) : (
          <div className="space-y-2.5">
            {bins.map((b) => {
              const tier = classifyCongestion(b.count);
              const barWidth = b.count > 0 ? Math.max(2, (b.count / maxBinCount) * 100) : 0;
              return (
                <div key={b.altitude_range_km} className="p-3 bg-space-950 rounded-md border border-space-800 space-y-2">
                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100">{b.altitude_range_km}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-[11px] text-slate-400">
                        SAT {b.satellites} / DEB {b.debris} / RKT {b.rocket_bodies}
                      </span>
                      <span className="text-slate-200 font-semibold">{b.count.toLocaleString()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${tier.badgeCls}`}>
                        {tier.label}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-space-900 h-2 rounded-full overflow-hidden border border-space-800">
                    <div className={`h-full ${tier.barCls}`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
