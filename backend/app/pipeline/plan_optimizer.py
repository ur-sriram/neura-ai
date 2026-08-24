import uuid
from typing import List, Dict, Any, Tuple
from ortools.sat.python import cp_model
from app.models.schema import Delivery, Vehicle, Plan, Assignment, Stop, DecisionRecord
from app.pipeline.route_engine import generate_k_routes
from app.pipeline.vehicle_matcher import score_vehicle_suitability

def optimize_plan(
    deliveries: List[Delivery],
    vehicles: List[Vehicle],
    overlays_map: Dict[int, Any],
    sim_hour: int = 0,
    mode: str = 'NORMAL'
) -> Tuple[Plan, List[Assignment], List[Stop], List[Dict[str, Any]], DecisionRecord]:
    """
    CP-SAT Joint Optimizer for cargo -> vehicle -> route assignment.
    Deterministic execution (random_seed = 42, max_time = 5.0s).
    """
    model = cp_model.CpModel()
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    solver.parameters.random_seed = 42

    plan_id = uuid.uuid4()

    # Pre-generate route candidates & vehicle suitability
    candidate_dict = {}
    suitability_dict = {}

    for d in deliveries:
        for v in vehicles:
            s_score = score_vehicle_suitability(v, d)
            suitability_dict[(d.id, v.id)] = s_score
            if s_score > 0.0:
                origin = getattr(d, 'origin_id', None) or getattr(d, 'dest_id', None)
                cands = generate_k_routes(origin, d.dest_id, v, overlays_map, k=3)
                candidate_dict[(d.id, v.id)] = cands

    # Decision variables: x[d.id, v.id] = 1 if delivery assigned to vehicle
    x = {}
    for d in deliveries:
        for v in vehicles:
            if suitability_dict[(d.id, v.id)] > 0.0:
                x[(d.id, v.id)] = model.NewBoolVar(f"x_{d.id}_{v.id}")

    # Deferred variables
    deferred = {}
    for d in deliveries:
        deferred[d.id] = model.NewBoolVar(f"deferred_{d.id}")
        assignable_vars = [x[(d.id, v.id)] for v in vehicles if (d.id, v.id) in x]
        if assignable_vars:
            model.Add(sum(assignable_vars) + deferred[d.id] == 1)
        else:
            model.Add(deferred[d.id] == 1)

    # Vehicle capacity constraints
    for v in vehicles:
        v_vars = [x[(d.id, v.id)] * int(d.weight_kg) for d in deliveries if (d.id, v.id) in x]
        if v_vars:
            model.Add(sum(v_vars) <= int(v.capacity_kg))

    # Objective Function
    obj_terms = []
    EMERGENCY_PENALTY = 10000
    ROUTINE_PENALTY = 200

    for d in deliveries:
        penalty = EMERGENCY_PENALTY if getattr(d, 'is_emergency', False) else ROUTINE_PENALTY
        obj_terms.append(deferred[d.id] * penalty)

        for v in vehicles:
            if (d.id, v.id) in x:
                cands = candidate_dict[(d.id, v.id)]
                best_cost = int((cands[0]['cost_total'] if cands else 100.0) * 100)
                obj_terms.append(x[(d.id, v.id)] * best_cost)

    model.Minimize(sum(obj_terms))
    status = solver.Solve(model)

    # Extract solution
    plan = Plan(
        id=plan_id,
        version=1,
        mode='EMERGENCY' if any(d.is_emergency for d in deliveries) else 'NORMAL',
        status='PROPOSED',
        objective_value=float(solver.ObjectiveValue() if status in [cp_model.OPTIMAL, cp_model.FEASIBLE] else 99999.0),
        created_sim=sim_hour
    )

    assignments = []
    stops = []
    candidates_record = []

    for v in vehicles:
        assigned_deliveries = [d for d in deliveries if (d.id, v.id) in x and solver.Value(x[(d.id, v.id)]) == 1]
        if assigned_deliveries:
            assign_id = uuid.uuid4()
            d_primary = assigned_deliveries[0]
            cands = candidate_dict.get((d_primary.id, v.id), [])
            chosen_route = cands[0] if cands else {}

            assignment = Assignment(
                id=assign_id,
                plan_id=plan_id,
                vehicle_id=v.id,
                depart_sim=sim_hour,
                eta_p50=sim_hour + int(chosen_route.get('eta_p50', 2.0)),
                eta_p90=sim_hour + int(chosen_route.get('eta_p90', 3.0)),
                risk_score=chosen_route.get('p_closure', 0.1),
                status='PLANNED'
            )
            assignments.append(assignment)

            for seq, d in enumerate(assigned_deliveries, 1):
                stop = Stop(
                    id=uuid.uuid4(),
                    assignment_id=assign_id,
                    delivery_id=d.id,
                    seq=seq,
                    planned_arrival_sim=sim_hour + int(chosen_route.get('eta_p50', 2.0))
                )
                stops.append(stop)

            candidates_record.append({
                'vehicle_id': str(v.id),
                'delivery_ids': [str(d.id) for d in assigned_deliveries],
                'chosen_route': chosen_route,
                'candidate_routes': cands
            })

    decision_record = DecisionRecord(
        id=uuid.uuid4(),
        plan_id=plan_id,
        decision_type='PLAN_OPTIMIZATION',
        candidates=candidates_record,
        selection={'assigned_vehicles': len(assignments), 'deferred_deliveries': sum(solver.Value(deferred[d.id]) for d in deliveries if d.id in deferred)},
        confidence=0.92,
        created_sim=sim_hour
    )

    return plan, assignments, stops, candidates_record, decision_record
