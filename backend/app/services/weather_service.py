import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

from app.data.ner_data import (
    WEATHER_CURRENT,
    WEATHER_ZONES,
    CITIES,
    get_weather_zone_of_city,
)
from app.models.schemas import WeatherInfo

OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"

logger = logging.getLogger(__name__)

_cache: Dict[str, Dict] = {}
_cache_ts: Dict[str, datetime] = {}
CACHE_TTL_SECONDS = 300

_weather_lock = asyncio.Lock()

WMO_CODES = {
    0: ("Clear", "Clear sky"),
    1: ("Partly Cloudy", "Mainly clear"),
    2: ("Cloudy", "Partly cloudy"),
    3: ("Cloudy", "Overcast"),
    45: ("Fog", "Depositing rime fog"),
    48: ("Fog", "Fog"),
    51: ("Drizzle", "Light drizzle"),
    53: ("Drizzle", "Moderate drizzle"),
    55: ("Drizzle", "Dense drizzle"),
    61: ("Rain", "Slight rain"),
    63: ("Rain", "Moderate rain"),
    65: ("Rain", "Heavy rain"),
    71: ("Snow", "Slight snow"),
    73: ("Snow", "Moderate snow"),
    75: ("Snow", "Heavy snow"),
    80: ("Rain", "Slight rain showers"),
    81: ("Rain", "Moderate rain showers"),
    82: ("Rain", "Violent rain showers"),
    95: ("Thunderstorm", "Thunderstorm"),
    96: ("Thunderstorm", "Thunderstorm with hail"),
    99: ("Thunderstorm", "Thunderstorm with heavy hail"),
}


def _condition_from_code(code: int) -> str:
    return WMO_CODES.get(code, ("Cloudy", "Unknown"))[0]


def _check_flood_warning(precipitation_mm: float, humidity: float, condition: str) -> bool:
    if precipitation_mm >= 20:
        return True
    if precipitation_mm >= 10 and humidity >= 90:
        return True
    if condition == "Rain" and precipitation_mm >= 5 and humidity >= 95:
        return True
    return False


def _check_landslide_warning(
    precipitation_mm: float, humidity: float, zone: Optional[Dict]
) -> bool:
    base_risk = 0.0
    if zone:
        base_risk += zone.get("landslide_risk", 0) * 100
        base_risk += zone.get("monsoon_risk", 0) * 50
    if precipitation_mm >= 30:
        base_risk += 60
    elif precipitation_mm >= 15:
        base_risk += 30
    elif precipitation_mm >= 5:
        base_risk += 10
    if humidity >= 95:
        base_risk += 15
    return base_risk >= 50


def _cache_get(key: str) -> Optional[Dict]:
    now = datetime.now(timezone.utc)
    cached = _cache.get(key)
    ts = _cache_ts.get(key)
    if not cached or not ts:
        return None
    if (now - ts).total_seconds() > CACHE_TTL_SECONDS:
        return None
    return cached


def _cache_set(key: str, value: Dict) -> None:
    _cache[key] = value
    _cache_ts[key] = datetime.now(timezone.utc)


async def fetch_open_meteo(lat: float, lng: float) -> Optional[Dict]:
    cache_key = f"{round(lat, 3)},{round(lng, 3)}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        "hourly": "temperature_2m,precipitation_probability",
        "timezone": "Asia/Kolkata",
        "forecast_days": 2,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(OPEN_METEO_BASE, params=params)
        if resp.status_code != 200:
            logger.warning("Open-Meteo %s failed: %s", resp.status_code, resp.text[:120])
            return None
        data = resp.json()
        _cache_set(cache_key, data)
        return data
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Open-Meteo HTTP error: %s", exc)
        return None


def _city_coords(city: str) -> Optional[Dict]:
    city_data = CITIES.get(city)
    if city_data:
        return city_data
    city_key = next(
        (k for k in CITIES if k.lower().startswith(city.lower())), None
    )
    if city_key:
        return CITIES[city_key]
    return None


def _build_weather_from_meteo(
    city: str, meteo: Dict
) -> WeatherInfo:
    current = meteo.get("current", {})
    zone = get_weather_zone_of_city(city)
    zone_name = zone["zone_name"] if zone else None

    temp_c = float(current.get("temperature_2m", 25.0))
    humidity = float(current.get("relative_humidity_2m", 70))
    wind_kmh = float(current.get("wind_speed_10m", 5))
    precip_mm = float(current.get("precipitation", 0))
    wmo_code = int(current.get("weather_code", 3))
    condition = _condition_from_code(wmo_code)

    hourly = meteo.get("hourly", {})
    rain_prob = 0
    if hourly and "precipitation_probability" in hourly:
        probs = hourly["precipitation_probability"][:24]
        rain_prob = max((int(p) for p in probs if p is not None), default=0)

    flood_warning = _check_flood_warning(precip_mm, humidity, condition)
    landslide_warning = _check_landslide_warning(precip_mm, humidity, zone)

    return WeatherInfo(
        city=city,
        temp_c=round(temp_c, 1),
        humidity=round(humidity, 0),
        condition=condition,
        wind_kmh=round(wind_kmh, 1),
        rain_probability_percent=rain_prob,
        precipitation_mm=round(precip_mm, 1),
        flood_warning=flood_warning,
        landslide_warning=landslide_warning,
        updated=datetime.now(timezone.utc).isoformat(),
        source="Open-Meteo",
        zone_name=zone_name,
        zone=zone,
    )


