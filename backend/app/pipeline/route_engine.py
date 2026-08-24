import os
import pickle
import networkx as nx
from typing import Dict, List, Any, Optional
from app.ml import eta_model

_G_base = None

def load_graph():
    global _G_base
    graph_path = "data/graph.pkl"
    if os.path.exists(graph_path):
        try:
            with open(graph_path, "rb") as f:
                _G_base = pickle.load(f)
                return
        except Exception as e:
            print(f"⚠️ Failed loading graph from {graph_path}: {e}")
    # Synthetic fallback graph if file missing
    _G_base = nx.MultiDiGraph()
    _G_base.add_node(1, y=26.14, x=91.73)
    _G_base.add_node(2, y=25.57, x=91.88)
    _G_base.add_edge(1, 2, length=60000.0, highway='primary', mean_grade=4.0)

load_graph()

HARD_CONSTRAINTS = {
    'status_closed': lambda seg, overlay: overlay and overlay.status == 'CLOSED',
    'max_weight': lambda seg, vehicle: seg and seg.maxweight and vehicle and vehicle.weight_kg > seg.maxweight * 1000,
}

def build_weighted_graph(G_base, overlays_map, vehicle, rain_mm_h: float = 0.0):
    G = G_base.copy()
    vclass = getattr(vehicle, 'vclass', 'mini') if vehicle else 'mini'

    for u, v, key, data in G.edges(keys=True, data=True):
        seg_id = data.get('segment_id')
        overlay = overlays_map.get(seg_id)
        
        # Hard constraint check
        if overlay and overlay.status == 'CLOSED':
            G[u][v][key]['weight'] = float('inf')
            G[u][v][key]['feasible'] = False
            G[u][v][key]['rejection'] = "Road segment is CLOSED due to hazard"
            continue
            
        maxw = data.get('maxweight')
        if maxw and vehicle and vehicle.weight_kg > maxw * 1000:
            G[u][v][key]['weight'] = float('inf')
            G[u][v][key]['feasible'] = False
            G[u][v][key]['rejection'] = f"Bridge maxweight {maxw}t < vehicle weight {vehicle.weight_kg/1000}t"
            continue

        # Soft cost calculation (RouteCost formula Section 12.3)
        length_m = data.get('length', 1500.0)
        grade = data.get('grade', 3.0)
        
        # Simple proxy object for eta_model predict
        class SegProxy:
            def __init__(self, l, g, h): self.length_m, self.mean_grade, self.highway_class = l, g, h
            
        proxy = SegProxy(length_m, grade, data.get('highway', 'secondary'))
        eta_p50, eta_p90 = eta_model.predict(proxy, vclass, rain_mm_h)
        
        p_closure = overlay.p_landslide_24h if overlay else 0.0
        confidence = overlay.confidence if overlay else 1.0

        cost = (
            0.35 * (eta_p50 * 3600.0) +
            0.20 * ((eta_p90 - eta_p50) * 3600.0) +
            0.25 * (p_closure * 1000.0) +
            0.15 * (1.0 - confidence) * 500.0 +
            0.05 * length_m
        )
        
        G[u][v][key]['weight'] = max(1.0, cost)
        G[u][v][key]['feasible'] = True
        G[u][v][key]['eta_p50'] = eta_p50
        G[u][v][key]['eta_p90'] = eta_p90
        G[u][v][key]['p_closure'] = p_closure

    return G

def generate_k_routes(origin_id, dest_id, vehicle, overlays_map, k: int = 3) -> List[Dict[str, Any]]:
    """Generates k diverse routes using iterative edge penalization."""
    if _G_base is None:
        load_graph()
        
    G = build_weighted_graph(_G_base, overlays_map, vehicle)
    
    routes = []
    G_iter = G.copy()
    
    nodes = list(G_iter.nodes)
    if not nodes:
        return []

    # Try to resolve origin/dest from node attributes (OSM node_id or index)
    def find_node(target_id, default_idx: int):
        """Find a graph node matching target_id, else fall back to default index."""
        if target_id is None:
            return nodes[default_idx]
        # Try direct match (if node IDs are ints or strings)
        if target_id in G_iter.nodes:
            return target_id
        # Try string/int coercion
        try:
            as_int = int(str(target_id)[:8], 16)  # first 8 hex chars of UUID
            idx = as_int % len(nodes)
            return nodes[idx]
        except Exception:
            return nodes[default_idx]

    u_start = find_node(origin_id, 0)
    v_target = find_node(dest_id, -1)
    
    # Ensure origin != dest for non-trivial routes
    if u_start == v_target and len(nodes) > 1:
        v_target = nodes[-1] if u_start != nodes[-1] else nodes[-2]

    for i in range(k):
        try:
            path = nx.shortest_path(G_iter, u_start, v_target, weight='weight')
            
            # Compute total distance & ETA
            dist_total = 0.0
            eta_p50_total = 0.0
            eta_p90_total = 0.0
            cost_sum = 0.0
            seg_ids = []

            for u_node, v_node in zip(path[:-1], path[1:]):
                edge_data = G_iter[u_node][v_node][0]
                dist_total += edge_data.get('length', 1000.0)
                eta_p50_total += edge_data.get('eta_p50', 0.05)
                eta_p90_total += edge_data.get('eta_p90', 0.08)
                cost_sum += edge_data.get('weight', 10.0)
                if 'segment_id' in edge_data:
                    seg_ids.append(edge_data['segment_id'])

                # Penalize for diversity
                G_iter[u_node][v_node][0]['weight'] *= 3.0

            routes.append({
                'route_label': f"Route {chr(65+i)}",
                'path_nodes': path,
                'segment_ids': seg_ids,
                'distance_m': round(dist_total, 1),
                'eta_p50': round(eta_p50_total, 2),
                'eta_p90': round(eta_p90_total, 2),
                'cost_total': round(cost_sum, 2),
                'feasible': True,
                'rejection_reason': None,
                'chosen': (i == 0)
            })

        except (nx.NetworkXNoPath, nx.NodeNotFound):
            break

    if not routes:
        # Return infeasible dummy candidate explaining rejection
        routes.append({
            'route_label': "Route A",
            'path_nodes': [],
            'segment_ids': [],
            'distance_m': 0.0,
            'eta_p50': 0.0,
            'eta_p90': 0.0,
            'cost_total': float('inf'),
            'feasible': False,
            'rejection_reason': "No feasible path found due to road closures or bridge weight limits",
            'chosen': False
        })

    return routes
