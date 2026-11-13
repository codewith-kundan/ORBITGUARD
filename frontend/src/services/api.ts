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
import { calculateDynamicPasses } from './skySpotterEngine';

const rawApiUrl = ((import.meta as any).env?.VITE_API_URL as string) || '';
const API_BASE = rawApiUrl
  ? rawApiUrl.endsWith('/api')
    ? rawApiUrl
    : `${rawApiUrl.replace(/\/$/, '')}/api`
  : 'http://localhost:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 45000);
  const externalSignal = options?.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }
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
      const errorText = await res.text().catch(() => 'Request failed');
      throw new Error(`API Error [${res.status}]: ${errorText}`);
    }

    return await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      if (timedOut) {
        throw new Error('Request timed out waiting for the OrbitGuard API server.');
      }
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

const REFERENCE_GROUND_STATIONS: GroundStation[] = [
  { id: 'isro_istrac', name: 'ISRO ISTRAC (Bengaluru, India)', country: 'India', latitude_deg: 13.034, longitude_deg: 77.512, altitude_m: 920, min_elevation_deg: 5 },
  { id: 'isro_shar', name: 'ISRO SDSC SHAR (Sriharikota, India)', country: 'India', latitude_deg: 13.733, longitude_deg: 80.235, altitude_m: 20, min_elevation_deg: 5 },
  { id: 'isro_lucknow', name: 'ISRO Ground Station (Lucknow, India)', country: 'India', latitude_deg: 26.846, longitude_deg: 80.946, altitude_m: 123, min_elevation_deg: 5 },
  { id: 'isro_byalalu', name: 'ISRO Deep Space Network IDSN (Byalalu, India)', country: 'India', latitude_deg: 12.875, longitude_deg: 77.368, altitude_m: 815, min_elevation_deg: 5 },
  { id: 'isro_antarctica', name: 'ISRO AGEOS Bharati Station (Antarctica)', country: 'Antarctica', latitude_deg: -69.407, longitude_deg: 76.187, altitude_m: 35, min_elevation_deg: 5 },
  { id: 'nasa_ksc', name: 'NASA Kennedy Space Center (Florida, USA)', country: 'USA', latitude_deg: 28.572, longitude_deg: -80.649, altitude_m: 3, min_elevation_deg: 5 },
  { id: 'dsn_goldstone', name: 'NASA DSN Goldstone (California, USA)', country: 'USA', latitude_deg: 35.426, longitude_deg: -116.890, altitude_m: 1036, min_elevation_deg: 5 },
  { id: 'vandenberg_sfb', name: 'Vandenberg Space Force Base (California, USA)', country: 'USA', latitude_deg: 34.756, longitude_deg: -120.542, altitude_m: 112, min_elevation_deg: 5 },
  { id: 'esa_esoc', name: 'ESA ESOC (Darmstadt, Germany)', country: 'Germany', latitude_deg: 49.871, longitude_deg: 8.623, altitude_m: 140, min_elevation_deg: 5 },
  { id: 'dsn_madrid', name: 'NASA/ESA DSN Madrid (Robledo, Spain)', country: 'Spain', latitude_deg: 40.427, longitude_deg: -4.249, altitude_m: 834, min_elevation_deg: 5 },
  { id: 'esa_kiruna', name: 'ESA ESTRACK Kiruna (Sweden)', country: 'Sweden', latitude_deg: 67.857, longitude_deg: 20.964, altitude_m: 380, min_elevation_deg: 5 },
  { id: 'esa_kourou', name: 'ESA ESTRACK Kourou (French Guiana)', country: 'France', latitude_deg: 5.251, longitude_deg: -52.805, altitude_m: 15, min_elevation_deg: 5 },
  { id: 'dsn_canberra', name: 'NASA DSN Canberra (Tidbinbilla, Australia)', country: 'Australia', latitude_deg: -35.401, longitude_deg: 148.981, altitude_m: 650, min_elevation_deg: 5 },
  { id: 'jaxa_tsukuba', name: 'JAXA Tsukuba Space Center (Japan)', country: 'Japan', latitude_deg: 36.066, longitude_deg: 140.128, altitude_m: 30, min_elevation_deg: 5 },
  { id: 'ksat_svalbard', name: 'KSAT Svalbard Satellite Station (Norway)', country: 'Norway', latitude_deg: 78.229, longitude_deg: 15.407, altitude_m: 470, min_elevation_deg: 5 },
  { id: 'mcmurdo_antarctica', name: 'NASA McMurdo Ground Station (Antarctica)', country: 'Antarctica', latitude_deg: -77.846, longitude_deg: 166.668, altitude_m: 40, min_elevation_deg: 5 }
];

