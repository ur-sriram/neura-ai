import pytest
import time
from app.pipeline.accessibility_engine import compute_accessibility
from app.pipeline.route_engine import generate_k_routes
from app.pipeline.plan_optimizer import optimize_plan
from app.models.schema import RoadSegment, Vehicle, Delivery

class MockSegment:
    def __init__(self, id=1001, surface='paved', mean_grade=2.0, maxweight=None, highway_class='secondary'):
        self.id = id
        self.surface = surface
        self.mean_grade = mean_grade
        self.maxweight = maxweight
        self.highway_class = highway_class
        self.length_m = 1500.0

class MockVehicle:
    def __init__(self, vclass='heavy', weight_kg=10000.0, capacity_kg=8000.0):
        self.id = 'v-1'
        self.vclass = vclass
        self.weight_kg = weight_kg
        self.capacity_kg = capacity_kg
        self.cold_chain = False
        self.accessible = False

class MockDelivery:
    def __init__(self, weight_kg=500.0, is_emergency=False):
        self.id = 'd-1'
        self.weight_kg = weight_kg
        self.dest_id = 'loc-1'
        self.is_emergency = is_emergency

def test_closed_segment_scores_zero():
    """SAFETY INVARIANT: CLOSED segment accessibility score must equal 0.0."""
    seg = MockSegment(surface='paved', mean_grade=2.0)
    score, _ = compute_accessibility(seg, 'heavy', rain_mm_h=0.0, hazard_p=0.0, status='CLOSED')
    assert score == 0.0, "CLOSED segment did not score 0.0. SAFETY INVARIANT VIOLATED."

def test_overweight_bridge_scores_zero():
    """SAFETY INVARIANT: Vehicle weight exceeding bridge maxweight must score 0.0."""
    seg = MockSegment(surface='paved', mean_grade=2.0, maxweight=3.0) # 3 tonne bridge
    score, _ = compute_accessibility(seg, 'heavy', rain_mm_h=0.0, hazard_p=0.0, status='OPEN') # heavy truck (10t)
    assert score == 0.0, "Overweight truck on light bridge did not score 0.0. SAFETY INVARIANT VIOLATED."

def test_plan_determinism():
    """DETERMINISM INVARIANT: CP-SAT solver with fixed seed returns identical objective & assignment count."""
    deliveries = [MockDelivery(500.0), MockDelivery(1200.0)]
    vehicles = [MockVehicle('mini', 3500.0, 2500.0), MockVehicle('heavy', 10000.0, 8000.0)]

    plan1, assign1, _, _, _ = optimize_plan(deliveries, vehicles, {}, sim_hour=0)
    plan2, assign2, _, _, _ = optimize_plan(deliveries, vehicles, {}, sim_hour=0)

    assert plan1.objective_value == plan2.objective_value, "CP-SAT objective values differ across identical runs. DETERMINISM VIOLATED."
    assert len(assign1) == len(assign2), "Assignment counts differ across identical runs. DETERMINISM VIOLATED."

def test_cascade_performance_sla():
    """PERFORMANCE SLA: Optimization execution must finish under 5.0 seconds."""
    t_start = time.perf_counter()
    deliveries = [MockDelivery(500.0)]
    vehicles = [MockVehicle('mini', 3500.0, 2500.0)]
    optimize_plan(deliveries, vehicles, {}, sim_hour=0)
    t_exec = time.perf_counter() - t_start
    assert t_exec < 5.0, f"CP-SAT optimization took {t_exec:.2f}s - exceeds 5.0s SLA."
