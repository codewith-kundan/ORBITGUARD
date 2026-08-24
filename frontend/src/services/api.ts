import { 
  OrbitalObject, 
  OrbitalPosition, 
  TrajectoryResponse, 
  Conjunction, 
  ConjunctionSummary, 
  Alert, 
  SystemStatistics, 
  ObjectType, 
  RiskLevel 
} from '../types';

const API_BASE = 'http://localhost:8000/api';

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Refresh TLE Data
  refreshData: async (): Promise<{ status: string; data_source: string; mode: string; total_objects: number }> => {
    const res = await fetch(`${API_BASE}/data/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh TLE catalog');
    return res.json();
  },

  // Objects
  getObjects: async (params?: { object_type?: ObjectType; search?: string; limit?: number }): Promise<OrbitalObject[]> => {
    const query = new URLSearchParams();
    if (params?.object_type) query.append('object_type', params.object_type);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    
    const res = await fetch(`${API_BASE}/objects?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orbital objects');
    return res.json();
  },

  getObjectById: async (id: number): Promise<OrbitalObject> => {
    const res = await fetch(`${API_BASE}/objects/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch object ${id}`);
    return res.json();
  },

  getObjectPosition: async (id: number): Promise<OrbitalPosition> => {
    const res = await fetch(`${API_BASE}/objects/${id}/position`);
    if (!res.ok) throw new Error(`Failed to propagate position for object ${id}`);
    return res.json();
  },

  getObjectTrajectory: async (id: number, hours = 24, stepMinutes = 5): Promise<TrajectoryResponse> => {
    const res = await fetch(`${API_BASE}/objects/${id}/trajectory?hours=${hours}&step_minutes=${stepMinutes}`);
    if (!res.ok) throw new Error(`Failed to calculate trajectory for object ${id}`);
    return res.json();
  },

  // Conjunctions
  screenConjunctions: async (windowHours = 24, thresholdKm = 50.0, coarseStepMinutes = 5) => {
    const res = await fetch(
      `${API_BASE}/conjunctions/screen?window_hours=${windowHours}&threshold_km=${thresholdKm}&coarse_step_minutes=${coarseStepMinutes}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error('Failed to run conjunction screening');
    return res.json();
  },

  getConjunctions: async (params?: { risk_level?: RiskLevel; limit?: number }): Promise<Conjunction[]> => {
    const query = new URLSearchParams();
    if (params?.risk_level) query.append('risk_level', params.risk_level);
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/conjunctions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch conjunctions');
    return res.json();
  },

  getHighRiskConjunctions: async (limit = 20): Promise<Conjunction[]> => {
    const res = await fetch(`${API_BASE}/conjunctions/high-risk?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch high-risk conjunctions');
    return res.json();
  },

  getConjunctionSummary: async (): Promise<ConjunctionSummary> => {
    const res = await fetch(`${API_BASE}/conjunctions/summary`);
    if (!res.ok) throw new Error('Failed to fetch conjunction summary');
    return res.json();
  },

  getConjunctionById: async (id: number): Promise<Conjunction> => {
    const res = await fetch(`${API_BASE}/conjunctions/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch conjunction ${id}`);
    return res.json();
  },

  // Alerts
  getAlerts: async (): Promise<Alert[]> => {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  acknowledgeAlert: async (id: number): Promise<Alert> => {
    const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to acknowledge alert ${id}`);
    return res.json();
  },

  // Statistics
  getStatistics: async (): Promise<SystemStatistics> => {
    const res = await fetch(`${API_BASE}/statistics`);
    if (!res.ok) throw new Error('Failed to fetch system statistics');
    return res.json();
  }
};
