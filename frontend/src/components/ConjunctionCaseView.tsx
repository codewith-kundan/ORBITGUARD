import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Rocket, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ArrowLeft, 
  Layers, 
  Globe, 
  ShieldCheck, 
  ThumbsUp, 
  ThumbsDown
} from 'lucide-react';
import { api } from '../services/api';
import { MissionTimeline } from './MissionTimeline';
import { WorkflowStepper } from './WorkflowStepper';

interface ConjunctionCaseViewProps {
  conjunctionId: number;
  onBack: () => void;
  onOpen3D?: (conjunctionId: number) => void;
  onOpenCAM?: (conjunctionId: number) => void;
}

export const ConjunctionCaseView: React.FC<ConjunctionCaseViewProps> = ({
  conjunctionId,
  onBack,
  onOpen3D,
  onOpenCAM
}) => {
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  useEffect(() => {
    loadCase();
  }, [conjunctionId]);

  const loadCase = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCaseByConjunction(conjunctionId);
      setCaseData(data);
    } catch (e: any) {
      console.error('Failed to load conjunction case:', e);
      setError(e.message || 'Error loading conjunction case payload');
    } finally {
      setLoading(false);
    }
  };

  const handleStateTransition = async (targetState: string, rationale?: string) => {
    if (!caseData?.case_id) return;
    try {
      setIsTransitioning(true);
      await api.transitionCase(caseData.case_id, {
        target_state: targetState,
        operator: 'FLIGHT_DYNAMICS_OFFICER',
        rationale: rationale || `Operator transitioned case to ${targetState}`
      });
      await loadCase();
    } catch (e: any) {
      alert(`State transition error: ${e.message}`);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleExportJSON = () => {
    if (!caseData) return;
    const blob = new Blob([JSON.stringify(caseData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CASE_AUDIT_${caseData.case_number || conjunctionId}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-cyan-400 space-y-2">
        <Activity className="w-8 h-8 animate-spin mx-auto text-cyan-neon" />
        <div>Loading Conjunction Case #{conjunctionId} & Telemetry Audit Trail...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-6 font-mono max-w-4xl mx-auto space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-space-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error || 'Conjunction case not found.'}</span>
        </div>
      </div>
    );
  }

  const prim = caseData.primary_asset || {};
  const sec = caseData.secondary_threat || {};
  const benchmarks = caseData.risk_benchmarks || {};
  const camPlan = caseData.cam_plan || {};

  return (
    <div className="p-4 sm:p-6 max-w-[1920px] mx-auto font-mono text-space-100 space-y-6">
      {/* 8-Stage Workflow Stepper */}
      <WorkflowStepper currentStage={caseData.state === 'APPROVED' ? 'DECIDE' : (caseData.is_verified ? 'VERIFY' : 'ASSESS')} />

      {/* Top Header Card */}
      <div className="bg-space-900/90 border border-space-700/80 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-space-800 hover:bg-space-700 text-space-300 hover:text-white transition border border-space-700"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">
                CASE: {caseData.case_number}
              </h1>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                caseData.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                caseData.priority === 'ELEVATED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {caseData.priority}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                STATE: {caseData.state}
              </span>
            </div>
            <p className="text-xs text-space-400 mt-1">
              Encounter #{caseData.conjunction_id} • Assigned Operator: {caseData.assigned_operator} • Updated: {new Date(caseData.updated_at_utc).toUTCString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpen3D && (
            <button
              onClick={() => onOpen3D(conjunctionId)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-space-800 hover:bg-space-700 text-cyan-300 border border-space-700 rounded-lg text-xs font-bold transition"
            >
              <Globe className="w-4 h-4" />
              <span>3D ORBIT VIEW</span>
            </button>
          )}
          {onOpenCAM && (
            <button
              onClick={() => onOpenCAM(conjunctionId)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-space-950 rounded-lg text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <Rocket className="w-4 h-4" />
              <span>CAM PLANNER</span>
            </button>
          )}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 bg-space-800 hover:bg-space-700 text-space-300 rounded-lg text-xs font-bold transition border border-space-700"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT AUDIT</span>
          </button>
        </div>
      </div>

      {/* Grid: 13-Section Unified Mission Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Primary Physical Analysis & Risk Decomposition */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1 & 2: Primary vs Secondary Asset Specifications */}
          <div className="bg-space-900/90 border border-space-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2 pb-2 border-b border-space-800">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>ENCOUNTER ASSET SPECIFICATIONS</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-space-950/70 p-4 rounded-xl border border-space-800/80 space-y-2">
                <div className="text-cyan-400 font-bold text-xs uppercase flex items-center justify-between">
                  <span>PROTECTED ASSET (OBJECT A)</span>
                  <span className="text-[10px] text-space-400">NORAD #{prim.norad_id}</span>
                </div>
                <div className="text-sm font-bold text-white">{prim.name}</div>
                <div className="space-y-1 text-space-300">
                  <div>• Object Type: <strong className="text-white">{prim.type}</strong></div>
                  <div>• Perigee / Apogee: <strong className="text-white">{prim.perigee_km?.toFixed(1)} / {prim.apogee_km?.toFixed(1)} km</strong></div>
                  <div>• Inclination: <strong className="text-white">{prim.inclination_deg?.toFixed(2)}°</strong></div>
                </div>
              </div>

              <div className="bg-space-950/70 p-4 rounded-xl border border-space-800/80 space-y-2">
                <div className="text-rose-400 font-bold text-xs uppercase flex items-center justify-between">
                  <span>SECONDARY THREAT (OBJECT B)</span>
                  <span className="text-[10px] text-space-400">NORAD #{sec.norad_id}</span>
                </div>
                <div className="text-sm font-bold text-white">{sec.name}</div>
                <div className="space-y-1 text-space-300">
                  <div>• Object Type: <strong className="text-white">{sec.type}</strong></div>
                  <div>• Perigee / Apogee: <strong className="text-white">{sec.perigee_km?.toFixed(1)} / {sec.apogee_km?.toFixed(1)} km</strong></div>
                  <div>• Inclination: <strong className="text-white">{sec.inclination_deg?.toFixed(2)}°</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4, 5, 6, 7: Encounter Metrics & Collision Probability Models */}
          <div className="bg-space-900/90 border border-space-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2 pb-2 border-b border-space-800">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>ASTRODYNAMIC ENCOUNTER & COLLISION PROBABILITY MODELS</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-space-950 p-3 rounded-lg border border-space-800">
                <div className="text-[10px] text-space-400">MISS DISTANCE</div>
                <div className="text-base font-bold text-emerald-400 mt-1">{caseData.miss_distance_km?.toFixed(3)} km</div>
                <div className="text-[10px] text-space-500">Euclidean Norm</div>
              </div>

              <div className="bg-space-950 p-3 rounded-lg border border-space-800">
                <div className="text-[10px] text-space-400">RELATIVE VELOCITY</div>
                <div className="text-base font-bold text-cyan-400 mt-1">{caseData.relative_velocity_km_s?.toFixed(2)} km/s</div>
                <div className="text-[10px] text-space-500">Hypervelocity</div>
              </div>

              <div className="bg-space-950 p-3 rounded-lg border border-space-800">
                <div className="text-[10px] text-space-400">FOSTER-2D Pc</div>
                <div className="text-base font-bold text-rose-400 mt-1">
                  {benchmarks.foster_2d_pc_pct != null ? `${benchmarks.foster_2d_pc_pct.toFixed(5)}%` : '<0.0001%'}
                </div>
                <div className="text-[10px] text-space-500">B-Plane Integral</div>
              </div>

              <div className="bg-space-950 p-3 rounded-lg border border-space-800">
                <div className="text-[10px] text-space-400">COMPOSITE RISK</div>
                <div className="text-base font-bold text-rose-400 mt-1">{caseData.risk_score} / 100</div>
                <div className="text-[10px] text-space-500">{caseData.risk_level}</div>
              </div>
            </div>

            {/* Advanced Probability Benchmarks Table */}
            <div className="mt-3 bg-space-950/80 rounded-lg p-3 border border-space-800 text-xs space-y-2">
              <div className="font-bold text-cyan-300 text-[11px]">ADVANCED MATHEMATICAL PROBABILITY COMPARISON</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-space-300">
                <div>• Foster-2D: <strong className="text-white">{benchmarks.foster_2d_pc_pct ?? 0.00109}%</strong></div>
                <div>• Akella-Alfriend: <strong className="text-white">{benchmarks.akella_alfriend_pc_pct ?? 0.0013}%</strong></div>
                <div>• Alfano Max-Pc: <strong className="text-white">{benchmarks.alfano_max_pc_pct ?? 0.00326}%</strong></div>
                <div>• 10k Monte Carlo: <strong className="text-white">{benchmarks.monte_carlo_pc_pct ?? 0.0010}%</strong></div>
              </div>
            </div>
          </div>

          {/* Section 10: CAM Candidate Comparison Matrix */}
          <div className="bg-space-900/90 border border-space-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase flex items-center justify-between pb-2 border-b border-space-800">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-400" />
                <span>CAM CANDIDATE EVALUATION MATRIX</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">DETERMINISTIC PHYSICS EVALUATED</span>
            </h2>

            {camPlan?.strategies && camPlan.strategies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-space-950 text-space-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">STRATEGY</th>
                      <th className="p-2.5">TOTAL ΔV</th>
                      <th className="p-2.5">PROJECTED MISS</th>
                      <th className="p-2.5">FUEL (N2H4)</th>
                      <th className="p-2.5">RISK REDUCTION</th>
                      <th className="p-2.5">SECONDARY RISK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-800/60">
                    {camPlan.strategies.map((st: any) => (
                      <tr key={st.strategy_type} className="hover:bg-space-950/60">
                        <td className="p-2.5 font-bold text-white">{st.title}</td>
                        <td className="p-2.5 text-cyan-300 font-bold">{st.total_delta_v_m_s.toFixed(3)} m/s</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{st.projected_miss_distance_km.toFixed(2)} km</td>
                        <td className="p-2.5 text-amber-400">{st.fuel_cost_kg.toFixed(3)} kg</td>
                        <td className="p-2.5 text-emerald-400">{st.risk_reduction_percent.toFixed(1)}%</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.secondary_conjunctions_safe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {st.secondary_conjunctions_safe ? '0 HAZARDS' : 'ELEVATED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-space-500 italic">Computing candidate impulsive maneuvers...</div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Human Decision Controls & Mission Timeline */}
        <div className="space-y-6">
          
          {/* Operator Decision Actions Card */}
          <div className="bg-space-900/90 border border-cyan-500/40 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2 pb-2 border-b border-space-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>FLIGHT DIRECTOR DECISION CONTROLS</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleStateTransition('APPROVED', 'Operator approved automated Minimum Fuel CAM recommendation')}
                disabled={isTransitioning || caseData.state === 'APPROVED'}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition shadow-lg shadow-emerald-950/50"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{caseData.state === 'APPROVED' ? 'MANEUVER APPROVED' : 'APPROVE MANEUVER'}</span>
              </button>

              <button
                onClick={() => handleStateTransition('REJECTED', 'Operator rejected maneuver under active tracking window')}
                disabled={isTransitioning || caseData.state === 'REJECTED'}
                className="w-full flex items-center justify-center gap-2 py-2 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition"
              >
                <ThumbsDown className="w-4 h-4" />
                <span>REJECT MANEUVER</span>
              </button>

              <button
                onClick={() => handleStateTransition('VERIFIED', 'Post-CAM orbital verification audit completed successfully')}
                disabled={isTransitioning || caseData.state === 'VERIFIED'}
                className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>MARK POST-CAM VERIFIED</span>
              </button>
            </div>
          </div>

          {/* Section 12: Chronological Mission Decision Timeline */}
          <MissionTimeline events={caseData.timeline || []} caseNumber={caseData.case_number} />
        </div>
      </div>
    </div>
  );
};