async def get_current_weather(city: str, use_live: bool = True) -> Optional[WeatherInfo]:
    fallback = None
    w = WEATHER_CURRENT.get(city)
    if w:
        zone = get_weather_zone_of_city(city)
        zone_name = zone["zone_name"] if zone else None
        fallback = WeatherInfo(
            city=city,
            temp_c=w["temp_c"],
            humidity=w["humidity"],
            condition=w["condition"],
            wind_kmh=w["wind_kmh"],
            rain_probability_percent=w.get("rain_probability_percent", 20),
            precipitation_mm=w.get("precipitation_mm", 0),
            flood_warning=w["flood_warning"],
            landslide_warning=w["landslide_warning"],
            updated=w["updated"],
            source="NER Static Dataset",
            zone_name=zone_name,
            zone=zone,
        )
    if not use_live:
        return fallback

    coords = _city_coords(city)
    if not coords:
        return fallback

    async with _weather_lock:
        meteo = await fetch_open_meteo(coords["lat"], coords["lon"])
    if not meteo:
        return fallback
    try:
        return _build_weather_from_meteo(city, meteo)
    except (KeyError, TypeError, ValueError) as exc:
        logger.warning("Open-Meteo parse failed for %s: %s", city, exc)
        return fallback


async def list_all_weather(use_live: bool = True) -> List[WeatherInfo]:
    out: List[WeatherInfo] = []
    for city in WEATHER_CURRENT:
        w = await get_current_weather(city, use_live=use_live)
        if w:
            out.append(w)
    return out


def get_weather_zones(state: Optional[str] = None) -> Dict[str, Dict]:
    out: Dict[str, Dict] = {}
    for zname, zdata in WEATHER_ZONES.items():
        if state and state not in zdata["states"]:
            continue
        out[zname] = zdata
    return out


async def weather_aware_factor(
    cities: List[str], use_live: bool = True
) -> Dict[str, float]:
    result: Dict[str, float] = {}
    for city in cities:
        zone = get_weather_zone_of_city(city)
        weather = await get_current_weather(city, use_live=use_live)
        factor = 1.0
        if weather:
            if weather.landslide_warning:
                factor *= 2.0
            if weather.flood_warning:
                factor *= 1.8
            if weather.humidity >= 90:
                factor *= 1.1
            if weather.wind_kmh >= 20:
                factor *= 1.15
            if weather.precipitation_mm and weather.precipitation_mm >= 10:
                factor *= 1.2
        if zone:
            factor *= 1.0 + zone.get("landslide_risk", 0) * 0.5
            factor *= 1.0 + zone.get("flood_risk", 0) * 0.4
            factor *= 1.0 + zone.get("monsoon_risk", 0) * 0.2
        result[city] = round(factor, 2)
    return result


# NER state capitals for the live-risk panel
_NER_CAPITALS = [
    "Guwahati",    # Assam (largest city / effective gateway)
    "Shillong",    # Meghalaya
    "Imphal",      # Manipur
    "Agartala",    # Tripura
    "Aizawl",      # Mizoram
    "Kohima",      # Nagaland
    "Itanagar",    # Arunachal Pradesh
    "Gangtok",     # Sikkim
]

_RISK_TIER_LABELS = {
    "critical": "Critical",
    "high": "High",
    "moderate": "Moderate",
    "low": "Low",
}


def _compute_risk_tier(weather: WeatherInfo) -> str:
    """Derive a simple 4-level risk tier from weather flags."""
    if weather.landslide_warning and weather.flood_warning:
        return "critical"
    if weather.landslide_warning or weather.flood_warning:
        return "high"
    if (weather.precipitation_mm or 0) >= 10 or weather.wind_kmh >= 30:
        return "moderate"
    return "low"


async def get_multi_city_weather(
    cities: Optional[List[str]] = None,
    use_live: bool = True,
) -> List[Dict]:
    """
    Parallel fetch of current weather + risk tier for all NER state capitals
    (or a custom city list). Used by GET /api/emergency/live-risk.
    """
    target = cities if cities else _NER_CAPITALS
    tasks = [get_current_weather(c, use_live=use_live) for c in target]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    panel: List[Dict] = []
    for city, w in zip(target, results):
        if isinstance(w, Exception) or w is None:
            panel.append({
                "city": city,
                "available": False,
                "risk_tier": "unknown",
                "risk_label": "Unknown",
            })
            continue
        tier = _compute_risk_tier(w)
        panel.append({
            "city": city,
            "available": True,
            "temp_c": w.temp_c,
            "humidity": w.humidity,
            "condition": w.condition,
            "wind_kmh": w.wind_kmh,
            "precipitation_mm": w.precipitation_mm,
            "rain_probability_percent": w.rain_probability_percent,
            "flood_warning": w.flood_warning,
            "landslide_warning": w.landslide_warning,
            "risk_tier": tier,
            "risk_label": _RISK_TIER_LABELS.get(tier, "Low"),
            "updated": w.updated,
            "source": w.source,
            "zone_name": w.zone_name,
        })
    return panel
