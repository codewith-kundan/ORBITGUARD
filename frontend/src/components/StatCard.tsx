import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'danger' | 'warning' | 'default';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) => {
  const iconStyle = (() => {
    switch (variant) {
      case 'cyan':
        return 'border-sky-500/30 text-accent-400 bg-sky-500/10';
      case 'danger':
        return 'border-red-500/30 text-red-400 bg-red-500/10';
      case 'warning':
        return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
      default:
        return 'border-space-700 text-slate-400 bg-space-950';
    }
  })();

  return (
    <div className="bg-space-900 border border-space-700 hover:border-space-600 rounded-lg p-4 transition-colors">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
          {title}
        </span>
        <div className={`p-1.5 rounded-md border ${iconStyle}`} aria-hidden="true">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-semibold font-mono text-slate-100 tracking-tight tabular-nums mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 font-mono truncate">{subtitle}</div>
      )}
    </div>
  );
};
