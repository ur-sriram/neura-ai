from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException

from app.data.ner_data import STATES, CITIES, HOSPITALS, ACCESSIBILITY_POIS, WEATHER_ZONES
from app.models.schemas import CityInfo, StateInfo

router = APIRouter()


DATA_PORTAL_META = {
    "portal": "NER Open Data Portal",
    "inspired_by": "data.gov.in (National Data Sharing and Accessibility Policy - NDSAP)",
    "source": "NER Platform Public Dataset Compilation",
    "last_updated": datetime.now(timezone.utc).isoformat(),
    "region": "North Eastern Region (NER) of India",
    "states_covered": 8,
    "attribution": "Open datasets compiled from public sources: Census of India 2011, MoDoNER, NHAI, MoHUA, IMD",
    "license": "Creative Commons Attribution 4.0 (CC BY 4.0)",
}


NER_STATE_PROFILES: Dict[str, Dict[str, Any]] = {
    "Assam": {
        "state_code": "AS",
        "area_km2": 78438,
        "census_population_2011": 31205576,
        "estimated_population_2025": 36500000,
        "sex_ratio": 958,
        "literacy_rate_pct": 72.19,
        "urban_population_pct": 14.1,
        "gdp_crore_inr_2023_24": 568000,
        "official_languages": ["Assamese", "English", "Bengali", "Bodo"],
        "districts": 35,
        "subdivisions": 78,
        "airports": [
            {"name": "Lokpriya Gopinath Bordoloi International", "iata": "GAU", "type": "International"},
            {"name": "Dibrugarh", "iata": "DIB", "type": "Domestic"},
            {"name": "Silchar", "iata": "IXS", "type": "Domestic"},
            {"name": "Jorhat", "iata": "JRH", "type": "Domestic"},
            {"name": "Tezpur", "iata": "TEZ", "type": "Domestic"},
        ],
        "national_highways": ["NH 27", "NH 15", "NH 17", "NH 29", "NH 37", "NH 54"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Brahmaputra", "Barak", "Subansiri", "Kameng", "Manas"],
        "major_industries": ["Tea", "Oil & Natural Gas", "Coal", "Limestone", "Handloom & Textiles", "Tourism"],
        "agriculture_crops": ["Rice", "Tea", "Mustard", "Sugarcane", "Potato", "Pulses", "Fruits"],
        "key_heritage_sites": [
            "Kaziranga National Park (UNESCO)",
            "Manas National Park (UNESCO)",
            "Kamakhya Temple",
            "Sivasagar Monuments (Ahom Dynasty)",
            "Majuli (World's Largest River Island)",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 25800,
            "ayushman_bharat_beneficiaries_millions": 16.4,
            "ujjwala_yojana_lpg_connections_millions": 4.8,
            "pm_awas_yojana_houses_completed_thousands": 320,
        },
        "msme_units_registered_thousands": 840,
    },
    "Meghalaya": {
        "state_code": "ML",
        "area_km2": 22429,
        "census_population_2011": 2966889,
        "estimated_population_2025": 3450000,
        "sex_ratio": 989,
        "literacy_rate_pct": 74.43,
        "urban_population_pct": 20.1,
        "gdp_crore_inr_2023_24": 52000,
        "official_languages": ["English", "Khasi", "Garo"],
        "districts": 12,
        "subdivisions": 39,
        "airports": [
            {"name": "Shillong (Umroi)", "iata": "SHL", "type": "Domestic"},
            {"name": "Baljek (Tura)", "iata": "TUR", "type": "Domestic"},
        ],
        "national_highways": ["NH 6", "NH 106", "NH 217"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Umiam", "Simsang", "Kynshi", "Umngot"],
        "major_industries": ["Coal", "Limestone", "Cement", "Tourism", "Horticulture", "Handicrafts"],
        "agriculture_crops": ["Rice", "Maize", "Potato", "Orange", "Pineapple", "Turmeric", "Black Pepper"],
        "key_heritage_sites": [
            "Cherrapunji (Wettest Place on Earth)",
            "Mawsynram",
            "Living Root Bridges",
            "Umiam Lake",
            "Nokrek National Park (Biosphere Reserve)",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 8200,
            "ayushman_bharat_beneficiaries_millions": 1.6,
            "ujjwala_yojana_lpg_connections_millions": 0.45,
            "pm_awas_yojana_houses_completed_thousands": 42,
        },
        "msme_units_registered_thousands": 62,
    },
    "Manipur": {
        "state_code": "MN",
        "area_km2": 22327,
        "census_population_2011": 2855794,
        "estimated_population_2025": 3350000,
        "sex_ratio": 992,
        "literacy_rate_pct": 76.94,
        "urban_population_pct": 29.2,
        "gdp_crore_inr_2023_24": 48000,
        "official_languages": ["Meiteilon (Manipuri)", "English"],
        "districts": 16,
        "subdivisions": 38,
        "airports": [
            {"name": "Imphal (Bir Tikendrajit)", "iata": "IMF", "type": "Domestic"},
        ],
        "national_highways": ["NH 2", "NH 37", "NH 102", "NH 129A", "NH 137"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Imphal", "Iril", "Nambul", "Thoubal", "Barak (western)"],
        "major_industries": ["Handloom", "Handicrafts", "Sericulture", "Tourism", "Horticulture", "Sports Equipment"],
        "agriculture_crops": ["Rice", "Maize", "Lentil", "Chillies", "Pineapple", "Citrus", "Lotus Stem (Thambal)"],
        "key_heritage_sites": [
            "Kangla Fort Palace",
            "Loktak Lake (Floating Islands & Phums)",
            "Kebul Lamjao National Park",
            "Shree Govindajee Temple",
            "INA Memorial (Moirang - Azad Hind Fauj)",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 7900,
            "ayushman_bharat_beneficiaries_millions": 1.5,
            "ujjwala_yojana_lpg_connections_millions": 0.42,
            "pm_awas_yojana_houses_completed_thousands": 38,
        },
        "msme_units_registered_thousands": 58,
    },
    "Tripura": {
        "state_code": "TR",
        "area_km2": 10486,
        "census_population_2011": 3673917,
        "estimated_population_2025": 4250000,
        "sex_ratio": 961,
        "literacy_rate_pct": 87.22,
        "urban_population_pct": 26.2,
        "gdp_crore_inr_2023_24": 82000,
        "official_languages": ["Kokborok", "Bengali", "English"],
        "districts": 8,
        "subdivisions": 23,
        "airports": [
            {"name": "Agartala (Maharaja Bir Bikram)", "iata": "IXA", "type": "International"},
        ],
        "national_highways": ["NH 8", "NH 108", "NH 108A", "NH 208"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Meghna", "Gumti", "Manu", "Feni", "Haora", "Deo"],
        "major_industries": ["Rubber", "Tea", "Handloom & Handicrafts", "Tourism", "Fruit Processing", "Bamboo"],
        "agriculture_crops": ["Rice", "Pineapple", "Jackfruit", "Mango", "Rubber", "Tea", "Orange"],
        "key_heritage_sites": [
            "Ujjayanta Palace",
            "Neermahal (Lake Palace)",
            "Unakoti Rock Carvings",
            "Sepahijala Wildlife Sanctuary",
            "Tripura Sundari Temple (Matabari)",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 5200,
            "ayushman_bharat_beneficiaries_millions": 1.9,
            "ujjwala_yojana_lpg_connections_millions": 0.58,
            "pm_awas_yojana_houses_completed_thousands": 52,
        },
        "msme_units_registered_thousands": 74,
    },
    "Mizoram": {
        "state_code": "MZ",
        "area_km2": 21081,
        "census_population_2011": 1097206,
        "estimated_population_2025": 1320000,
        "sex_ratio": 976,
        "literacy_rate_pct": 91.33,
        "urban_population_pct": 52.1,
        "gdp_crore_inr_2023_24": 36000,
        "official_languages": ["Mizo", "English"],
        "districts": 11,
        "subdivisions": 29,
        "airports": [
            {"name": "Aizawl (Lengpui)", "iata": "AJL", "type": "Domestic"},
        ],
        "national_highways": ["NH 6", "NH 150", "NH 202", "NH 154"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Tlawng", "Tuirial", "Chhimtuipui (Kaladan)", "Serlui", "Tuirini"],
        "major_industries": ["Bamboo", "Tea", "Handloom & Handicrafts", "Tourism", "Horticulture", "Rubber"],
        "agriculture_crops": ["Rice", "Maize", "Ginger", "Turmeric", "Chillies", "Passion Fruit", "Litchi"],
        "key_heritage_sites": [
            "Aizawl City View",
            "Murlen National Park",
            "Phawngpui (Blue Mountain)",
            "Vantawng Waterfalls",
            "Khawnglung Wildlife Sanctuary",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 7100,
            "ayushman_bharat_beneficiaries_millions": 0.58,
            "ujjwala_yojana_lpg_connections_millions": 0.15,
            "pm_awas_yojana_houses_completed_thousands": 18,
        },
        "msme_units_registered_thousands": 22,
    },
    "Nagaland": {
        "state_code": "NL",
        "area_km2": 16579,
        "census_population_2011": 1980602,
        "estimated_population_2025": 2320000,
        "sex_ratio": 931,
        "literacy_rate_pct": 79.55,
        "urban_population_pct": 28.8,
        "gdp_crore_inr_2023_24": 44000,
        "official_languages": ["English"],
        "districts": 16,
        "subdivisions": 41,
        "airports": [
            {"name": "Dimapur", "iata": "DMU", "type": "Domestic"},
        ],
        "national_highways": ["NH 2", "NH 29", "NH 129", "NH 150", "NH 202"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Doyang", "Dhansiri", "Milak", "Tizu", "Tsurang"],
        "major_industries": ["Handloom & Handicrafts", "Bamboo", "Tourism", "Forestry", "Oil Palm", "Coffee"],
        "agriculture_crops": ["Rice", "Maize", "Millets", "Pineapple", "Passion Fruit", "Orange", "Coffee"],
        "key_heritage_sites": [
            "Hornbill Festival Venue (Kisama)",
            "Kohima WWII Cemetery",
            "Dzükou Valley",
            "Intanki National Park",
            "Shilloi Lake",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 6400,
            "ayushman_bharat_beneficiaries_millions": 1.05,
            "ujjwala_yojana_lpg_connections_millions": 0.28,
            "pm_awas_yojana_houses_completed_thousands": 28,
        },
        "msme_units_registered_thousands": 38,
    },
    "Arunachal Pradesh": {
        "state_code": "AR",
        "area_km2": 83743,
        "census_population_2011": 1383727,
        "estimated_population_2025": 1680000,
        "sex_ratio": 938,
        "literacy_rate_pct": 65.38,
        "urban_population_pct": 22.9,
        "gdp_crore_inr_2023_24": 68000,
        "official_languages": ["English"],
        "districts": 26,
        "subdivisions": 63,
        "airports": [
            {"name": "Itanagar (Donyi Polo)", "iata": "HGI", "type": "Domestic"},
            {"name": "Pasighat", "iata": "IXT", "type": "Domestic"},
            {"name": "Tezu", "iata": "TEI", "type": "Domestic"},
            {"name": "Zero", "iata": "ZER", "type": "Domestic"},
            {"name": "Tawang (operational 2024)", "iata": "—", "type": "Strategic"},
        ],
        "national_highways": ["NH 13", "NH 15", "NH 415", "NH 229"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Brahmaputra (Siang)", "Lohit", "Subansiri", "Kameng", "Dibang", "Tirap"],
        "major_industries": ["Hydro Power", "Forestry", "Tourism", "Horticulture", "Bamboo", "Tea"],
        "agriculture_crops": ["Rice", "Maize", "Millets", "Potato", "Orange", "Apple", "Cardamom", "Mishmi Teeta"],
        "key_heritage_sites": [
            "Tawang Monastery (2nd Largest in World)",
            "Namdapha National Park (UNESCO Tentative)",
            "Sela Pass",
            "Ziro Valley (UNESCO Tentative)",
            "Bomdila Monastery",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 11800,
            "ayushman_bharat_beneficiaries_millions": 0.72,
            "ujjwala_yojana_lpg_connections_millions": 0.22,
            "pm_awas_yojana_houses_completed_thousands": 24,
        },
        "msme_units_registered_thousands": 29,
    },
    "Sikkim": {
        "state_code": "SK",
        "area_km2": 7096,
        "census_population_2011": 610577,
        "estimated_population_2025": 720000,
        "sex_ratio": 890,
        "literacy_rate_pct": 81.42,
        "urban_population_pct": 25.2,
        "gdp_crore_inr_2023_24": 52000,
        "official_languages": ["Nepali", "English", "Bhutia", "Lepcha"],
        "districts": 6,
        "subdivisions": 9,
        "airports": [
            {"name": "Gangtok (Pakyong)", "iata": "PYG", "type": "Domestic"},
        ],
        "national_highways": ["NH 10", "NH 310", "NH 510", "NH 710"],
        "railway_zones": ["Northeast Frontier Railway (NFR)"],
        "major_rivers": ["Teesta", "Rangeet", "Rangpo", "Rorachu", "Jaldhaka"],
        "major_industries": ["Tourism", "Hydropower", "Organic Agriculture", "Tea", "Handicrafts", "Cardamom"],
        "agriculture_crops": ["Rice", "Maize", "Cardamom", "Ginger", "Turmeric", "Apple", "Tea (Temi)"],
        "key_heritage_sites": [
            "Kanchenjunga National Park (UNESCO)",
            "Rumtek Monastery",
            "Tsomgo (Changu) Lake",
            "Nathu La Pass",
            "Gurudongmar Lake",
        ],
        "scheme_coverage": {
            "pmgsy_road_length_km": 2900,
            "ayushman_bharat_beneficiaries_millions": 0.32,
            "ujjwala_yojana_lpg_connections_millions": 0.09,
            "pm_awas_yojana_houses_completed_thousands": 12,
        },
        "msme_units_registered_thousands": 18,
    },
}


TRANSPORT_DATASET: Dict[str, Any] = {
    "total_national_highway_length_km_ner": 14500,
    "total_airports": 15,
    "total_railway_route_km": 2650,
    "nh_by_state": {
        "Assam": 3800,
        "Arunachal Pradesh": 2900,
        "Meghalaya": 1200,
        "Manipur": 1700,
        "Tripura": 900,
        "Mizoram": 1400,
        "Nagaland": 1500,
        "Sikkim": 700,
    },
    "major_international_borders": [
        {"border_with": "Bhutan", "length_km": 267, "states": ["Assam", "Arunachal Pradesh"]},
        {"border_with": "Bangladesh", "length_km": 1880, "states": ["Assam", "Meghalaya", "Tripura", "Mizoram"]},
        {"border_with": "Myanmar", "length_km": 1643, "states": ["Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram"]},
        {"border_with": "China (Tibet)", "length_km": 1129, "states": ["Arunachal Pradesh", "Sikkim"]},
        {"border_with": "Nepal", "length_km": 97, "states": ["Sikkim"]},
    ],
    "key_transport_projects": [
        {
            "name": "Brahmaputra National Waterway - 2 (NW2)",
            "stretch": "Dhubri to Sadiya (891 km)",
            "status": "Operational + Under Development",
            "authority": "IWAI",
        },
        {
            "name": "Kaladan Multimodal Transit Transport Project",
            "stretch": "Kolkata → Sittwe (Myanmar) → Paletwa → Mizoram",
            "status": "Partially Operational",
            "authority": "MoPSW + MoDoNER",
        },
        {
            "name": "Imphal-Moreh Integrated Check Post (ASEAN Highway)",
            "stretch": "Asian Highway AH1 & AH3",
            "status": "Operational",
            "authority": "MHA + MORTH",
        },
        {
            "name": "Agartala-Akhaura Rail Link",
            "stretch": "India-Bangladesh (Nischintapur)",
            "status": "Operational 2024",
            "authority": "Railway Board",
        },
        {
            "name": "Rupsi Airport (Strategic Hub for Bodoland & NE)",
            "stretch": "Kokrajhar, Assam",
            "status": "Operational 2021",
            "authority": "AAI",
        },
        {
            "name": "Char Dham of the East (Gangtok - Tawang - Bomdila - Ziro)",
            "stretch": "NH-13 Trans-Arunachal upgrade",
            "status": "Under Implementation (Bharatmala)",
            "authority": "MoRTH + BRO",
        },
    ],
    "nearest_major_seaports": [
        {"name": "Kolkata Port Trust", "distance_to_guwahati_km_by_river": 1380},
        {"name": "Paradip Port Trust", "distance_to_guwahati_km_by_road": 790},
        {"name": "Vizag (Visakhapatnam) Port", "distance_to_guwahati_km_by_road": 980},
    ],
}


HOSPITAL_SUMMARY = {
    "total_registered_government_hospitals_ner": 880,
    "total_chcs_phcs_scs_ner": 6400,
    "total_allotted_medical_college_seats_ug_ner_2024": 2150,
    "total_aiims_and_apex_institutes_ner": 5,
    "apex_institutes": [
        {"name": "AIIMS Guwahati", "state": "Assam", "status": "Operational 2022"},
        {"name": "AIIMS Manipur", "state": "Manipur", "status": "Operational 2023"},
        {"name": "NEIGRIHMS Shillong", "state": "Meghalaya", "status": "Operational 2007"},
        {"name": "Regional Institute of Medical Sciences (RIMS) Imphal", "state": "Manipur", "status": "Operational 1976"},
        {"name": "Assam Medical College Dibrugarh", "state": "Assam", "status": "Operational 1900"},
    ],
}


EDUCATION_SUMMARY = {
    "total_central_universities_ner": 8,
    "total_central_institutes_ner_iit_nit_iiit": 12,
    "total_sainik_schools_and_army_public_schools": 26,
    "total_net_enrollment_ratio_primary_ner_2023_24": 94.8,
    "central_institutes": [
        {"name": "IIT Guwahati", "state": "Assam", "estd": 1994, "nirf_engg_2024": 7},
        {"name": "NIT Silchar", "state": "Assam", "estd": 1967, "nirf_engg_2024": 40},
        {"name": "IIIT Guwahati", "state": "Assam", "estd": 2013, "nirf_engg_2024": 110},
        {"name": "NIT Agartala", "state": "Tripura", "estd": 1965, "nirf_engg_2024": 83},
        {"name": "NIT Meghalaya", "state": "Meghalaya", "estd": 2010, "nirf_engg_2024": 72},
        {"name": "NIT Manipur", "state": "Manipur", "estd": 2010, "nirf_engg_2024": 95},
        {"name": "NIT Nagaland", "state": "Nagaland", "estd": 2010},
        {"name": "NIT Mizoram", "state": "Mizoram", "estd": 2010},
        {"name": "NIT Arunachal Pradesh", "state": "Arunachal Pradesh", "estd": 2010},
        {"name": "NIT Sikkim", "state": "Sikkim", "estd": 2010},
        {"name": "IIIT Manipur", "state": "Manipur", "estd": 2015},
        {"name": "Indian Institute of Information Technology Design & Manufacturing (IIITDM) Jabalpur - Satellite Campus Guwahati", "state": "Assam"},
    ],
}


@router.get("/", summary="NER Open Data Portal index (data.gov.in-inspired)")
def portal_index():
    return {
        **DATA_PORTAL_META,
        "datasets": [
            {"id": "states-demographics", "name": "States Demographics & Socio-Economic Profiles", "records": 8, "category": "Demography"},
            {"id": "cities-master", "name": "Cities Master (lat/lon, transport, population)", "records": len(CITIES), "category": "Urban"},
            {"id": "transport-infrastructure", "name": "Transport Infrastructure (NH, Airports, Rails, Border Trade)", "category": "Infrastructure"},
            {"id": "health-facilities", "name": "Health Facilities & Hospitals", "records": len(HOSPITALS), "category": "Health"},
            {"id": "accessibility-pois", "name": "Accessibility POIs (PwD Friendly)", "records": len(ACCESSIBILITY_POIS), "category": "Social Justice"},
            {"id": "weather-zones", "name": "Weather & Disaster Zones (Flood, Landslide, Monsoon)", "records": len(WEATHER_ZONES), "category": "Disaster Management"},
            {"id": "education-councils", "name": "Education Councils & Apex Institutes", "category": "Education"},
        ],
        "endpoints": [
            {"method": "GET", "path": "/states", "description": "List all NER states with optional filters"},
            {"method": "GET", "path": "/states/{state_name}", "description": "Detailed state profile with demographics"},
            {"method": "GET", "path": "/cities", "description": "NER Cities master list with coordinates & infrastructure"},
            {"method": "GET", "path": "/transport", "description": "Transport datasets: highways, rails, airports, cross-border"},
            {"method": "GET", "path": "/hospitals", "description": "Hospital dataset with bed count, specialties, accessibility rating"},
            {"method": "GET", "path": "/accessibility-pois", "description": "PwD friendly Accessibility POIs"},
            {"method": "GET", "path": "/education", "description": "Education councils, universities, NIRF ranking"},
            {"method": "GET", "path": "/schemes", "description": "Centrally Sponsored Schemes coverage per state (PMGSY, PMJDY, etc.)"},
            {"method": "GET", "path": "/weather-zones", "description": "Agro-climatic & disaster zones with risk ratings"},
        ],
    }


@router.get("/states", summary="Get list of NER states with demographics (Census 2011 + 2025 estimates)")
def list_states(
    state: Optional[str] = Query(None, description="Optional state name filter"),
    min_literacy: Optional[float] = Query(None, ge=0, le=100, description="Filter by minimum literacy percentage"),
    include_profiles: bool = Query(True, description="Include full profile dataset"),
):
    results: List[Dict[str, Any]] = []
    for s in STATES:
        if state and s["name"].lower() != state.lower():
            continue
        profile = NER_STATE_PROFILES.get(s["name"], {})
        if min_literacy is not None and profile.get("literacy_rate_pct", 0) < min_literacy:
            continue
        state_out: Dict[str, Any] = {
            "state_name": s["name"],
            "state_code": profile.get("state_code", s["id"].upper()[:2]),
            "capital": s["capital"],
            "lat": s["lat"],
            "lng": s["lng"],
            "population_census_2011": profile.get("census_population_2011", s["population"]),
            "population_estimated_2025": profile.get("estimated_population_2025"),
            "area_km2": profile.get("area_km2", s["area"]),
            "sex_ratio": profile.get("sex_ratio"),
            "literacy_rate_pct": profile.get("literacy_rate_pct"),
            "urban_population_pct": profile.get("urban_population_pct"),
            "gdp_crore_inr_2023_24": profile.get("gdp_crore_inr_2023_24"),
            "official_languages": profile.get("official_languages", []),
            "districts": profile.get("districts"),
            "accessibility_score_pct": s["accessibilityScore"],
            "logistics_index_pct": s["logisticsIndex"],
        }
        if include_profiles:
            state_out["profile"] = profile
        results.append(state_out)
    return {
        "dataset_id": "states-demographics",
        "total": len(results),
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
        "items": results,
    }


@router.get("/states/{state_name}", summary="Detailed state profile with demographics & schemes")
def get_state_profile(state_name: str):
    s = next((x for x in STATES if x["name"].lower() == state_name.lower()), None)
    if not s:
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found. Valid: {[x['name'] for x in STATES]}")
    profile = NER_STATE_PROFILES.get(s["name"], {})
    return {
        "dataset_id": f"state-profile-{s['id']}",
        "state_name": s["name"],
        "state_code": profile.get("state_code"),
        "capital": s["capital"],
        "geography": {
            "lat": s["lat"],
            "lng": s["lng"],
            "area_km2": profile.get("area_km2", s["area"]),
            "terrain": profile.get("key_heritage_sites", [])[0] if profile.get("key_heritage_sites") else "Himalayan Foothills / Brahmaputra Valley",
        },
        "demographics": {
            "census_population_2011": profile.get("census_population_2011", s["population"]),
            "estimated_population_2025": profile.get("estimated_population_2025"),
            "sex_ratio": profile.get("sex_ratio"),
            "literacy_rate_pct": profile.get("literacy_rate_pct"),
            "urban_population_pct": profile.get("urban_population_pct"),
            "districts": profile.get("districts"),
            "subdivisions": profile.get("subdivisions"),
            "official_languages": profile.get("official_languages", []),
        },
        "economy": {
            "gdp_crore_inr_2023_24": profile.get("gdp_crore_inr_2023_24"),
            "major_industries": profile.get("major_industries", []),
            "agriculture_crops": profile.get("agriculture_crops", []),
            "msme_units_registered_thousands": profile.get("msme_units_registered_thousands"),
        },
        "infrastructure": {
            "airports": profile.get("airports", []),
            "national_highways": profile.get("national_highways", []),
            "major_rivers": profile.get("major_rivers", []),
        },
        "schemes_central": profile.get("scheme_coverage", {}),
        "tourism_heritage": profile.get("key_heritage_sites", []),
        "platform_metrics": {
            "accessibility_score_pct": s["accessibilityScore"],
            "logistics_index_pct": s["logisticsIndex"],
        },
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
    }


@router.get("/cities", summary="Get NER Cities master dataset with coordinates")
def list_cities(
    state: Optional[str] = Query(None),
    has_airport: Optional[bool] = Query(None),
    has_railhead: Optional[bool] = Query(None),
    min_population: Optional[int] = Query(None),
):
    out: List[CityInfo] = []
    for cname, c in CITIES.items():
        if state and c["state"] != state:
            continue
        if has_airport is not None and c["airport"] != has_airport:
            continue
        if has_railhead is not None and c["railhead"] != has_railhead:
            continue
        if min_population is not None and c["population"] < min_population:
            continue
        out.append(
            CityInfo(
                name=cname,
                state=c["state"],
                lat=c["lat"],
                lon=c["lng"],
                population=c["population"],
                airport=c["airport"],
                railhead=c["railhead"],
            )
        )
    return {
        "dataset_id": "cities-master",
        "total": len(out),
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
        "items": out,
    }


@router.get("/transport", summary="NER Transport Infrastructure dataset")
def get_transport():
    return {
        "dataset_id": "transport-infrastructure",
        **TRANSPORT_DATASET,
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
    }


@router.get("/hospitals", summary="NER hospitals with bed count, specialties, accessibility rating")
def list_hospitals(
    state: Optional[str] = Query(None),
    min_beds: Optional[int] = Query(None),
    is_tertiary: Optional[bool] = Query(None),
    min_accessibility: Optional[int] = Query(None, ge=0, le=5),
):
    out: List[Dict[str, Any]] = []
    for h in HOSPITALS:
        if state and h.get("state") != state:
            continue
        if min_beds and h["beds"] < min_beds:
            continue
        if is_tertiary is not None and h["tertiary"] != is_tertiary:
            continue
        if min_accessibility and h.get("accessibility_rating", 0) < min_accessibility:
            continue
        out.append(h)
    return {
        "dataset_id": "health-facilities",
        "total": len(out),
        "summary": HOSPITAL_SUMMARY,
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
        "items": out,
    }


@router.get("/accessibility-pois", summary="Accessibility POIs (PwD friendly) - NER")
def list_accessibility_pois(state: Optional[str] = Query(None)):
    out = []
    for p in ACCESSIBILITY_POIS:
        if state and p.get("state") != state:
            continue
        out.append(p)
    return {
        "dataset_id": "accessibility-pois",
        "total": len(out),
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
        "items": out,
    }


@router.get("/education", summary="NER Education councils, universities, central institutes")
def get_education():
    return {
        "dataset_id": "education-councils",
        "summary": EDUCATION_SUMMARY,
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
    }


@router.get("/schemes", summary="Centrally Sponsored Schemes coverage per state (aggregated)")
def get_schemes(state: Optional[str] = Query(None)):
    state_names = [s["name"] for s in STATES] if not state else [state]
    scheme_rows: List[Dict[str, Any]] = []
    for sname in state_names:
        p = NER_STATE_PROFILES.get(sname, {})
        scheme_rows.append({
            "state": sname,
            **p.get("scheme_coverage", {}),
            "msme_units_registered_thousands": p.get("msme_units_registered_thousands"),
        })
    totals: Dict[str, Any] = {
        "total_pmgsy_road_length_km_ner": sum(NER_STATE_PROFILES[s].get("scheme_coverage", {}).get("pmgsy_road_length_km", 0) for s in state_names),
        "total_ayushman_bharat_beneficiaries_millions_ner": round(sum(NER_STATE_PROFILES[s].get("scheme_coverage", {}).get("ayushman_bharat_beneficiaries_millions", 0) for s in state_names), 2),
        "total_ujjwala_lpg_connections_millions_ner": round(sum(NER_STATE_PROFILES[s].get("scheme_coverage", {}).get("ujjwala_yojana_lpg_connections_millions", 0) for s in state_names), 2),
        "total_pm_awas_yojana_houses_ner_thousands": sum(NER_STATE_PROFILES[s].get("scheme_coverage", {}).get("pm_awas_yojana_houses_completed_thousands", 0) for s in state_names),
    }
    return {
        "dataset_id": "central-schemes-coverage",
        "summary_overall": totals,
        "total": len(scheme_rows),
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
        "items": scheme_rows,
    }


@router.get("/weather-zones", summary="Agro-climatic & disaster risk zones for NER")
def list_zones(state: Optional[str] = Query(None)):
    out: Dict[str, Any] = {}
    for zname, zdata in WEATHER_ZONES.items():
        if state and state not in zdata.get("states", []):
            continue
        out[zname] = zdata
    return {
        "dataset_id": "weather-zones",
        "total": len(out),
        "source": DATA_PORTAL_META["source"],
        "last_updated": DATA_PORTAL_META["last_updated"],
        "items": out,
    }
