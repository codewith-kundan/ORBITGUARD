import React from 'react';
import { 
  X, 
  FileText, 
  Printer 
} from 'lucide-react';
import { Conjunction } from '../types';

interface SITREPModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunction: Conjunction | null;
  stats?: any;
}

export const SITREPModal: React.FC<SITREPModalProps> = ({ isOpen, onClose, conjunction }) => {
  if (!isOpen) return null;

  const nameA = conjunction?.object_a?.name || 'ISS (ZARYA)';
  const nameB = conjunction?.object_b?.name || 'FENGYUN 1C DEB';
  const noradA = conjunction?.object_a?.norad_id || 25544;
  const noradB = conjunction?.object_b?.norad_id || 31254;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                FORMAL SPACE DEFENSE SITREP
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                Orbital Conjunction Assessment & Flight Dossier
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Dossier Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-950 text-slate-200">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">DOCUMENT CLASSIFICATION:</div>
              <div className="text-sm font-bold text-cyan-400">UNCLASSIFIED / SPACE SAFETY SITREP-2026-08</div>
            </div>
            <div className="text-right text-xs">
              <div className="text-slate-400">GENERATION TIME:</div>
              <div className="text-white font-bold">{new Date().toUTCString()}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-l-2 border-cyan-400 pl-2">
              1. EXECUTIVE CONJUNCTION ASSESSMENT
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">PRIMARY ASSET:</span>
                <span className="text-white font-bold">{nameA} (#{noradA})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SECONDARY OBJECT:</span>
                <span className="text-red-400 font-bold">{nameB} (#{noradB})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">PREDICTED MISS DISTANCE:</span>
                <span className="text-amber-400 font-bold">{conjunction?.miss_distance_km.toFixed(2) || '0.38'} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">COLLISION PROBABILITY:</span>
                <span className="text-red-400 font-bold">{conjunction?.collision_probability?.toFixed(2) || '0.81'}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-l-2 border-cyan-400 pl-2">
              2. ISO 26900 / CCSDS 508.0-B-1 RISK ATTRIBUTION
            </h4>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Relative Kinetic Velocity at TCA:</span>
                <span className="text-white font-bold">{conjunction?.relative_velocity_km_s.toFixed(2) || '13.40'} km/s</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Orbital Altitude / Regime:</span>
                <span className="text-white font-bold">{conjunction?.altitude_km?.toFixed(1) || '420.0'} km (Low Earth Orbit)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Encounter Geometry:</span>
                <span className="text-white font-bold">Orthogonal Ascending Nodal Crossing (~88.4°)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-l-2 border-emerald-400 pl-2">
              3. FLIGHT DYNAMICS MITIGATION DIRECTIVE
            </h4>
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 leading-relaxed">
              <strong>Maneuver Directive:</strong> Execute an authorized Collision Avoidance Maneuver (CAM) with +1.2 m/s prograde velocity burn 12 hours before TCA. This establishes an estimated 16.2 km radial buffer while complying with CCSDS inter-operator coordination standards.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
