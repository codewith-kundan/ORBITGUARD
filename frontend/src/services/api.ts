import {
  OrbitalObject,
  OrbitalPosition,
  PositionsBatchResponse,
  TrajectoryResponse,
  GroundTrackResponse,
  PaginatedObjectsResponse,
  Conjunction,
  Alert,
  SystemStatistics,
  DataStatus,
  DataHealthResponse,
  VisibilityPassesResponse,
  AIRiskPredictionResponse,
  WhatIfSimulationResponse,
  KesslerSimulationResponse,
  ADRSimulationResponse
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
  // System & Health
  getHealth: async (): Promise<{ status: string; service: string }> => {
    return request<{ status: string; service: string }>('/health');
  },

  getDataStatus: async (): Promise<DataStatus> => {
    return request<DataStatus>('/data/status');
  },

  getDataHealth: async (): Promise<DataHealthResponse> => {
    return request<DataHealthResponse>('/data/health');
  },

  syncData: async (mode: string = 'LIVE'): Promise<any> => {
    return request<any>(`/data/sync?mode=${mode}`, { method: 'POST' });
  },

  uploadCustomTle: async (content: string, sourceName: string = 'Custom Dataset'): Promise<any> => {
    const params = new URLSearchParams({
      content,
      source_name: sourceName
    });
    return request<any>(`/data/upload-tle?${params.toString()}`, { method: 'POST' });
  },

  // Orbital Objects & Positions
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

  // Conjunctions & Screening
  getConjunctions: async (limit: number = 100, offset: number = 0): Promise<Conjunction[]> => {
    return request<Conjunction[]>(`/conjunctions?limit=${limit}&offset=${offset}`);
  },

  getHighRiskConjunctions: async (): Promise<Conjunction[]> => {
    return request<Conjunction[]>('/conjunctions/high-risk');
  },

  triggerConjunctionScreening: async (
    windowHours: number = 72,
    thresholdKm: number = 150.0,
    coarseStepMinutes: number = 3
  ): Promise<any> => {
    return request<any>(
      `/conjunctions/screen?window_hours=${windowHours}&threshold_km=${thresholdKm}&coarse_step_minutes=${coarseStepMinutes}`,
      { method: 'POST' }
    );
  },

  // Alerts
  getAlerts: async (limit: number = 50): Promise<Alert[]> => {
    return request<Alert[]>(`/alerts?limit=${limit}`);
  },

  acknowledgeAlert: async (id: number): Promise<Alert> => {
    return request<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' });
  },

  resolveAlert: async (id: number, notes?: string): Promise<Alert> => {
    const params = new URLSearchParams();
    if (notes) params.append('notes', notes);
    return request<Alert>(`/alerts/${id}/resolve?${params.toString()}`, { method: 'POST' });
  },

  // Statistics & Analytics
  getStatistics: async (): Promise<SystemStatistics> => {
    return request<SystemStatistics>('/statistics');
  },

  // Satellite Pass Visibility Predictor
  getSatellitePasses: async (
    noradId: number,
    lat: number,
    lon: number,
    altM: number = 0.0,
    hours: number = 48.0,
    minElevation: number = 10.0
  ): Promise<VisibilityPassesResponse> => {
    const params = new URLSearchParams({
      norad_id: noradId.toString(),
      lat: lat.toString(),
      lon: lon.toString(),
      alt_m: altM.toString(),
      hours: hours.toString(),
      min_elevation: minElevation.toString()
    });
    return request<VisibilityPassesResponse>(`/visibility/passes?${params.toString()}`);
  },

  // AI Conjunction Risk Module
  predictAIRisk: async (
    missDistanceKm: number,
    relativeVelocityKmS: number,
    hoursToTca: number,
    altitudeKm: number = 550.0,
    inclinationDiffDeg: number = 15.0
  ): Promise<AIRiskPredictionResponse> => {
    const params = new URLSearchParams({
      miss_distance_km: missDistanceKm.toString(),
      relative_velocity_km_s: relativeVelocityKmS.toString(),
      hours_to_tca: hoursToTca.toString(),
      altitude_km: altitudeKm.toString(),
      inclination_diff_deg: inclinationDiffDeg.toString()
    });
    return request<AIRiskPredictionResponse>(`/ai/predict-risk?${params.toString()}`);
  },

  getConjunctionAIAnalysis: async (conjunctionId: number): Promise<AIRiskPredictionResponse> => {
    return request<AIRiskPredictionResponse>(`/ai/conjunction/${conjunctionId}/ai-analysis`);
  },

  // Space Simulations
  runWhatIfSimulation: async (
    targetName: string = 'SAT-1023',
    noradId: number = 44713,
    altitudeKm: number = 550.0,
    massKg: number = 800.0,
    fragmentCount: number = 150,
    scenario: string = 'EXPLOSION'
  ): Promise<WhatIfSimulationResponse> => {
    const params = new URLSearchParams({
      target_name: targetName,
      norad_id: noradId.toString(),
      altitude_km: altitudeKm.toString(),
      mass_kg: massKg.toString(),
      fragment_count: fragmentCount.toString(),
      scenario: scenario
    });
    return request<WhatIfSimulationResponse>(`/simulations/what-if?${params.toString()}`);
  },

  runKesslerSimulation: async (
    initialObjects: number = 19578,
    annualLaunches: number = 1500,
    collisionRate: number = 1.0,
    fragmentsPerCollision: number = 400,
    years: number = 30,
    pmdCompliance: number = 85.0
  ): Promise<KesslerSimulationResponse> => {
    const params = new URLSearchParams({
      initial_objects: initialObjects.toString(),
      annual_launches: annualLaunches.toString(),
      collision_rate: collisionRate.toString(),
      fragments_per_collision: fragmentsPerCollision.toString(),
      years: years.toString(),
      pmd_compliance: pmdCompliance.toString()
    });
    return request<KesslerSimulationResponse>(`/simulations/kessler?${params.toString()}`);
  },

  runADRSimulation: async (
    method: string = 'ROBOTIC_CAPTURE',
    annualRemovals: number = 15,
    targetAltitude: number = 800.0,
    years: number = 20
  ): Promise<ADRSimulationResponse> => {
    const params = new URLSearchParams({
      method: method,
      annual_removals: annualRemovals.toString(),
      target_altitude: targetAltitude.toString(),
      years: years.toString()
    });
    return request<ADRSimulationResponse>(`/simulations/adr?${params.toString()}`);
  },

  // Export URLs
  getExportUrl: (type: 'objects' | 'conjunctions', format: 'json' | 'csv' = 'json'): string => {
    return `${API_BASE}/export/${type}?format=${format}&limit=1000`;
  }
};
