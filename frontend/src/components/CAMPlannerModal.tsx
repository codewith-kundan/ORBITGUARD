import React, { useState, useEffect } from 'react';
import { 
  X, 
  Rocket, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Flame, 
  Sliders, 
  ChevronRight,
  Download,
  AlertTriangle,
  Zap,
  Clock
} from 'lucide-react';
import { Conjunction, CAMPlanResponse, CAMStrategy, CAMSimulateResponse } from '../types';
import { api } from '../services/api';
import { RiskBadge } from './RiskBadge';

interface CAMPlannerModalProps {
  conjunction: Conjunction;
  onClose: () => void;
  onSelectStrategyFor3D?: (strategy: CAMStrategy) => void;
}

export const CAMPlannerModal: React.FC<CAMPlannerModalProps> = ({
  conjunction,
  onClose,
  onSelectStrategyFor3D
}) => {
  const [plan, setPlan] = useState<CAMPlanResponse | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<CAMStrategy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Custom Simulator Parameters
  const [activeTab, setActiveTab] = useState<'strategies' | 'simulator'>('strategies');
  const [deltaVR, setDeltaVR] = useState<number>(0.0);
  const [deltaVT, setDeltaVT] = useState<number>(1.2);
  const [deltaVW, setDeltaVW] = useState<number>(0.0);
  const [leadTimeHours, setLeadTimeHours] = useState<number>(12.0);
  const [spacecraftMassKg, setSpacecraftMassKg] = useState<number>(500.0);
  const [ispSeconds, setIspSeconds] = useState<number>(220.0);
  
  const [simResult, setSimResult] = useState<CAMSimulateResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getCAMPlan(conjunction.id);
        setPlan(data);
        if (data.strategies && data.strategies.length > 0) {
          setSelectedStrategy(data.strategies[3] || data.strategies[0]); // Default to Min Fuel or Prograde
        }
      } catch (err: any) {
        setError(err.message || 'Failed to calculate collision avoidance maneuver');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [conjunction.id]);

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const res = await api.simulateCAM({
        conjunction_id: conjunction.id,
        delta_v_radial_m_s: deltaVR,
        delta_v_in_track_m_s: deltaVT,
        delta_v_cross_track_m_s: deltaVW,
        lead_time_hours: leadTimeHours,
        spacecraft_mass_kg: spacecraftMassKg,
        isp_seconds: ispSeconds
      });
      setSimResult(res);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportTelemetry = () => {
    const exportData = {
      conjunction_id: conjunction.id,
      primary_object: conjunction.object_a?.name,
      secondary_threat: conjunction.object_b?.name,
      tca: conjunction.tca,
      initial_miss_distance_km: conjunction.miss_distance_km,
      selected_strategy: selectedStrategy,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAM_Plan_CONJ_${conjunction.id}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-space-900 border border-cyan-500/50 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col font-mono shadow-2xl text-slate-200 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-6 py-3.5 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-neon">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  COLLISION AVOIDANCE MANEUVER (CAM) PLANNER
                </h3>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                  GAUSS IMPULSE ENGINE
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Optimal ΔV Velocity Vector, Fuel Consumption & Secondary Conjunction Screening
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white rounded-lg border border-space-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Threat Conjunction Banner */}
        <div className="bg-space-950/60 border-b border-space-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">PROTECTED ASSET:</span>
              <span className="text-white font-bold">{conjunction.object_a?.name}</span>
              <span className="text-[10px] text-cyan-400">#{conjunction.object_a?.norad_id}</span>
            </div>
            <span className="text-slate-600">⚡ vs ⚡</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">THREAT:</span>
              <span className="text-danger-neon font-bold">{conjunction.object_b?.name}</span>
              <span className="text-[10px] text-slate-400">#{conjunction.object_b?.norad_id}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">INITIAL MISS:</span>
              <span className="text-danger-neon font-bold">{conjunction.miss_distance_km.toFixed(2)} km</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">TCA:</span>
              <span className="text-slate-300">{new Date(conjunction.tca).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
            </div>
            <RiskBadge level={conjunction.risk_level} score={conjunction.risk_score} />
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-2 bg-space-950/30 border-b border-space-800 text-xs">
          <button
            onClick={() => setActiveTab('strategies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-bold text-[11px] border-b-2 transition ${
              activeTab === 'strategies'
                ? 'border-cyan-400 text-cyan-neon bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>OPTIMAL MANEUVER STRATEGIES</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-bold text-[11px] border-b-2 transition ${
              activeTab === 'simulator'
                ? 'border-cyan-400 text-cyan-neon bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>INTERACTIVE CUSTOM BURN SIMULATOR</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(92vh-180px)] space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Activity className="w-6 h-6 animate-spin text-cyan-neon mx-auto" />
              <div>Computing Gauss variational equations and secondary conjunction screens...</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-neon text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : activeTab === 'strategies' ? (
            <div className="space-y-4">
              {/* Strategy Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan?.strategies.map((strat) => {
                  const isSelected = selectedStrategy?.strategy_type === strat.strategy_type;
                  const isMinFuel = strat.strategy_type === 'MINIMUM_FUEL';
                  return (
                    <div
                      key={strat.strategy_type}
                      onClick={() => setSelectedStrategy(strat)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/50'
                          : 'bg-space-950/60 border-space-800 hover:border-space-700'
                      }`}
                    >
                      {isMinFuel && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">
                          RECOMMENDED
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Rocket className={`w-4 h-4 ${isSelected ? 'text-cyan-neon' : 'text-slate-500'}`} />
                          <h4 className="text-xs sm:text-sm font-bold text-white">{strat.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3">{strat.description}</p>

                        <div className="grid grid-cols-3 gap-2 bg-space-900/80 p-2.5 rounded-lg border border-space-800 text-[10px] mb-2.5">
                          <div>
                            <span className="text-slate-500 block">TOTAL ΔV</span>
                            <span className="text-cyan-neon font-bold text-xs">{strat.total_delta_v_m_s.toFixed(2)} m/s</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">POST-BURN MISS</span>
                            <span className="text-emerald-400 font-bold text-xs">{strat.projected_miss_distance_km.toFixed(1)} km</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">FUEL COST</span>
                            <span className="text-amber-400 font-bold text-xs">{strat.fuel_cost_kg.toFixed(2)} kg</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-[10px] text-slate-400 border-t border-space-800/80 pt-2">
                          <div className="flex justify-between">
                            <span>BURN TIME:</span>
                            <span className="text-slate-300">
                              {new Date(strat.burn_time).toISOString().replace('T', ' ').slice(0, 16)} UTC (T-{strat.lead_time_hours}h)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>ORBIT SHIFT:</span>
                            <span className="text-slate-300">
                              Perigee: {strat.new_perigee_km.toFixed(0)} km • Apogee: {strat.new_apogee_km.toFixed(0)} km
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>SECONDARY SCREENING:</span>
                            <span className={`font-bold flex items-center gap-1 ${
                              strat.secondary_conjunctions_safe ? 'text-emerald-400' : 'text-warning-neon'
                            }`}>
                              <ShieldCheck className="w-3 h-3" />
                              {strat.secondary_conjunctions_safe ? 'CLEAR (0 Hazards)' : `${strat.secondary_conjunctions_count} Nearby Assets`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-space-800 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-bold">
                          RISK REDUCTION: {strat.risk_reduction_percent.toFixed(1)}%
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStrategy(strat);
                            if (onSelectStrategyFor3D) onSelectStrategyFor3D(strat);
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                            isSelected
                              ? 'bg-cyan-500 text-space-950'
                              : 'bg-space-800 text-slate-300 hover:bg-space-700'
                          }`}
                        >
                          {isSelected ? 'SELECTED' : 'SELECT'}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Strategy Execution Panel */}
              {selectedStrategy && (
                <div className="bg-space-950 p-4 rounded-xl border border-cyan-500/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-space-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        MANEUVER EXECUTION DIRECTIVE: {selectedStrategy.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-cyan-neon font-bold">
                      PROPELLANT CONSUMED: {selectedStrategy.fuel_cost_kg.toFixed(3)} kg ({selectedStrategy.propellant_fraction_percent.toFixed(2)}% of mass)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">RADIAL ΔVr</div>
                      <div className="font-bold text-white mt-0.5">{selectedStrategy.delta_v_vector.delta_v_r.toFixed(2)} m/s</div>
                    </div>
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">IN-TRACK ΔVt</div>
                      <div className="font-bold text-cyan-neon mt-0.5">{selectedStrategy.delta_v_vector.delta_v_t.toFixed(2)} m/s</div>
                    </div>
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">CROSS-TRACK ΔVw</div>
                      <div className="font-bold text-purple-400 mt-0.5">{selectedStrategy.delta_v_vector.delta_v_w.toFixed(2)} m/s</div>
                    </div>
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">NEW ORBIT PERIOD</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{selectedStrategy.new_period_minutes.toFixed(2)} min</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Execute burn command at: </span>
                      <span className="text-white font-bold">
                        {new Date(selectedStrategy.burn_time).toISOString().replace('T', ' ').slice(0, 19)} UTC
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportTelemetry}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white rounded-lg border border-space-700 text-xs font-bold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        EXPORT TELEMETRY
                      </button>

                      <button
                        onClick={() => {
                          setIsCommitted(true);
                          setTimeout(() => setIsCommitted(false), 3000);
                        }}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
                          isCommitted 
                            ? 'bg-emerald-500 text-space-950 font-bold' 
                            : 'bg-cyan-500 hover:bg-cyan-400 text-space-950'
                        }`}
                      >
                        {isCommitted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
                        {isCommitted ? 'MANEUVER SCHEDULED!' : 'COMMIT TO SPACECRAFT'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: INTERACTIVE CUSTOM BURN SIMULATOR */
            <div className="space-y-4">
              <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-4">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Custom Impulsive Vector Parameters
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Radial ΔVr */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Radial Impulse (ΔVr):</span>
                      <span className="text-white font-bold">{deltaVR.toFixed(1)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.1"
                      value={deltaVR}
                      onChange={(e) => setDeltaVR(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 bg-space-800"
                    />
                    <span className="text-[9px] text-slate-500">Affects eccentricity / orbital shape</span>
                  </div>

                  {/* In-Track ΔVt */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">In-Track Impulse (ΔVt):</span>
                      <span className="text-cyan-neon font-bold">{deltaVT.toFixed(1)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.1"
                      value={deltaVT}
                      onChange={(e) => setDeltaVT(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 bg-space-800"
                    />
                    <span className="text-[9px] text-slate-500">Most efficient along-track phase separation</span>
                  </div>

                  {/* Cross-Track ΔVw */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cross-Track Impulse (ΔVw):</span>
                      <span className="text-purple-400 font-bold">{deltaVW.toFixed(1)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.1"
                      value={deltaVW}
                      onChange={(e) => setDeltaVW(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 bg-space-800"
                    />
                    <span className="text-[9px] text-slate-500">Out-of-plane inclination / node shift</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-space-800">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Lead Time Before TCA (Hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={leadTimeHours}
                      onChange={(e) => setLeadTimeHours(parseFloat(e.target.value) || 12)}
                      className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Spacecraft Mass (kg)</label>
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={spacecraftMassKg}
                      onChange={(e) => setSpacecraftMassKg(parseFloat(e.target.value) || 500)}
                      className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Specific Impulse Isp (Seconds)</label>
                    <input
                      type="number"
                      min="50"
                      max="5000"
                      value={ispSeconds}
                      onChange={(e) => setIspSeconds(parseFloat(e.target.value) || 220)}
                      className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs rounded-lg transition disabled:opacity-50 shadow-md"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                    RUN ORBITAL BURN SIMULATION
                  </button>
                </div>
              </div>

              {/* Simulation Result Output */}
              {simResult && (
                <div className="bg-space-950 p-4 rounded-xl border border-cyan-500/40 space-y-3 animate-fade-in">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Simulation Telemetry Output
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">TOTAL ΔV APPLIED</div>
                      <div className="font-bold text-cyan-neon mt-0.5">{simResult.total_delta_v_m_s.toFixed(2)} m/s</div>
                    </div>
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">PROJECTED MISS DISTANCE</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{simResult.projected_miss_distance_km.toFixed(2)} km</div>
                    </div>
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">SEPARATION GAIN</div>
                      <div className="font-bold text-white mt-0.5">+{simResult.miss_distance_gain_km.toFixed(2)} km</div>
                    </div>
                    <div className="p-2 bg-space-900 rounded-lg border border-space-800">
                      <div className="text-[10px] text-slate-400">FUEL CONSUMED</div>
                      <div className="font-bold text-amber-400 mt-0.5">{simResult.fuel_cost_kg.toFixed(3)} kg</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-space-900 rounded-lg border border-space-800 text-[11px] flex justify-between items-center">
                    <span>SECONDARY CONJUNCTION RISK:</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      simResult.secondary_conjunctions_safe ? 'text-emerald-400' : 'text-danger-neon'
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {simResult.secondary_conjunctions_safe ? 'SAFE: 0 Secondary Cascades' : `CAUTION: ${simResult.secondary_conjunctions_count} Nearby Assets`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-space-800 px-4 sm:px-6 py-2.5 bg-space-950/90 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div>SPACE SENTINEL CAM ENGINE • WGS84 & GAUSS VARIATIONAL EQUATIONS</div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-space-800 hover:bg-space-700 text-white rounded text-xs transition font-bold"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
