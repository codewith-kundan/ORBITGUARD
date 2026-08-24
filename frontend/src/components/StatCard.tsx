import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'danger' | 'warning' | 'default';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default'
}) => {
  const getGlow = () => {
    switch (variant) {
      case 'cyan':
        return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';
      case 'danger':
        return 'border-danger-500/30 text-danger-neon bg-danger-500/10';
      case 'warning':
        return 'border-warning-500/30 text-warning-neon bg-warning-500/10';
      default:
        return 'border-space-700 text-slate-400 bg-space-850';
    }
  };

  return (
    <div className="bg-space-900/80 border border-space-800 hover:border-space-700 rounded-xl p-5 backdrop-blur-md transition-all duration-200 shadow-xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg border ${getGlow()}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold font-mono text-white tracking-tight mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};
