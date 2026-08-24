import React, { useState } from 'react';
import { OrbitalObject, ObjectType } from '../types';
import { Search, Satellite, Eye } from 'lucide-react';

interface ObjectTableProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  onSelectObject: (obj: OrbitalObject) => void;
}

export const ObjectTable: React.FC<ObjectTableProps> = ({
  objects,
  selectedObject,
  onSelectObject
}) => {
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = objects.filter((obj) => {
    const matchesSearch =
      obj.name.toLowerCase().includes(search.toLowerCase()) ||
      obj.norad_id.toString().includes(search);
    const matchesType = filterType === 'all' || obj.object_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: ObjectType) => {
    switch (type) {
      case 'debris':
        return 'bg-danger-500/20 text-danger-neon border-danger-500/30';
      case 'rocket_body':
        return 'bg-warning-500/20 text-warning-neon border-warning-500/30';
      case 'satellite':
      default:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="bg-space-900/80 border border-space-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-space-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
            Tracked Orbital Catalog
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-space-800 text-cyan-400 border border-space-700">
            {filtered.length} Objects
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Name or NORAD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-space-950 border border-space-700 text-xs font-mono rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition w-56"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-700 text-xs font-mono">
            {['all', 'satellite', 'debris', 'rocket_body'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded capitalize transition ${
                  filterType === t
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-space-950/80 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-space-800">
            <tr>
              <th className="py-3 px-4">NORAD ID</th>
              <th className="py-3 px-4">Object Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Perigee</th>
              <th className="py-3 px-4">Apogee</th>
              <th className="py-3 px-4">Inclination</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No orbital objects matching search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((obj) => {
                const isSelected = selectedObject?.norad_id === obj.norad_id;
                return (
                  <tr
                    key={obj.norad_id}
                    onClick={() => onSelectObject(obj)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-cyan-500/15 text-white'
                        : 'hover:bg-space-850/60 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-400">#{obj.norad_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{obj.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded border uppercase text-[10px] ${getTypeBadge(obj.object_type)}`}>
                        {obj.object_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {obj.perigee_km !== null && obj.perigee_km !== undefined ? `${obj.perigee_km.toFixed(1)} km` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {obj.apogee_km !== null && obj.apogee_km !== undefined ? `${obj.apogee_km.toFixed(1)} km` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {obj.inclination_deg !== null && obj.inclination_deg !== undefined ? `${obj.inclination_deg.toFixed(2)}°` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {obj.period_min !== null && obj.period_min !== undefined ? `${obj.period_min.toFixed(1)} min` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1 rounded bg-space-800 hover:bg-space-700 text-cyan-400 hover:text-cyan-neon border border-space-700">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
