from typing import Dict, Any, List
from app.models.schema import Vehicle, Delivery

GRADE_COMFORT = {'heavy': 5.0, 'mini': 7.0, '4x4': 12.0, 'special': 8.0, 'ambulance': 10.0, 'accessible_van': 8.0}

def score_vehicle_suitability(vehicle: Vehicle, delivery: Delivery, dest_accessibility: Dict[str, float] = None) -> float:
    """
    Returns suitability score in [0.0, 1.0].
    0.0 = hard infeasible.
    """
    vclass = getattr(vehicle, 'vclass', 'mini')
    cap_kg = getattr(vehicle, 'capacity_kg', 2500.0)
    cold = getattr(vehicle, 'cold_chain', False)
    accessible = getattr(vehicle, 'accessible', False)

    deliv_weight = getattr(delivery, 'weight_kg', 500.0)
    deliv_cold = getattr(delivery, 'needs_cold_chain', False) if hasattr(delivery, 'needs_cold_chain') else False
    deliv_passenger = getattr(delivery, 'is_passenger', False) if hasattr(delivery, 'is_passenger') else False

    # Hard Checks
    if deliv_weight > cap_kg:
        return 0.0
    if deliv_cold and not cold:
        return 0.0
    if deliv_passenger and not accessible:
        return 0.0

    if dest_accessibility and dest_accessibility.get(vclass, 100.0) == 0.0:
        return 0.0

    # Soft Scoring
    cap_util = deliv_weight / max(cap_kg, 1.0)
    util_fit = 1.0 - abs(cap_util - 0.6)  # prefer ~60% capacity utilization
    
    class_bonus = 1.0
    if deliv_passenger and vclass == 'accessible_van': class_bonus = 1.3
    if getattr(delivery, 'is_emergency', False) and vclass in ['ambulance', '4x4']: class_bonus = 1.25

    score = (0.5 * util_fit + 0.5 * (1.0 if cap_util <= 1.0 else 0.0)) * class_bonus
    return max(0.0, min(1.0, round(score, 2)))
