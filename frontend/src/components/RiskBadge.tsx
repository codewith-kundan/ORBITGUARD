import React from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const config = (() => {
    switch (level) {
      case 'CRITICAL':
        return {
          classes: 'bg-red-500/15 text-red-300 border-red-500/40',
          Icon: AlertOctagon,
        };
      case 'HIGH':
        return {
          classes: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
          Icon: AlertTriangle,
        };
      case 'MEDIUM':
        return {
          classes: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
          Icon: Info,
        };
      case 'LOW':
      default:
        return {
          classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35',
          Icon: CheckCircle2,
        };
    }
  })();

  const sizeClasses = (() => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-[10px]';
      case 'lg':
        return 'px-3 py-1 text-xs font-semibold';
      case 'md':
      default:
        return 'px-2.5 py-0.5 text-[11px]';
    }
  })();

  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold uppercase rounded border tracking-wider tabular-nums ${config.classes} ${sizeClasses}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{level}</span>
      {score !== undefined && <span className="opacity-85">({score.toFixed(0)})</span>}
    </span>
  );
};
