import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  HelpCircle,
  Satellite,
  Search,
  Trash2,
} from 'lucide-react';
import { ObjectType, OrbitalObject } from '../types';
import { api } from '../services/api';

interface ObjectTableProps {
  onSelectObject: (obj: OrbitalObject) => void;
  selectedObject: OrbitalObject | null;
  onOpenDetails?: (obj: OrbitalObject) => void;
}

export const ObjectTable: React.FC<ObjectTableProps> = ({
  onSelectObject,
  selectedObject,
  onOpenDetails,
}) => {
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('norad_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getPaginatedObjects(
        page,
        pageSize,
        search.trim() ? search.trim() : undefined,
        typeFilter !== 'ALL' ? typeFilter : undefined,
        sortBy,
        sortOrder
      );
      setObjects(res.items);
      setTotalPages(Math.max(1, res.total_pages || 1));
      setTotalItems(res.total || 0);
    } catch (err: any) {
      setObjects([]);
      setErrorMessage(err?.message || 'Unable to load orbital catalog records.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, sortBy, sortOrder]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      fetchObjects();
    }, 200);
    return () => window.clearTimeout(handler);
  }, [fetchObjects]);

  const handleSort = (column: string) => {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getAriaSort = (column: string): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== column) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
    );
  };

  const renderTypeBadge = (type: ObjectType) => {
    switch (type) {
      case 'ACTIVE_SATELLITE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-sky-400/35 bg-sky-500/12 text-sky-300 text-[11px] font-mono">
            <Satellite className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Payload</span>
          </span>
        );
      case 'DEBRIS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-500/35 bg-red-500/12 text-red-300 text-[11px] font-mono">
            <Trash2 className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Debris</span>
          </span>
        );
      case 'ROCKET_BODY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/35 bg-amber-500/12 text-amber-300 text-[11px] font-mono">
            <Flame className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Rocket Body</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-space-700 bg-space-800 text-slate-300 text-[11px] font-mono">
            <HelpCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Unknown</span>
          </span>
        );
    }
  };

  const columns = [
    { key: 'norad_id', label: 'NORAD ID', align: 'left' as const },
    { key: 'name', label: 'Object Name', align: 'left' as const },
    { key: 'object_type', label: 'Classification', align: 'left' as const },
    { key: 'inclination', label: 'Inclination', align: 'right' as const },
    { key: 'perigee_km', label: 'Perigee / Apogee', align: 'right' as const },
    { key: 'period_minutes', label: 'Period', align: 'right' as const },
  ];

  return (
    <section
      aria-label="Orbital catalog workspace"
      className="bg-space-900 border border-space-800 rounded-xl overflow-hidden flex flex-col font-mono"
    >
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4 bg-space-950/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg border border-space-700 bg-space-900 flex items-center justify-center text-sky-400 shrink-0">
            <Satellite className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-slate-100 font-sans">
                Resident Space Object Catalog
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded border border-space-700 bg-space-900 text-sky-300 tabular-nums">
                {totalItems.toLocaleString()} objects
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Keplerian elements and TLE orbital regimes maintained in the SGP4 database
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter */}
          <div
            role="group"
            aria-label="Filter objects by classification"
            className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-800 text-xs"
          >
            {[
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE_SATELLITE', label: 'Payloads' },
              { key: 'DEBRIS', label: 'Debris' },
              { key: 'ROCKET_BODY', label: 'Rockets' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setTypeFilter(tab.key);
                  setPage(1);
                }}
                aria-pressed={typeFilter === tab.key}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
                  typeFilter === tab.key
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/35 font-medium'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <label htmlFor="catalog-search-input" className="sr-only">
              Search catalog by object name or NORAD ID
            </label>
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="catalog-search-input"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or NORAD..."
              className="w-56 sm:w-64 pl-8 pr-3 py-1.5 rounded-lg border border-space-800 bg-space-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400/60"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div
          role="alert"
          className="px-5 py-3 border-b border-red-500/35 bg-red-950/30 flex items-center justify-between gap-3 text-xs text-red-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchObjects}
            className="px-2.5 py-1 rounded border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 text-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Semantic Data Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <caption className="sr-only">
            Cataloged orbital objects with sortable NORAD identifier, object name, classification,
            inclination, apogee/perigee altitude, and orbital period.
          </caption>
          <thead>
            <tr className="bg-space-950/90 border-b border-space-800 text-slate-400 text-[11px] uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={getAriaSort(col.key)}
                  className={`py-2.5 px-4 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={`inline-flex items-center gap-1.5 hover:text-slate-100 transition-colors ${
                      col.align === 'right' ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    <span>{col.label}</span>
                    {renderSortIcon(col.key)}
                  </button>
                </th>
              ))}
              <th scope="col" className="py-2.5 px-4 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-space-800/70">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-300">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Activity className="w-5 h-5 animate-spin text-sky-400" aria-hidden="true" />
                    <span>Querying orbital catalog...</span>
                  </div>
                </td>
              </tr>
            ) : objects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  No cataloged objects match the active filter.
                </td>
              </tr>
            ) : (
              objects.map((obj) => {
                const isSelected =
                  selectedObject?.id === obj.id || selectedObject?.norad_id === obj.norad_id;
                const inclination = obj.inclination ?? (obj as any).inclination_deg;
                const period = obj.period_minutes ?? (obj as any).period_min;

                return (
                  <tr
                    key={obj.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-sky-500/12 text-white' : 'hover:bg-space-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-sky-300 tabular-nums whitespace-nowrap">
                      #{obj.norad_id}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-100">
                      <button
                        type="button"
                        onClick={() => onSelectObject(obj)}
                        className="text-left hover:text-sky-300 transition-colors"
                      >
                        {obj.name}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {renderTypeBadge(obj.object_type)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-200 tabular-nums whitespace-nowrap">
                      {inclination != null ? `${inclination.toFixed(2)}°` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums whitespace-nowrap">
                      {obj.perigee_km != null && obj.apogee_km != null
                        ? `${obj.perigee_km.toFixed(0)} – ${obj.apogee_km.toFixed(0)} km`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums whitespace-nowrap">
                      {period != null ? `${period.toFixed(1)} min` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectObject(obj);
                          onOpenDetails?.(obj);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-space-700 bg-space-950 hover:bg-space-800 text-slate-200 hover:text-sky-300 text-[11px] transition-colors"
                      >
                        <Eye className="w-3 h-3 text-sky-400" aria-hidden="true" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="px-4 py-3 border-t border-space-800 bg-space-950/80 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
        <div className="text-slate-400">
          {totalItems > 0 ? (
            <>
              Showing{' '}
              <span className="text-slate-100 font-medium">
                {Math.min(totalItems, (page - 1) * pageSize + 1)}
              </span>
              –
              <span className="text-slate-100 font-medium">
                {Math.min(totalItems, page * pageSize)}
              </span>{' '}
              of <span className="text-sky-300 font-medium">{totalItems.toLocaleString()}</span>
            </>
          ) : (
            <span>0 objects</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Prev</span>
          </button>

          <span className="px-2.5 py-1 rounded border border-space-800 bg-space-950 text-slate-200">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
