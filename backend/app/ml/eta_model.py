import os
import joblib

_model = None

BASE_SPEEDS = {
    'motorway': 80.0, 'trunk': 60.0, 'primary': 50.0,
    'secondary': 40.0, 'tertiary': 30.0, 'unclassified': 20.0,
    'residential': 15.0, 'track': 10.0
}

def load():
    global _model
    for path in ['models/eta_model.joblib', 'backend/models/eta_model.joblib']:
        if os.path.exists(path):
            try:
                _model = joblib.load(path)
                print(f"  - Loaded ETA model from {path}")
                return
            except Exception as e:
                print(f"  - Failed loading ETA model from {path}: {e}")
    print("  - ETA model artifact not found. Using T0 physical fallback.")

def predict(segment, vehicle_class: str, rain_mm_h: float) -> tuple[float, float]:
    """Returns (eta_p50_hours, eta_p90_hours)."""
    t0_p50, t0_p90 = eta_baseline(segment, vehicle_class, rain_mm_h)
    if _model is None:
        return t0_p50, t0_p90
    try:
        length_m = getattr(segment, 'length_m', 1500.0)
        grade = abs(getattr(segment, 'mean_grade', 3.0) or 3.0)
        features = [[length_m, grade, rain_mm_h, 0, t0_p50]]
        residual = float(_model.predict(features)[0])
        residual = max(0.8, min(residual, 3.0))
        p50 = t0_p50 * residual
        p90 = p50 * 1.35
        return p50, p90
    except Exception:
        return t0_p50, t0_p90

def eta_baseline(segment, vehicle_class: str, rain_mm_h: float) -> tuple[float, float]:
    highway = getattr(segment, 'highway_class', 'secondary') or 'secondary'
    speed = BASE_SPEEDS.get(highway, 25.0)
    grade = abs(getattr(segment, 'mean_grade', 3.0) or 3.0)
    length_m = getattr(segment, 'length_m', 1500.0) or 1500.0
    
    grade_factor = max(0.3, 1.0 - 0.04 * max(0.0, grade - 3.0))
    rain_factor = max(0.5, 1.0 - 0.03 * min(rain_mm_h, 10.0))
    
    effective_speed = max(5.0, speed * grade_factor * rain_factor)
    t0 = (length_m / 1000.0) / effective_speed
    return t0, t0 * 1.4

# Auto-load on import
load()
