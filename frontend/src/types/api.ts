export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Scenario = {
  id: number;
  name: string;
  description: string;
  scenario_type: string;
  created_at: string;
  updated_at: string;
  node_count: number;
  edge_count: number;
  vehicle_count: number;
  demand_count: number;
  priority_distribution?: Record<string, number>;
  congested_edge_count?: number;
  blocked_edge_count?: number;
  expected_challenge?: string;
};

export type NodeItem = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  node_type: string;
};

export type EdgeItem = {
  id: number;
  source_node_id: number;
  target_node_id: number;
  distance_km: number;
  speed_kmph: number;
  congestion_factor: number;
  is_blocked: boolean;
  surface_type: string;
  bridge_tonnage_limit: number | null;
  base_landslide_risk: number;
  base_flood_risk: number;
  accessibility_score: number;
};

export type Depot = {
  id: number;
  node_id: number;
  name: string;
  inventory_units: number;
};

export type Vehicle = {
  id: number;
  depot_id: number;
  current_node_id: number;
  name: string;
  capacity: number;
  speed_kmph: number;
  available: boolean;
  is_4x4: boolean;
  weight_tons: number;
  accessibility_equipped: boolean;
};

export type Demand = {
  id: number;
  node_id: number;
  name: string;
  quantity: number;
  priority: number;
  time_window_start_min: number | null;
  time_window_end_min: number | null;
  service_time_min: number;
  cargo_type: string;
  requires_accessibility: boolean;
};

export type Network = {
  nodes: NodeItem[];
  edges: EdgeItem[];
  depots: Depot[];
  vehicles: Vehicle[];
  demands: Demand[];
};

export type SimulationRun = {
  id: number;
  scenario_id: number;
  status: string;
  algorithms: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Route = {
  id: number;
  dispatch_plan_id: number;
  vehicle_id: number;
  sequence_index: number;
  node_path: number[];
  demand_sequence: Array<{
    demand_id: number;
    node_id: number;
    quantity: number;
    priority: number;
    arrival_time_min: number;
    service_time_min: number;
    delayed: boolean;
    cargo_type?: string;
    requires_accessibility?: boolean;
  }>;
  distance_km: number;
  travel_time_min: number;
  load_units: number;
  risk_score?: number;
  decision_rationale?: {
    evaluated_demands?: number;
    rejected_reasons?: string[];
    selection_factors?: string[];
  };
};

export type Metric = {
  id: number;
  simulation_run_id: number;
  dispatch_plan_id: number;
  metric_name: string;
  metric_value: number;
  unit: string;
};

export type Comparison = {
  run_id: number | null;
  algorithms: Array<{
    dispatch_plan_id?: number;
    algorithm: string;
    objective_value?: number;
    runtime_ms?: number;
    route_count?: number;
    served_demand_count?: number;
    served_demand_ids?: number[];
    unserved_demand_ids?: number[];
    metrics: Record<string, number>;
    normalized_scores?: Record<string, number>;
    weighted_score?: number;
  }>;
  summary?: {
    metric_names: string[];
    best_by: Record<string, { algorithm: string; value: number; direction: "min" | "max" }>;
    ranking: Array<{
      algorithm: string;
      dispatch_plan_id: number;
      score: number;
      normalized_scores: Record<string, number>;
    }>;
    bottlenecks: string[];
    weighted_score_model: {
      formula: string;
      normalization: string;
      weights: Record<string, number>;
    };
    metric_explanations: Record<string, string>;
  };
};

export type Report = {
  run_id: number;
  markdown: string;
  generated_by: string;
};

// NE-SETU specific types

export type RoadConditionReport = {
  edge_id: number;
  status: "OPEN" | "SUSPECTED" | "CLOSED";
  source_type: "operator" | "community" | "sensor";
  severity: number;
  description: string;
};

export type ConditionReportRead = {
  id: number;
  scenario_id: number;
  edge_id: number;
  status: "OPEN" | "SUSPECTED" | "CLOSED";
  source_type: "operator" | "community" | "sensor";
  severity: number;
  description: string | null;
  trust_score: number;
  reported_at: string;
};

export type AssistedMobilityRequest = {
  scenario_id: number;
  node_id: number;
  name: string;
  priority: number;
  description: string;
};

export type PointToPointRequest = {
  source_node_id: number;
  target_node_id: number;
  vehicle_weight_tons?: number;
  is_4x4?: boolean;
  objective?: string;
};

export type PointToPointResponse = {
  path_nodes: number[];
  distance_km: number;
  travel_time_min: number;
  risk_score: number;
  objective_value: number;
  unreachable: boolean;
  message: string;
};

export type DataPoint = {
  time: string;
  predicted: number;
  actual: number;
};

export type ClosureDataPoint = {
  time: string;
  precision: number;
  recall: number;
  f1_score: number;
};

export type ModelPerformanceMetrics = {
  eta_mae: number;
  eta_rmse: number;
  closure_precision: number;
  closure_recall: number;
  closure_f1: number;
  eta_calibration_series: DataPoint[];
  closure_accuracy_series: ClosureDataPoint[];
};
