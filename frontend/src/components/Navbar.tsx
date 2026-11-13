import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Crosshair,
  Database,
  Eye,
  FileText,
  Globe,
  Layers,
  Map as MapIcon,
  Orbit,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sun,
  Terminal,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { DataStatus, SystemStatistics } from '../types';
import { formatUtcTime } from '../utils/utcTime';

export type NavTabKey =
  | 'space'
  | 'map2d'
  | 'catalog'
  | 'conjunctions'
  | 'case'
  | 'analytics'
  | 'validation';

interface NavbarProps {
  activeTab: NavTabKey;
  setActiveTab?: (tab: NavTabKey) => void;
  onSelectTab?: (tab: NavTabKey) => void;
  stats: SystemStatistics | null;
  dataStatus?: DataStatus | null;
  alertCount: number;
  highRiskConjunctionCount?: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenAlerts?: () => void;
  onOpenOrbitAI?: () => void;
  onOpenSystemHealth?: () => void;
  onOpenSpaceWeather?: () => void;
  onOpenLaunchRadar?: () => void;
  onOpenKesslerDensity?: () => void;
  onOpenSITREP?: () => void;
  onOpenSpotter?: () => void;
  onOpenTrustCenter?: () => void;
  onOpenLiveGuide?: () => void;
  onOpenPerformanceTelemetry?: () => void;
}

