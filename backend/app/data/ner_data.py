from typing import Dict, List, Tuple


STATES = {
    "Assam": {
        "capital": "Dispur",
        "population_millions": 35,
        "languages": ["Assamese", "Bengali", "Hindi", "English"],
        "highways": ["NH-37", "NH-40", "NH-15", "NH-52", "NH-31"],
        "airports": ["Lokpriya Gopinath Bordoloi (Guwahati)", "Dibrugarh", "Jorhat", "Silchar"],
        "terrain": "Riverine plains with hills in north/south; Brahmaputra valley dominates",
        "disaster_risk": ["flood", "earthquake", "erosion"],
    },
    "Meghalaya": {
        "capital": "Shillong",
        "population_millions": 3.3,
        "languages": ["Khasi", "Garo", "English", "Hindi"],
        "highways": ["NH-40", "NH-44", "NH-6", "NH-217"],
        "airports": ["Shillong (Umroi)", "Baljek (Tura)"],
        "terrain": "Khasi, Garo, Jaintia Hills; heavy rainfall; hilly roads with landslide risk",
        "disaster_risk": ["landslide", "flood", "lightning"],
    },
    "Manipur": {
        "capital": "Imphal",
        "population_millions": 2.9,
        "languages": ["Meiteilon (Manipuri)", "English", "Hindi", "Tangkhul"],
        "highways": ["NH-39", "NH-53", "NH-150", "NH-2"],
        "airports": ["Imphal (Tulihal)"],
        "terrain": "Central valley surrounded by rugged hills; Imphal river basin",
        "disaster_risk": ["landslide", "earthquake", "flood"],
    },
    "Tripura": {
        "capital": "Agartala",
        "population_millions": 3.7,
        "languages": ["Kokborok", "Bengali", "English", "Hindi"],
        "highways": ["NH-8", "NH-44", "NH-208"],
        "airports": ["Agartala (Maharaja Bir Bikram)"],
        "terrain": "Undulating hillocks, valleys; state with Bangladesh border on 3 sides",
        "disaster_risk": ["flood", "landslide", "cyclone"],
    },
    "Mizoram": {
        "capital": "Aizawl",
        "population_millions": 1.1,
        "languages": ["Mizo", "English", "Hindi"],
        "highways": ["NH-54", "NH-150", "NH-44A"],
        "airports": ["Aizawl (Lengpui)", "Zemabawk (Champhai)"],
        "terrain": "Rugged hills (Lushai hills), narrow valleys; highest average elevation in NER",
        "disaster_risk": ["landslide", "storm", "wildfire"],
    },
    "Nagaland": {
        "capital": "Kohima",
        "population_millions": 2.3,
        "languages": ["Naga languages", "English", "Hindi"],
        "highways": ["NH-39", "NH-61", "NH-29"],
        "airports": ["Dimapur"],
        "terrain": "Patkai hills, Naga hills; steep ridges, deep valleys",
        "disaster_risk": ["landslide", "earthquake", "flood"],
    },
    "Arunachal Pradesh": {
        "capital": "Itanagar",
        "population_millions": 1.4,
        "languages": ["Nishi/Adi", "Monpa", "English", "Hindi"],
        "highways": ["NH-52", "NH-415", "NH-229", "NH-15"],
        "airports": ["Itanagar (Donyi Polo)", "Pasighat", "Tezu", "Zero"],
        "terrain": "Eastern Himalayas; highest peaks, deep gorges, snow areas in north; Siang (Brahmaputra entry)",
        "disaster_risk": ["landslide", "earthquake", "flash flood", "snow avalanche"],
    },
    "Sikkim": {
        "capital": "Gangtok",
        "population_millions": 0.69,
        "languages": ["Nepali", "English", "Bhutia", "Lepcha"],
        "highways": ["NH-10", "NH-31A", "NH-717A"],
        "airports": ["Gangtok (Pakyong)"],
        "terrain": "High Himalaya; Kanchenjunga, steep mountain roads, limited road network",
        "disaster_risk": ["landslide", "earthquake", "avalanche", "flash flood"],
    },
}


