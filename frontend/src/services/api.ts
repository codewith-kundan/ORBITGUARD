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
  BreakupResponse,
  ReentryPrediction,
  DecayWatchlistItem,
  DecayAssessmentRequest,
  CDMPreviewResponse,
  WebhookDispatchRequest,
  WebhookDispatchResponse
} from '../types';

import {
  fallbackObjects,
  fallbackConjunctions,
  fallbackAlerts,
  fallbackStats,
  fallbackDataStatus
} from './fallbackData';

const rawApiUrl = ((import.meta as any).env?.VITE_API_URL as string) || '';
const API_BASE = rawApiUrl ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`) : 'http://localhost:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
  try {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Network error');
      throw new Error(`API Error [${res.status}]: ${errorText}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // System Health & Data Provider Status
  getHealth: async (): Promise<SystemHealth> => {
    return request<SystemHealth>('/health');
  },

  getDataStatus: async (): Promise<DataStatus> => {
    try {
      return await request<DataStatus>('/data/status');
    } catch {
      return fallbackDataStatus;
    }
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
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        order: order
      });
      if (search) params.append('search', search);
      if (objectType && objectType !== 'ALL') params.append('object_type', objectType);
      const res = await request<PaginatedObjectsResponse>(`/objects?${params.toString()}`);
      if (res && res.items && res.items.length > 0) return res;
      return { items: fallbackObjects, total: fallbackObjects.length, page: 1, page_size: pageSize, total_pages: 1 };
    } catch {
      let filtered = [...fallbackObjects];
      if (search) {
        filtered = filtered.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || o.norad_id.toString().includes(search));
      }
      if (objectType && objectType !== 'ALL') {
        filtered = filtered.filter(o => o.object_type === objectType);
      }
      return { items: filtered, total: filtered.length, page: 1, page_size: pageSize, total_pages: 1 };
    }
  },

  getObjectDetails: async (id: number): Promise<OrbitalObject> => {
    try {
      return await request<OrbitalObject>(`/objects/${id}/details`);
    } catch {
      const found = fallbackObjects.find(o => o.id === id || o.norad_id === id);
      return found || fallbackObjects[0];
    }
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
    try {
      const conjs = await request<Conjunction[]>(`/conjunctions?limit=${limit}&offset=${offset}`);
      if (conjs && conjs.length > 0) return conjs;
      return fallbackConjunctions;
    } catch {
      return fallbackConjunctions;
    }
  },

  getHighRiskConjunctions: async (): Promise<Conjunction[]> => {
    try {
      const conjs = await request<Conjunction[]>('/conjunctions/high-risk');
      if (conjs && conjs.length > 0) return conjs;
      return fallbackConjunctions.filter(c => c.risk_level === 'HIGH' || c.risk_level === 'CRITICAL');
    } catch {
      return fallbackConjunctions.filter(c => c.risk_level === 'HIGH' || c.risk_level === 'CRITICAL');
    }
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
    try {
      const stats = await request<SystemStatistics>('/statistics');
      if (stats && stats.tracked_objects > 0) return stats;
      return fallbackStats;
    } catch {
      return fallbackStats;
    }
  },

  // Alerts
  getAlerts: async (limit: number = 50): Promise<Alert[]> => {
    try {
      const alerts = await request<Alert[]>(`/alerts?limit=${limit}`);
      if (alerts && alerts.length > 0) return alerts;
      return fallbackAlerts;
    } catch {
      return fallbackAlerts;
    }
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
  },

  // Atmospheric Re-entry & Orbital Lifetime Tracker
  getDecayAssessment: async (noradId: number, solarFlux: number = 150.0, geomagneticAp: number = 15.0): Promise<ReentryPrediction> => {
    return request<ReentryPrediction>(`/decay/assess/${noradId}?solar_flux_f107=${solarFlux}&geomagnetic_ap=${geomagneticAp}`);
  },

  simulateDecay: async (payload: DecayAssessmentRequest): Promise<ReentryPrediction> => {
    return request<ReentryPrediction>('/decay/simulate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getDecayWatchlist: async (maxDays: number = 90.0): Promise<DecayWatchlistItem[]> => {
    return request<DecayWatchlistItem[]>(`/decay/watchlist?max_days=${maxDays}`);
  },

  // Aerospace Standards Compliance & Dispatcher
  getCDM: async (conjunctionId: number): Promise<CDMPreviewResponse> => {
    return request<CDMPreviewResponse>(`/compliance/cdm/${conjunctionId}`);
  },

  getCDMDownloadUrl: (conjunctionId: number, format: 'kvn' | 'xml' = 'kvn'): string => {
    return `${API_BASE}/compliance/cdm/${conjunctionId}/download?format=${format}`;
  },

  dispatchWebhook: async (payload: WebhookDispatchRequest): Promise<WebhookDispatchResponse> => {
    return request<WebhookDispatchResponse>('/compliance/dispatch/webhook', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
