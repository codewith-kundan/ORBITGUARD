export type ObjectType = 'ACTIVE_SATELLITE' | 'DEBRIS' | 'ROCKET_BODY' | 'UNKNOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OrbitalObject {
  id: number;
  norad_id: number;
  name: string;
  object_type: ObjectType;
  source: string;
  source_group?: string;
  country?: string;
  launch_date?: string;
  status?: string;
  tle_line1: string;
  tle_line2: string;
  tle_epoch?: string;
  inclination?: number;
  eccentricity?: number;
  mean_motion?: number;
  period_minutes?: number;
  semi_major_axis_km?: number;
  perigee_km?: number;
  apogee_km?: number;
  international_designator?: string;
  country_code?: string;
  launch_site?: string;
  decay_date?: string;
  rcs_size?: string;
  bstar?: number;
  raan_deg?: number;
  arg_pericenter_deg?: number;
  mean_anomaly_deg?: number;
  gp_id?: number;
  last_position_update?: string;
  last_propagated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitalPosition {
  timestamp: string;
  id?: number;
  norad_id: number;
  name: string;
  type: ObjectType;
  lat: number;
  lon: number;
  alt_km: number;
  x_km: number;
  y_km: number;
  z_km: number;
  vx_km_s: number;
  vy_km_s: number;
  vz_km_s: number;
  velocity_km_s: number;
  tle_line1?: string;
  tle_line2?: string;
}

export interface PositionsBatchResponse {
  timestamp: string;
  total_objects: number;
  positions: OrbitalPosition[];
}

export interface TrajectoryPoint {
  timestamp: string;
  lat: number;
  lon: number;
  alt_km: number;
  x_km: number;
  y_km: number;
  z_km: number;
  velocity_km_s: number;
}

export interface TrajectoryResponse {
  id: number;
  norad_id: number;
  name: string;
  object_type: ObjectType;
  start_time: string;
  end_time: string;
  step_minutes: number;
  points: TrajectoryPoint[];
}

export interface GroundTrackPoint {
  timestamp: string;
  lat: number;
  lon: number;
  alt_km: number;
}

export interface GroundTrackResponse {
  id: number;
  norad_id: number;
  name: string;
  points: GroundTrackPoint[];
}

export interface PaginatedObjectsResponse {
  items: OrbitalObject[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RiskFactors {
  miss_distance_factor: {
    score: number;
    max: number;
    contribution: string;
    value_km: number;
  };
  relative_velocity_factor: {
    score: number;
    max: number;
    contribution: string;
    value_km_s: number;
  };
  time_to_tca_factor: {
    score: number;
    max: number;
    contribution: string;
    hours_to_tca: number;
  };
  methodology?: string;
}

export interface Conjunction {
  id: number;
  object_a_id: number;
  object_b_id: number;
  object_a: OrbitalObject;
  object_b: OrbitalObject;
  tca: string;
  miss_distance_km: number;
  relative_velocity_km_s: number;
  altitude_km?: number;
  latitude_deg?: number;
  longitude_deg?: number;
  risk_score: number;
  risk_level: RiskLevel;
  status: string;
  calculated_at: string;
  created_at: string;
  factors?: RiskFactors;
}

export interface SystemStatistics {
  tracked_objects: number;
  active_satellites: number;
  space_debris: number;
  rocket_bodies: number;
  unknown: number;
  total_conjunctions: number;
  high_risk_events: number;
  active_alerts: number;
  risk_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  altitude_distribution: {
    leo: number;
    meo: number;
    geo: number;
  };
  data_source?: string;
  status_mode?: string;
  last_sync?: string;
  data_age_minutes?: number;
}

export interface DataStatus {
  source: string;
  mode: string;
  is_live: boolean;
  is_live_error: boolean;
  total_objects: number;
  last_updated: string;
  last_sync?: string;
  data_age_minutes?: number;
  error_message?: string;
  sync_error?: string;
  database_connected: boolean;
}

export interface SystemHealth {
  status: string;
  service: string;
  version?: string;
  database_connected?: boolean;
  object_count?: number;
  last_conjunction_scan?: string;
}

export type AlertStatus = 'ACTIVE' | 'MONITORING' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: number;
  conjunction_id: number;
  severity: RiskLevel;
  status: AlertStatus;
  title: string;
  description?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}
