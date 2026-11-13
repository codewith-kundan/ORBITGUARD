import React from 'react';
import { Loader2, Radio } from 'lucide-react';

export interface SceneDensityPreset {
  val: number;
  label: string;
  desc: string;
}

interface SceneDensityControlProps {
  swarmDensity: number;
  onChangeDensity: (density: number) => void;
  renderedCount: number;
  totalCatalogCount?: number;
  isLoading?: boolean;
}

function formatCompactTotal(count?: number): string {
  if (!count || count <= 0) return 'Full';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toLocaleString();
}

export const SceneDensityControl: React.FC<SceneDensityControlProps> = ({
  swarmDensity,
  onChangeDensity,
  renderedCount,
  totalCatalogCount,
  isLoading = false,
}) => {
  const presets: SceneDensityPreset[] = [
    { val: 1200, label: 'Lite', desc: '1,200' },
    { val: 3000, label: 'Standard', desc: '3,000' },
    { val: 5000, label: 'Dense', desc: '5,000' },
    { val: 0, label: 'All', desc: formatCompactTotal(totalCatalogCount) },
  ];

  const statusText = isLoading
    ? swarmDensity === 0
      ? 'Loading all…'
      : `Loading ${swarmDensity.toLocaleString()}…`
    : `${renderedCount.toLocaleString()} shown`;

  return (
    <div className="pb-2.5 border-b border-space-800">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <Radio className="w-3 h-3 text-sky-400" aria-hidden="true" />
          Scene Density Cap
        </span>
        <span
          className={`text-[10px] tabular-nums inline-flex items-center gap-1 ${
            isLoading ? 'text-sky-300' : 'text-slate-300'
          }`}
        >
          {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-sky-400" aria-hidden="true" />}
          <span>{statusText}</span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-[11px]">
        {presets.map((d) => {
          const isSelected = swarmDensity === d.val;
          return (
            <button
              key={d.val}
              type="button"
              onClick={() => onChangeDensity(d.val)}
              aria-pressed={isSelected}
              title={
                d.val === 0
                  ? `Render all ${(totalCatalogCount || renderedCount || 0).toLocaleString()} tracked catalog objects`
                  : `Cap rendered objects to ${d.desc}`
              }
              className={`py-1.5 px-1.5 rounded border text-center transition-colors ${
                isSelected
                  ? 'bg-sky-500/15 text-sky-300 border-sky-400/40 font-medium'
                  : 'bg-space-950 text-slate-400 hover:text-slate-200 border-space-800'
              }`}
            >
              <span className="block">{d.label}</span>
              <span className="text-[9px] text-slate-400 tabular-nums">{d.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

