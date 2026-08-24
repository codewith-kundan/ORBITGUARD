import {
  OrbitalObject,
  OrbitalPosition,
  PositionsBatchResponse,
  TrajectoryResponse,
  GroundTrackResponse,
  PaginatedObjectsResponse,
  Conjunction,
  ConjunctionSummary,
  Alert,
  SystemStatistics,
  DataStatus,
  DensityResponse,
  SystemHealth
} from '../types';

const API_BASE = 'http://localhost:8000/api';

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
  // System Health
  getHealth: async (): Promise<SystemHealth> => {
    return request<SystemHealth>('/health');
  },

  // Live Data Ingestion & Status
  getDataStatus: async (): Promise<DataStatus> => {
    return request<DataStatus>('/data/status');
  },

  syncData: async (mode: string = 'LIVE'): Promise<any> => {
    return request<any>(`/data/sync?mode=${mode}`, { method: 'POST' });
  },

  // Orbital Objects & Positions
  getBatchPositions: async (timestamp?: string, limit: number = 500): Promise<PositionsBatchResponse> => {
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

  getDensity: async (): Promise<DensityResponse> => {
    return request<DensityResponse>('/density');
  },

  getEvents: async (limit: number = 20): Promise<Conjunction[]> => {
    return request<Conjunction[]>(`/events?limit=${limit}`);
  },

  // Conjunctions & Screening
  getConjunctions: async (limit: number = 100, offset: number = 0): Promise<Conjunction[]> => {
    return request<Conjunction[]>(`/conjunctions?limit=${limit}&offset=${offset}`);
  },

  getHighRiskConjunctions: async (): Promise<Conjunction[]> => {
    return request<Conjunction[]>('/conjunctions/high-risk');
  },

  getConjunctionSummary: async (): Promise<ConjunctionSummary> => {
    return request<ConjunctionSummary>('/conjunctions/summary');
  },

  triggerConjunctionScreening: async (
    windowHours: number = 24,
    thresholdKm: number = 50.0,
    coarseStepMinutes: number = 5
  ): Promise<any> => {
    const params = new URLSearchParams({
      window_hours: windowHours.toString(),
      threshold_km: thresholdKm.toString(),
      coarse_step_minutes: coarseStepMinutes.toString()
    });
    return request<any>(`/conjunctions/screen?${params.toString()}`, { method: 'POST' });
  },

  // Alerts
  getAlerts: async (status?: string, severity?: string): Promise<Alert[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    return request<Alert[]>(`/alerts?${params.toString()}`);
  },

  acknowledgeAlert: async (id: number): Promise<Alert> => {
    return request<Alert>(`/alerts/${id}/acknowledge`, { method: 'PATCH' });
  },

  resolveAlert: async (id: number): Promise<Alert> => {
    return request<Alert>(`/alerts/${id}/resolve`, { method: 'PATCH' });
  },

  // Statistics
  getStatistics: async (): Promise<SystemStatistics> => {
    return request<SystemStatistics>('/statistics');
  },
};