export const api = {
  // System Health & Data Provider Status
  getHealth: async (): Promise<SystemHealth> => {
    return request<SystemHealth>('/health');
  },

  getDataStatus: async (): Promise<DataStatus> => {
    try {
      return await request<DataStatus>('/data/status');
    } catch (err: any) {
      return {
        source: 'Backend Unreachable',
        mode: 'OFFLINE',
        is_live: false,
        is_live_error: true,
        total_objects: 0,
        last_updated: new Date().toISOString(),
        database_connected: false,
        error_message: err?.message || 'Unable to connect to telemetry backend'
      };
    }
  },

  getDataHealth: async (): Promise<SystemHealthDiagnostics> => {
    return request<SystemHealthDiagnostics>('/data/health');
  },

  syncData: async (mode: string = 'LIVE'): Promise<any> => {
    return request<any>(`/data/sync?mode=${encodeURIComponent(mode)}`, { method: 'POST' });
  },

  // Real-Time Orbital Objects & SGP4 Batch Ephemeris
  getBatchPositions: async (
    timestamp?: string,
    limit: number = 3000,
    signal?: AbortSignal
  ): Promise<PositionsBatchResponse> => {
    const params = new URLSearchParams();
    if (timestamp) params.append('timestamp', timestamp);
    params.append('limit', limit.toString());
    if (limit === 0) params.append('all', 'true');
    return request<PositionsBatchResponse>(`/objects/positions?${params.toString()}`, { signal });
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
      order
    });
    if (search) params.append('search', search);
    if (objectType && objectType !== 'ALL') params.append('object_type', objectType);
    return request<PaginatedObjectsResponse>(`/objects?${params.toString()}`);
  },

  getObjectDetails: async (id: number): Promise<OrbitalObject> => {
    return request<OrbitalObject>(`/objects/${id}/details`);
  },

  getObjectPosition: async (id: number, timestamp?: string): Promise<OrbitalPosition> => {
    const url = timestamp
      ? `/objects/${id}/position?timestamp=${encodeURIComponent(timestamp)}`
      : `/objects/${id}/position`;
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
    thresholdKm: number = 120.0,
    coarseStepMinutes: number = 3
  ): Promise<any> => {
    return request<any>(
      `/conjunctions/screen?window_hours=${windowHours}&threshold_km=${thresholdKm}&coarse_step_minutes=${coarseStepMinutes}`,
      { method: 'POST' }
    );
  },

  // System Statistics & Shell Density
  getStatistics: async (): Promise<SystemStatistics> => {
    return request<SystemStatistics>('/statistics');
  },

  getDensityProfile: async (): Promise<any> => {
    return request<any>('/density');
  },

  // NOAA Space Weather Telemetry
  getSpaceWeather: async (): Promise<any> => {
    return request<any>('/space-weather');
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
    try {
      const data = await request<GroundStation[]>('/overpass/stations');
      return data && data.length > 0 ? data : REFERENCE_GROUND_STATIONS;
    } catch {
      return REFERENCE_GROUND_STATIONS;
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

  // Real-Time Space Launches Manifest (Launch Library 2)
  getUpcomingLaunches: async (): Promise<{ source: string; status: string; cached?: boolean; count: number; launches: any[]; error?: string }> => {
    try {
      return await request<{ source: string; status: string; cached?: boolean; count: number; launches: any[]; error?: string }>('/launches');
    } catch {
      try {
        const res = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=15');
        if (res.ok) {
          const data = await res.json();
          const parsed = (data.results || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            vehicle: item.rocket?.configuration?.name || 'Launch Vehicle',
            site: item.pad?.location?.name ? `${item.pad.location.name}, ${item.pad.name}` : 'Launch Site Unknown',
            launchTimeUtc: item.net,
            targetOrbit: item.mission?.orbit?.name || 'Target Orbit Unspecified',
            status: (item.status?.name || 'SCHEDULED').toUpperCase(),
            missionDescription: item.mission?.description || 'Orbital payload deployment mission.',
            image: typeof item.image === 'string' ? item.image : item.image?.image_url
          }));
          return { source: 'Launch Library 2 (Direct Feed)', status: 'LIVE', count: parsed.length, launches: parsed };
        }
      } catch {
        // Explicit unavailable state instead of fabricated manifests
      }
      return {
        source: 'Launch Library 2 (Unavailable)',
        status: 'UNAVAILABLE',
        count: 0,
        launches: [],
        error: 'Both backend launch proxy and upstream Launch Library 2 API are unreachable.'
      };
    }
  },

  // Citizen Sky Spotter Visible Passes
  getVisiblePasses: async (
    cityId?: string,
    options?: { minElevation?: number; lat?: number; lon?: number; locationName?: string }
  ): Promise<{ status: string; total_passes: number; available_cities: any[]; passes: any[] }> => {
    try {
      const params = new URLSearchParams();
      if (cityId && cityId !== 'custom_gps') params.append('city_id', cityId);
      if (options?.minElevation != null) params.append('min_elevation', String(options.minElevation));
      if (options?.lat != null && options?.lon != null) {
        params.append('lat', String(options.lat));
        params.append('lon', String(options.lon));
        if (options.locationName) params.append('location_name', options.locationName);
      }
      const qs = params.toString();
      const url = qs ? `/spotter/visible-passes?${qs}` : '/spotter/visible-passes';
      return await request<{ status: string; total_passes: number; available_cities: any[]; passes: any[] }>(url);
    } catch {
      const target =
        options?.lat != null && options?.lon != null
          ? { lat: options.lat, lon: options.lon, name: options.locationName || 'Custom Location', id: 'custom_gps' }
          : cityId;
      return calculateDynamicPasses(target, options?.minElevation ?? 10.0, 48.0);
    }
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
  },

  // Scientific Validation & Provenance Center
  getValidationStatus: async (): Promise<any> => {
    return request<any>('/validation/status');
  },

  runLiveValidation: async (): Promise<any> => {
    return request<any>('/validation/run', { method: 'POST' });
  },

  getValidationReport: async (): Promise<any> => {
    return request<any>('/validation/report');
  },

  getConjunctionProvenance: async (conjunctionId: number): Promise<any> => {
    return request<any>(`/validation/provenance/${conjunctionId}`);
  },

  // Physics-Grounded AI Copilot
  queryAICopilot: async (query: string, context?: any): Promise<any> => {
    return request<any>('/ai/copilot/query', {
      method: 'POST',
      body: JSON.stringify({ query, context })
    });
  },

  getAICopilotTools: async (): Promise<any> => {
    return request<any>('/ai/copilot/tools');
  },

  getCAMRecommendation: async (conjunctionId: number): Promise<any> => {
    return request<any>(`/ai/copilot/cam_recommendation/${conjunctionId}`, { method: 'POST' });
  },

  verifyPostCAM: async (payload: { conjunction_id: number; delta_v_m_s: number; strategy_type: string }): Promise<any> => {
    return request<any>('/ai/copilot/verify_post_cam', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Conjunction Case Management & State Machine
  getCases: async (state?: string, priority?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (priority) params.append('priority', priority);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/cases${qs}`);
  },

  getCaseDetail: async (caseId: number): Promise<any> => {
    return request<any>(`/cases/${caseId}`);
  },

  getCaseByConjunction: async (conjunctionId: number): Promise<any> => {
    return request<any>(`/cases/by-conjunction/${conjunctionId}`);
  },

  transitionCase: async (
    caseId: number,
    payload: { target_state: string; operator?: string; rationale?: string; strategy_type?: string; delta_v_m_s?: number }
  ): Promise<any> => {
    return request<any>(`/cases/${caseId}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getCaseTimeline: async (caseId: number): Promise<any[]> => {
    return request<any[]>(`/cases/${caseId}/timeline`);
  },

  // Performance Telemetry & Profiler
  getPerformanceTelemetry: async (): Promise<any> => {
    return request<any>('/telemetry/summary');
  }
};
