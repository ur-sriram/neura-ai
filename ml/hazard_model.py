def predict_closure_probability(segment_features, horizon_h):
    """
    Mock implementation of 11.1 Landslide closure probability
    Input: segment features (slope, rain, history), horizon
    Output: P(closure) in [0, 1]
    """
    # Dummy T1 susceptibility index
    slope = segment_features.get('slope', 0)
    rain = segment_features.get('antecedent_rain_mm', 0)
    
    susceptibility = (0.4 * slope) + (0.6 * min(rain / 200, 1.0))
    
    # Dummy T2 logistic calibration over horizon
    base_prob = susceptibility * (horizon_h / 72.0)
    
    return min(max(base_prob, 0.0), 1.0)

def predict_flood_probability(segment_features, horizon_h):
    """
    Mock implementation of 11.2 Flood closure probability
    """
    elevation = segment_features.get('elevation', 100)
    upstream_rain = segment_features.get('upstream_rain_mm', 0)
    
    if elevation < 50 and upstream_rain > 150:
        return 0.8 * (horizon_h / 72.0)
    return 0.0
