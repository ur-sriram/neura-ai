const API_BASE = '/api/v1';

async function safeFetch<T>(url: string, init?: RequestInit, fallback?: T): Promise<T> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`API error: ${url}`, e);
    return fallback as T;
  }
}

// ── Map & Fleet ──────────────────────────────────────────────────────────────

export async function fetchMapSegments(vclass: string = 'heavy'): Promise<any> {
  return safeFetch<any>(`${API_BASE}/map/segments?vclass=${vclass}`,
    undefined, { type: 'FeatureCollection', lns_version: 0, features: [] });
}

export async function fetchLocations() {
  return safeFetch<any[]>(`${API_BASE}/map/locations`, undefined, []);
}

export async function fetchVehicles() {
  return safeFetch<any[]>(`${API_BASE}/map/vehicles`, undefined, []);
}

// ── Deliveries ───────────────────────────────────────────────────────────────

export async function fetchDeliveries(status?: string) {
  const qs = status ? `?status=${status}` : '';
  return safeFetch<any[]>(`${API_BASE}/deliveries${qs}`, undefined, []);
}

export async function updateDeliveryStatus(deliveryId: string, newStatus: string) {
  return safeFetch<any>(`${API_BASE}/deliveries/${deliveryId}/status?new_status=${newStatus}`,
    { method: 'PATCH' }, {});
}

// ── Accessibility / Heatmap ──────────────────────────────────────────────────

export async function fetchHeatmap(vclass: string = 'heavy', horizon: number = 0) {
  return safeFetch<any>(`${API_BASE}/accessibility/h3?vclass=${vclass}&horizon=${horizon}`,
    undefined, { type: 'FeatureCollection', features: [] });
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function fetchEvents() {
  return safeFetch<any[]>(`${API_BASE}/events`, undefined, []);
}

export async function postEvent(payload: any) {
  return safeFetch<any>(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, {});
}

// ── Plans ────────────────────────────────────────────────────────────────────

export async function fetchActivePlan() {
  return safeFetch<any>(`${API_BASE}/plans/active`,
    undefined, { plan: null, assignments: [], decision_record: null });
}

export async function approvePlan(planId: string) {
  return safeFetch<any>(`${API_BASE}/plans/${planId}/approve`, { method: 'POST' }, {});
}

// ── Optimization ─────────────────────────────────────────────────────────────

export async function runOptimization() {
  return safeFetch<any>(`${API_BASE}/optimization/run`, { method: 'POST' }, {});
}

// ── Simulation ───────────────────────────────────────────────────────────────

export async function postWhatIf(payload: any) {
  return safeFetch<any>(`${API_BASE}/simulation/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, {});
}

export async function controlSimClock(action: string, speed?: number, target_hour?: number) {
  return safeFetch<any>(`${API_BASE}/simulation/clock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, speed, target_hour })
  }, {});
}

// ── Demo ─────────────────────────────────────────────────────────────────────

export async function runDemoScenario() {
  return safeFetch<any>(`${API_BASE}/demo/scenario/scn-01`, { method: 'POST' }, {});
}

export async function resetDemo() {
  return safeFetch<any>(`${API_BASE}/demo/reset`, { method: 'POST' }, {});
}
