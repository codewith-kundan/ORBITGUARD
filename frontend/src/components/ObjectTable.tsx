import React, { useState, useEffect } from 'react';
import { OrbitalObject, ObjectType } from '../types';
import { api } from '../services/api';
import { Search, Satellite, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, Flame, Eye, Activity } from 'lucide-react';

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
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('norad_id');
  const [sortOrder, setSortOrder] = useState<string>('asc');

  const fetchObjects = async () => {
    setLoading(true);
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
      setTotalPages(res.total_pages);
      setTotalItems(res.total);
    } catch (err) {
      console.error('Failed to load orbital objects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, [page, typeFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchObjects();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getTypeBadge = (type: ObjectType) => {
    switch (type) {
      case 'ACTIVE_SATELLITE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/15 text-cyan-neon border border-cyan-500/30 flex items-center gap-1 w-fit">
            <Satellite className="w-3 h-3" /> Payload
          </span>
        );
      case 'DEBRIS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-danger-500/15 text-danger-neon border border-danger-500/30 flex items-center gap-1 w-fit">
            <Trash2 className="w-3 h-3" /> Debris
          </span>
        );
      case 'ROCKET_BODY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-warning-500/15 text-warning-neon border border-warning-500/30 flex items-center gap-1 w-fit">
            <Flame className="w-3 h-3" /> Rocket Body
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700 w-fit">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="bg-space-900/90 border border-space-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-neon">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-wider flex items-center gap-2">
                <span>ORBITAL CATALOG & EPHEMERIS DATABASE</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {totalItems.toLocaleString()} ASSETS
                </span>
              </h2>
              <p className="text-xs text-slate-400">Live Space-Track / 18th Space Defense Squadron Tracked Objects</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Fleet Filter Tabs */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE_SATELLITE', label: 'Payloads' },
              { key: 'DEBRIS', label: 'Debris' },
              { key: 'ROCKET_BODY', label: 'Rockets' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setTypeFilter(tab.key); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  typeFilter === tab.key
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search Name or NORAD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-space-950 border border-space-700 rounded-xl px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 shadow-inner"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="overflow-x-auto min-h-[460px]">
        <table className="w-full text-left text-xs">
          <thead className="bg-space-950/90 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-space-800">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('norad_id')}>
                <div className="flex items-center gap-1">
                  <span>NORAD ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  <span>Name / Mission</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Classification</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('inclination')}>
                <div className="flex items-center gap-1">
                  <span>Inclination</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('perigee_km')}>
                <div className="flex items-center gap-1">
                  <span>Perigee / Apogee</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('period_minutes')}>
                <div className="flex items-center gap-1">
                  <span>Period</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-cyan-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Activity className="w-6 h-6 animate-spin text-cyan-neon" />
                    <span>Loading orbital catalog records...</span>
                  </div>
                </td>
              </tr>
            ) : objects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500">
                  No orbital objects found matching the search criteria.
                </td>
              </tr>
            ) : (
              objects.map((obj) => {
                const isSelected = selectedObject?.id === obj.id || selectedObject?.norad_id === obj.norad_id;
                const inclination = obj.inclination ?? (obj as any).inclination_deg;
                const period = obj.period_minutes ?? (obj as any).period_min;

                return (
                  <tr
                    key={obj.id}
                    onClick={() => onSelectObject(obj)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-cyan-500/15 text-white'
                        : 'hover:bg-space-850/60 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-cyan-neon">
                      #{obj.norad_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{obj.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(obj.object_type)}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {inclination != null ? `${inclination.toFixed(2)}°` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {obj.perigee_km != null && obj.apogee_km != null
                        ? `${obj.perigee_km.toFixed(0)} - ${obj.apogee_km.toFixed(0)} km`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {period != null ? `${period.toFixed(1)} min` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectObject(obj);
                          onOpenDetails?.(obj);
                        }}
                        className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-neon border border-cyan-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>INSPECT</span>
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
      <div className="p-4 border-t border-space-800 bg-space-950/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="text-slate-400">
          Showing <span className="text-white font-bold">{Math.min(totalItems, (page - 1) * pageSize + 1)}</span> to{' '}
          <span className="text-white font-bold">{Math.min(totalItems, page * pageSize)}</span> of{' '}
          <span className="text-cyan-neon font-bold">{totalItems.toLocaleString()}</span> assets
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-space-900 hover:bg-space-800 text-slate-300 border border-space-700 rounded-lg disabled:opacity-40 transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <span className="px-3 py-1.5 bg-space-900 border border-space-700 rounded-lg text-cyan-neon font-bold">
            {page} / {totalPages || 1}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-space-900 hover:bg-space-800 text-slate-300 border border-space-700 rounded-lg disabled:opacity-40 transition flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
