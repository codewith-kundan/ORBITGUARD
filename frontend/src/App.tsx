import { useState, useEffect } from 'react';
import { Navbar, NavTabKey } from './components/Navbar';
import { DataStatusBar } from './components/DataStatusBar';
import { SpaceView } from './pages/SpaceView';
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
import { api } from './services/api';
import { 
  OrbitalObject, 
  Conjunction, 
  SystemStatistics, 
  DataStatus,
  Alert
} from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabKey>('space');
  const [stats, setStats] = useState<SystemStatistics | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [selectedObject, setSelectedObject] = useState<OrbitalObject | null>(null);
  const [selectedConjunction, setSelectedConjunction] = useState<Conjunction | null>(null);
  const [isObjectModalOpen, setIsObjectModalOpen] = useState<boolean>(false);
  const [isConjunctionModalOpen, setIsConjunctionModalOpen] = useState<boolean>(false);
  const [isSystemHealthModalOpen, setIsSystemHealthModalOpen] = useState<boolean>(false);
  const [isCAMModalOpen, setIsCAMModalOpen] = useState<boolean>(false);
  const [isOverpassModalOpen, setIsOverpassModalOpen] = useState<boolean>(false);
  const [isBreakupModalOpen, setIsBreakupModalOpen] = useState<boolean>(false);
  const [isReentryModalOpen, setIsReentryModalOpen] = useState<boolean>(false);
  const [isCDMModalOpen, setIsCDMModalOpen] = useState<boolean>(false);
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
        api.getPaginatedObjects(1, 500).then(r => r.items).catch(() => []),
        api.getConjunctions(100, 0).catch(() => []),
        api.getAlerts(50).catch(() => [])
      ]);

      if (statusData) setDataStatus(statusData);
      if (statsData) setStats(statsData);
      setObjects(objsData);
      setConjunctions(conjsData);
      setAlerts(alertsData);

      // If catalog is empty on initial boot, trigger initial sync
      if (objsData.length === 0) {
        await handleSync('DEMO');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with SPACE SENTINEL backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSync = async (mode: 'LIVE' | 'DEMO' = 'LIVE') => {
    try {
      setIsSyncing(true);
      await api.syncData(mode);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScreenConjunctions = async () => {
    try {
      setIsScreening(true);
      await api.triggerConjunctionScreening(24, 500.0, 3);
      const [newConjs, newStats] = await Promise.all([
        api.getConjunctions(100, 0),
        api.getStatistics()
      ]);
      setConjunctions(newConjs);
      setStats(newStats);
    } catch (err: any) {
      setError(err.message || 'Conjunction screening error');
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
        onOpenSystemHealth={() => setIsSystemHealthModalOpen(true)}
      />

      {/* Global Data Provider Status Bar */}
      <DataStatusBar
        dataStatus={dataStatus}
        stats={stats}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {loading && objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-3 font-mono text-cyan-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-neon" />
            <p className="text-sm font-bold">Connecting to SPACE SENTINEL SGP4 Ephemeris Engine...</p>
            <p className="text-xs text-slate-400">Loading orbital state vectors and active collision screening tables...</p>
          </div>
        ) : error ? (
          <div className="bg-danger-500/10 border border-danger-500/30 rounded-2xl p-6 text-center font-mono text-danger-neon max-w-lg mx-auto mt-12 shadow-2xl">
            <p className="font-bold text-base mb-2">Backend Connection Issue</p>
            <p className="text-xs text-slate-300 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-cyan-500 text-space-950 font-bold hover:bg-cyan-400 rounded-xl text-xs transition"
              >
                RETRY CONNECTION
              </button>
              <button
                onClick={() => handleSync('LIVE')}
                className="px-4 py-2 bg-space-800 hover:bg-space-700 text-white rounded-xl border border-space-700 text-xs transition"
              >
                FORCE SYNC
              </button>
            </div>
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
                onScreenNew={handleScreenConjunctions}
                isScreening={isScreening}
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

      {/* System & Database Diagnostics Modal */}
      <SystemHealthModal
        isOpen={isSystemHealthModalOpen}
        onClose={() => setIsSystemHealthModalOpen(false)}
        onSync={handleSync}
        isSyncing={isSyncing}
        onScreenConjunctions={handleScreenConjunctions}
        isScreening={isScreening}
      />
    </div>
  );
}
