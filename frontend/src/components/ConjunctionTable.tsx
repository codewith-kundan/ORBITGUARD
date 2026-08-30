import React, { useState, useEffect, useMemo } from 'react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { 
  ShieldAlert, 
  Crosshair, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  ArrowRightLeft, 
  Clock, 
  Play, 
  AlertCircle
} from 'lucide-react';

const parseUtcDate = (dStr: string): number => {
  if (!dStr) return Date.now();
  let s = dStr.trim();
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (!s.endsWith('Z') && !s.includes('+')) {
    s += 'Z';
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? Date.now() : t;
};

const formatTcaCountdown = (tcaMs: number, nowMs: number) => {
  const diffMs = tcaMs - nowMs;
  if (diffMs <= 0) return 'PASSED TCA';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getMissDistanceColor = (km: number) => {
  if (km < 5) return 'text-red-400 font-bold';
  if (km < 25) return 'text-amber-400 font-bold';
  return 'text-cyan-400 font-semibold';
};

interface ConjunctionTableProps {
  conjunctions: Conjunction[];
  selectedConjunction: Conjunction | null;
  onSelectConjunction: (conj: Conjunction) => void;
  onFocus3D?: (conj: Conjunction) => void;
  onGroundTrack2D?: (conj: Conjunction) => void;
  onOpenReplay?: (conj: Conjunction) => void;
  onOpenCAM?: (conj: Conjunction) => void;
  onOpenCDM?: (conj: Conjunction) => void;
  onScreenNew?: () => void;
  isScreening?: boolean;
}

export const ConjunctionTable: React.FC<ConjunctionTableProps> = ({
  conjunctions,
  selectedConjunction,
  onSelectConjunction,
  onFocus3D,
  onGroundTrack2D,
  onOpenReplay,
  onOpenCAM: _onOpenCAM,
  onOpenCDM: _onOpenCDM,
  onScreenNew,
  isScreening
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [horizonFilter, setHorizonFilter] = useState<'ALL' | '6H' | '24H' | '72H'>('ALL');
  const [objectPairFilter, setObjectPairFilter] = useState<'ALL' | 'SAT_DEBRIS' | 'SAT_SAT' | 'ROCKET'>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'tca' | 'distance' | 'probability'>('risk');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  // Dynamic 1-second interval keeps countdown live
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredConjunctions = useMemo(() => {
    return conjunctions
      .map(c => ({
        ...c,
        _tcaMs: parseUtcDate(c.tca)
      }))
      .filter(c => {
        // Keep events visible during monitoring
        if (c._tcaMs <= currentTimeMs - 30 * 60 * 1000) return false;

        // Risk Filter
        if (riskFilter !== 'ALL' && c.risk_level !== riskFilter) return false;

        // Horizon Filter
        const diffHours = (c._tcaMs - currentTimeMs) / (1000 * 3600);
        if (horizonFilter === '6H' && diffHours > 6.0) return false;
        if (horizonFilter === '24H' && diffHours > 24.0) return false;
        if (horizonFilter === '72H' && diffHours > 72.0) return false;

        // Object Pair Type Filter
        const typeA = c.object_a?.object_type || '';
        const typeB = c.object_b?.object_type || '';
        if (objectPairFilter === 'SAT_DEBRIS') {
          const hasSat = typeA === 'ACTIVE_SATELLITE' || typeB === 'ACTIVE_SATELLITE';
          const hasDeb = typeA === 'DEBRIS' || typeB === 'DEBRIS';
          if (!hasSat || !hasDeb) return false;
        } else if (objectPairFilter === 'SAT_SAT') {
          if (typeA !== 'ACTIVE_SATELLITE' || typeB !== 'ACTIVE_SATELLITE') return false;
        } else if (objectPairFilter === 'ROCKET') {
          if (typeA !== 'ROCKET_BODY' && typeB !== 'ROCKET_BODY') return false;
        }

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameA = (c.object_a?.name || '').toLowerCase();
          const nameB = (c.object_b?.name || '').toLowerCase();
          const idA = (c.object_a?.norad_id || c.object_a_id || '').toString();
          const idB = (c.object_b?.norad_id || c.object_b_id || '').toString();
          if (!nameA.includes(q) && !nameB.includes(q) && !idA.includes(q) && !idB.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk') return b.risk_score - a.risk_score;
        if (sortBy === 'tca') return a._tcaMs - b._tcaMs;
        if (sortBy === 'distance') return a.miss_distance_km - b.miss_distance_km;
        if (sortBy === 'probability') return (b.collision_probability || 0) - (a.collision_probability || 0);
        return 0;
      });
  }, [conjunctions, riskFilter, horizonFilter, objectPairFilter, sortBy, searchQuery, currentTimeMs]);

  const formatTCA = (tcaMs: number) => {
    const d = new Date(tcaMs);
    const diffMs = tcaMs - currentTimeMs;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
    if (diffMs > 0) {
      return { timeFormatted, countdown: `in ${diffHours}h ${diffMins}m` };
    }
    return { timeFormatted, countdown: 'Passed TCA' };
  };

  return (
    <div className="bg-space-900/90 border border-space-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono text-slate-200">
      {/* Top Header & Screening Bar */}
      <div className="p-4 sm:p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-neon">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-danger-500/20 text-danger-neon border border-danger-500/30">
                CONJUNCTION CENTER & RISK MATRIX
              </span>
              <span className="text-xs text-cyan-300 font-semibold">
                {filteredConjunctions.length} Matches Found
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
              Orbital Conjunction Screening & Close Encounter Assessment
            </h2>
          </div>
        </div>

        {/* View Toggle & Run Screening Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-cyan-500 text-space-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Matrix View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-cyan-500 text-space-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Table Grid View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {onScreenNew && (
            <button
              onClick={onScreenNew}
              disabled={isScreening}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`} />
              <span>{isScreening ? 'SCREENING...' : 'RUN SCREENING'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Filter & Search Dock */}
      <div className="p-3 sm:p-4 bg-space-950/70 border-b border-space-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder="Filter by name or NORAD (e.g. Starlink, Cosmos, 25544)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-space-900 border border-space-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-full sm:w-64"
          />
        </div>

        {/* Risk Level Toggles */}
        <div className="flex items-center gap-1 bg-space-900 p-1 rounded-xl border border-space-800 overflow-x-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-2.5 py-1 rounded-lg transition font-bold text-[11px] whitespace-nowrap ${
                riskFilter === lvl
                  ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Horizon Filter */}
        <div className="flex items-center gap-1 bg-space-900 p-1 rounded-xl border border-space-800 text-xs">
          <span className="text-[10px] text-slate-500 px-1 uppercase font-bold">HORIZON:</span>
          {(['ALL', '6H', '24H', '72H'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizonFilter(h)}
              className={`px-2 py-0.5 rounded font-semibold text-[10px] transition ${
                horizonFilter === h ? 'bg-cyan-500 text-space-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {h}
            </button>
          ))}
        </div>

        {/* Object Pair Filter */}
        <div className="flex items-center gap-1 bg-space-900 p-1 rounded-xl border border-space-800 text-xs hidden xl:flex">
          <span className="text-[10px] text-slate-500 px-1 uppercase font-bold">PAIR:</span>
          {([
            { id: 'ALL', label: 'All Pairs' },
            { id: 'SAT_DEBRIS', label: 'Sat ↔ Debris' },
            { id: 'SAT_SAT', label: 'Sat ↔ Sat' },
            { id: 'ROCKET', label: 'Rocket Bodies' }
          ] as const).map((p) => (
            <button
              key={p.id}
              onClick={() => setObjectPairFilter(p.id)}
              className={`px-2 py-0.5 rounded font-semibold text-[10px] transition ${
                objectPairFilter === p.id ? 'bg-cyan-500 text-space-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[10px] text-slate-500 uppercase font-bold">SORT:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-space-900 border border-space-800 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="risk">Risk Score (Desc)</option>
            <option value="tca">TCA Chronological</option>
            <option value="distance">Miss Distance (Asc)</option>
            <option value="probability">Collision Probability</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4">
        {filteredConjunctions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
            <p className="font-bold text-sm text-slate-400">No active conjunctions matching current filter criteria.</p>
            <p className="text-xs text-slate-500">Try adjusting the risk filter or expanding the prediction horizon.</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards Grid Matrix */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredConjunctions.map((c) => {
              const nameA = c.object_a?.name || `ID-${c.object_a_id}`;
              const nameB = c.object_b?.name || `ID-${c.object_b_id}`;
              const noradA = c.object_a?.norad_id || c.object_a_id;
              const noradB = c.object_b?.norad_id || c.object_b_id;
              const { timeFormatted, countdown } = formatTCA(c._tcaMs);
              const isSelected = selectedConjunction?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectConjunction(c)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 shadow-lg ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'bg-space-950/80 hover:bg-space-900 border-space-800 hover:border-space-700'
                  }`}
                >
                  {/* Card Header: Risk Badge & Countdown */}
                  <div className="flex items-center justify-between gap-2 border-b border-space-800/80 pb-2.5">
                    <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                    <div className="text-right">
                      <span className="text-[10px] text-amber-400 font-extrabold flex items-center gap-1 justify-end">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTcaCountdown(c._tcaMs, currentTimeMs)}
                      </span>
                      <span className="text-[9px] text-slate-500 block">{countdown} ({timeFormatted})</span>
                    </div>
                  </div>

                  {/* Encounter Pair */}
                  <div className="space-y-1.5 my-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300 truncate">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span className="truncate">{nameA}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">#{noradA}</span>
                    </div>

                    <div className="flex items-center justify-center my-0.5 text-slate-600">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-red-400 truncate">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="truncate">{nameB}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">#{noradB}</span>
                    </div>
                  </div>

                  {/* Telemetry Strip */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-space-900 rounded-xl border border-space-800 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 block">MISS DIST</span>
                      <span className={`font-bold ${getMissDistanceColor(c.miss_distance_km)}`}>
                        {c.miss_distance_km.toFixed(2)} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">REL VEL</span>
                      <span className="font-bold text-slate-200">{c.relative_velocity_km_s.toFixed(1)} km/s</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">EST PC</span>
                      <span className="font-bold text-amber-300">
                        {c.collision_probability != null ? `${c.collision_probability.toFixed(2)}%` : '<0.01%'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-space-800/80 flex-wrap">
                    <div className="flex items-center gap-1">
                      {onFocus3D && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocus3D(c);
                          }}
                          className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold transition"
                          title="Focus 3D Globe"
                        >
                          3D
                        </button>
                      )}
                      {onGroundTrack2D && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGroundTrack2D(c);
                          }}
                          className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-[10px] font-bold transition"
                          title="2D Ground Track"
                        >
                          2D
                        </button>
                      )}
                      {onOpenReplay && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReplay(c);
                          }}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          title="Cinematic Replay"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>REPLAY</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectConjunction(c);
                      }}
                      className="px-2.5 py-1 bg-space-800 hover:bg-space-700 text-slate-200 border border-space-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3 text-cyan-400" />
                      <span>EVIDENCE</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Grid View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-space-950/80 border-b border-space-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Primary Target (Object A)</th>
                  <th className="py-3 px-4">Secondary Target (Object B)</th>
                  <th className="py-3 px-4">Miss Distance</th>
                  <th className="py-3 px-4">Relative Velocity</th>
                  <th className="py-3 px-4">TCA (UTC)</th>
                  <th className="py-3 px-4 text-center">Countdown</th>
                  <th className="py-3 px-4 text-center">Risk Level</th>
                  <th className="py-3 px-4 text-center">Est. Probability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-800/60 font-mono">
                {filteredConjunctions.map((c) => {
                  const isSelected = selectedConjunction?.id === c.id;
                  const { timeFormatted, countdown } = formatTCA(c._tcaMs);
                  const nameA = c.object_a?.name || `ID-${c.object_a_id}`;
                  const nameB = c.object_b?.name || `ID-${c.object_b_id}`;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectConjunction(c)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected ? 'bg-cyan-500/15 text-white' : 'hover:bg-space-850/60 text-slate-300'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                          <span>{nameA}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-red-400">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          <span>{nameB}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${getMissDistanceColor(c.miss_distance_km)}`}>
                          {c.miss_distance_km.toFixed(2)} km
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {c.relative_velocity_km_s.toFixed(2)} km/s
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <div>{timeFormatted}</div>
                        <div className="text-[10px] text-slate-400">{countdown}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">
                        {formatTcaCountdown(c._tcaMs, currentTimeMs)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">
                        {c.collision_probability != null ? `${c.collision_probability.toFixed(2)}%` : '<0.01%'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {onFocus3D && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onFocus3D(c);
                              }}
                              className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold transition"
                            >
                              3D
                            </button>
                          )}
                          {onOpenReplay && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReplay(c);
                              }}
                              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition"
                            >
                              REPLAY
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectConjunction(c);
                            }}
                            className="px-2.5 py-1 bg-space-800 hover:bg-space-700 text-slate-300 border border-space-700 rounded-lg text-[10px] font-bold transition"
                          >
                            EVIDENCE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
