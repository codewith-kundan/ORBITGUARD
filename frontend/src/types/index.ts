export type ObjectType = 'ACTIVE_SATELLITE' | 'DEBRIS' | 'ROCKET_BODY' | 'UNKNOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'MONITORING' | 'ACKNOWLEDGED' | 'RESOLVED';

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

export interface Alert {
  id: number;
  conjunction_id: number;
  conjunction?: Conjunction;
  severity: RiskLevel;
  title: string;
  message: string;
  status: AlertStatus;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved: boolean;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface SystemStatistics {
  tracked_objects: number;
  total_active_satellites: number;
  total_debris: number;
  total_rocket_bodies: number;
  total_conjunctions: number;
  critical_conjunctions: number;
  high_risk_conjunctions: number;
  medium_risk_conjunctions: number;
  low_risk_conjunctions: number;
  active_alerts: number;
  unacknowledged_alerts: number;
  last_screening_time?: string;
  data_mode?: string;
  data_source?: string;
  // Aliases for backwards compatibility
  active_satellites?: number;
  space_debris?: number;
  rocket_bodies?: number;
  high_risk_events?: number;
  altitude_distribution?: {
    leo: number;
    meo: number;
    geo: number;
    other?: number;
  };
  risk_breakdown?: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  regime_breakdown?: {
    leo: number;
    meo: number;
    geo: number;
    other: number;
  };
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

export interface ProviderHealth {
  provider: string;
  status: 'HEALTHY' | 'AVAILABLE' | 'CONFIGURED' | 'UNCONFIGURED' | 'DEGRADED' | 'OFFLINE' | 'MISSING';
  latency_ms: number;
  is_live: boolean;
  requires_auth: boolean;
  message: string;
  last_checked: string;
}

export interface DataHealthResponse {
  overall_status: string;
  timestamp: string;
  total_tracked_objects: number;
  stale_tle_count: number;
  providers: ProviderHealth[];
  latest_sync?: {
    source: string;
    mode: string;
    status: string;
    total_synced: number;
    timestamp?: string;
    error_message?: string;
  };
}

export interface PassTrackPoint {
  timestamp: string;
  azimuth_deg: number;
  elevation_deg: number;
  range_km: number;
  sat_lat: number;
  sat_lon: number;
  sat_alt_km: number;
}

export interface SatellitePass {
  aos_time: string;
  aos_azimuth_deg: number;
  max_elevation_time: string;
  max_elevation_deg: number;
  max_elevation_azimuth_deg: number;
  min_range_km: number;
  los_time: string;
  los_azimuth_deg: number;
  duration_minutes: number;
  track_points: PassTrackPoint[];
}

export interface VisibilityPassesResponse {
  satellite: {
    id: number;
    norad_id: number;
    name: string;
    type: ObjectType;
    perigee_km?: number;
    apogee_km?: number;
    inclination?: number;
  };
  observer: {
    latitude: number;
    longitude: number;
    altitude_m: number;
  };
  prediction_window_hours: number;
  min_elevation_deg: number;
  total_passes: number;
  passes: SatellitePass[];
}

export interface FeatureContribution {
  feature: string;
  value: string;
  importance_weight_percent: number;
  assessment: string;
}

export interface AIRiskPredictionResponse {
  predicted_risk_score: number;
  severity_level: RiskLevel;
  color_hex: string;
  confidence_percent: number;
  feature_contributions: FeatureContribution[];
  operational_recommendations: string[];
  model_metadata: {
    model_name: string;
    disclaimer: string;
    standard: string;
  };
}

export interface WhatIfFragment {
  fragment_id: string;
  size_cm: number;
  delta_v_m_s: number;
  perigee_km: number;
  apogee_km: number;
  orbital_period_minutes: number;
  estimated_lifetime_days: number;
}

export interface WhatIfSimulationResponse {
  target: {
    name: string;
    norad_id: number;
    initial_altitude_km: number;
    mass_kg: number;
  };
  scenario: string;
  total_fragments_generated: number;
  decayed_within_1_year: number;
  persistent_fragments: number;
  regional_risk_increase_percent: number;
  fragments_sample: WhatIfFragment[];
  metadata: {
    disclaimer: string;
  };
}

export interface KesslerYearPoint {
  year: number;
  active_satellites: number;
  tracked_debris: number;
  total_population: number;
  annual_collisions: number;
  cumulative_collisions: number;
  orbital_risk_index: number;
}

export interface KesslerSimulationResponse {
  parameters: {
    initial_population: number;
    annual_launches: number;
    simulation_duration_years: number;
    fragments_per_collision: number;
    mitigation_compliance_pct: number;
  };
  summary: {
    final_population: number;
    total_predicted_collisions: number;
    cascade_tipping_point_year: string | number;
    risk_growth_percent: number;
  };
  timeline: KesslerYearPoint[];
  metadata: {
    disclaimer: string;
  };
}

export interface ADRYearPoint {
  year: number;
  baseline_population: number;
  mitigated_population: number;
  baseline_risk_score: number;
  mitigated_risk_score: number;
  prevented_collisions: number;
}

export interface ADRSimulationResponse {
  method: {
    name: string;
    target: string;
    effectiveness_per_object: number;
  };
  parameters: {
    annual_removal_count: number;
    target_altitude_km: number;
    forecast_years: number;
  };
  summary: {
    total_derelicts_removed: number;
    prevented_catastrophic_collisions: number;
    risk_reduction_percent: number;
  };
  timeline: ADRYearPoint[];
  metadata: {
    disclaimer: string;
  };
}
