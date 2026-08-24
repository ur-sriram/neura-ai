import os
import joblib

_model = None

def load():
    global _model
    for path in ['models/hazard_model.joblib', 'backend/models/hazard_model.joblib']:
        if os.path.exists(path):
            try:
                _model = joblib.load(path)
                print(f"  - Loaded hazard model from {path}")
                return
            except Exception as e:
                print(f"  - Failed loading hazard model from {path}: {e}")
    print("  - Hazard model artifact not found. Using T1 physical fallback.")

def predict(S: float, horizon_h: int, slope: float = 0.0, elevation: float = 500.0,
            antecedent_24h: float = 0.0, rain_now: float = 0.0) -> float:
    if _model is None:
        return hazard_fallback(S, horizon_h)
    try:
        features = [[S, slope, elevation, antecedent_24h, rain_now, horizon_h, S]]
        prob = float(_model.predict_proba(features)[0][1])
        return max(0.0, min(1.0, prob))
    except Exception:
        return hazard_fallback(S, horizon_h)

def hazard_fallback(S: float, horizon_h: int) -> float:
    decay = {6: 0.4, 12: 0.6, 24: 0.8, 48: 0.9, 72: 1.0}
    return max(0.0, min(1.0, S * decay.get(horizon_h, 0.8)))

# Auto-load on import
load()
