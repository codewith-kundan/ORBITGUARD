import React, { useState } from 'react';
import { 
  Flame, 
  Activity, 
  Trash2, 
  Layers, 
  Play, 
  RefreshCw, 
  TrendingUp, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { WhatIfSimulationResponse, KesslerSimulationResponse, ADRSimulationResponse } from '../types';

export const SimulationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'what-if' | 'kessler' | 'adr'>('kessler');
  const [loading, setLoading] = useState<boolean>(false);

  // What-If State
  const [whatIfTarget, setWhatIfTarget] = useState<string>('STARLINK-1007');
  const [whatIfNorad, setWhatIfNorad] = useState<number>(44713);
  const [whatIfAlt, setWhatIfAlt] = useState<number>(550);
  const [whatIfMass, setWhatIfMass] = useState<number>(260);
  const [whatIfFrags, setWhatIfFrags] = useState<number>(150);
  const [whatIfScenario, setWhatIfScenario] = useState<string>('EXPLOSION');
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulationResponse | null>(null);

  // Kessler State
  const [kesslerObjects, setKesslerObjects] = useState<number>(19578);
  const [kesslerLaunches, setKesslerLaunches] = useState<number>(1800);
  const [kesslerColMult, setKesslerColMult] = useState<number>(1.2);
  const [kesslerFragsPerCol, setKesslerFragsPerCol] = useState<number>(450);
  const [kesslerYears, setKesslerYears] = useState<number>(30);
  const [kesslerPmd, setKesslerPmd] = useState<number>(85);
  const [kesslerResult, setKesslerResult] = useState<KesslerSimulationResponse | null>(null);

  // ADR State
  const [adrMethod, setAdrMethod] = useState<string>('ROBOTIC_CAPTURE');
  const [adrRemovals, setAdrRemovals] = useState<number>(15);
  const [adrAlt, setAdrAlt] = useState<number>(800);
  const [adrYears, setAdrYears] = useState<number>(20);
  const [adrResult, setAdrResult] = useState<ADRSimulationResponse | null>(null);

  const handleRunWhatIf = async () => {
    setLoading(true);
    try {
      const res = await api.runWhatIfSimulation(
        whatIfTarget,
        whatIfNorad,
        whatIfAlt,
        whatIfMass,
        whatIfFrags,
        whatIfScenario
      );
      setWhatIfResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunKessler = async () => {
    setLoading(true);
    try {
      const res = await api.runKesslerSimulation(
        kesslerObjects,
        kesslerLaunches,
        kesslerColMult,
        kesslerFragsPerCol,
        kesslerYears,
        kesslerPmd
      );
      setKesslerResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunADR = async () => {
    setLoading(true);
    try {
      const res = await api.runADRSimulation(
        adrMethod,
        adrRemovals,
        adrAlt,
        adrYears
      );
      setAdrResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">SPACE SENTINEL SIMULATION CENTER</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Astrodynamic scenarios: NASA Standard Breakup Model, Multi-Year Kessler Syndrome Cascade, and Active Debris Removal (ADR)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-space-950 p-1 rounded-xl border border-space-800 text-xs">
          <button
            onClick={() => setActiveTab('kessler')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold ${
              activeTab === 'kessler' ? 'bg-danger-500/20 text-danger-neon border border-danger-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Kessler Cascade
          </button>
          <button
            onClick={() => setActiveTab('what-if')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold ${
              activeTab === 'what-if' ? 'bg-warning-500/20 text-warning-neon border border-warning-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            What-If Breakup
          </button>
          <button
            onClick={() => setActiveTab('adr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold ${
              activeTab === 'adr' ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Debris Removal (ADR)
          </button>
        </div>
      </div>

      {/* TAB 1: KESSLER SYNDROME CASCADE SIMULATOR */}
      {activeTab === 'kessler' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-space-800 pb-3">
              <Activity className="w-4 h-4 text-danger-400" />
              <h2 className="font-bold text-sm text-white">Cascade Parameters</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Initial Tracked Population:</label>
                <input
                  type="number"
                  value={kesslerObjects}
                  onChange={(e) => setKesslerObjects(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Annual Launch Rate (Satellites/yr):</label>
                <input
                  type="number"
                  value={kesslerLaunches}
                  onChange={(e) => setKesslerLaunches(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Collision Rate Multiplier: {kesslerColMult}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={kesslerColMult}
                  onChange={(e) => setKesslerColMult(Number(e.target.value))}
                  className="w-full accent-danger-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Fragments per Hypervelocity Impact:</label>
                <input
                  type="number"
                  value={kesslerFragsPerCol}
                  onChange={(e) => setKesslerFragsPerCol(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Post-Mission Disposal (PMD) Compliance: {kesslerPmd}%</label>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={kesslerPmd}
                  onChange={(e) => setKesslerPmd(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Simulation Duration: {kesslerYears} Years</label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={kesslerYears}
                  onChange={(e) => setKesslerYears(Number(e.target.value))}
                  className="w-full accent-warning-500"
                />
              </div>

              <button
                onClick={handleRunKessler}
                disabled={loading}
                className="w-full mt-4 py-2.5 bg-danger-500 hover:bg-danger-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-danger-500/20 transition"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                RUN CASCADE SIMULATION
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h2 className="font-bold text-sm text-white">Orbital Population & Collision Cascade Trajectory</h2>
              </div>
              <span className="text-[10px] text-slate-400 uppercase bg-space-950 px-2 py-0.5 rounded border border-space-800">
                Educational / Research Model
              </span>
            </div>

            {kesslerResult ? (
              <div className="space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">FINAL POPULATION</span>
                    <span className="text-lg font-bold text-white">{kesslerResult.summary.final_population.toLocaleString()}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">TOTAL COLLISIONS</span>
                    <span className="text-lg font-bold text-danger-400">{kesslerResult.summary.total_predicted_collisions}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">TIPPING POINT</span>
                    <span className="text-lg font-bold text-warning-400">{kesslerResult.summary.cascade_tipping_point_year}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">POPULATION GROWTH</span>
                    <span className="text-lg font-bold text-cyan-400">+{kesslerResult.summary.risk_growth_percent}%</span>
                  </div>
                </div>

                {/* Timeline Table */}
                <div className="max-h-72 overflow-y-auto border border-space-800 rounded-xl bg-space-950/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-space-900 text-slate-400 text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2">Year</th>
                        <th className="p-2">Active Sats</th>
                        <th className="p-2">Tracked Debris</th>
                        <th className="p-2">Total Population</th>
                        <th className="p-2">Annual Collisions</th>
                        <th className="p-2">Risk Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-space-800 text-slate-300">
                      {kesslerResult.timeline.map((row) => (
                        <tr key={row.year} className="hover:bg-space-900/50">
                          <td className="p-2 font-bold text-white">{row.year}</td>
                          <td className="p-2 text-cyan-400">{row.active_satellites.toLocaleString()}</td>
                          <td className="p-2 text-danger-400">{row.tracked_debris.toLocaleString()}</td>
                          <td className="p-2 font-bold text-slate-100">{row.total_population.toLocaleString()}</td>
                          <td className="p-2">{row.annual_collisions}</td>
                          <td className="p-2">
                            <span className={`font-bold ${row.orbital_risk_index > 70 ? 'text-danger-400' : row.orbital_risk_index > 40 ? 'text-warning-400' : 'text-cyan-400'}`}>
                              {row.orbital_risk_index}/100
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  {kesslerResult.metadata.disclaimer}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <Activity className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Adjust parameters and click "RUN CASCADE SIMULATION" to model the Kessler tipping point.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WHAT-IF BREAKUP & GABBARD DISPERSION */}
      {activeTab === 'what-if' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* What-If Controls */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-space-800 pb-3">
              <Flame className="w-4 h-4 text-warning-400" />
              <h2 className="font-bold text-sm text-white">Target Breakup Scenario</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Space Object Name:</label>
                <input
                  type="text"
                  value={whatIfTarget}
                  onChange={(e) => setWhatIfTarget(e.target.value)}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target NORAD ID:</label>
                <input
                  type="number"
                  value={whatIfNorad}
                  onChange={(e) => setWhatIfNorad(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Breakup Altitude (km):</label>
                <input
                  type="number"
                  value={whatIfAlt}
                  onChange={(e) => setWhatIfAlt(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Dry Mass (kg):</label>
                <input
                  type="number"
                  value={whatIfMass}
                  onChange={(e) => setWhatIfMass(Number(e.target.value))}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Fragment Generation Sample Count: {whatIfFrags}</label>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={whatIfFrags}
                  onChange={(e) => setWhatIfFrags(Number(e.target.value))}
                  className="w-full accent-warning-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Breakup Mechanism:</label>
                <select
                  value={whatIfScenario}
                  onChange={(e) => setWhatIfScenario(e.target.value)}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="EXPLOSION">Hypergolic Fuel Tank Explosion</option>
                  <option value="COLLISION">Hypervelocity Kinetic Impact (10 km/s)</option>
                  <option value="SOLAR_MAX">Solar Max Atmospheric Expansion Decay</option>
                </select>
              </div>

              <button
                onClick={handleRunWhatIf}
                disabled={loading}
                className="w-full mt-4 py-2.5 bg-warning-500 hover:bg-warning-600 text-space-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-warning-500/20 transition"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                DISPERSE DEBRIS CLOUD
              </button>
            </div>
          </div>

          {/* What-If Results */}
          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-warning-400" />
                <h2 className="font-bold text-sm text-white">Gabbard Diagram & Dispersion Decay Model</h2>
              </div>
              <span className="text-[10px] text-slate-400 uppercase bg-space-950 px-2 py-0.5 rounded border border-space-800">
                NASA Standard Breakup Model
              </span>
            </div>

            {whatIfResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">FRAGMENTS GENERATED</span>
                    <span className="text-lg font-bold text-warning-400">{whatIfResult.total_fragments_generated}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">DECAYED IN 1 YEAR</span>
                    <span className="text-lg font-bold text-emerald-400">{whatIfResult.decayed_within_1_year}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">PERSISTENT DEBRIS</span>
                    <span className="text-lg font-bold text-danger-400">{whatIfResult.persistent_fragments}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">LOCAL RISK SURGE</span>
                    <span className="text-lg font-bold text-purple-400">+{whatIfResult.regional_risk_increase_percent}%</span>
                  </div>
                </div>

                {/* Sample Fragments Table */}
                <div className="max-h-72 overflow-y-auto border border-space-800 rounded-xl bg-space-950/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-space-900 text-slate-400 text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2">Fragment ID</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Delta-V</th>
                        <th className="p-2">Perigee</th>
                        <th className="p-2">Apogee</th>
                        <th className="p-2">Estimated Lifetime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-space-800 text-slate-300">
                      {whatIfResult.fragments_sample.map((f) => (
                        <tr key={f.fragment_id} className="hover:bg-space-900/50">
                          <td className="p-2 font-mono text-cyan-400">{f.fragment_id}</td>
                          <td className="p-2">{f.size_cm} cm</td>
                          <td className="p-2 text-warning-400">{f.delta_v_m_s} m/s</td>
                          <td className="p-2">{f.perigee_km} km</td>
                          <td className="p-2">{f.apogee_km} km</td>
                          <td className="p-2 font-bold text-slate-200">
                            {f.estimated_lifetime_days > 365 ? `${round(f.estimated_lifetime_days / 365, 1)} yrs` : `${f.estimated_lifetime_days} days`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <Flame className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Configure target satellite mass and altitude, then click "DISPERSE DEBRIS CLOUD".</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE DEBRIS REMOVAL (ADR) */}
      {activeTab === 'adr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-space-800 pb-3">
              <Trash2 className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm text-white">ADR Mission Profile</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Mitigation Architecture:</label>
                <select
                  value={adrMethod}
                  onChange={(e) => setAdrMethod(e.target.value)}
                  className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="ROBOTIC_CAPTURE">Robotic Arm Capture & Controlled Deorbit</option>
                  <option value="DRAG_SAIL">Deployable Drag Sail / Electrodynamic Tether</option>
                  <option value="LASER_ABLATION">Laser Ablation Photon Momentum Deorbit</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Annual Removal Target: {adrRemovals} Derelict Bodies/yr</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={adrRemovals}
                  onChange={(e) => setAdrRemovals(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Altitude Band: {adrAlt} km (LEO Peak)</label>
                <input
                  type="range"
                  min="500"
                  max="1200"
                  step="50"
                  value={adrAlt}
                  onChange={(e) => setAdrAlt(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Forecast Horizon: {adrYears} Years</label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="5"
                  value={adrYears}
                  onChange={(e) => setAdrYears(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <button
                onClick={handleRunADR}
                disabled={loading}
                className="w-full mt-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-space-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                SIMULATE ADR RISK MITIGATION
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-space-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <h2 className="font-bold text-sm text-white">Comparative Risk Reduction & Collision Prevention</h2>
              </div>
              <span className="text-[10px] text-slate-400 uppercase bg-space-950 px-2 py-0.5 rounded border border-space-800">
                Liou & Johnson Mitigation Model
              </span>
            </div>

            {adrResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">DERELICT BODIES REMOVED</span>
                    <span className="text-lg font-bold text-cyan-400">{adrResult.summary.total_derelicts_removed}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">PREVENTED COLLISIONS</span>
                    <span className="text-lg font-bold text-emerald-400">{adrResult.summary.prevented_catastrophic_collisions}</span>
                  </div>
                  <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                    <span className="text-slate-400 text-[10px] block">LONG-TERM RISK REDUCTION</span>
                    <span className="text-lg font-bold text-cyan-neon">-{adrResult.summary.risk_reduction_percent}%</span>
                  </div>
                </div>

                {/* Comparative Timeline */}
                <div className="max-h-72 overflow-y-auto border border-space-800 rounded-xl bg-space-950/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-space-900 text-slate-400 text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2">Year</th>
                        <th className="p-2">Baseline Pop.</th>
                        <th className="p-2">Mitigated Pop.</th>
                        <th className="p-2">Baseline Risk</th>
                        <th className="p-2">Mitigated Risk</th>
                        <th className="p-2">Collisions Averted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-space-800 text-slate-300">
                      {adrResult.timeline.map((row) => (
                        <tr key={row.year} className="hover:bg-space-900/50">
                          <td className="p-2 font-bold text-white">{row.year}</td>
                          <td className="p-2 text-danger-400">{row.baseline_population.toLocaleString()}</td>
                          <td className="p-2 text-emerald-400 font-bold">{row.mitigated_population.toLocaleString()}</td>
                          <td className="p-2 text-danger-400">{row.baseline_risk_score}</td>
                          <td className="p-2 text-emerald-400 font-bold">{row.mitigated_risk_score}</td>
                          <td className="p-2 text-cyan-400">+{row.prevented_collisions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <Trash2 className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Select ADR method and annual removal rate, then click "SIMULATE ADR RISK MITIGATION".</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function round(val: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