CITIES: Dict[str, Dict] = {
    "Guwahati": {"state": "Assam", "lat": 26.1158, "lon": 91.7086, "population": 1100000, "airport": True, "railhead": True},
    "Dispur": {"state": "Assam", "lat": 26.1346, "lon": 91.8032, "population": 120000, "airport": False, "railhead": True},
    "Silchar": {"state": "Assam", "lat": 24.8104, "lon": 92.7799, "population": 250000, "airport": True, "railhead": True},
    "Dibrugarh": {"state": "Assam", "lat": 27.4728, "lon": 94.9120, "population": 180000, "airport": True, "railhead": True},
    "Jorhat": {"state": "Assam", "lat": 26.7604, "lon": 94.1975, "population": 155000, "airport": True, "railhead": True},
    "Tezpur": {"state": "Assam", "lat": 26.6318, "lon": 92.8669, "population": 140000, "airport": False, "railhead": True},
    "Nagaon": {"state": "Assam", "lat": 26.3475, "lon": 92.6860, "population": 160000, "airport": False, "railhead": True},
    "Bongaigaon": {"state": "Assam", "lat": 26.4974, "lon": 90.5653, "population": 130000, "airport": False, "railhead": True},
    "Shillong": {"state": "Meghalaya", "lat": 25.5690, "lon": 91.8831, "population": 350000, "airport": True, "railhead": False},
    "Tura": {"state": "Meghalaya", "lat": 25.5218, "lon": 90.2203, "population": 140000, "airport": True, "railhead": False},
    "Cherrapunji": {"state": "Meghalaya", "lat": 25.2810, "lon": 91.7317, "population": 12000, "airport": False, "railhead": False},
    "Jowai": {"state": "Meghalaya", "lat": 25.4449, "lon": 92.1992, "population": 35000, "airport": False, "railhead": False},
    "Nongpoh": {"state": "Meghalaya", "lat": 25.9048, "lon": 91.8813, "population": 18000, "airport": False, "railhead": False},
    "Imphal": {"state": "Manipur", "lat": 24.8170, "lon": 93.9368, "population": 500000, "airport": True, "railhead": False},
    "Thoubal": {"state": "Manipur", "lat": 24.6349, "lon": 93.9799, "population": 80000, "airport": False, "railhead": False},
    "Ukhrul": {"state": "Manipur", "lat": 25.1200, "lon": 94.3700, "population": 45000, "airport": False, "railhead": False},
    "Churachandpur": {"state": "Manipur", "lat": 24.3312, "lon": 93.6938, "population": 70000, "airport": False, "railhead": False},
    "Kakching": {"state": "Manipur", "lat": 24.4864, "lon": 93.9808, "population": 32000, "airport": False, "railhead": False},
    "Agartala": {"state": "Tripura", "lat": 23.8314, "lon": 91.2868, "population": 400000, "airport": True, "railhead": True},
    "Udaipur": {"state": "Tripura", "lat": 23.5344, "lon": 91.4811, "population": 55000, "airport": False, "railhead": False},
    "Dharmanagar": {"state": "Tripura", "lat": 24.3712, "lon": 92.1605, "population": 45000, "airport": False, "railhead": True},
    "Kailasahar": {"state": "Tripura", "lat": 24.3182, "lon": 91.9921, "population": 35000, "airport": False, "railhead": False},
    "Belonia": {"state": "Tripura", "lat": 23.2492, "lon": 91.4433, "population": 28000, "airport": False, "railhead": False},
    "Aizawl": {"state": "Mizoram", "lat": 23.7271, "lon": 92.7173, "population": 300000, "airport": True, "railhead": False},
    "Lunglei": {"state": "Mizoram", "lat": 22.8753, "lon": 92.7728, "population": 55000, "airport": False, "railhead": False},
    "Champhai": {"state": "Mizoram", "lat": 23.4500, "lon": 93.3300, "population": 32000, "airport": True, "railhead": False},
    "Saiha": {"state": "Mizoram", "lat": 22.4878, "lon": 92.9825, "population": 22000, "airport": False, "railhead": False},
    "Serchhip": {"state": "Mizoram", "lat": 23.3400, "lon": 92.8500, "population": 20000, "airport": False, "railhead": False},
    "Kohima": {"state": "Nagaland", "lat": 25.6751, "lon": 94.1086, "population": 115000, "airport": False, "railhead": False},
    "Dimapur": {"state": "Nagaland", "lat": 25.9058, "lon": 93.7254, "population": 220000, "airport": True, "railhead": True},
    "Mokokchung": {"state": "Nagaland", "lat": 26.3278, "lon": 94.5279, "population": 42000, "airport": False, "railhead": False},
    "Tuensang": {"state": "Nagaland", "lat": 26.2798, "lon": 94.8315, "population": 30000, "airport": False, "railhead": False},
    "Wokha": {"state": "Nagaland", "lat": 26.0988, "lon": 94.2606, "population": 25000, "airport": False, "railhead": False},
    "Itanagar": {"state": "Arunachal Pradesh", "lat": 27.0970, "lon": 93.6282, "population": 85000, "airport": True, "railhead": False},
    "Pasighat": {"state": "Arunachal Pradesh", "lat": 28.0670, "lon": 95.3259, "population": 40000, "airport": True, "railhead": False},
    "Tawang": {"state": "Arunachal Pradesh", "lat": 27.5860, "lon": 91.8760, "population": 11000, "airport": False, "railhead": False},
    "Tezu": {"state": "Arunachal Pradesh", "lat": 27.9202, "lon": 96.1595, "population": 22000, "airport": True, "railhead": False},
    "Ziro": {"state": "Arunachal Pradesh", "lat": 27.5428, "lon": 93.8385, "population": 18000, "airport": True, "railhead": False},
    "Bomdila": {"state": "Arunachal Pradesh", "lat": 27.2627, "lon": 92.4111, "population": 9000, "airport": False, "railhead": False},
    "Gangtok": {"state": "Sikkim", "lat": 27.3389, "lon": 88.6066, "population": 100000, "airport": True, "railhead": False},
    "Siliguri": {"state": "West Bengal", "lat": 26.7271, "lon": 88.3953, "population": 700000, "airport": True, "railhead": True},
    "Namchi": {"state": "Sikkim", "lat": 27.1675, "lon": 88.3567, "population": 22000, "airport": False, "railhead": False},
    "Geyzing": {"state": "Sikkim", "lat": 27.2797, "lon": 88.2678, "population": 18000, "airport": False, "railhead": False},
    "Rangpo": {"state": "Sikkim", "lat": 27.1900, "lon": 88.5300, "population": 12000, "airport": False, "railhead": False},
    "Jorethang": {"state": "Sikkim", "lat": 27.1286, "lon": 88.2831, "population": 10000, "airport": False, "railhead": False},
}


