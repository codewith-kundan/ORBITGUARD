import React, { useState } from 'react';
import { StatCard } from '../components/StatCard';
import { OrbitViewer2D } from '../components/OrbitViewer2D';
import { OrbitViewer3D } from '../components/OrbitViewer3D';
import { RiskBadge } from '../components/RiskBadge';
import { 
  OrbitalObject, 
  Conjunction, 
  SystemStatistics, 
  Alert 
} from '../types';
import { 
  Satellite, 
  Trash2, 
  ShieldAlert, 
  AlertTriangle, 
  Radio, 
  ChevronRight,
  Globe,
  Map as MapIcon,
  Flame
} from 'lucide-react';

interface DashboardProps {
  stats: SystemStatistics | null;
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  alerts: Alert[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  objects,
  conjunctions,
  alerts,
  selectedObject,
  selectedConjunction,
  onSelectObject,
  onSelectConjunction,
  onNavigateTab
}) => {
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');

  const highRiskConjunctions = conjunctions
    .filter((c) => c.risk_level === 'CRITICAL' || c.risk_level === 'HIGH')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Tracked Objects"
          value={stats?.tracked_objects ?? objects.length}
          subtitle={stats ? stats.data_source : "Ingested Catalog"}
          icon={Radio}
          variant="cyan"
        />
        <StatCard
          title="Active Satellites"
          value={stats?.total_active_satellites ?? stats?.active_satellites ?? objects.filter(o => o.object_type === 'ACTIVE_SATELLITE').length}
          subtitle="Operational payloads"
          icon={Satellite}
          variant="default"
        />
        <StatCard
          title="Space Debris"
          value={stats?.total_debris ?? stats?.space_debris ?? objects.filter(o => o.object_type === 'DEBRIS').length}
          subtitle="Tracked fragments"
          icon={Trash2}
          variant="default"
        />
        <StatCard
          title="Rocket Bodies"
          value={stats?.total_rocket_bodies ?? stats?.rocket_bodies ?? objects.filter(o => o.object_type === 'ROCKET_BODY').length}
          subtitle="Upper stages & boosters"
          icon={Flame}
          variant="warning"
        />
        <StatCard
          title="High-Risk Conjunctions"
          value={stats?.critical_conjunctions ?? stats?.high_risk_conjunctions ?? highRiskConjunctions.length}
          subtitle="Urgent close encounters"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main Grid: Orbit Viewer (Left 2/3) + Upcoming Conjunctions & Alerts (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orbit Viewer with 2D / 3D Toggle */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-neon animate-pulse"></span>
              <span className="font-bold text-white uppercase tracking-wider">
                {viewMode === '3D' ? '3D Celestial Mission Control' : '2D WGS84 Ground Track Map'}
              </span>
            </div>

            {/* 2D / 3D Mode Selector */}
            <div className="flex items-center gap-1 bg-space-900 p-1 rounded-lg border border-space-700 font-mono text-xs">
              <button
                onClick={() => setViewMode('3D')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
                  viewMode === '3D'
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                3D Globe
              </button>
              <button
                onClick={() => setViewMode('2D')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
                  viewMode === '2D'
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                2D Map
              </button>
            </div>
          </div>

          {viewMode === '3D' ? (
            <OrbitViewer3D
              objects={objects}
              conjunctions={conjunctions}
              selectedObject={selectedObject}
              selectedConjunction={selectedConjunction}
              onSelectObject={onSelectObject}
              onSelectConjunction={onSelectConjunction}
            />
          ) : (
            <OrbitViewer2D
              objects={objects}
              conjunctions={conjunctions}
              selectedObject={selectedObject}
              selectedConjunction={selectedConjunction}
              onSelectObject={onSelectObject}
              onSelectConjunction={onSelectConjunction}
            />
          )}
        </div>

        {/* Right Panel: Upcoming Close Conjunctions & Alerts */}
        <div className="space-y-4 flex flex-col">
          {/* Conjunctions Card */}
          <div className="bg-space-900/80 border border-space-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-warning-neon" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                  Upcoming Close Approaches
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('conjunctions')}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-neon flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[220px]">
              {highRiskConjunctions.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500">
                  No high-risk conjunctions detected.
                </div>
              ) : (
                highRiskConjunctions.map((c) => {
                  const tcaDate = new Date(c.tca);
                  const nameA = c.object_a?.name || `Object #${c.object_a_id}`;
                  const nameB = c.object_b?.name || `Object #${c.object_b_id}`;

                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectConjunction(c)}
                      className="bg-space-950/80 border border-space-800 hover:border-cyan-500/40 p-3 rounded-lg cursor-pointer transition text-xs font-mono group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                        <span className="text-[11px] text-danger-neon font-bold">
                          {c.miss_distance_km.toFixed(2)} km
                        </span>
                      </div>
                      <div className="text-white font-semibold flex items-center justify-between">
                        <span className="truncate max-w-[120px]">{nameA}</span>
                        <span className="text-slate-500">↔</span>
                        <span className="truncate max-w-[120px] text-slate-300">{nameB}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>TCA: {tcaDate.toLocaleTimeString()} UTC</span>
                        <span>{c.relative_velocity_km_s.toFixed(1)} km/s</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Alerts Snapshot */}
          <div className="bg-space-900/80 border border-space-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger-neon" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                  Active Alerts ({alerts.filter(a => a.status === 'ACTIVE').length})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('alerts')}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-neon flex items-center gap-1"
              >
                Alert Center <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-slate-500">
                  No active collision alerts.
                </div>
              ) : (
                alerts.slice(0, 3).map((a) => (
                  <div key={a.id} className="text-xs font-mono bg-space-950 p-2.5 rounded-lg border border-space-800">
                    <div className="flex items-center gap-2 mb-1">
                      <RiskBadge level={a.severity} size="sm" />
                      <span className="text-[10px] text-slate-400">#{a.id}</span>
                    </div>
                    <p className="text-[11px] text-slate-200 truncate">{a.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
