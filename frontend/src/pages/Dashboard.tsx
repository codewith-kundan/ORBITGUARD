import React from 'react';
import { StatCard } from '../components/StatCard';
import { OrbitViewer2D } from '../components/OrbitViewer2D';
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
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  stats: SystemStatistics | null;
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  alerts: Alert[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  onSelectObject: (obj: OrbitalObject) => void;
  onSelectConjunction: (conj: Conjunction) => void;
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
          subtitle="Ingested from CelesTrak"
          icon={Radio}
          variant="cyan"
        />
        <StatCard
          title="Active Satellites"
          value={stats?.active_satellites ?? objects.filter(o => o.object_type === 'satellite').length}
          subtitle="Operational payloads"
          icon={Satellite}
          variant="default"
        />
        <StatCard
          title="Space Debris"
          value={stats?.space_debris ?? objects.filter(o => o.object_type === 'debris').length}
          subtitle="Tracked fragments & R/B"
          icon={Trash2}
          variant="default"
        />
        <StatCard
          title="Conjunctions"
          value={stats?.total_conjunctions ?? conjunctions.length}
          subtitle="Within 50km threshold"
          icon={ShieldAlert}
          variant="warning"
        />
        <StatCard
          title="High-Risk Events"
          value={stats?.high_risk_events ?? highRiskConjunctions.length}
          subtitle="Urgent collision warnings"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main Grid: 2D Orbit Viewer (Left 2/3) + Upcoming Conjunctions & Alerts (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2D Orbital Map */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          <OrbitViewer2D
            objects={objects}
            conjunctions={conjunctions}
            selectedObject={selectedObject}
            selectedConjunction={selectedConjunction}
            onSelectObject={onSelectObject}
            onSelectConjunction={onSelectConjunction}
          />
        </div>

        {/* Right Panel: Upcoming Close Conjunctions */}
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
              {alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="text-xs font-mono bg-space-950 p-2.5 rounded-lg border border-space-800">
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={a.severity} size="sm" />
                    <span className="text-[10px] text-slate-400">#{a.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 truncate">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