ROAD_NETWORK: List[Tuple[str, str, Dict]] = [
    ("Guwahati", "Dispur", {"distance_km": 12, "highway": "NH-37", "terrain_factor": 1.0, "lanes": 4, "accessibility_rating": 4, "condition": "good"}),
    ("Guwahati", "Nagaon", {"distance_km": 120, "highway": "NH-37", "terrain_factor": 1.1, "lanes": 2, "accessibility_rating": 3, "condition": "good"}),
    ("Guwahati", "Tezpur", {"distance_km": 185, "highway": "NH-15", "terrain_factor": 1.2, "lanes": 2, "accessibility_rating": 3, "condition": "fair"}),
    ("Guwahati", "Shillong", {"distance_km": 99, "highway": "NH-40", "terrain_factor": 1.6, "lanes": 2, "accessibility_rating": 2, "condition": "good"}),
    ("Guwahati", "Bongaigaon", {"distance_km": 185, "highway": "NH-31", "terrain_factor": 1.1, "lanes": 2, "accessibility_rating": 3, "condition": "good"}),
    ("Guwahati", "Silchar", {"distance_km": 343, "highway": "NH-44", "terrain_factor": 1.7, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Nagaon", "Jorhat", {"distance_km": 180, "highway": "NH-37", "terrain_factor": 1.15, "lanes": 2, "accessibility_rating": 3, "condition": "fair"}),
    ("Jorhat", "Dibrugarh", {"distance_km": 140, "highway": "NH-37", "terrain_factor": 1.1, "lanes": 2, "accessibility_rating": 3, "condition": "good"}),
    ("Jorhat", "Itanagar", {"distance_km": 240, "highway": "NH-52", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Shillong", "Nongpoh", {"distance_km": 52, "highway": "NH-40", "terrain_factor": 1.7, "lanes": 2, "accessibility_rating": 2, "condition": "good"}),
    ("Shillong", "Cherrapunji", {"distance_km": 56, "highway": "SH", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "fair"}),
    ("Shillong", "Jowai", {"distance_km": 64, "highway": "NH-44", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 1, "condition": "fair"}),
    ("Shillong", "Tura", {"distance_km": 220, "highway": "NH-217", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Tura", "Bongaigaon", {"distance_km": 145, "highway": "NH-31", "terrain_factor": 1.5, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Guwahati", "Dimapur", {"distance_km": 290, "highway": "NH-39", "terrain_factor": 1.5, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Dimapur", "Kohima", {"distance_km": 70, "highway": "NH-39", "terrain_factor": 1.9, "lanes": 2, "accessibility_rating": 1, "condition": "fair"}),
    ("Kohima", "Mokokchung", {"distance_km": 160, "highway": "NH-61", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Mokokchung", "Tuensang", {"distance_km": 110, "highway": "NH-29", "terrain_factor": 2.1, "lanes": 1, "accessibility_rating": 1, "condition": "poor"}),
    ("Dimapur", "Imphal", {"distance_km": 215, "highway": "NH-39", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Imphal", "Thoubal", {"distance_km": 25, "highway": "NH-102", "terrain_factor": 1.0, "lanes": 2, "accessibility_rating": 3, "condition": "good"}),
    ("Imphal", "Ukhrul", {"distance_km": 82, "highway": "SH", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Imphal", "Churachandpur", {"distance_km": 62, "highway": "SH", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Imphal", "Kakching", {"distance_km": 44, "highway": "NH-102", "terrain_factor": 1.2, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Silchar", "Agartala", {"distance_km": 290, "highway": "NH-8", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Agartala", "Udaipur", {"distance_km": 52, "highway": "NH-8", "terrain_factor": 1.2, "lanes": 2, "accessibility_rating": 3, "condition": "good"}),
    ("Agartala", "Dharmanagar", {"distance_km": 140, "highway": "NH-44", "terrain_factor": 1.4, "lanes": 2, "accessibility_rating": 3, "condition": "good"}),
    ("Agartala", "Kailasahar", {"distance_km": 118, "highway": "NH-44", "terrain_factor": 1.3, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Agartala", "Belonia", {"distance_km": 88, "highway": "NH-208", "terrain_factor": 1.3, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Udaipur", "Aizawl", {"distance_km": 140, "highway": "NH-54", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Aizawl", "Lunglei", {"distance_km": 170, "highway": "NH-54", "terrain_factor": 2.1, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Aizawl", "Champhai", {"distance_km": 188, "highway": "NH-150", "terrain_factor": 2.0, "lanes": 1, "accessibility_rating": 1, "condition": "poor"}),
    ("Aizawl", "Serchhip", {"distance_km": 95, "highway": "NH-54", "terrain_factor": 1.9, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Lunglei", "Saiha", {"distance_km": 92, "highway": "SH", "terrain_factor": 2.2, "lanes": 1, "accessibility_rating": 1, "condition": "poor"}),
    ("Itanagar", "Bomdila", {"distance_km": 185, "highway": "NH-229", "terrain_factor": 2.2, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Itanagar", "Ziro", {"distance_km": 115, "highway": "NH-415", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Itanagar", "Pasighat", {"distance_km": 220, "highway": "NH-52", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Bomdila", "Tawang", {"distance_km": 175, "highway": "SH", "terrain_factor": 2.5, "lanes": 1, "accessibility_rating": 1, "condition": "poor"}),
    ("Pasighat", "Tezu", {"distance_km": 160, "highway": "NH-52", "terrain_factor": 1.9, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Tezu", "Dibrugarh", {"distance_km": 180, "highway": "NH-15", "terrain_factor": 1.7, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Siliguri", "Gangtok", {"distance_km": 112, "highway": "NH-10", "terrain_factor": 2.3, "lanes": 2, "accessibility_rating": 1, "condition": "fair"}),
    ("Bongaigaon", "Siliguri", {"distance_km": 230, "highway": "NH-31", "terrain_factor": 1.1, "lanes": 4, "accessibility_rating": 3, "condition": "good"}),
    ("Gangtok", "Namchi", {"distance_km": 78, "highway": "NH-717A", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "fair"}),
    ("Gangtok", "Geyzing", {"distance_km": 110, "highway": "NH-31A", "terrain_factor": 2.2, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Gangtok", "Rangpo", {"distance_km": 32, "highway": "NH-10", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 1, "condition": "good"}),
    ("Namchi", "Jorethang", {"distance_km": 22, "highway": "NH-717A", "terrain_factor": 1.8, "lanes": 2, "accessibility_rating": 2, "condition": "good"}),
    ("Jorethang", "Geyzing", {"distance_km": 65, "highway": "NH-31A", "terrain_factor": 2.1, "lanes": 1, "accessibility_rating": 1, "condition": "poor"}),
    ("Rangpo", "Siliguri", {"distance_km": 72, "highway": "NH-10", "terrain_factor": 2.0, "lanes": 2, "accessibility_rating": 2, "condition": "fair"}),
    ("Jorhat", "Kohima", {"distance_km": 200, "highway": "SH", "terrain_factor": 2.2, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Imphal", "Aizawl", {"distance_km": 395, "highway": "NH-150", "terrain_factor": 2.3, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
    ("Silchar", "Imphal", {"distance_km": 260, "highway": "NH-37", "terrain_factor": 2.2, "lanes": 2, "accessibility_rating": 1, "condition": "poor"}),
]


HOSPITALS: List[Dict] = [
    {"name": "Gauhati Medical College", "city": "Guwahati", "lat": 26.1530, "lon": 91.6636, "beds": 2500, "emergency": True, "tertiary": True, "helipad": True, "accessibility_rating": 4},
    {"name": "Assam Medical College", "city": "Dibrugarh", "lat": 27.4580, "lon": 94.9200, "beds": 1800, "emergency": True, "tertiary": True, "helipad": True, "accessibility_rating": 3},
    {"name": "Silchar Medical College", "city": "Silchar", "lat": 24.8000, "lon": 92.7800, "beds": 1100, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Jorhat Medical College", "city": "Jorhat", "lat": 26.7520, "lon": 94.1950, "beds": 900, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Tezpur Medical College", "city": "Tezpur", "lat": 26.6250, "lon": 92.8550, "beds": 700, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Fakhruddin Ali Ahmed Medical", "city": "Bongaigaon", "lat": 26.5050, "lon": 90.5700, "beds": 600, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 2},
    {"name": "Civil Hospital Shillong", "city": "Shillong", "lat": 25.5700, "lon": 91.8800, "beds": 580, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "NEIGRIHMS", "city": "Shillong", "lat": 25.5900, "lon": 91.9000, "beds": 800, "emergency": True, "tertiary": True, "helipad": True, "accessibility_rating": 4},
    {"name": "RMS Civil Hospital", "city": "Tura", "lat": 25.5150, "lon": 90.2150, "beds": 350, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 2},
    {"name": "Regional Institute of Medical Sciences (RIMS)", "city": "Imphal", "lat": 24.8250, "lon": 93.9300, "beds": 1600, "emergency": True, "tertiary": True, "helipad": True, "accessibility_rating": 3},
    {"name": "Jawaharlal Nehru Institute of Medical Sciences", "city": "Imphal", "lat": 24.8100, "lon": 93.9450, "beds": 1400, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Thoubal District Hospital", "city": "Thoubal", "lat": 24.6400, "lon": 93.9800, "beds": 250, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 2},
    {"name": "GB Pant Hospital", "city": "Agartala", "lat": 23.8350, "lon": 91.2900, "beds": 850, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Tripura Medical College", "city": "Agartala", "lat": 23.8400, "lon": 91.2700, "beds": 700, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Zoram Medical College", "city": "Aizawl", "lat": 23.7300, "lon": 92.7200, "beds": 600, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 2},
    {"name": "Civil Hospital Lunglei", "city": "Lunglei", "lat": 22.8700, "lon": 92.7700, "beds": 200, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 1},
    {"name": "Naga Hospital Authority Kohima", "city": "Kohima", "lat": 25.6700, "lon": 94.1100, "beds": 450, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 2},
    {"name": "Dimapur District Hospital", "city": "Dimapur", "lat": 25.9000, "lon": 93.7200, "beds": 350, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 2},
    {"name": "Mokokchung District Hospital", "city": "Mokokchung", "lat": 26.3200, "lon": 94.5200, "beds": 200, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 1},
    {"name": "Tomo Riba Institute of Health & Medical Sciences", "city": "Itanagar", "lat": 27.1000, "lon": 93.6300, "beds": 550, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 2},
    {"name": "Pasighat General Hospital", "city": "Pasighat", "lat": 28.0650, "lon": 95.3200, "beds": 180, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 1},
    {"name": "Tawang General Hospital", "city": "Tawang", "lat": 27.5900, "lon": 91.8800, "beds": 100, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 1},
    {"name": "STNM Hospital", "city": "Gangtok", "lat": 27.3350, "lon": 88.6050, "beds": 400, "emergency": True, "tertiary": True, "helipad": False, "accessibility_rating": 3},
    {"name": "Namchi District Hospital", "city": "Namchi", "lat": 27.1650, "lon": 88.3600, "beds": 150, "emergency": True, "tertiary": False, "helipad": False, "accessibility_rating": 2},
]


ACCESSIBILITY_POIS: List[Dict] = [
    {"name": "Guwahati ISBT", "type": "bus_terminal", "city": "Guwahati", "lat": 26.145, "lon": 91.690, "wheelchair": True, "rating": 4, "services": ["braille_signs", "ramp", "accessible_toilets", "lift"]},
    {"name": "Kamakhya Railway Station", "type": "railway", "city": "Guwahati", "lat": 26.165, "lon": 91.700, "wheelchair": True, "rating": 4, "services": ["ramp", "wheelchair_available", "accessible_coaches"]},
    {"name": "Lokpriya Gopinath Airport", "type": "airport", "city": "Guwahati", "lat": 26.112, "lon": 91.605, "wheelchair": True, "rating": 5, "services": ["ramp", "lift", "accessible_toilets", "wheelchair_assistance", "priority_checkin"]},
    {"name": "Shillong Civil Hospital Entry", "type": "hospital", "city": "Shillong", "lat": 25.571, "lon": 91.884, "wheelchair": True, "rating": 3, "services": ["ramp", "accessible_toilets"]},
    {"name": "Police Bazaar Crossing", "type": "market", "city": "Shillong", "lat": 25.574, "lon": 91.879, "wheelchair": False, "rating": 1, "services": ["steep_hills", "no_sidewalks"]},
    {"name": "Imphal Tulihal Airport", "type": "airport", "city": "Imphal", "lat": 24.765, "lon": 93.905, "wheelchair": True, "rating": 4, "services": ["ramp", "lift", "accessible_toilets"]},
    {"name": "RIMS Hospital Gate", "type": "hospital", "city": "Imphal", "lat": 24.826, "lon": 93.931, "wheelchair": True, "rating": 3, "services": ["ramp", "accessible_toilets"]},
    {"name": "Agartala ISBT", "type": "bus_terminal", "city": "Agartala", "lat": 23.838, "lon": 91.275, "wheelchair": True, "rating": 3, "services": ["ramp", "accessible_toilets"]},
    {"name": "Maharaja Bir Bikram Airport", "type": "airport", "city": "Agartala", "lat": 23.887, "lon": 91.242, "wheelchair": True, "rating": 4, "services": ["ramp", "lift", "accessible_toilets", "priority_checkin"]},
    {"name": "Aizawl Lengpui Airport", "type": "airport", "city": "Aizawl", "lat": 23.920, "lon": 92.650, "wheelchair": True, "rating": 3, "services": ["ramp", "accessible_toilets"]},
    {"name": "Aizawl Bara Bazar", "type": "market", "city": "Aizawl", "lat": 23.728, "lon": 92.718, "wheelchair": False, "rating": 1, "services": ["narrow_lanes", "steep_inclines"]},
    {"name": "Dimapur Railway Station", "type": "railway", "city": "Dimapur", "lat": 25.885, "lon": 93.735, "wheelchair": True, "rating": 3, "services": ["ramp", "accessible_toilets"]},
    {"name": "Itanagar Donyi Polo Airport", "type": "airport", "city": "Itanagar", "lat": 26.968, "lon": 93.536, "wheelchair": True, "rating": 4, "services": ["ramp", "lift", "accessible_toilets", "priority_checkin"]},
    {"name": "Gangtok Pakyong Airport", "type": "airport", "city": "Gangtok", "lat": 27.230, "lon": 88.630, "wheelchair": True, "rating": 4, "services": ["ramp", "lift", "accessible_toilets"]},
    {"name": "MG Marg Gangtok", "type": "market", "city": "Gangtok", "lat": 27.336, "lon": 88.610, "wheelchair": True, "rating": 3, "services": ["pedestrianised", "ramp_access", "benches"]},
    {"name": "Tezpur Railway Station", "type": "railway", "city": "Tezpur", "lat": 26.620, "lon": 92.800, "wheelchair": False, "rating": 2, "services": ["steps_at_entry"]},
]


WEATHER_ZONES: Dict[str, Dict] = {
    "Upper Brahmaputra Valley": {"states": ["Assam"], "cities": ["Dibrugarh", "Jorhat", "Tezpur"], "monsoon_risk": 0.7, "flood_risk": 0.8, "landslide_risk": 0.3, "avg_rainfall_mm_year": 2500, "seasons": {"pre_monsoon": "Mar-May: Thunderstorms, hailstorms possible", "monsoon": "Jun-Sep: Heavy rain, riverine flood risk", "post_monsoon": "Oct-Nov: Moderate, retreating monsoon", "winter": "Dec-Feb: Cool, fog early mornings"}},
    "Lower Brahmaputra Valley": {"states": ["Assam"], "cities": ["Guwahati", "Dispur", "Nagaon", "Bongaigaon"], "monsoon_risk": 0.65, "flood_risk": 0.85, "landslide_risk": 0.2, "avg_rainfall_mm_year": 1800, "seasons": {"pre_monsoon": "Mar-May: Warm, thunderstorms", "monsoon": "Jun-Sep: Very high flood risk (Brahmaputra)", "post_monsoon": "Oct-Nov: Clear, pleasant", "winter": "Dec-Feb: Cool, dense fog"}},
    "Barak Valley": {"states": ["Assam"], "cities": ["Silchar"], "monsoon_risk": 0.7, "flood_risk": 0.7, "landslide_risk": 0.4, "avg_rainfall_mm_year": 3000, "seasons": {"pre_monsoon": "Mar-May: Hot, humid", "monsoon": "Jun-Sep: Very heavy rain", "post_monsoon": "Oct-Nov: Occasional rain", "winter": "Dec-Feb: Pleasant"}},
    "Meghalaya Plateau (Khasi Hills)": {"states": ["Meghalaya"], "cities": ["Shillong", "Cherrapunji", "Nongpoh", "Jowai"], "monsoon_risk": 0.9, "flood_risk": 0.4, "landslide_risk": 0.85, "avg_rainfall_mm_year": 11000, "seasons": {"pre_monsoon": "Mar-May: Thunder showers", "monsoon": "Jun-Sep: EXTREME rainfall, landslide high risk", "post_monsoon": "Oct-Nov: Clear skies", "winter": "Dec-Feb: Cool, fog, visibility issues"}},
    "Garo Hills": {"states": ["Meghalaya"], "cities": ["Tura"], "monsoon_risk": 0.75, "flood_risk": 0.5, "landslide_risk": 0.5, "avg_rainfall_mm_year": 2800, "seasons": {"pre_monsoon": "Mar-May: Warm, occasional storms", "monsoon": "Jun-Sep: Heavy rain", "post_monsoon": "Oct-Nov: Dry", "winter": "Dec-Feb: Cool, dry"}},
    "Manipur Valley": {"states": ["Manipur"], "cities": ["Imphal", "Thoubal", "Kakching"], "monsoon_risk": 0.6, "flood_risk": 0.6, "landslide_risk": 0.4, "avg_rainfall_mm_year": 1500, "seasons": {"pre_monsoon": "Mar-May: Thunderstorms", "monsoon": "Jun-Sep: Heavy rain, Imphal river rise", "post_monsoon": "Oct-Nov: Clear, cool", "winter": "Dec-Feb: Cool, foggy mornings"}},
    "Manipur Hills": {"states": ["Manipur"], "cities": ["Ukhrul", "Churachandpur"], "monsoon_risk": 0.7, "flood_risk": 0.3, "landslide_risk": 0.8, "avg_rainfall_mm_year": 1900, "seasons": {"pre_monsoon": "Mar-May: Thunder", "monsoon": "Jun-Sep: Landslide risk high", "post_monsoon": "Oct-Nov: Clear", "winter": "Dec-Feb: Cool, possible frost"}},
    "Tripura Plains": {"states": ["Tripura"], "cities": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia"], "monsoon_risk": 0.7, "flood_risk": 0.65, "landslide_risk": 0.3, "avg_rainfall_mm_year": 2200, "seasons": {"pre_monsoon": "Mar-May: Hot, pre-monsoon showers", "monsoon": "Jun-Sep: Heavy rain, flash floods", "post_monsoon": "Oct-Nov: Cyclone tail risk", "winter": "Dec-Feb: Pleasant"}},
    "Lushai Hills (Mizoram)": {"states": ["Mizoram"], "cities": ["Aizawl", "Lunglei", "Champhai", "Saiha", "Serchhip"], "monsoon_risk": 0.85, "flood_risk": 0.3, "landslide_risk": 0.9, "avg_rainfall_mm_year": 2600, "seasons": {"pre_monsoon": "Mar-May: Thunder, wildfire risk pre-monsoon", "monsoon": "Jun-Sep: Extreme landslide risk, vertical faces", "post_monsoon": "Oct-Nov: Clear", "winter": "Dec-Feb: Cool, dry, fire risk"}},
    "Naga Hills": {"states": ["Nagaland"], "cities": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"], "monsoon_risk": 0.8, "flood_risk": 0.35, "landslide_risk": 0.85, "avg_rainfall_mm_year": 2000, "seasons": {"pre_monsoon": "Mar-May: Thunderstorms", "monsoon": "Jun-Sep: Heavy rain, landslide risk on steep roads", "post_monsoon": "Oct-Nov: Dry, clear", "winter": "Dec-Feb: Cool, dense fog mornings"}},
    "Eastern Himalaya (Arunachal)": {"states": ["Arunachal Pradesh"], "cities": ["Itanagar", "Bomdila", "Tawang", "Ziro"], "monsoon_risk": 0.85, "flood_risk": 0.5, "landslide_risk": 0.9, "avg_rainfall_mm_year": 3200, "seasons": {"pre_monsoon": "Mar-May: Snow melt + rain triggers", "monsoon": "Jun-Sep: Flash floods, major landslide risk, high passes closed", "post_monsoon": "Oct-Nov: Best season, roads re-open", "winter": "Dec-Feb: Snow in higher reaches, avalanche risk Tawang"}},
    "Upper Siang Valley": {"states": ["Arunachal Pradesh"], "cities": ["Pasighat", "Tezu"], "monsoon_risk": 0.8, "flood_risk": 0.7, "landslide_risk": 0.8, "avg_rainfall_mm_year": 4500, "seasons": {"pre_monsoon": "Mar-May: Rising Siang", "monsoon": "Jun-Sep: Very high flash flood risk", "post_monsoon": "Oct-Nov: Dry window", "winter": "Dec-Feb: Cool, low flow"}},
    "Sikkim Himalaya": {"states": ["Sikkim"], "cities": ["Gangtok", "Namchi", "Geyzing", "Rangpo", "Jorethang"], "monsoon_risk": 0.85, "flood_risk": 0.5, "landslide_risk": 0.9, "avg_rainfall_mm_year": 3100, "seasons": {"pre_monsoon": "Mar-May: Landslide risk from snowmelt", "monsoon": "Jun-Sep: Extreme landslide, Teesta flash flood", "post_monsoon": "Oct-Nov: Best tourist season", "winter": "Dec-Feb: Cold, snow in high areas, NH-10 disruption risk"}},
}


WEATHER_CURRENT: Dict[str, Dict] = {
    "Guwahati": {"temp_c": 31, "humidity": 82, "condition": "Partly cloudy", "wind_kmh": 8, "flood_warning": False, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Shillong": {"temp_c": 20, "humidity": 91, "condition": "Light rain", "wind_kmh": 12, "flood_warning": False, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Cherrapunji": {"temp_c": 18, "humidity": 96, "condition": "Heavy rain", "wind_kmh": 18, "flood_warning": False, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Imphal": {"temp_c": 26, "humidity": 85, "condition": "Overcast", "wind_kmh": 5, "flood_warning": False, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Agartala": {"temp_c": 29, "humidity": 88, "condition": "Thunderstorms", "wind_kmh": 14, "flood_warning": True, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Aizawl": {"temp_c": 22, "humidity": 93, "condition": "Moderate rain", "wind_kmh": 10, "flood_warning": False, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Kohima": {"temp_c": 21, "humidity": 90, "condition": "Drizzle", "wind_kmh": 7, "flood_warning": False, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Dimapur": {"temp_c": 28, "humidity": 86, "condition": "Cloudy", "wind_kmh": 6, "flood_warning": False, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Itanagar": {"temp_c": 25, "humidity": 89, "condition": "Moderate rain", "wind_kmh": 11, "flood_warning": False, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Tawang": {"temp_c": 8, "humidity": 75, "condition": "Foggy", "wind_kmh": 20, "flood_warning": False, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Pasighat": {"temp_c": 27, "humidity": 92, "condition": "Heavy rain", "wind_kmh": 15, "flood_warning": True, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Gangtok": {"temp_c": 14, "humidity": 88, "condition": "Fog & light rain", "wind_kmh": 16, "flood_warning": False, "landslide_warning": True, "updated": "2026-08-25T06:00:00Z"},
    "Silchar": {"temp_c": 30, "humidity": 90, "condition": "Rain", "wind_kmh": 9, "flood_warning": True, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Dibrugarh": {"temp_c": 29, "humidity": 84, "condition": "Cloudy", "wind_kmh": 7, "flood_warning": False, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
    "Tura": {"temp_c": 26, "humidity": 83, "condition": "Overcast", "wind_kmh": 5, "flood_warning": False, "landslide_warning": False, "updated": "2026-08-25T06:00:00Z"},
}


COMMUNITY_HUBS: List[Dict] = [
    {"name": "Assam State Rural Livelihood Mission Hub", "city": "Guwahati", "state": "Assam", "lat": 26.140, "lon": 91.740, "partner_type": "government", "services": ["women_shg", "skill_training", "microfinance", "market_linkage"], "contact": "+91-361-2222000"},
    {"name": "North East Small Scale Industry Association", "city": "Guwahati", "state": "Assam", "lat": 26.180, "lon": 91.750, "partner_type": "industry_association", "services": ["sme_support", "logistics_link", "exposure_visit", "vendor_connect"], "contact": "+91-361-2662000"},
    {"name": "Meghalaya State Cooperative Union", "city": "Shillong", "state": "Meghalaya", "lat": 25.570, "lon": 91.885, "partner_type": "cooperative", "services": ["cooperative_training", "agri_market", "transport_credit"], "contact": "+91-364-2223000"},
    {"name": "Khasi Hills Community Tourism Network", "city": "Shillong", "state": "Meghalaya", "lat": 25.565, "lon": 91.875, "partner_type": "community_tourism", "services": ["homestay", "local_guide", "craft_sale", "trek_support"], "contact": "+91-364-2564000"},
    {"name": "Manipur Women's Federation Hub", "city": "Imphal", "state": "Manipur", "lat": 24.815, "lon": 93.935, "partner_type": "ngo", "services": ["women_empowerment", "handloom_market", "skill_dev"], "contact": "+91-385-2411000"},
    {"name": "Manipur Organic Producers Cooperative", "city": "Thoubal", "state": "Manipur", "lat": 24.640, "lon": 93.980, "partner_type": "cooperative", "services": ["organic_certification", "agri_logistics", "cold_storage"], "contact": "+91-3848-225000"},
    {"name": "Tripura Bamboo & Cane Crafts Hub", "city": "Agartala", "state": "Tripura", "lat": 23.830, "lon": 91.280, "partner_type": "government", "services": ["bamboo_value_chain", "craft_export", "design_support"], "contact": "+91-381-2322000"},
    {"name": "Tripura Tribal Welfare Corporation", "city": "Kailasahar", "state": "Tripura", "lat": 24.320, "lon": 91.995, "partner_type": "government", "services": ["tribal_development", "land_connect", "education"], "contact": "+91-3824-223000"},
    {"name": "Mizoram Youth Volunteers Network", "city": "Aizawl", "state": "Mizoram", "lat": 23.725, "lon": 92.715, "partner_type": "volunteer", "services": ["emergency_volunteer", "road_maintenance", "disaster_response"], "contact": "+91-389-2341000"},
    {"name": "Champhai Border Trade Co-op", "city": "Champhai", "state": "Mizoram", "lat": 23.455, "lon": 93.335, "partner_type": "cooperative", "services": ["border_trade", "customs_support", "warehousing"], "contact": "+91-3832-221000"},
    {"name": "Nagaland Handloom & Handicrafts Hub", "city": "Kohima", "state": "Nagaland", "lat": 25.675, "lon": 94.110, "partner_type": "government", "services": ["naga_craft", "design_support", "exhibition_link"], "contact": "+91-370-2290000"},
    {"name": "Dimapur MSME Facilitation Centre", "city": "Dimapur", "state": "Nagaland", "lat": 25.910, "lon": 93.720, "partner_type": "government", "services": ["msme_registration", "loan_linkage", "logistics_helpdesk"], "contact": "+91-3862-234000"},
    {"name": "Arunachal Pradesh Agri-Horti Hub", "city": "Itanagar", "state": "Arunachal Pradesh", "lat": 27.090, "lon": 93.625, "partner_type": "government", "services": ["kiwi_market", "apple_logistics", "cold_storage_info"], "contact": "+91-360-2213000"},
    {"name": "Tawang Mountain Rescue Hub", "city": "Tawang", "state": "Arunachal Pradesh", "lat": 27.580, "lon": 91.880, "partner_type": "volunteer", "services": ["mountain_rescue", "weather_watch", "avalanche_monitor"], "contact": "+91-3794-222000"},
    {"name": "Sikkim Organic Farming Association", "city": "Gangtok", "state": "Sikkim", "lat": 27.338, "lon": 88.605, "partner_type": "cooperative", "services": ["organic_audit", "cardamom_market", "transport_coordination"], "contact": "+91-3592-202000"},
    {"name": "Namchi Floriculture Cooperative", "city": "Namchi", "state": "Sikkim", "lat": 27.170, "lon": 88.360, "partner_type": "cooperative", "services": ["flower_logistics", "cold_chain", "auction_access"], "contact": "+91-3595-220000"},
    {"name": "North East State Transport Coordination", "city": "Guwahati", "state": "Assam", "lat": 26.120, "lon": 91.710, "partner_type": "interstate_body", "services": ["bus_timetable", "interstate_permit", "goods_transit"], "contact": "+91-361-2526000"},
    {"name": "NER District Disaster Management Cell", "city": "Jorhat", "state": "Assam", "lat": 26.755, "lon": 94.200, "partner_type": "government", "services": ["shelter_list", "evacuation_route", "rescue_coordinate"], "contact": "+91-376-2360000"},
]


def get_city_coords(city: str) -> Tuple[float, float] | None:
    c = CITIES.get(city)
    if not c:
        return None
    return (c["lat"], c["lon"])


def get_cities_by_state(state: str) -> List[str]:
    return [name for name, data in CITIES.items() if data["state"] == state]


def get_state_of_city(city: str) -> str | None:
    c = CITIES.get(city)
    if not c:
        return None
    return c["state"]


def get_weather_zone_of_city(city: str) -> Dict | None:
    for zname, zdata in WEATHER_ZONES.items():
        if city in zdata["cities"]:
            z = dict(zdata)
            z["zone_name"] = zname
            return z
    return None
