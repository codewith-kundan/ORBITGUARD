import React from 'react';
import { DataState } from '../types';
import { Radio, Cpu, Activity, Sliders, AlertCircle } from 'lucide-react';

interface DataStateBadgeProps {
  state: DataState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const DataStateBadge: React.FC<DataStateBadgeProps> = ({
  state,
  size = 'md',
  showIcon = true,
}) => {
  const config = (() => {
    switch (state) {
      case 'LIVE':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-300',
          border: 'border-emerald-500/35',
          label: 'LIVE FEED',
          icon: <Radio className="w-3 h-3 text-emerald-400" aria-hidden="true" />,
        };
      case 'CALCULATED':
        return {
          bg: 'bg-sky-500/10',
          text: 'text-sky-300',
          border: 'border-sky-500/35',
          label: 'CALCULATED (SGP4)',
          icon: <Cpu className="w-3 h-3 text-sky-400" aria-hidden="true" />,
        };
      case 'PREDICTED':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-300',
          border: 'border-amber-500/35',
          label: 'MODEL ESTIMATE',
          icon: <Activity className="w-3 h-3 text-amber-400" aria-hidden="true" />,
        };
      case 'SIMULATED':
        return {
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-300',
          border: 'border-indigo-500/35',
          label: 'SIMULATED',
          icon: <Sliders className="w-3 h-3 text-indigo-400" aria-hidden="true" />,
        };
      case 'UNAVAILABLE':
      default:
        return {
          bg: 'bg-slate-800/80',
          text: 'text-slate-300',
          border: 'border-slate-600',
          label: 'UNAVAILABLE',
          icon: <AlertCircle className="w-3 h-3 text-slate-400" aria-hidden="true" />,
        };
    }
  })();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-[11px]',
    lg: 'px-3 py-1 text-xs',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold uppercase rounded border ${config.bg} ${config.text} ${config.border} ${sizeClasses} whitespace-nowrap`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
