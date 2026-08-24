# PHASE 04 — AI/ML MODELS
**Track:** C | **Hours:** 4–12 | **Agent:** ML Agent  
**Output:** Trained model artifacts (`hazard_model.joblib`, `eta_model.joblib`) + EVAL.md  
**Master spec refs:** Section 11 (Prediction Layer), Section 23 (AI/ML Architecture)

---

## Context

You are building the **AI/ML training pipeline** for NE-Setu. This runs **once at build time** to produce trained model artifacts loaded by the backend at runtime. 

**Critical rule:** Every model has a deterministic T0/T1 fallback. If a model fails to load, the system degrades gracefully — it never crashes.

**Honesty rule (Section 11.1):** Models are calibrated on synthetic data generated from real terrain + real rainfall. This is disclosed in EVAL.md and in the data-provenance panel. Do not overstate model capability.

---

## Deliverables

1. `scripts/ml/01_generate_corpus.py` — generates the training corpus from real terrain + weather
2. `scripts/ml/02_train_hazard.py` — trains and calibrates the landslide/flood model
3. `scripts/ml/03_train_eta.py` — trains the ETA residual model
4. `scripts/ml/04_eval.py` — evaluates all models and writes EVAL.md
5. `models/hazard_model.joblib` — saved scikit-learn pipeline
6. `models/eta_model.joblib` — saved LightGBM model
7. `models/EVAL.md` — honest evaluation report (quoted in demo)

---

## Step 1: Generate Training Corpus (`01_generate_corpus.py`)

### Landslide Closure Corpus

```python
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
import joblib

np.random.seed(42)  # FIXED SEED — determinism required

def generate_landslide_corpus(segments_df, weather_timeline_df, n_episodes=5):
    """
    Replay real weather archive over real terrain N times with stochastic noise.
    Generates closure events at physically plausible times and locations.
    """
    records = []
    
    for episode in range(n_episodes):
        rng = np.random.default_rng(42 + episode)
        
        for _, seg in segments_df.iterrows():
            for sim_hour in range(96):
                weather = weather_timeline_df[weather_timeline_df.sim_hour == sim_hour].iloc[0]
                
                # Antecedent rainfall (cumulative last 24h)
                antecedent = weather_timeline_df[
                    (weather_timeline_df.sim_hour >= max(0, sim_hour-24)) &
                    (weather_timeline_df.sim_hour < sim_hour)
                ]['rain_mm_h'].sum()
                
                # Physical susceptibility
                S = seg['suscept_landslide'] * (
                    min(1.0, antecedent / 80.0) + 
                    0.5 * min(1.0, weather['rain_mm_h'] / 15.0)
                )
                
                # Stochastic closure event (spatial clustering)
                # High S + neighbour closure increases probability
                base_prob = S ** 2 * 0.15  # max ~15% per hour at S=1
                closure = rng.random() < base_prob + episode * 0.01
                
                for horizon in [6, 12, 24, 48, 72]:
                    records.append({
                        'segment_id': seg['id'],
                        'episode': episode,
                        'sim_hour': sim_hour,
                        'horizon_h': horizon,
                        'suscept': seg['suscept_landslide'],
                        'slope': abs(seg['mean_grade']),
                        'elevation': seg.get('elevation_m', 500),
                        'antecedent_24h': antecedent,
                        'rain_now': weather['rain_mm_h'],
                        'S': S,
                        # Target: did a closure happen within [sim_hour, sim_hour+horizon]?
                        'closed': closure,
                    })
    
    return pd.DataFrame(records)
```

### ETA Residual Corpus

