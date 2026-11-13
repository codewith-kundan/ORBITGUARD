import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Eye,
  Loader2,
  RefreshCw,
  WifiOff,
  X,
} from 'lucide-react';
import { Navbar, NavTabKey } from './components/Navbar';
import { SpaceView } from './pages/SpaceView';
import { Analytics } from './pages/Analytics';
import { Map2DView } from './components/Map2DView';
import { ObjectTable } from './components/ObjectTable';
import { ConjunctionTable } from './components/ConjunctionTable';
import { ConjunctionCaseView } from './components/ConjunctionCaseView';
import { LiveValidationCenter } from './components/LiveValidationCenter';
import { AlertsModal } from './components/AlertsModal';
import { ObjectDetailsModal } from './components/ObjectDetailsModal';
import { ConjunctionDetailsModal } from './components/ConjunctionDetailsModal';
import { SystemHealthModal } from './components/SystemHealthModal';
import { CAMPlannerModal } from './components/CAMPlannerModal';
import { OverpassModal } from './components/OverpassModal';
import { BreakupSimulatorModal } from './components/BreakupSimulatorModal';
import { ReentryTrackerModal } from './components/ReentryTrackerModal';
import { CDMExportModal } from './components/CDMExportModal';
import { SpaceWeatherModal } from './components/SpaceWeatherModal';
import { LaunchRadarModal } from './components/LaunchRadarModal';
import { KesslerDensityModal } from './components/KesslerDensityModal';
import { SITREPModal } from './components/SITREPModal';
import { SkySpotterModal } from './components/SkySpotterModal';
import { CinematicReplayModal } from './components/CinematicReplayModal';
import { TrustCenterModal } from './components/TrustCenterModal';
import { LiveWebGuide } from './components/LiveWebGuide';
import { OrbitAIAssistant } from './components/OrbitAIAssistant';
import { PerformanceDashboardModal } from './components/PerformanceDashboardModal';
import { api } from './services/api';
import {
  Alert,
  Conjunction,
  DataStatus,
  OrbitalObject,
  SystemStatistics,
} from './types';
import { formatCountdownToUtc, formatUtcTime, parseUtcDate } from './utils/utcTime';

interface ToastNotice {
  id: number;
  tone: 'info' | 'success' | 'error';
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabKey>('space');
  const [stats, setStats] = useState<SystemStatistics | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [swarmDensity, setSwarmDensity] = useState<number>(3000);

