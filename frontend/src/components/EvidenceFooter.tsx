import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { CalculationEvidence } from '../types';
import { DataStateBadge } from './DataStateBadge';
import { formatUtcDateTime } from '../utils/utcTime';

interface EvidenceFooterProps {
  evidence: CalculationEvidence;
}

export const EvidenceFooter: React.FC<EvidenceFooterProps> = ({ evidence }) => {
  return (
    <div className="p-3 bg-space-950 rounded-lg border border-space-700 text-[11px] font-mono space-y-2 mt-3">
      <div className="flex items-center justify-between border-b border-space-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
          <span>DATA PROVENANCE &amp; CALCULATION AUDIT</span>
        </div>
        <DataStateBadge state={evidence.data_state} size="sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-400">
        <div>
          <span className="text-slate-400 block text-[10px]">UPSTREAM SOURCE</span>
          <span className="text-slate-200 font-medium truncate block" title={evidence.source}>
            {evidence.source}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px]">TLE EPOCH</span>
          <span className="text-slate-200 tabular-nums">
            {evidence.tle_epoch ? formatUtcDateTime(evidence.tle_epoch, true) : 'Unavailable'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px]">CALCULATION METHOD</span>
          <span className="text-slate-200 truncate block" title={evidence.calculation_method}>
            {evidence.calculation_method}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px]">CONFIDENCE / MODEL</span>
          <span className="text-slate-200 tabular-nums">
            {evidence.confidence} ({evidence.model_version})
          </span>
        </div>
      </div>
    </div>
  );
};
