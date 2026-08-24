from typing import Dict, Any
from app.models.schema import Delivery, CargoType

CARGO_BASE_PRIORITY = {
    'MEDICAL': 90.0,
    'MEDICINE_COLD': 95.0,
    'FOOD': 70.0,
    'WATER': 75.0,
    'GENERAL': 40.0,
    'PASSENGER': 85.0
}

def compute_delivery_priority(delivery: Delivery, sim_hour: int = 0, hazard_risk: float = 0.0) -> float:
    """
    Computes priority score in [1.0, 100.0].
    Emergency deliveries get explicit score escalation up to ~99.
    """
    cargo = getattr(delivery, 'cargo_code', 'GENERAL')
    base = CARGO_BASE_PRIORITY.get(cargo, 50.0)
    
    is_emerg = getattr(delivery, 'is_emergency', False)
    if is_emerg:
        return max(95.0, min(99.0, base + 10.0))

    deadline = getattr(delivery, 'deadline_sim', 24)
    time_remaining = max(1, deadline - sim_hour)
    
    urgency_multiplier = max(1.0, min(1.5, 24.0 / time_remaining))
    risk_bump = 10.0 * hazard_risk

    score = (base * urgency_multiplier) + risk_bump
    return max(1.0, min(94.0, round(score, 1)))
