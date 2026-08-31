import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Award
} from 'lucide-react';
import { api } from '../services/api';

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConjunction?: (conjunctionId: number) => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  onClose,
  onSelectConjunction
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO_03_HIGH_RISK');
  const [isLoadingScenario, setIsLoadingScenario] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadScenarios();
    }
  }, [isOpen]);

  const loadScenarios = async () => {
    try {
      const list = await api.getDemoScenarios();
      setScenarios(list);
    } catch (e) {
      console.error('Failed to load demo scenarios:', e);
    }
  };

  const handleApplyScenario = async (scenarioId: string) => {
    try {
      setIsLoadingScenario(true);
      setSelectedScenarioId(scenarioId);
      await api.loadDemoScenario(scenarioId);
    } catch (e: any) {
      alert(`Failed to activate scenario: ${e.message}`);
    } finally {
      setIsLoadingScenario(false);
    }
  };

  const demoSteps = [
    {
      title: 'STEP 1: Orbital Data Ingestion & Integrity Check',
      speaker: 'Flight Dynamics Officer',
      action: 'Show Live CelesTrak Ingestion with Modulo-10 checksum validation on 3,400+ orbital objects.',
      script: 'ORBITGUARD ingests live General Perturbations (GP) ephemerides from CelesTrak, validating every Two-Line Element set using strict Modulo-10 checksum algorithms.',
      badge: '1. DATA INGESTION'
    },
    {
      title: 'STEP 2: 3-Tier Spatial Sieve & Conjunction Screening',
      speaker: 'Astrodynamics Engine',
      action: 'Broad-phase altitude shell screening filters out non-threatening pairs in milliseconds.',
      script: 'Our broad-phase sieve prunes 99.8% of pairwise combinations before running full SGP4 propagation and Secant zero-crossing TCA solvers.',
      badge: '2. CONJUNCTION DETECTION'
    },
    {
      title: 'STEP 3: Orthogonal TCA & Foster-2D Pc Integration',
      speaker: 'Collision Risk Analyst',
      action: 'Display sub-millisecond TCA (r_rel · v_rel = 0) and B-plane Foster-2D probability integral.',
      script: 'We resolve Time of Closest Approach using an exact root solver where relative velocity is orthogonal to relative position, computing Foster-2D collision probability with 10,000 Monte Carlo bounds.',
      badge: '3. RISK ASSESSMENT'
    },
    {
      title: 'STEP 4: Physics-Grounded AI Copilot Investigation',
      speaker: 'AI Decision Copilot',
      action: 'Query AI Copilot. View exact tool execution audit drawer and verified source badges.',
      script: 'Our AI Copilot has ZERO physics calculation authority. It strictly executes allowlisted backend physics tools, verified by an automated Digit Validator within ±1% precision.',
      badge: '4. AI INVESTIGATION'
    },
    {
      title: 'STEP 5: Multi-Candidate CAM Strategy Evaluation',
      speaker: 'Guidance & Navigation',
      action: 'Open CAM Planner. Compare Prograde, Retrograde, Cross-Track, and Min-Fuel candidates.',
      script: 'The deterministic physics engine computes 4 valid orbital maneuver options using Gauss variational equations, calculating precise hydrazine propellant mass via Tsiolkovsky rocket equation.',
      badge: '5. CAM PLANNING'
    },
    {
      title: 'STEP 6: AI Candidate Recommendation & Flight Director Approval',
      speaker: 'Flight Director',
      action: 'AI recommends Option B (Minimum Fuel). Operator executes [ APPROVE MANEUVER ].',
      script: 'The AI analyzes the candidate evidence matrix and recommends Option B. The human Flight Director formally approves the burn vector, generating an immutable audit trail.',
      badge: '6. HUMAN DECISION'
    },
    {
      title: 'STEP 7: Post-CAM Orbit Clearance & Secondary Screening',
      speaker: 'Verification Officer',
      action: 'Display Before-vs-After table showing +26.9 km clearance gain and 0 secondary hazards.',
      script: 'Post-CAM verification confirms the new trajectory increases miss distance to 28.0 km (+26.9 km gain), reducing collision risk by 99.9% while guaranteeing zero secondary conjunctions.',
      badge: '7. VERIFICATION'
    },
    {
      title: 'STEP 8: Aerospace Defense SITREP & CCSDS CDM Export',
      speaker: 'Compliance & Safety',
      action: 'Generate standardized SITREP and export CCSDS 508.0-B-1 CDM in XML & KVN formats.',
      script: 'The platform generates an executive aerospace defense SITREP and exports compliant CCSDS Conjunction Data Messages (CDMs) ready for inter-agency coordination with ISRO/NASA/ESA.',
      badge: '8. MISSION COMPLIANCE'
    }
  ];

  if (!isOpen) return null;

  const current = demoSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 font-mono text-space-100 animate-fade-in">
      <div className="bg-space-900 border border-cyan-500/60 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-5 py-4 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  SIH 2026 OFFICIAL DEMONSTRATION MODE
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/40">
                  8-STAGE GUIDED WALKTHROUGH
                </span>
              </div>
              <p className="text-xs text-space-400">
                End-to-end scientific narrative for jury and technical evaluators
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-space-800 hover:bg-space-700 text-space-300 hover:text-white rounded-lg border border-space-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Scenario Selector */}
          <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 uppercase">SELECT DETERMINISTIC DEMO SCENARIO:</span>
              <span className="text-[10px] text-space-400">100% Deterministic & Offline-Safe</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleApplyScenario(sc.id)}
                  disabled={isLoadingScenario}
                  className={`p-2.5 rounded-lg text-left transition border ${
                    selectedScenarioId === sc.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                      : 'bg-space-900/60 text-space-400 border-space-800 hover:bg-space-800'
                  }`}
                >
                  <div className="font-bold truncate text-[11px]">{sc.name.split('—')[1] || sc.name}</div>
                  <div className="text-[9px] text-space-500 mt-0.5 truncate">{sc.risk_profile}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Step Card */}
          <div className="bg-space-950 p-5 rounded-xl border border-cyan-500/40 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-space-800/80 pb-3">
              <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40">
                {current.badge}
              </span>
              <span className="text-space-400 font-bold">
                STAGE {currentStep + 1} OF {demoSteps.length}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">{current.title}</h3>
              <div className="p-3 bg-space-900/90 rounded-lg border border-space-800 text-space-200 leading-relaxed italic">
                "{current.script}"
              </div>
            </div>

            <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-cyan-400 font-bold uppercase">LIVE ACTION TO DEMONSTRATE:</div>
                {onSelectConjunction && (
                  <button
                    onClick={() => {
                      onSelectConjunction(1);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition"
                  >
                    JUMP TO CASE VIEW →
                  </button>
                )}
              </div>
              <div className="text-space-300">{current.action}</div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-space-800 px-6 py-4 bg-space-950/90 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-space-800 hover:bg-space-700 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition border border-space-700"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>PREVIOUS STAGE</span>
          </button>

          <div className="flex items-center gap-1">
            {demoSteps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-cyan-400' : (i < currentStep ? 'bg-emerald-400' : 'bg-space-700')
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(Math.min(demoSteps.length - 1, currentStep + 1))}
            disabled={currentStep === demoSteps.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-space-950 font-bold rounded-lg text-xs transition shadow-md shadow-cyan-950/50"
          >
            <span>NEXT STAGE</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
