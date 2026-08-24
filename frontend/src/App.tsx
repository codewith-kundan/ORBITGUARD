import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DataStatusBar } from './components/DataStatusBar';
import { Dashboard } from './pages/Dashboard';
import { ObjectTable } from './components/ObjectTable';
import { ConjunctionTable } from './components/ConjunctionTable';
import { AlertPanel } from './components/AlertPanel';
import { Analytics } from './pages/Analytics';
import { OrbitViewer3D } from './components/OrbitViewer3D';
import { ObjectDetailsModal } from './components/ObjectDetailsModal';
import { ConjunctionDetailsModal } from './components/ConjunctionDetailsModal';
import { api } from './services/api';
import { 
  OrbitalObject, 
  Conjunction, 
  Alert, 
  SystemStatistics,
  DataStatus 
} from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'objects' | 'conjunctions' | 'alerts' | 'analytics' | '3d'>('dashboard');
  const [stats, setStats] = useState<SystemStatistics | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [selectedObject, setSelectedObject] = useState<OrbitalObject | null>(null);
  const [selectedConjunction, setSelectedConjunction] = useState<Conjunction | null>(null);
  const [isObjectModalOpen, setIsObjectModalOpen] = useState<boolean>(false);
  const [isConjunctionModalOpen, setIsConjunctionModalOpen] = useState<boolean>(false);

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
        api.getPaginatedObjects(1, 100).then(r => r.items).catch(() => []),
        api.getConjunctions(50, 0).catch(() => []),
        api.getAlerts().catch(() => [])
      ]);

      if (statusData) setDataStatus(statusData);
      if (statsData) setStats(statsData);
      setObjects(objsData);
      setConjunctions(conjsData);
      setAlerts(alertsData);

      // If database catalog is empty on first boot, trigger initial sync
      if (objsData.length === 0) {
        await handleSync('DEMO');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with ORBITGUARD API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle TLE Synchronization (LIVE or DEMO)
  const handleSync = async (mode: 'LIVE' | 'DEMO' = 'LIVE') => {
    setIsSyncing(true);
    try {
      await api.syncData(mode);
      // Run screening on new data
      await api.triggerConjunctionScreening(24, 50.0, 3);
      // Reload fresh data
      const [statusData, statsData, objsData, conjsData, alertsData] = await Promise.all([
        api.getDataStatus(),
        api.getStatistics(),
        api.getPaginatedObjects(1, 100).then(r => r.items),
        api.getConjunctions(50, 0),
        api.getAlerts()
      ]);
      setDataStatus(statusData);
      setStats(statsData);
      setObjects(objsData);
      setConjunctions(conjsData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Conjunction Screening Run
  const handleScreenConjunctions = async () => {
    setIsScreening(true);
    try {
      await api.triggerConjunctionScreening(24, 50.0, 3);
      const [statsData, conjsData, alertsData] = await Promise.all([
        api.getStatistics(),
        api.getConjunctions(50, 0),
        api.getAlerts()
      ]);
      setStats(statsData);
      setConjunctions(conjsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Screening error:', err);
    } finally {
      setIsScreening(false);
    }
  };

  // Handle Alert Acknowledgment
  const handleAcknowledgeAlert = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      const [statsData, alertsData] = await Promise.all([
        api.getStatistics(),
        api.getAlerts()
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleSelectObject = (obj: OrbitalObject | null) => {
    setSelectedObject(obj);
    if (obj) setIsObjectModalOpen(true);
  };

  const handleSelectConjunction = (conj: Conjunction | null) => {
    setSelectedConjunction(conj);
    if (conj) setIsConjunctionModalOpen(true);
  };

  const handleInspectConjunctionFromAlert = async (conjId: number) => {
    const found = conjunctions.find((c) => c.id === conjId);
    if (found) {
      handleSelectConjunction(found);
    }
  };

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans radar-grid">
      {/* Top Aerospace Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onRefresh={() => handleSync('LIVE')}
        isRefreshing={isSyncing}
      />

      {/* Data Ingestion Status Banner */}
      <DataStatusBar
        dataStatus={dataStatus}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {loading && objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-3 font-mono text-cyan-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-neon" />
            <p className="text-sm">Connecting to ORBITGUARD SGP4 Ephemeris Engine...</p>
          </div>
        ) : error ? (
          <div className="bg-danger-500/10 border border-danger-500/30 rounded-xl p-6 text-center font-mono text-danger-neon">
            <p className="font-bold text-base mb-2">Backend Connection Alert</p>
            <p className="text-xs text-slate-300 mb-4">{error}</p>
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-space-800 hover:bg-space-700 text-white rounded-lg border border-space-700 text-xs"
            >
              RETRY CONNECTION
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                objects={objects}
                conjunctions={conjunctions}
                alerts={alerts}
                selectedObject={selectedObject}
                selectedConjunction={selectedConjunction}
                onSelectObject={handleSelectObject}
                onSelectConjunction={handleSelectConjunction}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'objects' && (
              <ObjectTable
                selectedObject={selectedObject}
                onSelectObject={handleSelectObject}
              />
            )}

            {activeTab === 'conjunctions' && (
              <ConjunctionTable
                conjunctions={conjunctions}
                selectedConjunction={selectedConjunction}
                onSelectConjunction={handleSelectConjunction}
                onScreenNew={handleScreenConjunctions}
                isScreening={isScreening}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertPanel
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onSelectConjunction={handleInspectConjunctionFromAlert}
              />
            )}

            {activeTab === 'analytics' && (
              <Analytics
                stats={stats}
                conjunctions={conjunctions}
              />
            )}

            {activeTab === '3d' && (
              <OrbitViewer3D
                objects={objects}
                conjunctions={conjunctions}
                selectedObject={selectedObject}
                selectedConjunction={selectedConjunction}
                onSelectObject={handleSelectObject}
                onSelectConjunction={handleSelectConjunction}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {isObjectModalOpen && selectedObject && (
        <ObjectDetailsModal
          object={selectedObject}
          onClose={() => setIsObjectModalOpen(false)}
        />
      )}

      {isConjunctionModalOpen && selectedConjunction && (
        <ConjunctionDetailsModal
          conjunction={selectedConjunction}
          onClose={() => setIsConjunctionModalOpen(false)}
        />
      )}
    </div>
  );
}
