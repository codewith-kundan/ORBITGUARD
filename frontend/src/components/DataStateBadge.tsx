import React from 'react';
import { DataState } from '../types';
import { Cpu, Sparkles, Activity, AlertCircle } from 'lucide-react';

interface DataStateBadgeProps {
  state: DataState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const DataStateBadge: React.FC<DataStateBadgeProps> = ({ 
  state, 
  size = 'md',
  showIcon = true 
}) => {
  const getConfig = () => {
    switch (state) {
      case 'LIVE':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/40',
          label: 'LIVE DATA',
          icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        };
      case 'CALCULATED':
        return {
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-300',
          border: 'border-cyan-500/40',
          label: 'CALCULATED (SGP4)',
          icon: <Cpu className="w-2.5 h-2.5 text-cyan-400" />
        };
      case 'PREDICTED':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-300',
          border: 'border-amber-500/40',
          label: 'MODEL PREDICTION',
          icon: <Activity className="w-2.5 h-2.5 text-amber-400" />
        };
      case 'SIMULATED':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-300',
          border: 'border-purple-500/40',
          label: 'SIMULATION',
          icon: <Sparkles className="w-2.5 h-2.5 text-purple-400" />
        };
      case 'UNAVAILABLE':
      default:
        return {
          bg: 'bg-slate-800/80',
          text: 'text-slate-400',
          border: 'border-slate-700',
          label: 'DATA UNAVAILABLE',
          icon: <AlertCircle className="w-2.5 h-2.5 text-slate-500" />
        };
    }
  };

  const config = getConfig();

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-0.5 text-[10px]',
    lg: 'px-2.5 py-1 text-xs'
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold uppercase rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} shadow-sm whitespace-nowrap`}>
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
