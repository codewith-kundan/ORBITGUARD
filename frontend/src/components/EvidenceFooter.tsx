import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { CalculationEvidence } from '../types';
import { DataStateBadge } from './DataStateBadge';

interface EvidenceFooterProps {
  evidence: CalculationEvidence;
}

export const EvidenceFooter: React.FC<EvidenceFooterProps> = ({ evidence }) => {
  return (
    <div className="p-3 bg-space-950/90 rounded-xl border border-cyan-500/20 text-[11px] font-mono space-y-2 mt-3 shadow-inner">
      <div className="flex items-center justify-between border-b border-space-800 pb-1.5 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>DATA PROVENANCE & CALCULATION AUDIT</span>
        </div>
        <DataStateBadge state={evidence.data_state} size="sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-slate-400">
        <div>
          <span className="text-slate-500 block text-[9px]">UPSTREAM SOURCE:</span>
          <span className="text-cyan-300 font-semibold truncate block">
            {evidence.source}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[9px]">TLE STATE EPOCH:</span>
          <span className="text-slate-200 font-medium">
            {evidence.tle_epoch ? new Date(evidence.tle_epoch).toUTCString().substring(5, 22) : '—'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[9px]">CALCULATION METHOD:</span>
          <span className="text-emerald-400 font-semibold truncate block" title={evidence.calculation_method}>
            {evidence.calculation_method}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[9px]">CONFIDENCE / MODEL:</span>
          <span className="text-purple-300 font-medium">
            {evidence.confidence} ({evidence.model_version})
          </span>
        </div>
      </div>
    </div>
  );
};
