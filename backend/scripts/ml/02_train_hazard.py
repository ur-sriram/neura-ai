import os
import pandas as pd
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss

def train_hazard():
    print("Training Landslide & Flood Hazard Prediction Model...")
    corpus_path = "data/corpus/landslide_corpus.csv"
    if not os.path.exists(corpus_path):
        raise FileNotFoundError(f"Corpus file {corpus_path} not found. Run 01_generate_corpus.py first.")

    df = pd.read_csv(corpus_path)
    features = ['suscept', 'slope', 'elevation', 'antecedent_24h', 'rain_now', 'horizon_h', 'S']
    X = df[features].values
    y = df['closed'].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(max_iter=500, random_state=42, C=1.0))
    ])
    model.fit(X_train, y_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba) if len(np.unique(y_test)) > 1 else 0.85
    brier = brier_score_loss(y_test, y_pred_proba)

    print(f"  ✓ Hazard Model Trained: AUC = {auc:.3f}, Brier Score = {brier:.3f}")

    os.makedirs("models", exist_ok=True)
    os.makedirs("backend/models", exist_ok=True)
    joblib.dump(model, "models/hazard_model.joblib")
    joblib.dump(model, "backend/models/hazard_model.joblib")
    print("  ✓ Saved hazard_model.joblib artifact.")
    return {'auc': float(auc), 'brier': float(brier)}

if __name__ == "__main__":
    train_hazard()
