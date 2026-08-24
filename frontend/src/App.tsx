import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
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
  SystemStatistics 
} from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'objects' | 'conjunctions' | 'alerts' | 'analytics' | '3d'>('dashboard');
  const [stats, setStats] = useState<SystemStatistics | null>(null);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [selectedObject, setSelectedObject] = useState<OrbitalObject | null>(null);
  const [selectedConjunction, setSelectedConjunction] = useState<Conjunction | null>(null);
  const [isObjectModalOpen, setIsObjectModalOpen] = useState<boolean>(false);
  const [isConjunctionModalOpen, setIsConjunctionModalOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load all system data
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const [statsData, objsData, conjsData, alertsData] = await Promise.all([
        api.getStatistics().catch(() => null),
        api.getObjects({ limit: 100 }).catch(() => []),
        api.getConjunctions({ limit: 50 }).catch(() => []),
        api.getAlerts().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setObjects(objsData);
      setConjunctions(conjsData);
      setAlerts(alertsData);

      // If catalog is empty on first boot, trigger initial sync
      if (objsData.length === 0) {
        await handleRefresh();
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

  // Handle TLE Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.refreshData();
      // Run screening on new data
      await api.screenConjunctions(24, 60.0, 5);
      // Reload fresh data
      const [statsData, objsData, conjsData, alertsData] = await Promise.all([
        api.getStatistics(),
        api.getObjects({ limit: 100 }),
        api.getConjunctions({ limit: 50 }),
        api.getAlerts()
      ]);
      setStats(statsData);
      setObjects(objsData);
      setConjunctions(conjsData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Conjunction Screening Run
  const handleScreenConjunctions = async () => {
    setIsScreening(true);
    try {
      await api.screenConjunctions(24, 60.0, 5);
      const [statsData, conjsData, alertsData] = await Promise.all([
        api.getStatistics(),
        api.getConjunctions({ limit: 50 }),
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

  const handleSelectObject = (obj: OrbitalObject) => {
    setSelectedObject(obj);
    setIsObjectModalOpen(true);
  };

  const handleSelectConjunction = (conj: Conjunction) => {
    setSelectedConjunction(conj);
    setIsConjunctionModalOpen(true);
  };

  const handleInspectConjunctionFromAlert = async (conjId: number) => {
    const found = conjunctions.find((c) => c.id === conjId);
    if (found) {
      handleSelectConjunction(found);
    } else {
      try {
        const conj = await api.getConjunctionById(conjId);
        handleSelectConjunction(conj);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans radar-grid">
      {/* Top Aerospace Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
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
                objects={objects}
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
                onSelectObject={handleSelectObject}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {isObjectModalOpen && (
        <ObjectDetailsModal
          object={selectedObject}
          onClose={() => setIsObjectModalOpen(false)}
        />
      )}

      {isConjunctionModalOpen && (
        <ConjunctionDetailsModal
          conjunction={selectedConjunction}
          onClose={() => setIsConjunctionModalOpen(false)}
        />
      )}
    </div>
  );
}
