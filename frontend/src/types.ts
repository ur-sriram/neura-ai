export type VehicleClass = 'heavy' | 'mini' | '4x4' | 'special';

export interface LocationItem {
  id: string;
  name: string;
  kind: 'depot' | 'village' | 'health';
  population_class?: string;
  cold_chain?: boolean;
  accessible_entry?: boolean;
  coordinates: [number, number];
}

export interface VehicleItem {
  id: string;
  label: string;
  vclass: VehicleClass;
  capacity_kg: number;
  weight_kg: number;
  cold_chain: boolean;
  accessible: boolean;
  home_depot?: string;
}

export interface SegmentItem {
  id: number;
  highway_class: string;
  surface: string;
  length_m: number;
  mean_grade: number;
  maxweight?: number;
  status: 'OPEN' | 'SUSPECTED' | 'CLOSED';
  accessibility_score: number;
  p_landslide_24h: number;
  confidence: number;
  contributing_factors?: Record<string, any>;
}

export interface EventItem {
  id: string;
  type: string;
  source_type: string;
  source_trust: number;
  corroboration_count: number;
  received_sim: number;
  payload: Record<string, any>;
  resolved: boolean;
}

export interface PlanItem {
  id: string;
  version: number;
  mode: 'NORMAL' | 'EMERGENCY';
  status: 'DRAFT' | 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'SUPERSEDED';
  objective_value?: number;
  created_sim: number;
}
