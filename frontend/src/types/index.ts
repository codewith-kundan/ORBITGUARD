export type ObjectType = 'satellite' | 'debris' | 'rocket_body' | 'unknown';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'MONITORING' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface OrbitalObject {
  id: number;
  norad_id: number;
  name: string;
  object_type: ObjectType;
  tle_line1: string;
  tle_line2: string;
  tle_epoch?: string;
  inclination_deg?: number;
  eccentricity?: number;
  period_min?: number;
  semi_major_axis_km?: number;
  perigee_km?: number;
  apogee_km?: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitalPosition {
  timestamp: string;
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
}

export interface TrajectoryResponse {
  norad_id: number;
  name: string;
  object_type: ObjectType;
  points: OrbitalPosition[];
  start_time: string;
  end_time: string;
  step_minutes: number;
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
  methodology: string;
}

export interface Conjunction {
  id: number;
  object_a_id: number;
  object_b_id: number;
  tca: string;
  miss_distance_km: number;
  relative_velocity_km_s: number;
  altitude_km?: number;
  latitude_deg?: number;
  longitude_deg?: number;
  risk_score: number;
  risk_level: RiskLevel;
  object_a?: OrbitalObject;
  object_b?: OrbitalObject;
  factors?: RiskFactors;
  created_at: string;
}

export interface ConjunctionSummary {
  total_screened: number;
  conjunctions_detected: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  closest_miss_km?: number;
  earliest_tca?: string;
}

export interface Alert {
  id: number;
  conjunction_id: number;
  severity: RiskLevel;
  status: AlertStatus;
  message: string;
  created_at: string;
  acknowledged_at?: string;
  conjunction?: Conjunction;
}

export interface SystemStatistics {
  tracked_objects: number;
  active_satellites: number;
  space_debris: number;
  rocket_bodies: number;
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
  data_source: string;
  status_mode: 'LIVE' | 'DEMO MODE' | 'OFFLINE';
}