  const [selectedObject, setSelectedObject] = useState<OrbitalObject | null>(null);
  const [selectedConjunction, setSelectedConjunction] = useState<Conjunction | null>(null);
  const [replayConjunction, setReplayConjunction] = useState<Conjunction | null>(null);
  const [caseConjunctionId, setCaseConjunctionId] = useState<number | null>(null);
  const [overpassTargetObject, setOverpassTargetObject] = useState<OrbitalObject | null>(null);
  const [reentryTargetObject, setReentryTargetObject] = useState<OrbitalObject | null>(null);

  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [isObjectModalOpen, setIsObjectModalOpen] = useState<boolean>(false);
  const [isConjunctionModalOpen, setIsConjunctionModalOpen] = useState<boolean>(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState<boolean>(false);
  const [isTrustCenterOpen, setIsTrustCenterOpen] = useState<boolean>(false);
  const [isLiveGuideOpen, setIsLiveGuideOpen] = useState<boolean>(false);
  const [isOrbitAIOpen, setIsOrbitAIOpen] = useState<boolean>(false);
  const [isSystemHealthModalOpen, setIsSystemHealthModalOpen] = useState<boolean>(false);
  const [isSpaceWeatherOpen, setIsSpaceWeatherOpen] = useState<boolean>(false);
  const [isLaunchRadarOpen, setIsLaunchRadarOpen] = useState<boolean>(false);
  const [isKesslerDensityOpen, setIsKesslerDensityOpen] = useState<boolean>(false);
  const [isSITREPOpen, setIsSITREPOpen] = useState<boolean>(false);
  const [isSpotterOpen, setIsSpotterOpen] = useState<boolean>(false);
  const [isCAMModalOpen, setIsCAMModalOpen] = useState<boolean>(false);
  const [isOverpassModalOpen, setIsOverpassModalOpen] = useState<boolean>(false);
  const [isBreakupModalOpen, setIsBreakupModalOpen] = useState<boolean>(false);
  const [isReentryModalOpen, setIsReentryModalOpen] = useState<boolean>(false);
  const [isCDMModalOpen, setIsCDMModalOpen] = useState<boolean>(false);
  const [isPerformanceDashboardOpen, setIsPerformanceDashboardOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [dismissedCriticalId, setDismissedCriticalId] = useState<number | null>(null);
  const [bannerNowMs, setBannerNowMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const syncTriggeredRef = useRef<boolean>(false);

  const showToast = useCallback((tone: ToastNotice['tone'], message: string) => {
    const id = Date.now();
    setToast({ id, tone, message });
    window.setTimeout(() => {
      setToast((curr) => (curr && curr.id === id ? null : curr));
    }, 5500);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusData, statsRes, objsRes, conjsRes, alertsRes] = await Promise.all([
        api.getDataStatus(),
        api.getStatistics().catch(() => null),
        api
          .getPaginatedObjects(1, 3000)
          .then((r) => r.items)
          .catch(() => []),
        api.getConjunctions(100, 0).catch(() => []),
        api.getAlerts(50).catch(() => []),
      ]);

      setDataStatus(statusData);
      if (statsRes) setStats(statsRes);
      setObjects(objsRes);
      setConjunctions(conjsRes);
      setAlerts(alertsRes);

      if (
        statusData.database_connected &&
        objsRes.length === 0 &&
        statusData.total_objects === 0 &&
        !syncTriggeredRef.current
      ) {
        syncTriggeredRef.current = true;
        showToast('info', 'Orbital catalog is empty. Starting background CelesTrak ingestion.');
        api.syncData('LIVE').catch(() => {});
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Unable to reach OrbitGuard backend telemetry.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAllData();

    const pollInterval = window.setInterval(async () => {
      try {
        const [statusData, statsRes, conjsRes, alertsRes] = await Promise.all([
          api.getDataStatus(),
          api.getStatistics().catch(() => null),
          api.getConjunctions(100, 0).catch(() => null),
          api.getAlerts(50).catch(() => null),
        ]);
        setDataStatus(statusData);
        if (statsRes) setStats(statsRes);
        if (conjsRes) setConjunctions(conjsRes);
        if (alertsRes) setAlerts(alertsRes);
      } catch {
        // Status banner reflects getDataStatus offline state cleanly
      }
    }, 12000);

    return () => window.clearInterval(pollInterval);
  }, [loadAllData]);

  const handleSync = useCallback(
    async (mode: 'LIVE' | 'DEMO' = 'LIVE') => {
      try {
        setIsSyncing(true);
        const res = await api.syncData(mode);
        await loadAllData();
        if (res?.status === 'error') {
          showToast('error', res?.error_detail || 'Live upstream synchronization failed.');
        } else {
          showToast(
            'success',
            `${mode} catalog synchronized via ${res?.data_source || 'upstream feed'} (${(res?.total_objects ?? 0).toLocaleString()} objects).`
          );
        }
      } catch (err: any) {
        showToast('error', err?.message || 'Orbital catalog synchronization failed.');
      } finally {
        setIsSyncing(false);
      }
    },
    [loadAllData, showToast]
  );

  const handleScreenConjunctions = useCallback(async () => {
    try {
      setIsScreening(true);
      await api.triggerConjunctionScreening(24, 100.0, 3);
      const [newConjs, newAlerts, newStats] = await Promise.all([
        api.getConjunctions(100, 0),
        api.getAlerts(50),
        api.getStatistics().catch(() => null),
      ]);
      setConjunctions(newConjs);
      setAlerts(newAlerts);
      if (newStats) setStats(newStats);
      showToast('success', `Screening complete: ${newConjs.length} encounters tracked.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Conjunction screening failed.');
    } finally {
      setIsScreening(false);
    }
  }, [showToast]);

  const handleSelectObject = (obj: OrbitalObject | null) => {
    setSelectedObject(obj);
  };

  const handleOpenObjectModal = (obj: OrbitalObject) => {
    setSelectedObject(obj);
    setIsObjectModalOpen(true);
  };

  const handleSelectConjunction = (conj: Conjunction | null) => {
    setSelectedConjunction(conj);
    if (conj) setCaseConjunctionId(conj.id);
  };

  const handleOpenConjunctionModal = (conj: Conjunction) => {
    setSelectedConjunction(conj);
    setCaseConjunctionId(conj.id);
    setIsConjunctionModalOpen(true);
  };

  const handleOpenCAM = (conj: Conjunction) => {
    setSelectedConjunction(conj);
    setIsConjunctionModalOpen(false);
    setIsCAMModalOpen(true);
  };

  const handleOpenBreakup = (conj: Conjunction) => {
    setSelectedConjunction(conj);
    setIsConjunctionModalOpen(false);
    setIsBreakupModalOpen(true);
  };

  const handleOpenOverpassModal = (obj: OrbitalObject) => {
    setOverpassTargetObject(obj);
    setIsOverpassModalOpen(true);
  };

  const handleOpenReentryModal = (obj: OrbitalObject) => {
    setReentryTargetObject(obj);
    setIsReentryModalOpen(true);
  };

  const handleOpenCDM = (conj: Conjunction) => {
    setSelectedConjunction(conj);
    setIsConjunctionModalOpen(false);
    setIsCDMModalOpen(true);
  };

  const handleOpenReplay = (conj: Conjunction) => {
    setReplayConjunction(conj);
    setIsReplayModalOpen(true);
  };

  const alertCount = useMemo(
    () =>
      alerts.filter(
        (a) => a.status === 'ACTIVE' && (a.severity === 'HIGH' || a.severity === 'CRITICAL')
      ).length,
    [alerts]
  );

  const highRiskConjunctionCount = useMemo(
    () =>
      conjunctions.filter(
        (c) => c.risk_level === 'CRITICAL' || c.risk_level === 'HIGH' || c.risk_score >= 60
      ).length,
    [conjunctions]
  );

  const imminentCritical = useMemo(() => {
    const now = Date.now();
    return (
      conjunctions.find((c) => {
        if (c.risk_level !== 'CRITICAL' && c.risk_score < 80) return false;
        const tca = parseUtcDate(c.tca);
        return tca ? tca.getTime() > now : false;
      }) || null
    );
  }, [conjunctions]);

  useEffect(() => {
    if (!imminentCritical || dismissedCriticalId === imminentCritical.id) return;
    const timer = window.setInterval(() => setBannerNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [imminentCritical, dismissedCriticalId]);

  const isOffline =
    dataStatus !== null &&
    (dataStatus.mode === 'OFFLINE' || dataStatus.database_connected === false);
  const isFeedDegraded =
    dataStatus !== null && (dataStatus.mode === 'LIVE ERROR' || dataStatus.mode === 'DEGRADED');

  return (
    <div className="min-h-dvh bg-space-950 text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        dataStatus={dataStatus}
        alertCount={alertCount}
        highRiskConjunctionCount={highRiskConjunctionCount}
        onRefresh={() => handleSync('LIVE')}
        isRefreshing={loading || isSyncing}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
        onOpenOrbitAI={() => setIsOrbitAIOpen(true)}
        onOpenSystemHealth={() => setIsSystemHealthModalOpen(true)}
        onOpenSpaceWeather={() => setIsSpaceWeatherOpen(true)}
        onOpenLaunchRadar={() => setIsLaunchRadarOpen(true)}
        onOpenKesslerDensity={() => setIsKesslerDensityOpen(true)}
        onOpenSITREP={() => setIsSITREPOpen(true)}
        onOpenSpotter={() => setIsSpotterOpen(true)}
        onOpenTrustCenter={() => setIsTrustCenterOpen(true)}
        onOpenLiveGuide={() => setIsLiveGuideOpen(true)}
        onOpenPerformanceTelemetry={() => setIsPerformanceDashboardOpen(true)}
      />

      {/* Single Conditional Operational Status Strip */}
      {isOffline || isFeedDegraded ? (
        <div
          role="status"
          className="border-b border-amber-500/35 bg-amber-950/25 px-4 py-2 text-xs font-mono text-amber-200"
        >
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isOffline ? (
                <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              )}
              <span className="font-semibold text-slate-100">
                {isOffline ? 'BACKEND OFFLINE' : 'UPSTREAM FEED DEGRADED'}:
              </span>
              <span className="truncate text-amber-200/90">
                {dataStatus?.error_message ||
                  dataStatus?.sync_error ||
                  'Unable to verify live ephemeris feed.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadAllData}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200 text-[11px] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Retry</span>
              </button>
              {!isOffline && (
                <button
                  type="button"
                  onClick={() => handleSync('LIVE')}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 text-[11px] transition-colors disabled:opacity-50"
                >
                  <span>Sync LIVE</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : imminentCritical && dismissedCriticalId !== imminentCritical.id ? (
        <div
          role="status"
          className="border-b border-red-500/35 bg-red-950/30 px-4 py-2 text-xs font-mono text-red-100"
        >
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-red-300">CRITICAL CONJUNCTION</span>
              <span className="text-slate-100 font-medium truncate">
                {imminentCritical.object_a?.name || `#${imminentCritical.object_a_id}`} vs{' '}
                {imminentCritical.object_b?.name || `#${imminentCritical.object_b_id}`}
              </span>
              <span className="text-slate-400 tabular-nums">
                Miss {imminentCritical.miss_distance_km.toFixed(2)} km · Rel{' '}
                {imminentCritical.relative_velocity_km_s.toFixed(2)} km/s · TCA{' '}
                {formatUtcTime(imminentCritical.tca)} UTC (
                {formatCountdownToUtc(imminentCritical.tca, bannerNowMs)})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedConjunction(imminentCritical);
                  if (imminentCritical.object_a) setSelectedObject(imminentCritical.object_a);
                  setActiveTab('space');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200 text-[11px] transition-colors"
              >
                <Eye className="w-3 h-3 text-sky-400" aria-hidden="true" />
                <span>3D Focus</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenConjunctionModal(imminentCritical)}
                className="px-2 py-1 rounded border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 text-red-200 text-[11px] transition-colors"
              >
                Inspect Encounter
              </button>
              <button
                type="button"
                onClick={() => setDismissedCriticalId(imminentCritical.id)}
                aria-label="Dismiss critical alert strip"
                className="p-1 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Workspace */}
      <main className="flex-1 p-2 sm:p-3 lg:p-4 max-w-[1920px] mx-auto w-full">
        {loading && objects.length === 0 && conjunctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-3 font-mono text-slate-300">
            <Loader2 className="w-7 h-7 animate-spin text-sky-400" aria-hidden="true" />
            <p className="text-sm font-medium">Connecting to OrbitGuard SGP4 Engine...</p>
            <p className="text-xs text-slate-400">
              Retrieving catalog state vectors and conjunction screening queue.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'space' && (
              <SpaceView
                objects={objects}
                conjunctions={conjunctions}
                selectedObject={selectedObject}
                selectedConjunction={selectedConjunction}
                stats={stats}
                swarmDensity={swarmDensity}
                onChangeSwarmDensity={setSwarmDensity}
                onSelectObject={handleSelectObject}
                onSelectConjunction={handleSelectConjunction}
                onOpenConjunctionDetails={handleOpenConjunctionModal}
                onNavigateTo2DTrack={(conj) => {
                  setSelectedConjunction(conj);
                  if (conj.object_a) setSelectedObject(conj.object_a);
                  setActiveTab('map2d');
                }}
              />
            )}

            {activeTab === 'map2d' && (
              <Map2DView
                objects={objects}
                selectedObject={selectedObject}
                selectedConjunction={selectedConjunction}
                stats={stats}
                swarmDensity={swarmDensity}
                onChangeSwarmDensity={setSwarmDensity}
                onSelectObject={handleSelectObject}
                onSelectConjunction={handleSelectConjunction}
                onOpenOverpassModal={handleOpenOverpassModal}
                onOpenDetailsModal={handleOpenObjectModal}
              />
            )}

            {activeTab === 'catalog' && (
              <ObjectTable
                selectedObject={selectedObject}
                onSelectObject={handleSelectObject}
                onOpenDetails={handleOpenObjectModal}
              />
            )}

            {activeTab === 'conjunctions' && (
              <ConjunctionTable
                conjunctions={conjunctions}
                selectedConjunction={selectedConjunction}
                onSelectConjunction={handleOpenConjunctionModal}
                onFocus3D={(conj) => {
                  setSelectedConjunction(conj);
                  if (conj.object_a) setSelectedObject(conj.object_a);
                  setActiveTab('space');
                }}
                onGroundTrack2D={(conj) => {
                  setSelectedConjunction(conj);
                  if (conj.object_a) setSelectedObject(conj.object_a);
                  setActiveTab('map2d');
                }}
                onOpenReplay={handleOpenReplay}
                onOpenCAM={handleOpenCAM}
                onOpenCDM={handleOpenCDM}
                onScreenNew={handleScreenConjunctions}
                isScreening={isScreening}
              />
            )}

            {activeTab === 'analytics' && (
              <Analytics
                stats={stats}
                conjunctions={conjunctions}
                objects={objects}
                onNavigateTo3D={(conj) => {
                  setSelectedConjunction(conj);
                  if (conj.object_a) setSelectedObject(conj.object_a);
                  setActiveTab('space');
                }}
                onSelectObject={handleSelectObject}
              />
            )}

            {activeTab === 'validation' && (
              <LiveValidationCenter
                conjunctions={conjunctions}
                onSelectConjunction={handleOpenConjunctionModal}
                onOpenCAM={handleOpenCAM}
              />
            )}

            {activeTab === 'case' && (
              <ConjunctionCaseView
                conjunctionId={
                  caseConjunctionId || (selectedConjunction?.id ?? conjunctions[0]?.id ?? null)
                }
                conjunctions={conjunctions}
                onSelectCaseConjunction={(id) => setCaseConjunctionId(id)}
                onBack={() => setActiveTab('conjunctions')}
                onOpen3D={(id) => {
                  const target = conjunctions.find((c) => c.id === id);
                  if (target) setSelectedConjunction(target);
                  setActiveTab('space');
                }}
                onOpenCAM={(id) => {
                  const target = conjunctions.find((c) => c.id === id);
                  if (target) {
                    setSelectedConjunction(target);
                    setIsCAMModalOpen(true);
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Non-blocking status toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-40 max-w-md px-3.5 py-2.5 rounded-lg border text-xs font-mono shadow-xl flex items-center gap-3 ${
            toast.tone === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-200'
              : toast.tone === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-space-900 border-space-700 text-slate-200'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Alerts Triage Dialog */}
      <AlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={alerts}
        conjunctions={conjunctions}
        onAlertUpdated={(updated) =>
          setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        }
        onInspectConjunction={handleOpenConjunctionModal}
      />

      {/* Telemetry Modal for Catalog */}
      {isObjectModalOpen && selectedObject && (
        <ObjectDetailsModal
          object={selectedObject}
          onClose={() => setIsObjectModalOpen(false)}
          onOpenOverpass={handleOpenOverpassModal}
          onOpenDecay={handleOpenReentryModal}
        />
      )}

      {/* Conjunction Details Modal */}
      {isConjunctionModalOpen && selectedConjunction && (
        <ConjunctionDetailsModal
          conjunction={selectedConjunction}
          onClose={() => setIsConjunctionModalOpen(false)}
          onNavigateTo3D={(conj) => {
            setSelectedConjunction(conj);
            if (conj.object_a) setSelectedObject(conj.object_a);
            setActiveTab('space');
          }}
          onNavigateTo2D={(conj) => {
            setSelectedConjunction(conj);
            if (conj.object_a) setSelectedObject(conj.object_a);
            setActiveTab('map2d');
          }}
          onOpenReplay={handleOpenReplay}
          onOpenCAM={handleOpenCAM}
          onOpenBreakup={handleOpenBreakup}
          onOpenCDM={handleOpenCDM}
        />
      )}

      {/* Collision Avoidance Maneuver (CAM) Planner Modal */}
      {isCAMModalOpen && selectedConjunction && (
        <CAMPlannerModal
          conjunction={selectedConjunction}
          onClose={() => setIsCAMModalOpen(false)}
        />
      )}

      {/* NASA Standard Satellite Breakup Simulator Modal */}
      {isBreakupModalOpen && (
        <BreakupSimulatorModal
          conjunction={selectedConjunction}
          onClose={() => setIsBreakupModalOpen(false)}
        />
      )}

      {/* Ground Station Overpass Predictor Modal */}
      {isOverpassModalOpen && (overpassTargetObject || selectedObject || objects[0]) && (
        <OverpassModal
          object={overpassTargetObject || selectedObject || objects[0]}
          onClose={() => setIsOverpassModalOpen(false)}
        />
      )}

      {/* Atmospheric Re-entry & Orbital Lifetime Tracker Modal */}
      {isReentryModalOpen && (reentryTargetObject || selectedObject || objects[0]) && (
        <ReentryTrackerModal
          object={reentryTargetObject || selectedObject || objects[0]}
          onClose={() => setIsReentryModalOpen(false)}
        />
      )}

      {/* CCSDS 508.0-B-1 CDM Export Modal */}
      {isCDMModalOpen && selectedConjunction && (
        <CDMExportModal
          conjunction={selectedConjunction}
          onClose={() => setIsCDMModalOpen(false)}
        />
      )}

      {/* NOAA Space Weather Monitor */}
      <SpaceWeatherModal
        isOpen={isSpaceWeatherOpen}
        onClose={() => setIsSpaceWeatherOpen(false)}
      />

      {/* Orbital Launch Radar Modal */}
      <LaunchRadarModal
        isOpen={isLaunchRadarOpen}
        onClose={() => setIsLaunchRadarOpen(false)}
      />

      {/* Spatial Debris Shell Density Modal */}
      <KesslerDensityModal
        isOpen={isKesslerDensityOpen}
        onClose={() => setIsKesslerDensityOpen(false)}
        stats={stats}
      />

      {/* Executive SITREP Dossier Modal */}
      <SITREPModal
        isOpen={isSITREPOpen}
        onClose={() => setIsSITREPOpen(false)}
        conjunction={selectedConjunction}
        stats={stats}
      />

      {/* Optical Pass Spotter Modal */}
      <SkySpotterModal isOpen={isSpotterOpen} onClose={() => setIsSpotterOpen(false)} />

      {/* Encounter Replay Modal */}
      <CinematicReplayModal
        isOpen={isReplayModalOpen}
        conjunction={replayConjunction || selectedConjunction}
        onClose={() => setIsReplayModalOpen(false)}
        onOpenCAM={handleOpenCAM}
        onOpenCDM={handleOpenCDM}
      />

      {/* Verification & Proofs Modal */}
      <TrustCenterModal
        isOpen={isTrustCenterOpen}
        onClose={() => setIsTrustCenterOpen(false)}
      />

      {/* Operator Manual & Reference Modal */}
      <LiveWebGuide
        isOpen={isLiveGuideOpen}
        onClose={() => setIsLiveGuideOpen(false)}
        conjunctions={conjunctions}
        objects={objects}
        stats={stats}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onSelectObject={handleSelectObject}
        onSelectConjunction={handleSelectConjunction}
        onOpenConjunctionDetails={handleOpenConjunctionModal}
        onOpenReplay={handleOpenReplay}
        onOpenCAM={handleOpenCAM}
        onOpenCDM={handleOpenCDM}
        onOpenTrustCenter={() => {
          setIsLiveGuideOpen(false);
          setIsTrustCenterOpen(true);
        }}
        onOpenOrbitAI={() => setIsOrbitAIOpen(true)}
        onOpenSpaceWeather={() => setIsSpaceWeatherOpen(true)}
        onOpenBreakup={handleOpenBreakup}
        onTriggerScreening={handleScreenConjunctions}
      />

      {/* Astrodynamics Copilot Modal */}
      <OrbitAIAssistant
        isOpen={isOrbitAIOpen}
        onClose={() => setIsOrbitAIOpen(false)}
        conjunctions={conjunctions}
        objects={objects}
        selectedObject={selectedObject}
        selectedConjunction={selectedConjunction}
        stats={stats}
        dataStatus={dataStatus}
        activeTab={activeTab}
        onFocus3D={(target) => {
          if ('object_a' in target) {
            setSelectedConjunction(target);
            if (target.object_a) setSelectedObject(target.object_a);
          } else {
            setSelectedObject(target);
          }
          setActiveTab('space');
        }}
        onSelectConjunction={handleOpenConjunctionModal}
        onOpenReplay={handleOpenReplay}
        onOpenCAM={handleOpenCAM}
        onOpenSpaceWeather={() => setIsSpaceWeatherOpen(true)}
        onOpenLaunchRadar={() => setIsLaunchRadarOpen(true)}
        onOpenTrustCenter={() => setIsTrustCenterOpen(true)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* System & Database Diagnostics Modal */}
      <SystemHealthModal
        isOpen={isSystemHealthModalOpen}
        onClose={() => setIsSystemHealthModalOpen(false)}
        onSync={handleSync}
        isSyncing={isSyncing}
        onScreenConjunctions={handleScreenConjunctions}
        isScreening={isScreening}
      />

      {/* Performance Telemetry Modal */}
      <PerformanceDashboardModal
        isOpen={isPerformanceDashboardOpen}
        onClose={() => setIsPerformanceDashboardOpen(false)}
      />
    </div>
  );
}
