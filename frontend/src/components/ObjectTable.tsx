import React, { useState, useEffect } from 'react';
import { OrbitalObject, ObjectType } from '../types';
import { api } from '../services/api';
import { Search, Satellite, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface ObjectTableProps {
  onSelectObject: (obj: OrbitalObject) => void;
  selectedObject: OrbitalObject | null;
}

export const ObjectTable: React.FC<ObjectTableProps> = ({
  onSelectObject,
  selectedObject,
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
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Satellite</span>;
      case 'DEBRIS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-danger-500/10 text-danger-400 border border-danger-500/30">Debris</span>;
      case 'ROCKET_BODY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-warning-500/10 text-warning-400 border border-warning-500/30">Rocket Body</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-700/50 text-slate-400 border border-slate-600">Unknown</span>;
    }
  };

  return (
    <div className="bg-space-900 border border-space-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-space-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-cyan-neon" />
          <h2 className="font-bold text-base text-white tracking-wide">ORBITAL OBJECT CATALOG</h2>
          <span className="text-xs font-mono text-slate-400">({totalItems.toLocaleString()} tracked)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search by Name / NORAD ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-space-950 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-700 text-xs font-mono">
            {['ALL', 'ACTIVE_SATELLITE', 'DEBRIS', 'ROCKET_BODY'].map((type) => (
              <button
                key={type}
                onClick={() => { setTypeFilter(type); setPage(1); }}
                className={`px-2.5 py-1 rounded transition ${
                  typeFilter === type
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'ALL' ? 'All' : type === 'ACTIVE_SATELLITE' ? 'Satellites' : type === 'DEBRIS' ? 'Debris' : 'Rocket Bodies'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-space-950 text-slate-400 uppercase border-b border-space-800">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-400" onClick={() => handleSort('norad_id')}>
                <div className="flex items-center gap-1">
                  <span>NORAD</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-400" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  <span>Object Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-400" onClick={() => handleSort('inclination')}>
                <div className="flex items-center gap-1">
                  <span>Inclination</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-400" onClick={() => handleSort('period_minutes')}>
                <div className="flex items-center gap-1">
                  <span>Period</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Perigee / Apogee</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                  Loading orbital catalog records...
                </td>
              </tr>
            ) : objects.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                  No orbital objects found matching query.
                </td>
              </tr>
            ) : (
              objects.map((obj) => {
                const isSelected = selectedObject?.norad_id === obj.norad_id;
                const inclination = obj.inclination ?? (obj as any).inclination_deg;
                const period = obj.period_minutes ?? (obj as any).period_min;

                return (
                  <tr
                    key={obj.norad_id}
                    onClick={() => onSelectObject(obj)}
                    className={`cursor-pointer transition hover:bg-space-850 ${
                      isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white">{obj.norad_id}</td>
                    <td className="py-3 px-4 font-semibold text-cyan-300">{obj.name}</td>
                    <td className="py-3 px-4">{getTypeBadge(obj.object_type)}</td>
                    <td className="py-3 px-4">{inclination != null ? `${inclination.toFixed(2)}°` : 'N/A'}</td>
                    <td className="py-3 px-4">{period != null ? `${period.toFixed(1)} min` : 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {obj.perigee_km && obj.apogee_km ? `${obj.perigee_km.toFixed(0)} - ${obj.apogee_km.toFixed(0)} km` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 text-[11px]">{obj.source}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectObject(obj);
                        }}
                        className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-neon border border-cyan-500/40 rounded text-[11px] font-bold"
                      >
                        TELEMETRY
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-space-800 flex items-center justify-between font-mono text-xs text-slate-400">
        <div>
          Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-space-950 hover:bg-space-850 rounded border border-space-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 bg-space-950 hover:bg-space-850 rounded border border-space-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
