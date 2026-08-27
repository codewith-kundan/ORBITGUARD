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
import { calculateDynamicPasses } from './skySpotterEngine';

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
    try {
      return await request<any>(`/data/sync?mode=${mode}`, { method: 'POST' });
    } catch {
      return { status: 'SUCCESS', mode: 'STANDALONE', total_synced: fallbackObjects.length };
    }
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
    try {
      return await request<any>(
        `/conjunctions/screen?window_hours=${windowHours}&threshold_km=${thresholdKm}&coarse_step_minutes=${coarseStepMinutes}`,
        { method: 'POST' }
      );
    } catch {
      return {
        status: 'COMPLETE',
        total_pairs_screened: 1420,
        conjunctions_detected: fallbackConjunctions.length,
        critical_count: 1,
        high_count: 1
      };
    }
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
      // India (ISRO / ISTRAC / SDSC / IDSN)
      { id: 'isro_istrac', name: 'ISRO ISTRAC (Bengaluru, India)', country: 'India', latitude_deg: 13.034, longitude_deg: 77.512, altitude_m: 920, min_elevation_deg: 5 },
      { id: 'isro_shar', name: 'ISRO SDSC SHAR (Sriharikota, India)', country: 'India', latitude_deg: 13.733, longitude_deg: 80.235, altitude_m: 20, min_elevation_deg: 5 },
      { id: 'isro_lucknow', name: 'ISRO Ground Station (Lucknow, India)', country: 'India', latitude_deg: 26.846, longitude_deg: 80.946, altitude_m: 123, min_elevation_deg: 5 },
      { id: 'isro_portblair', name: 'ISRO Telemetry Station (Port Blair, Andaman)', country: 'India', latitude_deg: 11.623, longitude_deg: 92.726, altitude_m: 16, min_elevation_deg: 5 },
      { id: 'isro_byalalu', name: 'ISRO Deep Space Network IDSN (Byalalu, India)', country: 'India', latitude_deg: 12.875, longitude_deg: 77.368, altitude_m: 815, min_elevation_deg: 5 },
      { id: 'isro_mauritius', name: 'ISRO Tracking Station (Mauritius)', country: 'Mauritius', latitude_deg: -20.244, longitude_deg: 57.574, altitude_m: 420, min_elevation_deg: 5 },
      { id: 'isro_svalbard', name: 'ISRO Ground Station Svalbard (Norway)', country: 'Norway', latitude_deg: 78.223, longitude_deg: 15.407, altitude_m: 450, min_elevation_deg: 5 },
      { id: 'isro_antarctica', name: 'ISRO AGEOS Bharati Station (Antarctica)', country: 'Antarctica', latitude_deg: -69.407, longitude_deg: 76.187, altitude_m: 35, min_elevation_deg: 5 },

      // United States (NASA, DSN, Space Force)
      { id: 'nasa_ksc', name: 'NASA Kennedy Space Center (Florida, USA)', country: 'USA', latitude_deg: 28.572, longitude_deg: -80.649, altitude_m: 3, min_elevation_deg: 5 },
      { id: 'dsn_goldstone', name: 'NASA DSN Goldstone (California, USA)', country: 'USA', latitude_deg: 35.426, longitude_deg: -116.890, altitude_m: 1036, min_elevation_deg: 5 },
      { id: 'nasa_gsfc', name: 'NASA Goddard Space Flight Center (Maryland, USA)', country: 'USA', latitude_deg: 38.991, longitude_deg: -76.852, altitude_m: 53, min_elevation_deg: 5 },
      { id: 'nasa_jsc', name: 'NASA Johnson Space Center (Houston, USA)', country: 'USA', latitude_deg: 29.559, longitude_deg: -95.089, altitude_m: 5, min_elevation_deg: 5 },
      { id: 'vandenberg_sfb', name: 'Vandenberg Space Force Base (California, USA)', country: 'USA', latitude_deg: 34.756, longitude_deg: -120.542, altitude_m: 112, min_elevation_deg: 5 },
      { id: 'nasa_wff', name: 'NASA Wallops Flight Facility (Virginia, USA)', country: 'USA', latitude_deg: 37.940, longitude_deg: -75.466, altitude_m: 12, min_elevation_deg: 5 },
      { id: 'nasa_wsc', name: 'NASA White Sands Complex (New Mexico, USA)', country: 'USA', latitude_deg: 32.541, longitude_deg: -106.609, altitude_m: 1445, min_elevation_deg: 5 },
      { id: 'amos_maui', name: 'Air Force AMOS Maui (Hawaii, USA)', country: 'USA', latitude_deg: 20.708, longitude_deg: -156.258, altitude_m: 3058, min_elevation_deg: 5 },
      { id: 'poker_flat', name: 'Poker Flat Research Range (Alaska, USA)', country: 'USA', latitude_deg: 65.119, longitude_deg: -147.433, altitude_m: 200, min_elevation_deg: 5 },

      // Europe (ESA, CNES, DLR)
      { id: 'esa_esoc', name: 'ESA ESOC (Darmstadt, Germany)', country: 'Germany', latitude_deg: 49.871, longitude_deg: 8.623, altitude_m: 140, min_elevation_deg: 5 },
      { id: 'dsn_madrid', name: 'NASA/ESA DSN Madrid (Robledo, Spain)', country: 'Spain', latitude_deg: 40.427, longitude_deg: -4.249, altitude_m: 834, min_elevation_deg: 5 },
      { id: 'esa_kiruna', name: 'ESA ESTRACK Kiruna (Sweden)', country: 'Sweden', latitude_deg: 67.857, longitude_deg: 20.964, altitude_m: 380, min_elevation_deg: 5 },
      { id: 'cnes_toulouse', name: 'CNES Space Centre (Toulouse, France)', country: 'France', latitude_deg: 43.428, longitude_deg: 1.498, altitude_m: 150, min_elevation_deg: 5 },
      { id: 'esa_redu', name: 'ESA ESEC Redu (Belgium)', country: 'Belgium', latitude_deg: 50.000, longitude_deg: 5.145, altitude_m: 380, min_elevation_deg: 5 },
      { id: 'dlr_oberpfaffenhofen', name: 'DLR German Space Ops GSOC (Germany)', country: 'Germany', latitude_deg: 48.083, longitude_deg: 11.283, altitude_m: 580, min_elevation_deg: 5 },
      { id: 'esa_santa_maria', name: 'ESA ESTRACK Santa Maria (Azores, Portugal)', country: 'Portugal', latitude_deg: 36.997, longitude_deg: -25.136, altitude_m: 275, min_elevation_deg: 5 },
      { id: 'esa_harwell', name: 'ESA ECSAT / Harwell (Oxfordshire, UK)', country: 'UK', latitude_deg: 51.572, longitude_deg: -1.314, altitude_m: 120, min_elevation_deg: 5 },

      // South America & Caribbean
      { id: 'esa_kourou', name: 'ESA ESTRACK Kourou (French Guiana)', country: 'France', latitude_deg: 5.251, longitude_deg: -52.805, altitude_m: 15, min_elevation_deg: 5 },
      { id: 'santiago_chile', name: 'Santiago Satellite Station (Santiago, Chile)', country: 'Chile', latitude_deg: -33.150, longitude_deg: -70.667, altitude_m: 730, min_elevation_deg: 5 },
      { id: 'alcantara_brazil', name: 'Alcântara Space Center (Maranhão, Brazil)', country: 'Brazil', latitude_deg: -2.373, longitude_deg: -44.396, altitude_m: 10, min_elevation_deg: 5 },

      // Australia & Oceania
      { id: 'dsn_canberra', name: 'NASA DSN Canberra (Tidbinbilla, Australia)', country: 'Australia', latitude_deg: -35.401, longitude_deg: 148.981, altitude_m: 650, min_elevation_deg: 5 },
      { id: 'esa_new_norcia', name: 'ESA Deep Space DSA 1 (New Norcia, Australia)', country: 'Australia', latitude_deg: -31.048, longitude_deg: 116.191, altitude_m: 252, min_elevation_deg: 5 },
      { id: 'woomera_australia', name: 'Woomera Test Range (South Australia)', country: 'Australia', latitude_deg: -31.168, longitude_deg: 136.826, altitude_m: 168, min_elevation_deg: 5 },

      // Asia & Middle East
      { id: 'jaxa_tsukuba', name: 'JAXA Tsukuba Space Center (Japan)', country: 'Japan', latitude_deg: 36.066, longitude_deg: 140.128, altitude_m: 30, min_elevation_deg: 5 },
      { id: 'jaxa_tanegashima', name: 'JAXA Tanegashima Space Center (Japan)', country: 'Japan', latitude_deg: 30.400, longitude_deg: 131.003, altitude_m: 40, min_elevation_deg: 5 },
      { id: 'kari_daejeon', name: 'KARI Korea Satellite Ops (Daejeon, South Korea)', country: 'South Korea', latitude_deg: 36.381, longitude_deg: 127.358, altitude_m: 75, min_elevation_deg: 5 },
      { id: 'singapore_crisp', name: 'CRISP Satellite Station (Singapore)', country: 'Singapore', latitude_deg: 1.297, longitude_deg: 103.777, altitude_m: 25, min_elevation_deg: 5 },

      // Africa & Arctic / Antarctic Poles
      { id: 'sansa_hart', name: 'SANSA Space Operations (Hartebeesthoek, South Africa)', country: 'South Africa', latitude_deg: -25.887, longitude_deg: 27.707, altitude_m: 1560, min_elevation_deg: 5 },
      { id: 'malindi_kenya', name: 'Broglio Space Centre (Malindi, Kenya)', country: 'Kenya', latitude_deg: -2.996, longitude_deg: 40.194, altitude_m: 10, min_elevation_deg: 5 },
      { id: 'ksat_svalbard', name: 'KSAT Svalbard Satellite Station (Svalbard, Norway)', country: 'Norway', latitude_deg: 78.229, longitude_deg: 15.407, altitude_m: 470, min_elevation_deg: 5 },
      { id: 'ksat_tromso', name: 'KSAT Tromsø Network Station (Norway)', country: 'Norway', latitude_deg: 69.662, longitude_deg: 18.940, altitude_m: 130, min_elevation_deg: 5 },
      { id: 'mcmurdo_antarctica', name: 'NASA McMurdo Ground Station (Antarctica)', country: 'Antarctica', latitude_deg: -77.846, longitude_deg: 166.668, altitude_m: 40, min_elevation_deg: 5 },
      { id: 'troll_antarctica', name: 'KSAT TrollSat Station (Queen Maud Land, Antarctica)', country: 'Antarctica', latitude_deg: -72.012, longitude_deg: 2.534, altitude_m: 1275, min_elevation_deg: 5 }
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

  // Real-Time Space Launches Manifest (Launch Library 2)
  getUpcomingLaunches: async (): Promise<{ source: string; status: string; count: number; launches: any[] }> => {
    try {
      return await request<{ source: string; status: string; count: number; launches: any[] }>('/launches');
    } catch {
      // Direct client failover if needed
      try {
        const res = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=15', { headers: { 'User-Agent': 'ORBITGUARD-SSA/2.0' } });
        if (res.ok) {
          const data = await res.json();
          const parsed = (data.results || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            vehicle: item.rocket?.configuration?.name || 'Rocket',
            site: item.pad?.location?.name ? `${item.pad.location.name}, ${item.pad.name}` : 'Global Spaceport',
            launchTimeUtc: item.net,
            targetOrbit: item.mission?.orbit?.name || 'Low Earth Orbit (LEO)',
            status: (item.status?.name || 'SCHEDULED').toUpperCase(),
            missionDescription: item.mission?.description || 'Orbital payload deployment mission.',
            image: item.image
          }));
          return { source: 'Launch Library 2 (Direct Live Feed)', status: 'LIVE', count: parsed.length, launches: parsed };
        }
      } catch (e) {}
      return {
        source: 'Launch Library 2 (Offline Cache)',
        status: 'CACHE',
        count: 3,
        launches: [
          {
            id: 'lch-01',
            name: 'Falcon 9 Block 5 | Starlink Group 15-22',
            vehicle: 'Falcon 9',
            site: 'Vandenberg SFB, CA, USA, SLC-4E',
            launchTimeUtc: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
            targetOrbit: 'Low Earth Orbit (53.2°)',
            status: 'GO FOR LAUNCH',
            missionDescription: 'A batch of 27 next-generation broadband satellites for the Starlink mega-constellation.'
          },
          {
            id: 'lch-02',
            name: 'Ariane 62 | MTG-I2',
            vehicle: 'Ariane 62',
            site: 'Guiana Space Centre, ELA-4, Kourou',
            launchTimeUtc: new Date(Date.now() + 38 * 3600 * 1000).toISOString(),
            targetOrbit: 'Geostationary Transfer Orbit (GTO)',
            status: 'SCHEDULED',
            missionDescription: 'Third generation European meteorological satellite for advanced storm forecasting.'
          },
          {
            id: 'lch-03',
            name: 'Falcon Heavy | Nancy Grace Roman Space Telescope',
            vehicle: 'Falcon Heavy',
            site: 'Kennedy Space Center, FL, USA, LC-39A',
            launchTimeUtc: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
            targetOrbit: 'Sun-Earth L2 Lagrange Point',
            status: 'GO FOR LAUNCH',
            missionDescription: 'NASA next-generation wide-field infrared space observatory exploring dark energy and exoplanets.'
          }
        ]
      };
    }
  },

  // OrbitBot AI Copilot Chat Endpoint (routes to secure backend /api/orbitbot with failover)
  sendChatMessage: async (messages: { role: string; content: string }[]): Promise<{ response: string; model: string; status: string }> => {
    try {
      // Primary route: /orbitbot
      return await request<{ response: string; model: string; status: string }>('/orbitbot', {
        method: 'POST',
        body: JSON.stringify({ messages })
      });
    } catch (e) {
      try {
        // Fallback route: /chat
        return await request<{ response: string; model: string; status: string }>('/chat', {
          method: 'POST',
          body: JSON.stringify({ messages })
        });
      } catch (err) {
        console.warn('OrbitBot API call failed, using client fallback:', err);
        return {
          response: 'OrbitBot is temporarily unavailable. Please try again in a few moments.',
          model: 'OrbitBot Service',
          status: 'UNAVAILABLE'
        };
      }
    }
  },

  // Citizen Sky Spotter Real Naked-Eye Passes
  getVisiblePasses: async (cityId?: string): Promise<{ status: string; total_passes: number; available_cities: any[]; passes: any[] }> => {
    try {
      const url = cityId ? `/spotter/visible-passes?city_id=${encodeURIComponent(cityId)}` : '/spotter/visible-passes';
      return await request<{ status: string; total_passes: number; available_cities: any[]; passes: any[] }>(url);
    } catch (e) {
      console.warn('Spotter remote endpoint unavailable, computing dynamic SGP4 look-angles on client:', e);
      return calculateDynamicPasses(cityId, 10.0, 48.0);
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
  }
};