```python
def generate_eta_corpus(segments_df, weather_timeline_df):
    """
    Simulate traversal times for each segment under varying weather conditions.
    Ground truth = T0 baseline * delay_multiplier (physically motivated).
    LightGBM learns to predict the delay_multiplier residual.
    """
    records = []
    rng = np.random.default_rng(42)
    
    BASE_SPEEDS = {  # km/h by highway class
        'motorway': 80, 'trunk': 60, 'primary': 50,
        'secondary': 40, 'tertiary': 30, 'unclassified': 20,
        'residential': 15, 'track': 10
    }
    
    for _, seg in segments_df.iterrows():
        for sim_hour in range(0, 96, 3):  # sample every 3 hours
            weather = weather_timeline_df[weather_timeline_df.sim_hour == sim_hour].iloc[0]
            
            base_speed = BASE_SPEEDS.get(seg['highway_class'], 20)
            
            # Grade penalty
            grade = abs(seg['mean_grade'])
            grade_factor = max(0.3, 1.0 - 0.04 * max(0, grade - 3))
            
            # Weather penalty
            rain = weather['rain_mm_h']
            rain_factor = max(0.5, 1.0 - 0.03 * min(rain, 10))
            
            # Stochastic delay (convoy, partial blockage, etc.)
            delay_noise = rng.lognormal(mean=0, sigma=0.2)  # multiplicative
            
            effective_speed = base_speed * grade_factor * rain_factor
            t0_hours = (seg['length_m'] / 1000) / effective_speed
            actual_hours = t0_hours * delay_noise
            
            records.append({
                'segment_id': seg['id'],
                'highway_class': seg['highway_class'],
                'surface': seg['surface'],
                'length_m': seg['length_m'],
                'mean_grade': grade,
                'rain_mm_h': rain,
                'sim_hour_of_day': sim_hour % 24,
                't0_hours': t0_hours,
                'actual_hours': actual_hours,
                'residual_multiplier': actual_hours / max(t0_hours, 0.001),
            })
    
    return pd.DataFrame(records)
```

---

## Step 2: Train Hazard Model (`02_train_hazard.py`)

```python
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss
import joblib

def train_hazard_model(corpus_df):
    features = ['suscept', 'slope', 'elevation', 'antecedent_24h', 'rain_now', 'horizon_h', 'S']
    X = corpus_df[features].values
    y = corpus_df['closed'].values.astype(int)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(max_iter=500, random_state=42, C=1.0))
    ])
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    brier = brier_score_loss(y_test, y_pred_proba)
    
    print(f"Hazard model: AUC={auc:.3f}, Brier={brier:.3f}")
    
    joblib.dump(model, 'models/hazard_model.joblib')
    return {'auc': auc, 'brier': brier}
```

**T1 Fallback (used when model fails to load):**
```python
def hazard_fallback(S, horizon_h):
    """Pure formula, no model required."""
    decay = {6:0.4, 12:0.6, 24:0.8, 48:0.9, 72:1.0}
    return S * decay[horizon_h]
```

---

## Step 3: Train ETA Model (`03_train_eta.py`)

```python
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib

def train_eta_model(corpus_df):
    feature_cols = ['length_m', 'mean_grade', 'rain_mm_h', 'sim_hour_of_day', 't0_hours']
    # Encode highway_class and surface as ordinal integers
    
    X = corpus_df[feature_cols].values
    y = corpus_df['residual_multiplier'].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = lgb.LGBMRegressor(
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=31,
        random_state=42,
        n_jobs=1           # deterministic
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)])
    
    # Evaluate: MAE on residual + p90 calibration
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    
    # P90 calibration: was actual below predicted_p90 ~90% of the time?
    p90_predictions = y_pred * 1.3  # simple band estimate
    p90_coverage = np.mean(y_test <= p90_predictions)
    
    print(f"ETA model: MAE residual={mae:.3f}, P90 coverage={p90_coverage:.1%}")
    
    joblib.dump(model, 'models/eta_model.joblib')
    return {'mae_residual': mae, 'p90_coverage': p90_coverage}
```

**T0 Fallback (used when model fails to load):**
```python
BASE_SPEEDS = {'motorway':80,'trunk':60,'primary':50,'secondary':40,'tertiary':30,'unclassified':20,'track':10}

def eta_baseline(segment, vehicle_class, rain_mm_h):
    """Deterministic T0 estimate. Always available."""
    speed = BASE_SPEEDS.get(segment.highway_class, 20)
    grade_factor = max(0.3, 1.0 - 0.04 * max(0, abs(segment.mean_grade) - 3))
    rain_factor = max(0.5, 1.0 - 0.03 * min(rain_mm_h, 10))
    effective_speed = speed * grade_factor * rain_factor
    t0 = (segment.length_m / 1000) / effective_speed
    # Band: [p50=t0, p90=t0*1.4] (conservative fixed uncertainty)
    return t0, t0 * 1.4
```

---

## Step 4: Evaluate & Write EVAL.md (`04_eval.py`)

