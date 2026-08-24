import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const getColors = () => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-danger-500/20 text-danger-neon border-danger-500/50 glow-danger animate-pulse';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-warning-500/20 text-warning-neon border-warning-500/40';
      case 'LOW':
      default:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-[10px]';
      case 'lg':
        return 'px-3.5 py-1 text-sm font-semibold';
      case 'md':
      default:
        return 'px-2.5 py-0.5 text-xs';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono uppercase rounded border tracking-wider ${getColors()} ${getSizeClasses()}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === 'CRITICAL' ? 'bg-danger-500 animate-ping' : level === 'HIGH' ? 'bg-orange-400' : level === 'MEDIUM' ? 'bg-warning-500' : 'bg-cyan-400'}`}></span>
      {level}
      {score !== undefined && <span className="font-bold ml-0.5">({score.toFixed(0)})</span>}
    </span>
  );
};
