import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  Clock,
  Crosshair,
  FileCode,
  LayoutGrid,
  List,
  Navigation,
  Play,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Conjunction } from '../types';
import { RiskBadge } from './RiskBadge';
import { formatCountdownToUtc, formatUtcTime, parseUtcDate } from '../utils/utcTime';

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

type SortKey = 'risk' | 'tca' | 'distance' | 'velocity' | 'probability';

const getMissDistanceClass = (km: number) => {
  if (km < 5) return 'text-red-400 font-semibold';
  if (km < 25) return 'text-amber-300 font-semibold';
  return 'text-sky-300 font-medium';
};

export const ConjunctionTable: React.FC<ConjunctionTableProps> = ({
  conjunctions,
  selectedConjunction,
  onSelectConjunction,
  onFocus3D,
  onGroundTrack2D,
  onOpenReplay,
  onOpenCAM,
  onOpenCDM,
  onScreenNew,
  isScreening = false,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [horizonFilter, setHorizonFilter] = useState<'ALL' | '6H' | '24H' | '72H'>('ALL');
  const [objectPairFilter, setObjectPairFilter] = useState<
    'ALL' | 'SAT_DEBRIS' | 'SAT_SAT' | 'ROCKET'
  >('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSortColumn = (key: SortKey, defaultDir: 'asc' | 'desc') => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(defaultDir);
    }
  };

  const getAriaSort = (key: SortKey): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== key) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
    );
  };

  const filteredConjunctions = useMemo(() => {
    return conjunctions
      .map((c) => ({
        ...c,
        _tcaMs: parseUtcDate(c.tca)?.getTime() ?? currentTimeMs,
      }))
      .filter((c) => {
        if (c._tcaMs <= currentTimeMs - 30 * 60 * 1000) return false;
        if (riskFilter !== 'ALL' && c.risk_level !== riskFilter) return false;

        const diffHours = (c._tcaMs - currentTimeMs) / (1000 * 3600);
        if (horizonFilter === '6H' && diffHours > 6.0) return false;
        if (horizonFilter === '24H' && diffHours > 24.0) return false;
        if (horizonFilter === '72H' && diffHours > 72.0) return false;

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

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameA = (c.object_a?.name || '').toLowerCase();
          const nameB = (c.object_b?.name || '').toLowerCase();
          const idA = String(c.object_a?.norad_id || c.object_a_id || '');
          const idB = String(c.object_b?.norad_id || c.object_b_id || '');
          if (!nameA.includes(q) && !nameB.includes(q) && !idA.includes(q) && !idB.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'risk') diff = a.risk_score - b.risk_score;
        else if (sortBy === 'tca') diff = a._tcaMs - b._tcaMs;
        else if (sortBy === 'distance') diff = a.miss_distance_km - b.miss_distance_km;
        else if (sortBy === 'velocity')
          diff = a.relative_velocity_km_s - b.relative_velocity_km_s;
        else if (sortBy === 'probability')
          diff = (a.collision_probability || 0) - (b.collision_probability || 0);
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [
    conjunctions,
    riskFilter,
    horizonFilter,
    objectPairFilter,
    sortBy,
    sortDir,
    searchQuery,
    currentTimeMs,
  ]);

  return (
    <section
      aria-label="Conjunction screening queue"
      className="bg-space-900 border border-space-800 rounded-xl overflow-hidden flex flex-col font-mono"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-space-800 flex flex-wrap items-center justify-between gap-4 bg-space-950/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg border border-space-700 bg-space-900 flex items-center justify-center text-sky-400 shrink-0">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-slate-100 font-sans">
                Conjunction Screening &amp; TCA Queue
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded border border-space-700 bg-space-900 text-sky-300 tabular-nums">
                {filteredConjunctions.length} encounters
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              24-hour SGP4 spatial screening with B-plane miss distance and collision probability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Toggle */}
          <div
            role="group"
            aria-label="Conjunction display layout"
            className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-800 text-xs"
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors border ${
                viewMode === 'table'
                  ? 'bg-sky-500/15 text-sky-300 border-sky-400/35'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors border ${
                viewMode === 'cards'
                  ? 'bg-sky-500/15 text-sky-300 border-sky-400/35'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cards</span>
            </button>
          </div>

          {onScreenNew && (
            <button
              type="button"
              onClick={onScreenNew}
              disabled={isScreening}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isScreening ? 'Screening...' : 'Run Screening'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="px-4 py-3 border-b border-space-800 bg-space-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[220px] max-w-xs">
          <label htmlFor="conj-search-input" className="sr-only">
            Filter conjunctions by spacecraft name or NORAD ID
          </label>
          <input
            id="conj-search-input"
            type="search"
            placeholder="Filter by name or NORAD ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-space-900 border border-space-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Level Filter */}
          <div
            role="group"
            aria-label="Filter by risk severity"
            className="flex items-center gap-1 bg-space-900 p-1 rounded-lg border border-space-800"
          >
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                aria-pressed={riskFilter === lvl}
                className={`px-2 py-1 rounded text-[11px] transition-colors border ${
                  riskFilter === lvl
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/35 font-medium'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Time Horizon Filter */}
          <div
            role="group"
            aria-label="Filter by TCA time horizon"
            className="flex items-center gap-1 bg-space-900 p-1 rounded-lg border border-space-800"
          >
            <span className="text-[10px] text-slate-400 px-1.5">HORIZON</span>
            {(['ALL', '6H', '24H', '72H'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonFilter(h)}
                aria-pressed={horizonFilter === h}
                className={`px-2 py-1 rounded text-[11px] transition-colors border ${
                  horizonFilter === h
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/35 font-medium'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Pair Filter */}
          <div
            role="group"
            aria-label="Filter by orbital object pair type"
            className="hidden xl:flex items-center gap-1 bg-space-900 p-1 rounded-lg border border-space-800"
          >
            {(
              [
                { id: 'ALL', label: 'All Pairs' },
                { id: 'SAT_DEBRIS', label: 'Sat-Debris' },
                { id: 'SAT_SAT', label: 'Sat-Sat' },
                { id: 'ROCKET', label: 'Rocket Bodies' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setObjectPairFilter(p.id)}
                aria-pressed={objectPairFilter === p.id}
                className={`px-2 py-1 rounded text-[11px] transition-colors border ${
                  objectPairFilter === p.id
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/35 font-medium'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="conj-sort-select" className="text-[10px] text-slate-400">
              SORT
            </label>
            <select
              id="conj-sort-select"
              value={sortBy}
              onChange={(e) => {
                const key = e.target.value as SortKey;
                setSortBy(key);
                setSortDir(key === 'distance' || key === 'tca' ? 'asc' : 'desc');
              }}
              className="bg-space-900 border border-space-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-400/60"
            >
              <option value="risk">Risk Score</option>
              <option value="tca">TCA Chronological</option>
              <option value="distance">Miss Distance</option>
              <option value="velocity">Relative Velocity</option>
              <option value="probability">Collision Probability</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {filteredConjunctions.length === 0 ? (
          <div className="py-14 text-center text-slate-400 space-y-2 border border-dashed border-space-800 rounded-lg">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" aria-hidden="true" />
            <p className="text-sm font-sans font-medium text-slate-200">
              No conjunction encounters match the current filters.
            </p>
            <p className="text-xs text-slate-400 font-sans">
              Adjust risk severity filters or run SGP4 conjunction screening against the catalog.
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredConjunctions.map((c) => {
              const nameA = c.object_a?.name || `Object #${c.object_a_id}`;
              const nameB = c.object_b?.name || `Object #${c.object_b_id}`;
              const noradA = c.object_a?.norad_id || c.object_a_id;
              const noradB = c.object_b?.norad_id || c.object_b_id;
              const tcaUtc = formatUtcTime(c._tcaMs);
              const countdown = formatCountdownToUtc(c._tcaMs, currentTimeMs);
              const isSelected = selectedConjunction?.id === c.id;

              return (
                <article
                  key={c.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-400/50'
                      : 'bg-space-950/70 border-space-800 hover:border-space-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-space-800">
                    <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                    <div className="text-right tabular-nums">
                      <span className="text-[11px] text-amber-300 font-semibold inline-flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>{countdown}</span>
                      </span>
                      <span className="block text-[10px] text-slate-400">{tcaUtc} UTC</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectConjunction(c)}
                    className="text-left space-y-1.5 rounded p-1 -m-1 hover:bg-space-900/80 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-sans font-medium text-sky-300 truncate">{nameA}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                        #{noradA}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <ArrowRightLeft className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>Close encounter geometry</span>
                    </div>
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-sans font-medium text-red-300 truncate">{nameB}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                        #{noradB}
                      </span>
                    </div>
                  </button>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg border border-space-800 bg-space-900/90 text-center tabular-nums">
                    <div>
                      <span className="block text-[10px] text-slate-400">MISS DIST</span>
                      <span className={`text-xs ${getMissDistanceClass(c.miss_distance_km)}`}>
                        {c.miss_distance_km.toFixed(2)} km
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">REL VEL</span>
                      <span className="text-xs text-slate-200 font-medium">
                        {c.relative_velocity_km_s.toFixed(2)} km/s
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">EST PC</span>
                      <span className="text-xs text-amber-300 font-medium">
                        {c.collision_probability != null
                          ? c.collision_probability < 0.001
                            ? '< 0.001%'
                            : `${c.collision_probability.toFixed(3)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-space-800/80">
                    <div className="flex flex-wrap items-center gap-1">
                      {onFocus3D && (
                        <button
                          type="button"
                          onClick={() => onFocus3D(c)}
                          className="px-2 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-sky-300 text-[11px] transition-colors"
                        >
                          3D
                        </button>
                      )}
                      {onGroundTrack2D && (
                        <button
                          type="button"
                          onClick={() => onGroundTrack2D(c)}
                          className="px-2 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200 text-[11px] transition-colors"
                        >
                          2D
                        </button>
                      )}
                      {onOpenReplay && (
                        <button
                          type="button"
                          onClick={() => onOpenReplay(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-amber-300 text-[11px] transition-colors"
                        >
                          <Play className="w-2.5 h-2.5" aria-hidden="true" />
                          <span>Replay</span>
                        </button>
                      )}
                      {onOpenCAM && (
                        <button
                          type="button"
                          onClick={() => onOpenCAM(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200 text-[11px] transition-colors"
                        >
                          <Navigation className="w-2.5 h-2.5 text-sky-400" aria-hidden="true" />
                          <span>CAM</span>
                        </button>
                      )}
                      {onOpenCDM && (
                        <button
                          type="button"
                          onClick={() => onOpenCDM(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200 text-[11px] transition-colors"
                        >
                          <FileCode className="w-2.5 h-2.5 text-slate-400" aria-hidden="true" />
                          <span>CDM</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectConjunction(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 text-[11px] transition-colors"
                    >
                      <Crosshair className="w-3 h-3" aria-hidden="true" />
                      <span>Evidence</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto border border-space-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <caption className="sr-only">
                Conjunction screening results with sortable miss distance, relative velocity, TCA,
                risk score, and collision probability.
              </caption>
              <thead>
                <tr className="bg-space-950 border-b border-space-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th scope="col" className="py-2.5 px-4 font-medium">
                    Primary Object
                  </th>
                  <th scope="col" className="py-2.5 px-4 font-medium">
                    Secondary Object
                  </th>
                  <th scope="col" aria-sort={getAriaSort('distance')} className="py-2.5 px-4 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => handleSortColumn('distance', 'asc')}
                      className="inline-flex items-center gap-1.5 ml-auto hover:text-slate-100 transition-colors"
                    >
                      <span>Miss Dist</span>
                      {renderSortIcon('distance')}
                    </button>
                  </th>
                  <th scope="col" aria-sort={getAriaSort('velocity')} className="py-2.5 px-4 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => handleSortColumn('velocity', 'desc')}
                      className="inline-flex items-center gap-1.5 ml-auto hover:text-slate-100 transition-colors"
                    >
                      <span>Rel Vel</span>
                      {renderSortIcon('velocity')}
                    </button>
                  </th>
                  <th scope="col" aria-sort={getAriaSort('tca')} className="py-2.5 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSortColumn('tca', 'asc')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-100 transition-colors"
                    >
                      <span>TCA (UTC)</span>
                      {renderSortIcon('tca')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-center font-medium">
                    Countdown
                  </th>
                  <th scope="col" aria-sort={getAriaSort('risk')} className="py-2.5 px-4 text-center font-medium">
                    <button
                      type="button"
                      onClick={() => handleSortColumn('risk', 'desc')}
                      className="inline-flex items-center gap-1.5 mx-auto hover:text-slate-100 transition-colors"
                    >
                      <span>Risk</span>
                      {renderSortIcon('risk')}
                    </button>
                  </th>
                  <th scope="col" aria-sort={getAriaSort('probability')} className="py-2.5 px-4 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => handleSortColumn('probability', 'desc')}
                      className="inline-flex items-center gap-1.5 ml-auto hover:text-slate-100 transition-colors"
                    >
                      <span>Est. Pc</span>
                      {renderSortIcon('probability')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-space-800/70 tabular-nums">
                {filteredConjunctions.map((c) => {
                  const isSelected = selectedConjunction?.id === c.id;
                  const tcaUtc = formatUtcTime(c._tcaMs);
                  const countdown = formatCountdownToUtc(c._tcaMs, currentTimeMs);
                  const nameA = c.object_a?.name || `Object #${c.object_a_id}`;
                  const nameB = c.object_b?.name || `Object #${c.object_b_id}`;

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-sky-500/12 text-white'
                          : 'hover:bg-space-800/50 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-medium text-sky-300">
                        <button
                          type="button"
                          onClick={() => onSelectConjunction(c)}
                          className="text-left hover:underline"
                        >
                          {nameA}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-red-300">
                        {nameB}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <span className={getMissDistanceClass(c.miss_distance_km)}>
                          {c.miss_distance_km.toFixed(2)} km
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-200 whitespace-nowrap">
                        {c.relative_velocity_km_s.toFixed(2)} km/s
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 whitespace-nowrap">
                        {tcaUtc} UTC
                      </td>
                      <td className="py-2.5 px-4 text-center font-medium text-amber-300 whitespace-nowrap">
                        {countdown}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-200 whitespace-nowrap">
                        {c.collision_probability != null
                          ? c.collision_probability < 0.001
                            ? '< 0.001%'
                            : `${c.collision_probability.toFixed(3)}%`
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {onFocus3D && (
                            <button
                              type="button"
                              onClick={() => onFocus3D(c)}
                              className="px-2 py-1 rounded border border-space-700 bg-space-950 hover:bg-space-800 text-sky-300 text-[11px] transition-colors"
                            >
                              3D
                            </button>
                          )}
                          {onOpenReplay && (
                            <button
                              type="button"
                              onClick={() => onOpenReplay(c)}
                              className="px-2 py-1 rounded border border-space-700 bg-space-950 hover:bg-space-800 text-amber-300 text-[11px] transition-colors"
                            >
                              Replay
                            </button>
                          )}
                          {onOpenCAM && (
                            <button
                              type="button"
                              onClick={() => onOpenCAM(c)}
                              className="px-2 py-1 rounded border border-space-700 bg-space-950 hover:bg-space-800 text-slate-200 text-[11px] transition-colors"
                            >
                              CAM
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectConjunction(c)}
                            className="px-2.5 py-1 rounded border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 text-[11px] transition-colors"
                          >
                            Evidence
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
    </section>
  );
};
