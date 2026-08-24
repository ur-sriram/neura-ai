import os
import pandas as pd
import numpy as np
import joblib
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

def train_eta():
    print("Training ETA Residual Travel Time Prediction Model...")
    corpus_path = "data/corpus/eta_corpus.csv"
    if not os.path.exists(corpus_path):
        raise FileNotFoundError(f"Corpus file {corpus_path} not found. Run 01_generate_corpus.py first.")

    df = pd.read_csv(corpus_path)
    feature_cols = ['length_m', 'mean_grade', 'rain_mm_h', 'sim_hour_of_day', 't0_hours']
    X = df[feature_cols].values
    y = df['residual_multiplier'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = lgb.LGBMRegressor(
        n_estimators=150,
        learning_rate=0.05,
        num_leaves=31,
        random_state=42,
        n_jobs=1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    
    # Calculate P90 coverage
    p90_predictions = y_pred * 1.3
    p90_coverage = np.mean(y_test <= p90_predictions)

    print(f"  ✓ ETA Model Trained: MAE residual = {mae:.3f}, P90 Coverage = {p90_coverage:.1%}")

    os.makedirs("models", exist_ok=True)
    os.makedirs("backend/models", exist_ok=True)
    joblib.dump(model, "models/eta_model.joblib")
    joblib.dump(model, "backend/models/eta_model.joblib")
    print("  ✓ Saved eta_model.joblib artifact.")
    return {'mae_residual': float(mae), 'p90_coverage': float(p90_coverage)}

if __name__ == "__main__":
    train_eta()
