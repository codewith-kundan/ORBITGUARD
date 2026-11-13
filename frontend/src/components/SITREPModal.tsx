import React, { useState, useEffect } from 'react';
import { X, FileText, Printer, AlertTriangle } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { Conjunction, CAMPlanResponse } from '../types';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface SITREPModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunction: Conjunction | null;
  stats?: any;
}

export const SITREPModal: React.FC<SITREPModalProps> = ({ isOpen, onClose, conjunction }) => {
  const [camPlan, setCamPlan] = useState<CAMPlanResponse | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCam = async () => {
      if (!isOpen || !conjunction?.id) {
        setCamPlan(null);
        setCamError(null);
        return;
      }
      try {
        setCamError(null);
        const plan = await api.getCAMPlan(conjunction.id);
        if (!cancelled) setCamPlan(plan);
      } catch (e: any) {
        if (!cancelled) {
          setCamPlan(null);
          setCamError(e?.message || 'Unable to compute CAM directive from backend.');
        }
      }
    };
    loadCam();
    return () => {
      cancelled = true;
    };
  }, [isOpen, conjunction?.id]);

  const handlePrint = () => {
    window.print();
  };

  const nameA = conjunction?.object_a?.name || (conjunction ? `Object ${conjunction.object_a_id}` : '—');
  const nameB = conjunction?.object_b?.name || (conjunction ? `Object ${conjunction.object_b_id}` : '—');
  const noradA = conjunction?.object_a?.norad_id ?? '—';
  const noradB = conjunction?.object_b?.norad_id ?? '—';

  const bestStrategy =
    camPlan?.strategies && camPlan.strategies.length > 0
      ? camPlan.strategies[0]
      : null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="sitrep-modal-title"
      maxWidthClass="max-w-3xl"
      className="bg-space-900 border border-space-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] font-mono text-slate-200"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-space-950 border-b border-space-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-space-900 rounded-md border border-space-700 text-accent-400 shrink-0" aria-hidden="true">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-space-900 text-slate-300 rounded border border-space-700">
              CONJUNCTION SITREP DOSSIER
            </span>
            <h2 id="sitrep-modal-title" className="text-sm sm:text-base font-semibold text-slate-100 mt-1 truncate">
              Orbital Conjunction Assessment Report
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {conjunction && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-space-950 rounded-md text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Print / PDF</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SITREP report"
            className="p-1.5 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded-md border border-space-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-space-950 text-slate-200">
        {!conjunction ? (
          <div className="p-6 bg-space-900 border border-space-800 rounded-md text-xs text-slate-400 text-center">
            No conjunction event selected. Select an encounter from the Conjunctions queue to generate a SITREP dossier.
          </div>
        ) : (
          <>
            <div className="border-b border-space-800 pb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Encounter Identifier</div>
                <div className="text-sm font-semibold text-accent-400 tabular-nums">
                  EVENT #{conjunction.id} ({conjunction.risk_level})
                </div>
              </div>
              <div className="text-right text-xs tabular-nums">
                <div className="text-[10px] text-slate-400 uppercase">Generated (UTC)</div>
                <div className="text-slate-100 font-semibold">
                  {formatUtcDateTime(new Date().toISOString())} UTC
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider border-l-2 border-accent-400 pl-2">
                1. Conjunction Assessment Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-space-900 p-3.5 rounded-md border border-space-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Primary Asset</span>
                  <span className="text-slate-100 font-semibold">
                    {nameA} (#{noradA})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Secondary Object</span>
                  <span className="text-red-300 font-semibold">
                    {nameB} (#{noradB})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Miss Distance</span>
                  <span className="text-amber-300 font-semibold tabular-nums">
                    {conjunction.miss_distance_km != null
                      ? `${conjunction.miss_distance_km.toFixed(3)} km`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Collision Pc</span>
                  <span className="text-red-300 font-semibold tabular-nums">
                    {conjunction.collision_probability != null
                      ? `${conjunction.collision_probability.toFixed(4)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider border-l-2 border-accent-400 pl-2">
                2. Encounter Geometry &amp; Epoch Parameters
              </h3>
              <div className="p-3.5 bg-space-900 rounded-md border border-space-800 text-xs space-y-2 tabular-nums">
                <div className="flex justify-between border-b border-space-800 pb-1.5">
                  <span className="text-slate-400">Time of Closest Approach (TCA)</span>
                  <span className="text-slate-100 font-semibold">
                    {conjunction.tca ? `${formatUtcDateTime(conjunction.tca)} UTC` : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-space-800 pb-1.5">
                  <span className="text-slate-400">Relative Kinetic Velocity</span>
                  <span className="text-slate-100 font-semibold">
                    {conjunction.relative_velocity_km_s != null
                      ? `${conjunction.relative_velocity_km_s.toFixed(2)} km/s`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Encounter Altitude</span>
                  <span className="text-slate-100 font-semibold">
                    {conjunction.altitude_km != null ? `${conjunction.altitude_km.toFixed(1)} km` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider border-l-2 border-emerald-400 pl-2">
                3. Flight Dynamics Mitigation Directive
              </h3>
              {camError ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/35 rounded-md text-xs text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>{camError}</span>
                </div>
              ) : bestStrategy ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/35 rounded-md text-xs text-emerald-100 leading-relaxed font-sans">
                  <strong className="font-mono text-emerald-300">Recommended Option ({bestStrategy.title}):</strong>{' '}
                  Apply <span className="font-mono">{bestStrategy.total_delta_v_m_s.toFixed(3)} m/s</span> delta-V
                  (est. propellant <span className="font-mono">{bestStrategy.fuel_cost_kg.toFixed(3)} kg</span>) to
                  expand miss distance to{' '}
                  <span className="font-mono">{bestStrategy.projected_miss_distance_km.toFixed(2)} km</span> (
                  <span className="font-mono">{bestStrategy.risk_reduction_percent.toFixed(1)}%</span> risk
                  reduction). Secondary conjunction check:{' '}
                  <span className="font-mono">
                    {bestStrategy.secondary_conjunctions_safe ? 'CLEAR' : 'ELEVATED'}
                  </span>
                  .
                </div>
              ) : (
                <div className="p-3 bg-space-900 border border-space-800 rounded-md text-xs text-slate-400">
                  No maneuver directive loaded from backend CAM planner.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
};
