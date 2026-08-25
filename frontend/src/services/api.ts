import {
  OrbitalObject,
  OrbitalPosition,
  PositionsBatchResponse,
  TrajectoryResponse,
  GroundTrackResponse,
  PaginatedObjectsResponse,
  Conjunction,
  SystemStatistics,
  DataStatus,
  SystemHealth,
  SystemHealthDiagnostics,
  Alert,
  CAMPlanResponse,
  CAMSimulateRequest,
  CAMSimulateResponse,
  GroundStation,
  OverpassRequest,
  OverpassResponse,
  GroundTrackRibbonResponse,
  BreakupSimulateRequest,
  BreakupResponse
} from '../types';

const rawApiUrl = ((import.meta as any).env?.VITE_API_URL as string) || '';
const API_BASE = rawApiUrl ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`) : 'http://localhost:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Network error');
    throw new Error(`API Error [${res.status}]: ${errorText}`);
  }

  return res.json();
}

export const api = {
  // System Health & Data Provider Status
  getHealth: async (): Promise<SystemHealth> => {
    return request<SystemHealth>('/health');
  },

  getDataStatus: async (): Promise<DataStatus> => {
    return request<DataStatus>('/data/status');
  },

  getDataHealth: async (): Promise<SystemHealthDiagnostics> => {
    return request<SystemHealthDiagnostics>('/data/health');
  },

  syncData: async (mode: string = 'LIVE'): Promise<any> => {
    return request<any>(`/data/sync?mode=${mode}`, { method: 'POST' });
  },

  // Real-Time Orbital Objects & SGP4 Batch Ephemeris
  getBatchPositions: async (timestamp?: string, limit: number = 1000): Promise<PositionsBatchResponse> => {
    const params = new URLSearchParams();
    if (timestamp) params.append('timestamp', timestamp);
    params.append('limit', limit.toString());
    return request<PositionsBatchResponse>(`/objects/positions?${params.toString()}`);
  },

  getPaginatedObjects: async (
    page: number = 1,
    pageSize: number = 50,
    search?: string,
    objectType?: string,
    sortBy: string = 'norad_id',
    order: string = 'asc'
  ): Promise<PaginatedObjectsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      sort_by: sortBy,
      order: order
    });
    if (search) params.append('search', search);
    if (objectType && objectType !== 'ALL') params.append('object_type', objectType);
    return request<PaginatedObjectsResponse>(`/objects?${params.toString()}`);
  },

  getObjectDetails: async (id: number): Promise<OrbitalObject> => {
    return request<OrbitalObject>(`/objects/${id}/details`);
  },

  getObjectPosition: async (id: number, timestamp?: string): Promise<OrbitalPosition> => {
    const url = timestamp ? `/objects/${id}/position?timestamp=${encodeURIComponent(timestamp)}` : `/objects/${id}/position`;
    return request<OrbitalPosition>(url);
  },

  getObjectTrajectory: async (
    id: number,
    hours: number = 24,
    stepMinutes: number = 5,
    timestamp?: string
  ): Promise<TrajectoryResponse> => {
    const params = new URLSearchParams({
      hours: hours.toString(),
      step_minutes: stepMinutes.toString()
    });
    if (timestamp) params.append('timestamp', timestamp);
    return request<TrajectoryResponse>(`/objects/${id}/trajectory?${params.toString()}`);
  },

  getObjectGroundTrack: async (
    id: number,
    durationMinutes: number = 180,
    stepMinutes: number = 2,
    timestamp?: string
  ): Promise<GroundTrackResponse> => {
    const params = new URLSearchParams({
      duration_minutes: durationMinutes.toString(),
      step_minutes: stepMinutes.toString()
    });
    if (timestamp) params.append('timestamp', timestamp);
    return request<GroundTrackResponse>(`/objects/${id}/ground-track?${params.toString()}`);
  },

  // Conjunction Screening & Close Encounter Assessment
  getConjunctions: async (limit: number = 100, offset: number = 0): Promise<Conjunction[]> => {
    return request<Conjunction[]>(`/conjunctions?limit=${limit}&offset=${offset}`);
  },

  getHighRiskConjunctions: async (): Promise<Conjunction[]> => {
    return request<Conjunction[]>('/conjunctions/high-risk');
  },

  triggerConjunctionScreening: async (
    windowHours: number = 24,
    thresholdKm: number = 500.0,
    coarseStepMinutes: number = 3
  ): Promise<any> => {
    return request<any>(
      `/conjunctions/screen?window_hours=${windowHours}&threshold_km=${thresholdKm}&coarse_step_minutes=${coarseStepMinutes}`,
      { method: 'POST' }
    );
  },

  // System Statistics
  getStatistics: async (): Promise<SystemStatistics> => {
    return request<SystemStatistics>('/statistics');
  },

  // Alerts
  getAlerts: async (limit: number = 50): Promise<Alert[]> => {
    return request<Alert[]>(`/alerts?limit=${limit}`);
  },

  acknowledgeAlert: async (id: number): Promise<Alert> => {
    return request<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' });
  },

  // Collision Avoidance Maneuver (CAM) Planner
  getCAMPlan: async (conjunctionId: number): Promise<CAMPlanResponse> => {
    return request<CAMPlanResponse>(`/cam/plan/${conjunctionId}`);
  },

  simulateCAM: async (payload: CAMSimulateRequest): Promise<CAMSimulateResponse> => {
    return request<CAMSimulateResponse>('/cam/simulate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Ground Station Overpass & 2D Ground Track Ribbons
  getGroundStations: async (): Promise<GroundStation[]> => {
    return request<GroundStation[]>('/overpass/stations');
  },

  predictOverpasses: async (payload: OverpassRequest): Promise<OverpassResponse> => {
    return request<OverpassResponse>('/overpass/predict', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getGroundTrack: async (noradId: number): Promise<GroundTrackRibbonResponse> => {
    return request<GroundTrackRibbonResponse>(`/overpass/ground-track/${noradId}`);
  },

  // NASA Standard Satellite Breakup & Fragmentation Simulator
  simulateBreakup: async (payload: BreakupSimulateRequest): Promise<BreakupResponse> => {
    return request<BreakupResponse>('/breakup/simulate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  simulateConjunctionBreakup: async (conjunctionId: number): Promise<BreakupResponse> => {
    return request<BreakupResponse>(`/breakup/conjunction/${conjunctionId}`);
  }
};