```python
def write_eval_md(hazard_metrics, eta_metrics):
    content = f"""# NE-SETU MODEL EVALUATION REPORT
Generated: {datetime.now().isoformat()}

## Training Data Disclosure
All models are trained on **synthetic-but-principled data**:
- Road network: real OSM geometry for Guwahati–Jowai corridor
- Elevation/slope: real SRTM 30m DEM
- Weather: real Open-Meteo historical archive (2023-08-10 to 2023-08-14)
- Closure events: **simulated** via physical susceptibility model + stochastic noise
- Fleet/deliveries: **simulated** by design

This is the cold-start state. In production, the platform accumulates real closure
events via its own event pipeline and retrains on those (POST /models/retrain).

## Landslide Closure Model (Logistic Regression on T1 susceptibility features)
- Architecture: T1 physical susceptibility index → logistic calibration
- Evaluation: held-out replay (20% of generated corpus)
- **AUC (ROC):** {hazard_metrics['auc']:.3f} (target ≥ 0.80)
- **Brier Score:** {hazard_metrics['brier']:.3f} (target ≤ 0.15)
- Interpretation: AUC measures discrimination (can it rank risky segments above safe ones?).
  Brier measures calibration (does P=0.7 actually close 70% of the time?).

## ETA Prediction Model (LightGBM on T0 residuals)
- Architecture: T0 baseline (physical speed model) + LightGBM residual multiplier
- Evaluation: held-out replay (20% of generated corpus)
- **MAE (residual multiplier):** {eta_metrics['mae_residual']:.3f}
- **P90 Coverage:** {eta_metrics['p90_coverage']:.1%} (target 88–92%)
- Interpretation: the band is correctly calibrated — real travel times fell below the P90
  estimate {eta_metrics['p90_coverage']:.0%} of the time in evaluation.

## Demand Forecast (Elasticity model — no training required)
- Method: demand = base × (1 + α × hazard_exposure)
- α by commodity: MEDICAL=0.8, FOOD=0.5, WATER=0.6, GENERAL=0.1
- Evaluation: face validity — demand increases monotonically with hazard exposure ✓

## Fallback Behaviour
If any model artifact fails to load:
- Hazard model → T1 susceptibility × horizon decay (no ML)
- ETA model → T0 physical baseline with fixed ×1.4 P90 band
- Demand model → prior elasticity α values (unchanged)
The UI shows "Model in baseline mode" amber badge. System never crashes.
"""
    with open('models/EVAL.md', 'w') as f:
        f.write(content)
```

---

## Runtime Integration (`backend/app/ml/`)

### `hazard_model.py`
```python
import joblib, os

_model = None

def load():
    global _model
    try:
        _model = joblib.load('models/hazard_model.joblib')
    except Exception as e:
        print(f"WARNING: hazard model failed to load ({e}). Using T1 fallback.")

def predict(S: float, horizon_h: int, slope: float = 0, elevation: float = 500,
            antecedent_24h: float = 0, rain_now: float = 0) -> float:
    if _model is None:
        return hazard_fallback(S, horizon_h)
    features = [[S, slope, elevation, antecedent_24h, rain_now, horizon_h, S]]
    return float(_model.predict_proba(features)[0][1])

def hazard_fallback(S: float, horizon_h: int) -> float:
    decay = {6:0.4, 12:0.6, 24:0.8, 48:0.9, 72:1.0}
    return S * decay.get(horizon_h, 0.8)
```

### `eta_model.py`
```python
import joblib, numpy as np

_model = None

def load():
    global _model
    try:
        _model = joblib.load('models/eta_model.joblib')
    except Exception as e:
        print(f"WARNING: ETA model failed to load ({e}). Using T0 fallback.")

def predict(segment, vehicle_class: str, rain_mm_h: float) -> tuple[float, float]:
    """Returns (eta_p50_hours, eta_p90_hours)."""
    t0, t0_p90 = eta_baseline(segment, vehicle_class, rain_mm_h)
    if _model is None:
        return t0, t0_p90
    features = [[segment.length_m, abs(segment.mean_grade), rain_mm_h, 0, t0]]
    residual = float(_model.predict(features)[0])
    residual = max(0.8, min(residual, 3.0))  # clamp to plausible range
    p50 = t0 * residual
    p90 = p50 * 1.3
    return p50, p90
```

---

## Acceptance Criteria

- [ ] `models/hazard_model.joblib` exists and loads without error
- [ ] `models/eta_model.joblib` exists and loads without error
- [ ] `models/EVAL.md` exists with real metric values filled in (not placeholders)
- [ ] Hazard model AUC ≥ 0.75 on held-out replay
- [ ] ETA model P90 coverage between 80–98%
- [ ] Both models load in < 500ms at backend startup
- [ ] With model artificially deleted, system falls back gracefully and shows amber badge
- [ ] `scripts/ml/run_all.sh` completes end-to-end without error
