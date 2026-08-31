import { useState, useEffect } from 'react';
import { Navbar, NavTabKey } from './components/Navbar';
import { DataStatusBar } from './components/DataStatusBar';
import { SpaceView } from './pages/SpaceView';
import { Analytics } from './pages/Analytics';
import { Map2DView } from './components/Map2DView';
import { ObjectTable } from './components/ObjectTable';
import { ConjunctionTable } from './components/ConjunctionTable';
import { ObjectDetailsModal } from './components/ObjectDetailsModal';
import { ConjunctionDetailsModal } from './components/ConjunctionDetailsModal';
import { SystemHealthModal } from './components/SystemHealthModal';
import { CAMPlannerModal } from './components/CAMPlannerModal';
import { OverpassModal } from './components/OverpassModal';
import { BreakupSimulatorModal } from './components/BreakupSimulatorModal';
import { ReentryTrackerModal } from './components/ReentryTrackerModal';
import { CDMExportModal } from './components/CDMExportModal';
import { CriticalAlertBanner } from './components/CriticalAlertBanner';
import { SpaceWeatherModal } from './components/SpaceWeatherModal';
import { LaunchRadarModal } from './components/LaunchRadarModal';
import { KesslerDensityModal } from './components/KesslerDensityModal';
import { SITREPModal } from './components/SITREPModal';
import { ASATSimulatorModal } from './components/ASATSimulatorModal';
import { SkySpotterModal } from './components/SkySpotterModal';
import { OrbitalSafetyBanner } from './components/OrbitalSafetyBanner';
import { CinematicReplayModal } from './components/CinematicReplayModal';
import { TrustCenterModal } from './components/TrustCenterModal';
import { LiveWebGuide } from './components/LiveWebGuide';
import { OrbitAIAssistant } from './components/OrbitAIAssistant';
import { LiveValidationCenter } from './components/LiveValidationCenter';
import { ConjunctionCaseView } from './components/ConjunctionCaseView';
import { PresentationMode } from './components/PresentationMode';
import { PerformanceDashboardModal } from './components/PerformanceDashboardModal';
import { EncounterReplayModal } from './components/EncounterReplayModal';
import { api } from './services/api';
import { 
  OrbitalObject, 
  Conjunction, 
  SystemStatistics, 
  DataStatus,
  Alert
} from './types';
import {
  fallbackObjects,
  fallbackConjunctions,
  fallbackAlerts,
  fallbackStats,
  fallbackDataStatus
} from './services/fallbackData';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabKey>('space');
  const [stats, setStats] = useState<SystemStatistics | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [selectedObject, setSelectedObject] = useState<OrbitalObject | null>(null);
  const [selectedConjunction, setSelectedConjunction] = useState<Conjunction | null>(null);
  const [replayConjunction, setReplayConjunction] = useState<Conjunction | null>(null);
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
  const [isASATOpen, setIsASATOpen] = useState<boolean>(false);
  const [isSpotterOpen, setIsSpotterOpen] = useState<boolean>(false);
  const [isCAMModalOpen, setIsCAMModalOpen] = useState<boolean>(false);
  const [isOverpassModalOpen, setIsOverpassModalOpen] = useState<boolean>(false);
  const [isBreakupModalOpen, setIsBreakupModalOpen] = useState<boolean>(false);
  const [isReentryModalOpen, setIsReentryModalOpen] = useState<boolean>(false);
  const [isCDMModalOpen, setIsCDMModalOpen] = useState<boolean>(false);
  const [isPresentationModeOpen, setIsPresentationModeOpen] = useState<boolean>(false);
  const [isPerformanceDashboardOpen, setIsPerformanceDashboardOpen] = useState<boolean>(false);
  const [isEncounterReplayOpen, setIsEncounterReplayOpen] = useState<boolean>(false);
  const [caseConjunctionId, setCaseConjunctionId] = useState<number | null>(null);
  const [overpassTargetObject, setOverpassTargetObject] = useState<OrbitalObject | null>(null);
  const [reentryTargetObject, setReentryTargetObject] = useState<OrbitalObject | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load all system data
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusData, statsData, objsData, conjsData, alertsData] = await Promise.all([
        api.getDataStatus().catch(() => null),
        api.getStatistics().catch(() => null),
        api.getPaginatedObjects(1, 3000).then(r => r.items).catch(() => []),
        api.getConjunctions(100, 0).catch(() => []),
        api.getAlerts(50).catch(() => [])
      ]);

      if (objsData.length === 0 && (!statusData || statusData.total_objects === 0)) {
        // Trigger non-blocking live sync
        api.syncData('LIVE').catch(() => {});
      }

      setDataStatus(statusData || fallbackDataStatus);
      setStats(statsData || fallbackStats);
      setObjects(objsData && objsData.length > 0 ? objsData : fallbackObjects);
      setConjunctions(conjsData && conjsData.length > 0 ? conjsData : fallbackConjunctions);
      setAlerts(alertsData && alertsData.length > 0 ? alertsData : fallbackAlerts);
    } catch (err: any) {
      console.warn('Initial load exception, applying fallback:', err);
      setDataStatus(fallbackDataStatus);
      setStats(fallbackStats);
      setObjects(fallbackObjects);
      setConjunctions(fallbackConjunctions);
      setAlerts(fallbackAlerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Continuous automatic background live reconnect & polling every 12 seconds
    const interval = setInterval(async () => {
      try {
        const [conjsData, alertsData, statsData, statusData] = await Promise.all([
          api.getConjunctions(100, 0).catch(() => []),
          api.getAlerts(50).catch(() => []),
          api.getStatistics().catch(() => null),
          api.getDataStatus().catch(() => null)
        ]);
        if (conjsData && conjsData.length > 0) setConjunctions(conjsData);
        if (alertsData && alertsData.length > 0) setAlerts(alertsData);
        if (statsData) setStats(statsData);
        if (statusData) {
          setDataStatus(statusData);
          if (statusData.is_live) setError(null); // Auto-clear offline banner once connected
        }
      } catch (e) {
        console.debug('Background poll error:', e);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async (mode: 'LIVE' | 'DEMO' = 'LIVE') => {
    try {
      setIsSyncing(true);
      await api.syncData(mode);
      const [statusData, statsData, objsData, conjsData, alertsData] = await Promise.all([
        api.getDataStatus().catch(() => null),
        api.getStatistics().catch(() => null),
        api.getPaginatedObjects(1, 3000).then(r => r.items).catch(() => []),
        api.getConjunctions(100, 0).catch(() => []),
        api.getAlerts(50).catch(() => [])
      ]);

      if (objsData.length === 0 && (!statusData || statusData.total_objects === 0)) {
        // Trigger non-blocking live sync
        api.syncData('LIVE').catch(() => {});
      }
      if (statusData) setDataStatus(statusData);
      if (statsData) setStats(statsData);
      if (objsData && objsData.length > 0) setObjects(objsData);
      if (conjsData && conjsData.length > 0) setConjunctions(conjsData);
      if (alertsData && alertsData.length > 0) setAlerts(alertsData);
      setError(null);
    } catch (err: any) {
      console.warn('Sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScreenConjunctions = async () => {
    try {
      setIsScreening(true);
      await api.triggerConjunctionScreening(24, 100.0, 3);
      const [newConjs, newAlerts, newStats] = await Promise.all([
        api.getConjunctions(100, 0),
        api.getAlerts(50),
        api.getStatistics()
      ]);
      setConjunctions(newConjs);
      setAlerts(newAlerts);
      setStats(newStats);
      setError(null);
    } catch (err: any) {
      console.warn('Screening notice:', err);
    } finally {
      setIsScreening(false);
    }
  };

  const handleSelectObject = (obj: OrbitalObject | null) => {
    setSelectedObject(obj);
  };

  const handleOpenObjectModal = (obj: OrbitalObject) => {
    setSelectedObject(obj);
    setIsObjectModalOpen(true);
  };

  const handleSelectConjunction = (conj: Conjunction | null) => {
    setSelectedConjunction(conj);
  };

  const handleOpenConjunctionModal = (conj: Conjunction) => {
    setSelectedConjunction(conj);
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

  const alertCount = alerts.filter(
    (a) => a.status === 'ACTIVE' && (a.severity === 'HIGH' || a.severity === 'CRITICAL')
  ).length;

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-space-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        dataStatus={dataStatus}
        alertCount={alertCount}
        onRefresh={loadAllData}
        isRefreshing={loading}
        onOpenOrbitAI={() => setIsOrbitAIOpen(true)}
        onOpenSystemHealth={() => setIsSystemHealthModalOpen(true)}
        onOpenSpaceWeather={() => setIsSpaceWeatherOpen(true)}
        onOpenLaunchRadar={() => setIsLaunchRadarOpen(true)}
        onOpenKesslerDensity={() => setIsKesslerDensityOpen(true)}
        onOpenSITREP={() => setIsSITREPOpen(true)}
        onOpenASAT={() => setIsASATOpen(true)}
        onOpenSpotter={() => setIsSpotterOpen(true)}
        onOpenTrustCenter={() => setIsTrustCenterOpen(true)}
        onOpenLiveGuide={() => setIsLiveGuideOpen(true)}
        onOpenPresentationMode={() => setIsPresentationModeOpen(true)}
        onOpenPerformanceTelemetry={() => setIsPerformanceDashboardOpen(true)}
      />

      {/* Global Data Provider Status Bar */}
      <DataStatusBar
        dataStatus={dataStatus}
        stats={stats}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {/* High-Visibility Imminent Conjunction Warning Audio Banner */}
      <CriticalAlertBanner
        conjunctions={conjunctions}
        onSelectConjunction={handleOpenConjunctionModal}
        onFocus3D={(conj) => {
          setSelectedConjunction(conj);
          if (conj.object_a) setSelectedObject(conj.object_a);
          setActiveTab('space');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 p-2 sm:p-3 lg:p-4 max-w-[1920px] mx-auto w-full">
        {/* Real-Time Orbital Safety Status Banner */}
        <OrbitalSafetyBanner
          conjunctions={conjunctions}
          dataStatus={dataStatus}
          stats={stats}
          onSelectConjunction={handleOpenConjunctionModal}
          onNavigateToConjunctions={() => setActiveTab('conjunctions')}
        />
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 mb-4 font-mono text-amber-300 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-bold text-xs sm:text-sm text-white">Backend Offline / Standalone SGP4 Mode Active</p>
                <p className="text-[11px] text-amber-200/80">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => { setError(null); loadAllData(); }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold rounded-lg text-xs transition"
              >
                RETRY
              </button>
              <button
                onClick={() => setError(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}

        {loading && objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-3 font-mono text-cyan-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-neon" />
            <p className="text-sm font-bold">Connecting to ORBITGUARD SGP4 Ephemeris Engine...</p>
            <p className="text-xs text-slate-400">Loading orbital state vectors and active collision screening tables...</p>
          </div>
        ) : (
          <>
            {/* 1. 3D ORBIT TRACKER (Space View) */}
            {activeTab === 'space' && (
              <SpaceView
                objects={objects}
                conjunctions={conjunctions}
                selectedObject={selectedObject}
                selectedConjunction={selectedConjunction}
                stats={stats}
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

            {/* 2. 2D GROUND TRACK & SENSOR FOOTPRINT */}
            {activeTab === 'map2d' && (
              <Map2DView
                objects={objects}
                selectedObject={selectedObject}
                selectedConjunction={selectedConjunction}
                stats={stats}
                onSelectObject={handleSelectObject}
                onSelectConjunction={handleSelectConjunction}
                onOpenOverpassModal={handleOpenOverpassModal}
                onOpenDetailsModal={handleOpenObjectModal}
              />
            )}

            {/* 3. OBJECTS CATALOG */}
            {activeTab === 'catalog' && (
              <ObjectTable
                selectedObject={selectedObject}
                onSelectObject={handleSelectObject}
                onOpenDetails={handleOpenObjectModal}
              />
            )}

            {/* 4. CONJUNCTION ASSESSMENT */}
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

            {/* 5. SSA ANALYTICS & RISK DASHBOARD */}
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

            {/* 6. SCIENTIFIC VALIDATION & PROVENANCE CENTER */}
            {activeTab === 'validation' && (
              <LiveValidationCenter
                conjunctions={conjunctions}
                onSelectConjunction={handleOpenConjunctionModal}
                onOpenCAM={handleOpenCAM}
              />
            )}

            {/* 7. CONJUNCTION CASE MANAGEMENT & OPERATIONAL WORKFLOW */}
            {activeTab === 'case' && (
              <ConjunctionCaseView
                conjunctionId={caseConjunctionId || (selectedConjunction?.id ?? conjunctions[0]?.id ?? 1)}
                onBack={() => setActiveTab('conjunctions')}
                onOpen3D={(id) => {
                  const target = conjunctions.find(c => c.id === id);
                  if (target) setSelectedConjunction(target);
                  setActiveTab('space');
                }}
                onOpenCAM={(id) => {
                  const target = conjunctions.find(c => c.id === id);
                  if (target) setSelectedConjunction(target);
                  setIsCAMModalOpen(true);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Telemetry Modal for Catalog */}
      {isObjectModalOpen && selectedObject && (
        <ObjectDetailsModal
          object={selectedObject}
          onClose={() => setIsObjectModalOpen(false)}
          onOpenOverpass={handleOpenOverpassModal}
          onOpenDecay={handleOpenReentryModal}
        />
      )}

      {/* Conjunction Modal */}
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

      {/* NASA Standard Satellite Breakup & Fragmentation Simulator Modal */}
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

      {/* CCSDS 508.0-B-1 CDM Export & Operator Dispatcher Modal */}
      {isCDMModalOpen && selectedConjunction && (
        <CDMExportModal
          conjunction={selectedConjunction}
          onClose={() => setIsCDMModalOpen(false)}
        />
      )}

      {/* NOAA Space Weather & Solar Storm Monitor */}
      <SpaceWeatherModal
        isOpen={isSpaceWeatherOpen}
        onClose={() => setIsSpaceWeatherOpen(false)}
      />

      {/* Global Rocket Launch & Debris Re-entry Radar Modal */}
      <LaunchRadarModal
        isOpen={isLaunchRadarOpen}
        onClose={() => setIsLaunchRadarOpen(false)}
      />

      {/* Kessler Syndrome Spatial Density Heatmap Modal */}
      <KesslerDensityModal
        isOpen={isKesslerDensityOpen}
        onClose={() => setIsKesslerDensityOpen(false)}
        stats={stats}
      />


      {/* Executive Defense SITREP Dossier Modal */}
      <SITREPModal
        isOpen={isSITREPOpen}
        onClose={() => setIsSITREPOpen(false)}
        conjunction={selectedConjunction}
        stats={stats}
      />

      {/* ASAT Kinetic Intercept & Collision Cascade Modal */}
      <ASATSimulatorModal
        isOpen={isASATOpen}
        onClose={() => setIsASATOpen(false)}
      />


      {/* Naked-Eye Citizen Sky Spotter Modal */}
      <SkySpotterModal
        isOpen={isSpotterOpen}
        onClose={() => setIsSpotterOpen(false)}
      />

      {/* Cinematic Encounter Replay Modal */}
      <CinematicReplayModal
        isOpen={isReplayModalOpen}
        conjunction={replayConjunction || selectedConjunction}
        onClose={() => setIsReplayModalOpen(false)}
        onOpenCAM={handleOpenCAM}
        onOpenCDM={handleOpenCDM}
      />

      {/* Scientific Credibility & Trust Center Modal */}
      <TrustCenterModal
        isOpen={isTrustCenterOpen}
        onClose={() => setIsTrustCenterOpen(false)}
      />

      {/* Live Interactive Web Platform Guide & Feature Tour */}
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

      {/* Specialized Orbit AI Space Intelligence Copilot Modal */}
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

      {/* Floating ✦ ASK ORBIT AI Action Trigger */}
      {!isOrbitAIOpen && (
        <button
          onClick={() => setIsOrbitAIOpen(true)}
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-space-950 font-extrabold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center gap-2 font-mono text-xs sm:text-sm tracking-wide transition transform hover:scale-105 active:scale-95 group border border-white/20"
          title="Open Orbit AI Specialized Copilot"
        >
          <Sparkles className="w-4 h-4 text-space-950 animate-pulse group-hover:rotate-12 transition-transform" />
          <span>✦ ASK ORBIT AI</span>
        </button>
      )}

      {/* System & Database Diagnostics Modal */}
      <SystemHealthModal
        isOpen={isSystemHealthModalOpen}
        onClose={() => setIsSystemHealthModalOpen(false)}
        onSync={handleSync}
        isSyncing={isSyncing}
        onScreenConjunctions={handleScreenConjunctions}
        isScreening={isScreening}
      />

      {/* SIH Official 8-Stage Presentation Mode Modal */}
      <PresentationMode
        isOpen={isPresentationModeOpen}
        onClose={() => setIsPresentationModeOpen(false)}
        onSelectConjunction={(id) => {
          setCaseConjunctionId(id);
          setActiveTab('case');
        }}
      />

      {/* Performance Telemetry & Subsystem Profiler Modal */}
      <PerformanceDashboardModal
        isOpen={isPerformanceDashboardOpen}
        onClose={() => setIsPerformanceDashboardOpen(false)}
      />

      {/* Physics-Grounded Encounter Replay Modal */}
      {isEncounterReplayOpen && (replayConjunction || selectedConjunction || conjunctions[0]) && (
        <EncounterReplayModal
          isOpen={isEncounterReplayOpen}
          onClose={() => setIsEncounterReplayOpen(false)}
          conjunction={replayConjunction || selectedConjunction || conjunctions[0]}
        />
      )}
    </div>
  );
}
