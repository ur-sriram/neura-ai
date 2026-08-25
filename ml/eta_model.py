def predict_eta(route_segments, vehicle_class, weather_state):
    """
    Mock implementation of 11.3 ETA prediction (band + confidence)
    """
    # T0 Baseline
    base_time_minutes = len(route_segments) * 15.0 
    
    # Weather penalty
    weather_penalty = 1.0
    if weather_state == "rain":
        weather_penalty = 1.3
        
    # Class penalty
    class_penalty = 1.0
    if vehicle_class == "heavy_truck":
        class_penalty = 1.5
        
    p50 = base_time_minutes * weather_penalty * class_penalty
    p90 = p50 * 1.25 # 25% upper bound variance (mocked LightGBM residual)
    
    return {
        "eta_p50": p50,
        "eta_p90": p90,
        "confidence": 0.85
    }
