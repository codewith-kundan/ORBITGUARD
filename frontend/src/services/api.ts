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
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for Render cold starts / large queries
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
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out while waiting for backend response (Render free instance may be waking up). Please retry.');
    }
    throw err;
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
    const fallbackStations: GroundStation[] = [
      { id: 'ISTRAC', name: 'ISTRAC Bangalore', country: 'India', latitude_deg: 13.034, longitude_deg: 77.512, altitude_m: 920, min_elevation_deg: 5 },
      { id: 'SDSC', name: 'Satish Dhawan SHAR', country: 'India', latitude_deg: 13.72, longitude_deg: 80.23, altitude_m: 20, min_elevation_deg: 5 },
      { id: 'CNES-TLS', name: 'CNES Toulouse', country: 'France', latitude_deg: 43.428, longitude_deg: 1.498, altitude_m: 150, min_elevation_deg: 5 },
      { id: 'ESOC-DA', name: 'ESA ESOC Darmstadt', country: 'Germany', latitude_deg: 49.871, longitude_deg: 8.623, altitude_m: 140, min_elevation_deg: 5 },
      { id: 'GSFC', name: 'NASA GSFC Greenbelt', country: 'United States', latitude_deg: 38.991, longitude_deg: -76.852, altitude_m: 53, min_elevation_deg: 5 },
      { id: 'JSC', name: 'NASA JSC Houston', country: 'United States', latitude_deg: 29.559, longitude_deg: -95.089, altitude_m: 5, min_elevation_deg: 5 },
      { id: 'VAND', name: 'Vandenberg SFB', country: 'United States', latitude_deg: 34.756, longitude_deg: -120.542, altitude_m: 112, min_elevation_deg: 5 },
      { id: 'CAPE', name: 'Cape Canaveral SFS', country: 'United States', latitude_deg: 28.396, longitude_deg: -80.605, altitude_m: 3, min_elevation_deg: 5 },
      { id: 'BAIK', name: 'Baikonur Cosmodrome', country: 'Kazakhstan', latitude_deg: 45.965, longitude_deg: 63.305, altitude_m: 100, min_elevation_deg: 5 },
      { id: 'PLST', name: 'Plesetsk Cosmodrome', country: 'Russia', latitude_deg: 62.927, longitude_deg: 40.577, altitude_m: 130, min_elevation_deg: 5 },
      { id: 'XICH', name: 'Xichang Launch Center', country: 'China', latitude_deg: 28.246, longitude_deg: 102.027, altitude_m: 1825, min_elevation_deg: 5 },
      { id: 'TNEG', name: 'Tanegashima Space Center', country: 'Japan', latitude_deg: 30.400, longitude_deg: 131.003, altitude_m: 40, min_elevation_deg: 5 },
      { id: 'KOUR', name: 'Guiana Space Centre', country: 'French Guiana', latitude_deg: 5.236, longitude_deg: -52.768, altitude_m: 15, min_elevation_deg: 5 },
      { id: 'WOOMER', name: 'Woomera Test Range', country: 'Australia', latitude_deg: -31.168, longitude_deg: 136.826, altitude_m: 168, min_elevation_deg: 5 },
      { id: 'ALCANT', name: 'Alcântara Launch Center', country: 'Brazil', latitude_deg: -2.373, longitude_deg: -44.396, altitude_m: 10, min_elevation_deg: 5 },
      { id: 'SVALBARD', name: 'SvalSat Svalbard', country: 'Norway', latitude_deg: 78.229, longitude_deg: 15.408, altitude_m: 440, min_elevation_deg: 5 },
      { id: 'DSCOVR', name: 'McMurdo Station', country: 'Antarctica', latitude_deg: -77.846, longitude_deg: 166.668, altitude_m: 24, min_elevation_deg: 5 },
      { id: 'MALINDI', name: 'Malindi Ground Station', country: 'Kenya', latitude_deg: -2.996, longitude_deg: 40.194, altitude_m: 30, min_elevation_deg: 5 },
      { id: 'HARTS', name: 'HartRAO Hartebeesthoek', country: 'South Africa', latitude_deg: -25.887, longitude_deg: 27.687, altitude_m: 1400, min_elevation_deg: 5 },
      { id: 'KIRUNA', name: 'Esrange Kiruna', country: 'Sweden', latitude_deg: 67.893, longitude_deg: 21.104, altitude_m: 420, min_elevation_deg: 5 },
      { id: 'CANBERRA', name: 'CDSCC Canberra', country: 'Australia', latitude_deg: -35.401, longitude_deg: 148.981, altitude_m: 680, min_elevation_deg: 5 },
      { id: 'MADRID', name: 'MDSCC Robledo', country: 'Spain', latitude_deg: 40.431, longitude_deg: -4.249, altitude_m: 833, min_elevation_deg: 5 },
      { id: 'GOLDSTONE', name: 'GDSCC Goldstone', country: 'United States', latitude_deg: 35.427, longitude_deg: -116.890, altitude_m: 900, min_elevation_deg: 5 },
      { id: 'HAWAII', name: 'AMOS Maui', country: 'United States', latitude_deg: 20.7084, longitude_deg: -156.258, altitude_m: 3058, min_elevation_deg: 5 },
    ];
    try {
      const data = await request<GroundStation[]>('/overpass/stations');
      if (data && data.length > 0) return data;
      return fallbackStations;
    } catch {
      return fallbackStations;
    }
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
