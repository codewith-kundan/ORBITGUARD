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
  miss_distance_factor?: {
    score: number;
    weight?: number;
    description?: string;
    contribution?: string;
    value_km: number;
  };
  relative_velocity_factor?: {
    score: number;
    weight?: number;
    description?: string;
    contribution?: string;
    value_km_s: number;
  };
  approach_geometry_factor?: {
    score: number;
    weight?: number;
    description?: string;
    angle_deg?: number;
  };
  object_size_factor?: {
    score: number;
    weight?: number;
    description?: string;
    size_m?: number;
  };
  time_to_tca_factor?: {
    score: number;
    weight?: number;
    description?: string;
    contribution?: string;
    hours_to_tca: number;
  };
  collision_probability?: number;
  probability_confidence?: string;
  probability_methodology?: string;
  historical_prediction?: {
    has_historical_data: boolean;
    confidence_score: number;
    pattern_match: string;
    historical_events_count: number;
    historical_avg_miss_km?: number;
    distance_trend?: string;
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
  collision_probability?: number;
  probability_method?: string;
  approach_angle_deg?: number;
  combined_size_m?: number;
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
  fleet_breakdown?: {
    all: number;
    operational: number;
    payload?: number;
    starlink: number;
    oneweb: number;
    gps: number;
    debris: number;
    rocket: number;
    leo: number;
    meo: number;
    geo: number;
  };
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

export interface ProviderHealth {
  provider: string;
  status: string;
  latency_ms: number;
  is_live: boolean;
  requires_auth: boolean;
  message?: string;
  last_checked?: string;
}

export interface SyncHistoryItem {
  id: number;
  source: string;
  started_at: string;
  completed_at?: string;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_failed: number;
  status: string;
  error_message?: string;
}

export interface SystemHealthDiagnostics {
  overall_status: string;
  timestamp: string;
  database: {
    connected: boolean;
    engine: string;
    tables: {
      orbital_objects: number;
      tle_records: number;
      conjunctions: number;
      active_alerts: number;
    };
  };
  total_tracked_objects: number;
  data_age_hours?: number;
  providers: ProviderHealth[];
  latest_sync?: {
    source: string;
    mode: string;
    status: string;
    total_synced: number;
    timestamp?: string;
    error_message?: string;
  };
  sync_history: SyncHistoryItem[];
  astrodynamics: {
    propagation_engine: string;
    ellipsoid_model: string;
    conjunction_screening: {
      status: string;
      window_hours: number;
      threshold_km: number;
      critical_threshold_km: number;
      high_threshold_km: number;
      coarse_step_minutes: number;
    };
  };
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

export interface CAMStrategy {
  strategy_type: 'PROGRADE' | 'RETROGRADE' | 'CROSS_TRACK' | 'RADIAL' | 'MINIMUM_FUEL';
  title: string;
  description: string;
  burn_time: string;
  lead_time_hours: number;
  delta_v_vector: {
    delta_v_r: number;
    delta_v_t: number;
    delta_v_w: number;
  };
  total_delta_v_m_s: number;
  initial_miss_distance_km: number;
  projected_miss_distance_km: number;
  miss_distance_gain_km: number;
  fuel_cost_kg: number;
  propellant_fraction_percent: number;
  isp_seconds: number;
  new_perigee_km: number;
  new_apogee_km: number;
  new_period_minutes: number;
  new_inclination_deg: number;
  secondary_conjunctions_count: number;
  secondary_conjunctions_safe: boolean;
  risk_reduction_percent: number;
}

export interface CAMPlanResponse {
  conjunction_id: number;
  primary_object_name: string;
  primary_norad_id: number;
  secondary_object_name: string;
  secondary_norad_id: number;
  tca: string;
  initial_miss_distance_km: number;
  initial_risk_score: number;
  initial_risk_level: string;
  strategies: CAMStrategy[];
  trajectory_comparison?: any;
}

export interface CAMSimulateRequest {
  conjunction_id: number;
  delta_v_radial_m_s?: number;
  delta_v_in_track_m_s?: number;
  delta_v_cross_track_m_s?: number;
  lead_time_hours?: number;
  spacecraft_mass_kg?: number;
  isp_seconds?: number;
}

export interface CAMSimulateResponse {
  conjunction_id: number;
  burn_time: string;
  total_delta_v_m_s: number;
  projected_miss_distance_km: number;
  miss_distance_gain_km: number;
  fuel_cost_kg: number;
  new_perigee_km: number;
  new_apogee_km: number;
  new_period_minutes: number;
  secondary_conjunctions_count: number;
  secondary_conjunctions_safe: boolean;
  post_burn_trajectory?: Array<{ x: number; y: number; z: number; lat: number; lon: number; alt_km: number }>;
}

export interface GroundStation {
  id: string;
  name: string;
  country: string;
  latitude_deg: number;
  longitude_deg: number;
  altitude_m: number;
  min_elevation_deg: number;
}

export interface SkyPoint {
  timestamp: string;
  azimuth_deg: number;
  elevation_deg: number;
  range_km: number;
  range_rate_km_s: number;
  is_sunlit: boolean;
}

export interface OverpassEvent {
  norad_id: number;
  object_name: string;
  station_id: string;
  station_name: string;
  aos_time: string;
  peak_time: string;
  los_time: string;
  duration_seconds: number;
  max_elevation_deg: number;
  aos_azimuth_deg: number;
  peak_azimuth_deg: number;
  los_azimuth_deg: number;
  min_range_km: number;
  visibility_type: 'OPTICAL_VISIBLE' | 'SUNLIT_DAYLIGHT' | 'ECLIPSED_NIGHT';
  visibility_label: string;
  sky_trajectory: SkyPoint[];
}

export interface OverpassRequest {
  norad_id: number;
  station_latitude: number;
  station_longitude: number;
  station_altitude_m?: number;
  station_name?: string;
  min_elevation_deg?: number;
  prediction_hours?: number;
}

export interface OverpassResponse {
  norad_id: number;
  object_name: string;
  station_name: string;
  station_latitude: number;
  station_longitude: number;
  total_passes_found: number;
  passes: OverpassEvent[];
}

export interface GroundTrackRibbonPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_km: number;
  footprint_radius_km: number;
  is_sunlit: boolean;
}

export interface GroundTrackRibbonResponse {
  norad_id: number;
  object_name: string;
  period_minutes: number;
  current_position: GroundTrackRibbonPoint;
  past_track: GroundTrackRibbonPoint[];
  future_track: GroundTrackRibbonPoint[];
  footprint_radius_km: number;
  sub_solar_point: {
    latitude: number;
    longitude: number;
  };
}

export interface GabbardPoint {
  fragment_id: number;
  characteristic_length_m: number;
  mass_kg: number;
  area_to_mass_m2_kg: number;
  delta_v_m_s: number;
  period_minutes: number;
  perigee_altitude_km: number;
  apogee_altitude_km: number;
  semi_major_axis_km: number;
  eccentricity: number;
  inclination_deg: number;
  is_decayed: boolean;
}

export interface BreakupFragment {
  id: number;
  name: string;
  characteristic_length_m: number;
  mass_kg: number;
  area_to_mass_m2_kg: number;
  delta_v_m_s: number;
  orbital_elements: {
    semi_major_axis_km: number;
    eccentricity: number;
    inclination_deg: number;
    period_minutes: number;
    perigee_km: number;
    apogee_km: number;
  };
  initial_state_vector: {
    rx: number; ry: number; rz: number;
    vx: number; vy: number; vz: number;
  };
  position_at_epoch: {
    x: number; y: number; z: number;
  };
}

export interface BreakupSimulateRequest {
  event_type: string;
  target_name?: string;
  target_mass_kg: number;
  impactor_name?: string;
  impactor_mass_kg: number;
  relative_velocity_km_s: number;
  altitude_km: number;
  inclination_deg?: number;
  min_fragment_size_m?: number;
  max_fragments_to_generate?: number;
}

export interface BreakupResponse {
  event_id: string;
  event_type: string;
  event_timestamp: string;
  collision_energy_joules: number;
  specific_energy_j_per_kg: number;
  is_catastrophic: boolean;
  total_mass_kg: number;
  total_predicted_fragments_gt_min_size: number;
  sample_fragments_count: number;
  parent_orbit: {
    altitude_km: number;
    velocity_km_s: number;
    period_minutes: number;
    inclination_deg: number;
  };
  gabbard_points: GabbardPoint[];
  fragments: BreakupFragment[];
  cloud_dispersion_stats: {
    immediate_reentry_count: number;
    immediate_reentry_percentage: number;
    min_perigee_km: number;
    max_apogee_km: number;
    parent_period_minutes: number;
  };
}

export interface DecayProfilePoint {
  days_from_epoch: number;
  timestamp: string;
  perigee_altitude_km: number;
  apogee_altitude_km: number;
  semi_major_axis_km: number;
  eccentricity: number;
  atmospheric_density_kg_m3: number;
  decay_rate_km_per_day: number;
}

export interface ReentryPrediction {
  norad_id: number;
  object_name: string;
  object_type: string;
  country_code?: string;
  current_perigee_km: number;
  current_apogee_km: number;
  current_altitude_km: number;
  bstar: number;
  estimated_lifetime_days: number;
  predicted_reentry_time: string;
  uncertainty_window_hours: number;
  is_decay_imminent: boolean;
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  reentry_latitude_band: string;
  estimated_dry_mass_kg: number;
  estimated_surviving_mass_kg: number;
  casualty_risk_score: string;
  decay_profile: DecayProfilePoint[];
}

export interface DecayWatchlistItem {
  norad_id: number;
  object_name: string;
  object_type: string;
  country_code?: string;
  perigee_km: number;
  apogee_km: number;
  bstar: number;
  estimated_lifetime_days: number;
  predicted_reentry_time: string;
  risk_level: string;
}

export interface DecayAssessmentRequest {
  norad_id?: number;
  dry_mass_kg?: number;
  drag_area_m2?: number;
  drag_coefficient_cd?: number;
  solar_flux_f107?: number;
  geomagnetic_ap?: number;
}

export interface CDMPreviewResponse {
  conjunction_id: number;
  message_id: string;
  creation_date: string;
  originator: string;
  tca: string;
  miss_distance_m: number;
  relative_speed_m_s: number;
  collision_probability: number;
  object1_name: string;
  object1_norad_id: number;
  object2_name: string;
  object2_norad_id: number;
  kvn_content: string;
  xml_content: string;
}

export interface WebhookDispatchRequest {
  conjunction_id: number;
  webhook_url: string;
  secret_token?: string;
  include_cdm_attachment?: boolean;
  custom_notes?: string;
}

export interface WebhookDispatchResponse {
  success: boolean;
  status_code?: number;
  response_body?: string;
  dispatched_at: string;
  destination_url: string;
  message: string;
  latency_ms: number;
}