const UtcClock: React.FC = () => {
  const [utcString, setUtcString] = useState<string>(() => formatUtcTime(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUtcString(formatUtcTime(new Date()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded border border-space-800 bg-space-950/70 text-[11px] font-mono text-slate-300 tabular-nums whitespace-nowrap"
      title="Coordinated Universal Time (UTC)"
    >
      <Clock className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
      <span>{utcString} UTC</span>
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  stats,
  dataStatus,
  alertCount,
  highRiskConjunctionCount = 0,
  onRefresh,
  isRefreshing,
  onOpenAlerts,
  onOpenOrbitAI,
  onOpenSystemHealth,
  onOpenSpaceWeather,
  onOpenLaunchRadar,
  onOpenKesslerDensity,
  onOpenSITREP,
  onOpenSpotter,
  onOpenTrustCenter,
  onOpenLiveGuide,
  onOpenPerformanceTelemetry,
}) => {
  const [isModulesOpen, setIsModulesOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const handleTabSelect = setActiveTab || onSelectTab || (() => {});

  useEffect(() => {
    if (!isModulesOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModulesOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModulesOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModulesOpen]);

  const rawMode = dataStatus?.mode || (dataStatus?.is_live ? 'LIVE' : 'OFFLINE');
  const isOffline =
    rawMode === 'OFFLINE' ||
    (dataStatus !== null && dataStatus !== undefined && dataStatus.database_connected === false);
  const isDegraded = rawMode === 'LIVE ERROR' || rawMode === 'DEGRADED';
  const isCache = rawMode === 'DEMO' || rawMode === 'DEMO MODE' || rawMode === 'CACHED';
  const isLive = !isOffline && !isDegraded && !isCache && (rawMode === 'LIVE' || Boolean(dataStatus?.is_live));

  const trackedCount = stats?.tracked_objects || dataStatus?.total_objects || 0;

  const statusMeta = isOffline
    ? {
        label: 'OFFLINE',
        Icon: WifiOff,
        classes: 'border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-950/60',
      }
    : isDegraded
      ? {
          label: 'DEGRADED',
          Icon: AlertTriangle,
          classes: 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60',
        }
      : isCache
        ? {
            label: 'CACHE',
            Icon: Database,
            classes: 'border-amber-500/40 bg-amber-950/30 text-amber-200 hover:bg-amber-950/50',
          }
        : isLive
          ? {
              label: 'LIVE',
              Icon: CheckCircle2,
              classes:
                'border-emerald-500/35 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50',
            }
          : {
              label: 'SYNCING',
              Icon: Activity,
              classes: 'border-space-700 bg-space-950 text-slate-300 hover:bg-space-800',
            };

  const navItems: {
    id: NavTabKey;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'space', label: '3D Engine', Icon: Globe },
    { id: 'map2d', label: '2D Track', Icon: MapIcon },
    {
      id: 'conjunctions',
      label: 'Conjunctions',
      Icon: Crosshair,
      badge: highRiskConjunctionCount > 0 ? highRiskConjunctionCount : undefined,
    },
    { id: 'catalog', label: 'Catalog', Icon: Database },
    { id: 'case', label: 'Cases', Icon: Briefcase },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
    { id: 'validation', label: 'Validation', Icon: ShieldCheck },
  ];

  const moduleGroups = [
    {
      heading: 'Environment & Hazards',
      items: [
        {
          label: 'Space Weather',
          sub: 'NOAA SWPC Kp Index & Solar Flux',
          Icon: Sun,
          action: onOpenSpaceWeather,
        },
        {
          label: 'Debris Shell Density',
          sub: 'LEO / MEO / GEO Spatial Profile',
          Icon: Layers,
          action: onOpenKesslerDensity,
        },
        {
          label: 'Launch Radar',
          sub: 'Upcoming Orbital Launches',
          Icon: Rocket,
          action: onOpenLaunchRadar,
        },
      ],
    },
    {
      heading: 'Operations & Visibility',
      items: [
        {
          label: 'Executive SITREP',
          sub: 'Threat Summary & Conjunction Dossier',
          Icon: FileText,
          action: onOpenSITREP,
        },
        {
          label: 'Sky Spotter',
          sub: 'Local Optical Pass Predictions',
          Icon: Eye,
          action: onOpenSpotter,
        },
      ],
    },
    {
      heading: 'Diagnostics & Reference',
      items: [
        {
          label: 'System Diagnostics',
          sub: 'Feed Provenance & Database State',
          Icon: Activity,
          action: onOpenSystemHealth,
        },
        {
          label: 'Performance Profiler',
          sub: 'Screening Latency & Pair Throughput',
          Icon: Cpu,
          action: onOpenPerformanceTelemetry,
        },
        {
          label: 'Verification & Proofs',
          sub: 'Astrodynamics Reference Vectors',
          Icon: ShieldCheck,
          action: onOpenTrustCenter,
        },
        {
          label: 'Operator Manual',
          sub: 'Architecture & Workflow Reference',
          Icon: BookOpen,
          action: onOpenLiveGuide,
        },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-space-900/95 backdrop-blur-sm border-b border-space-800">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 h-[52px] flex items-center justify-between gap-2">
        {/* Left: Wordmark + Primary Workspaces */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => handleTabSelect('space')}
            className="flex items-center gap-2.5 px-1.5 py-1 rounded text-left hover:bg-space-800/70 transition-colors shrink-0"
          >
            <div className="w-7 h-7 rounded border border-sky-400/30 bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Orbit className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="leading-none">
              <span className="block font-semibold text-xs tracking-[0.14em] text-slate-100">
                ORBITGUARD
              </span>
              <span className="hidden sm:block text-[10px] font-mono text-slate-400 mt-0.5 tracking-wide">
                SGP4 ASTRODYNAMICS
              </span>
            </div>
          </button>

          <nav
            aria-label="Workspace navigation"
            className="hidden lg:flex items-center gap-0.5 pl-2 border-l border-space-800"
          >
            {navItems.map((item) => {
              const Icon = item.Icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors border ${
                    isActive
                      ? 'bg-sky-500/12 text-sky-300 border-sky-400/35'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-space-800/80 border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[10px] tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Modules Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsModulesOpen((prev) => !prev)}
              aria-expanded={isModulesOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap ${
                isModulesOpen
                  ? 'bg-space-800 text-slate-100 border-space-700'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-space-800/80 border-transparent'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Modules</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isModulesOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {isModulesOpen && (
              <div
                role="menu"
                aria-label="Auxiliary engineering modules"
                className="absolute left-0 mt-1.5 w-72 bg-space-900 border border-space-700 rounded-lg shadow-2xl py-2 z-50"
              >
                {moduleGroups.map((group, groupIdx) => {
                  const visibleItems = group.items.filter((it) => Boolean(it.action));
                  if (visibleItems.length === 0) return null;
                  return (
                    <div
                      key={group.heading}
                      className={groupIdx > 0 ? 'mt-2 pt-2 border-t border-space-800' : ''}
                    >
                      <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {group.heading}
                      </div>
                      {visibleItems.map((mod) => {
                        const ModIcon = mod.Icon;
                        return (
                          <button
                            key={mod.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              mod.action?.();
                              setIsModulesOpen(false);
                            }}
                            className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-space-800/80 transition-colors"
                          >
                            <ModIcon
                              className="w-4 h-4 text-sky-400 mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-100">
                                {mod.label}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {mod.sub}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Telemetry Clock, Feed State, Alerts, Sync, Copilot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <UtcClock />

          <button
            type="button"
            onClick={onOpenSystemHealth}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono font-medium transition-colors whitespace-nowrap ${statusMeta.classes}`}
            title={
              dataStatus?.source
                ? `${dataStatus.source} (${statusMeta.label})${dataStatus.data_age_minutes != null ? ` · updated ${dataStatus.data_age_minutes}m ago` : ''} — Inspect diagnostics`
                : 'Inspect feed provenance and engine diagnostics'
            }
          >
            <statusMeta.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{statusMeta.label}</span>
            {trackedCount > 0 && (
              <span className="hidden sm:inline opacity-80 tabular-nums">
                · {trackedCount.toLocaleString()}
              </span>
            )}
          </button>

          {onOpenAlerts && (
            <button
              type="button"
              onClick={onOpenAlerts}
              className="relative flex items-center gap-1.5 px-2 py-1.5 rounded border border-space-800 bg-space-950/70 hover:bg-space-800 text-slate-300 hover:text-slate-100 text-xs transition-colors"
              title="Open active orbital alerts"
              aria-label={`Open alerts (${alertCount} active high-priority)`}
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              {alertCount > 0 && (
                <span className="px-1.5 py-0 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[10px] tabular-nums">
                  {alertCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-space-800 bg-space-950/70 hover:bg-space-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors disabled:opacity-50"
            title="Synchronize live ephemeris feeds and reload orbital telemetry"
            aria-label="Synchronize live orbital feeds"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden md:inline">Sync</span>
          </button>

          {onOpenOrbitAI && (
            <button
              type="button"
              onClick={onOpenOrbitAI}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 text-xs font-medium transition-colors whitespace-nowrap"
              title="Open Astrodynamics Copilot"
            >
              <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Copilot</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Responsive Nav Row below lg */}
      <nav
        aria-label="Mobile workspace navigation"
        className="lg:hidden flex items-center gap-1 px-3 py-1.5 border-t border-space-800/80 overflow-x-auto"
      >
        {navItems.map((item) => {
          const Icon = item.Icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors border shrink-0 ${
                isActive
                  ? 'bg-sky-500/12 text-sky-300 border-sky-400/35'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-space-800/80 border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1 rounded bg-red-500/20 text-red-300 font-mono text-[10px] tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
