from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.schemas.api import ModelPerformanceMetrics, DataPoint, ClosureDataPoint

def get_model_performance(db: Session, scenario_id: int) -> ModelPerformanceMetrics:
    """
    Generates a realistic time-series tracking of ETA predictions vs actuals 
    and closure precision/recall for the scenario to demonstrate model calibration.
    """
    # Seed random with scenario_id so it's consistent for a given scenario
    random.seed(scenario_id)
    
    # 24 hours of data, 1 hour intervals
    now = datetime.now()
    times = [(now - timedelta(hours=i)).strftime("%H:00") for i in range(24)]
    times.reverse()
    
    eta_series = []
    closure_series = []
    
    # Simulating a system that "warms up" and learns
    # Early hours have higher error, later hours have lower error
    current_mae_trend = 15.0 # start at 15 mins error
    current_precision_trend = 0.65
    current_recall_trend = 0.50
    
    total_error = 0
    total_sq_error = 0
    count = 0
    
    for i, t in enumerate(times):
        # 1. ETA Calibration
        # base trip time around 120 mins
        actual = random.uniform(90.0, 180.0) 
        
        # prediction error decreases over time
        error_magnitude = max(3.0, current_mae_trend + random.uniform(-5.0, 5.0))
        predicted = actual + random.choice([1, -1]) * error_magnitude
        
        eta_series.append(DataPoint(time=t, predicted=round(predicted, 1), actual=round(actual, 1)))
        
        total_error += abs(predicted - actual)
        total_sq_error += (predicted - actual) ** 2
        count += 1
        
        current_mae_trend = max(4.0, current_mae_trend - 0.5) # improves over time
        
        # 2. Closure Accuracy
        # precision and recall improve
        prec = min(0.95, current_precision_trend + random.uniform(-0.05, 0.08))
        rec = min(0.92, current_recall_trend + random.uniform(-0.04, 0.10))
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        
        closure_series.append(ClosureDataPoint(time=t, precision=round(prec, 3), recall=round(rec, 3), f1_score=round(f1, 3)))
        
        current_precision_trend = prec
        current_recall_trend = rec
        
    mae = total_error / count
    rmse = (total_sq_error / count) ** 0.5
    
    return ModelPerformanceMetrics(
        eta_mae=round(mae, 2),
        eta_rmse=round(rmse, 2),
        closure_precision=round(current_precision_trend, 3),
        closure_recall=round(current_recall_trend, 3),
        closure_f1=round(2 * (current_precision_trend * current_recall_trend) / (current_precision_trend + current_recall_trend), 3),
        eta_calibration_series=eta_series,
        closure_accuracy_series=closure_series
    )
