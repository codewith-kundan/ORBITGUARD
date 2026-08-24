import React from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { SystemStatistics } from '../types';
import { BarChart3, PieChart as PieIcon, Layers, ShieldAlert } from 'lucide-react';

interface AnalyticsProps {
  stats: SystemStatistics | null;
  conjunctions?: any[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ stats }) => {
  // Object Types Data
  const objectTypeData = [
    { name: 'Satellites', value: stats?.total_active_satellites ?? stats?.active_satellites ?? 4719, color: '#00f0ff' },
    { name: 'Debris', value: stats?.total_debris ?? stats?.space_debris ?? 12374, color: '#ef4444' },
    { name: 'Rocket Bodies', value: stats?.total_rocket_bodies ?? stats?.rocket_bodies ?? 2151, color: '#f59e0b' }
  ];

  // Altitude Distribution Data
  const altitudeData = [
    { name: 'LEO (<2000 km)', count: stats?.regime_breakdown?.leo ?? stats?.altitude_distribution?.leo ?? 15603, fill: '#00f0ff' },
    { name: 'MEO (2000-35k km)', count: stats?.regime_breakdown?.meo ?? stats?.altitude_distribution?.meo ?? 2557, fill: '#3b82f6' },
    { name: 'GEO (>35k km)', count: stats?.regime_breakdown?.geo ?? stats?.altitude_distribution?.geo ?? 1418, fill: '#8b5cf6' }
  ];

  // Risk Distribution Data
  const riskData = [
    { name: 'Critical (81-100)', count: stats?.critical_conjunctions ?? stats?.risk_breakdown?.critical ?? 0, fill: '#ff3344' },
    { name: 'High (61-80)', count: stats?.high_risk_conjunctions ?? stats?.risk_breakdown?.high ?? 0, fill: '#f97316' },
    { name: 'Medium (31-60)', count: stats?.medium_risk_conjunctions ?? stats?.risk_breakdown?.medium ?? 8, fill: '#eab308' },
    { name: 'Low (0-30)', count: stats?.low_risk_conjunctions ?? stats?.risk_breakdown?.low ?? 91, fill: '#06b6d4' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-space-900/80 border border-space-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-neon">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">Orbital Analytics & Risk Telemetry</h1>
            <p className="text-xs text-slate-400 font-mono">
              Statistical breakdown of tracked catalog, orbital regimes, and conjunction risk distributions.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Object Distribution by Classification */}
        <div className="bg-space-900/80 border border-space-800 rounded-xl p-5 shadow-xl flex flex-col h-80">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" /> Objects by Classification
            </h3>
            <span className="text-xs font-mono text-cyan-400">Total: {stats?.tracked_objects || 0}</span>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={objectTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {objectTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1021', borderColor: '#1c284f', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Altitude Distribution */}
        <div className="bg-space-900/80 border border-space-800 rounded-xl p-5 shadow-xl flex flex-col h-80">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Orbital Altitude Regimes
            </h3>
            <span className="text-xs font-mono text-slate-400">LEO / MEO / GEO</span>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={altitudeData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1021', borderColor: '#1c284f', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Conjunctions by Risk Severity */}
        <div className="bg-space-900/80 border border-space-800 rounded-xl p-5 shadow-xl flex flex-col h-80">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-warning-neon" /> Conjunction Risk Breakdown
            </h3>
            <span className="text-xs font-mono text-warning-neon">Total: {stats?.total_conjunctions || 0}</span>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1021', borderColor: '#1c284f', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Methodology Summary Box */}
        <div className="bg-space-900/80 border border-space-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" /> Conjunction & Collision Screening Architecture
            </h3>
            <p className="text-xs font-mono text-slate-400 leading-relaxed space-y-2">
              ORBITGUARD uses a deterministic two-tiered screening algorithm. Broad-phase altitude filtering prunes un-intersecting orbital shells, while narrow-phase analytical time-stepping refines the exact Time of Closest Approach (TCA) and relative 3D velocity vectors.
            </p>
          </div>
          <div className="bg-space-950 p-3 rounded-lg border border-space-800 font-mono text-xs text-slate-300 mt-4">
            <div className="text-[10px] text-cyan-400 uppercase font-bold mb-1">Standard Screening Formula</div>
            <div>Risk Score = 0.55 × Distance + 0.25 × Velocity + 0.20 × Lead Time</div>
          </div>
        </div>
      </div>
    </div>
  );
};
