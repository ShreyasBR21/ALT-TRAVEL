from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import math
import io
import base64
import httpx
from PIL import Image
from config import Settings

settings = Settings()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AltTravelBackend")

if settings.debug:
    logger.setLevel(logging.DEBUG)

logger.info(f"Starting AltTravel backend in {settings.environment} mode")
logger.info(f"Configured CORS origins: {settings.allowed_origins}")

app = FastAPI(
    title="AltTravel API - SaaS Edition",
    description="Extended backend API with predictive analytics, eco-gamification verification, itinerary optimizing graph and B2B reports.",
    version="2.0.0"
)

# Enable CORS middleware to allow communication with frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Generative AI
GEMINI_API_KEY = settings.gemini_api_key or settings.google_api_key
if GEMINI_API_KEY:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully.")
else:
    logger.warning("No GEMINI_API_KEY or GOOGLE_API_KEY found. API will use local heuristic fallback.")

# Pre-baked static database of global hotspots and their under-visited alternatives
HOTSPOTS_DB: Dict[str, Dict[str, Any]] = {
    "tajmahal": {
        "name": "Taj Mahal, Agra",
        "coordinates": [78.0421, 27.1751],  # [Lng, Lat]
        "crowd_index": 96,
        "description": "The Taj Mahal faces severe pedestrian gridlock, long security queues, and air quality issues, overshadowing its Mughal architectural majesty.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Orchha, Madhya Pradesh",
                "coordinates": [78.6436, 25.3488],
                "crowd_index": 34,
                "similarity": 92,
                "description": "Boasts majestic medieval palaces, grand cenotaphs, and historic temples along the quiet Betwa River, without the massive tourist congestion.",
                "highlight": "Stunning riverside Cenotaphs, Orchha Fort complex, and serene historic vibes."
            },
            {
                "name": "Mandu, Madhya Pradesh",
                "coordinates": [75.2618, 22.3552],
                "crowd_index": 28,
                "similarity": 88,
                "description": "A historic fortress city featuring floating palaces like Jahaz Mahal and romantic ruins, offering a peaceful glimpse into medieval Mughal/Afghan architecture.",
                "highlight": "Jahaz Mahal floating palace, Rupmati Pavilion views, and peaceful ruins."
            }
        ]
    },
    "manali": {
        "name": "Manali, Himachal Pradesh",
        "coordinates": [77.1887, 32.2396],
        "crowd_index": 94,
        "description": "Manali suffers from heavy mountain traffic bottlenecks, commercialized Mall road gridlocks, and plastic pollution along its alpine routes.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Jibhi, Himachal Pradesh",
                "coordinates": [77.3489, 31.6372],
                "crowd_index": 32,
                "similarity": 91,
                "description": "Nestled in the lush Tirthan Valley, Jibhi features pristine pine forests, rustic wooden cottages, and rushing streams with minimal commercial footprints.",
                "highlight": "Quiet wooden architecture, Jibhi waterfall hike, and peaceful nature walks."
            },
            {
                "name": "Landour, Uttarakhand",
                "coordinates": [78.0934, 30.4578],
                "crowd_index": 41,
                "similarity": 86,
                "description": "A quiet colonial-era canopy town near Mussoorie, covered in thick Deodar oaks, offering stunning Himalayan panoramas and peaceful walks.",
                "highlight": "Panoramic snow-peak views, historic bakeries, and silent forest pathways."
            }
        ]
    },
    "goa": {
        "name": "Goa (North Beaches), India",
        "coordinates": [73.7553, 15.5436],
        "crowd_index": 98,
        "description": "Popular North Goa beaches like Baga and Calangute suffer from extreme crowd density, loud night commercialization, and littered coastlines.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Gokarna, Karnataka",
                "coordinates": [74.3188, 14.5479],
                "crowd_index": 30,
                "similarity": 94,
                "description": "Offers pristine crescent-shaped beaches like Om Beach, rugged cliffside coastal trails, and a relaxed, laidback spiritual vibe.",
                "highlight": "Cliff hikes from beach to beach, peaceful Om beach shape, and clean sunset views."
            },
            {
                "name": "Tarkarli, Maharashtra",
                "coordinates": [73.4913, 16.0601],
                "crowd_index": 36,
                "similarity": 89,
                "description": "Known for its white sand beaches, clear waters ideal for scuba diving, and the historic offshore Sindhudurg sea fort.",
                "highlight": "Sindhudurg sea fort boat ride, coral reef diving, and serene houseboats."
            }
        ]
    },
    "santorini": {
        "name": "Santorini, Greece",
        "coordinates": [25.4335, 36.3932],
        "crowd_index": 97,
        "description": "The famous Santorini caldera draws massive cruise crowds, crowded cliffside villages, and high summer prices that overshadow its volcanic sunsets.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Milos, Greece",
                "coordinates": [24.4431, 36.7255],
                "crowd_index": 32,
                "similarity": 91,
                "description": "A volcanic island with dramatic lunar landscapes, quiet fishing harbors, and lesser-known white-sand coves.",
                "highlight": "Secluded beaches, lunar rock formations, and authentic island villages."
            },
            {
                "name": "Naxos, Greece",
                "coordinates": [25.3774, 37.1050],
                "crowd_index": 38,
                "similarity": 87,
                "description": "A spacious Cycladic island offering long sandy beaches, traditional mountain villages, and local farm-to-table cuisine.",
                "highlight": "Wide beaches, inland olive groves, and authentic Greek village life."
            }
        ]
    },
    "venice": {
        "name": "Venice, Italy",
        "coordinates": [12.3155, 45.4408],
        "crowd_index": 96,
        "description": "Venice suffers from overwhelming canal crowds, cruise ship day-trippers, and flooded pedestrian routes that strain its fragile lagoon heritage.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Treviso, Italy",
                "coordinates": [12.2416, 45.6666],
                "crowd_index": 33,
                "similarity": 88,
                "description": "A charming canal town with medieval squares, quiet riverside cafés, and a gentle Venetian ambiance without the tourist crush.",
                "highlight": "Canal-side dining, historic walls, and relaxed local life."
            },
            {
                "name": "Chioggia, Italy",
                "coordinates": [12.2603, 45.2140],
                "crowd_index": 36,
                "similarity": 84,
                "description": "A fishing town on the southern Venetian lagoon with colorful canals, market culture, and fewer crowds than central Venice.",
                "highlight": "Local fish markets, peaceful lagoon views, and authentic lagoon town vistas."
            }
        ]
    },
    "kuta": {
        "name": "Kuta, Bali",
        "coordinates": [115.1691, -8.7186],
        "crowd_index": 95,
        "description": "Kuta attracts heavy surf tourism, neon nightlife, and crowded beachfront promenades, diluting Bali's quieter cultural charm.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Amed, Bali",
                "coordinates": [115.5743, -8.3432],
                "crowd_index": 29,
                "similarity": 86,
                "description": "A peaceful east Bali village known for black sand snorkeling sites, slow coastal pace, and traditional fishing culture.",
                "highlight": "Scuba reefs, beachfront bungalows, and sunrise boat tours."
            },
            {
                "name": "Munduk, Bali",
                "coordinates": [115.1029, -8.3187],
                "crowd_index": 35,
                "similarity": 82,
                "description": "A misty mountain hamlet with coffee farms, waterfalls, and tranquil rice terraces away from Bali's tourist beaches.",
                "highlight": "Hidden waterfalls, mountain coffee trails, and cool tropical forest walks."
            }
        ]
    },
    "machupicchu": {
        "name": "Machu Picchu, Peru",
        "coordinates": [-72.5449, -13.1631],
        "crowd_index": 93,
        "description": "Machu Picchu attracts massive daily visitors on the Inca Trail, creating long lines and pressure on the ancient ruins.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Choquequirao, Peru",
                "coordinates": [-72.7150, -13.3470],
                "crowd_index": 24,
                "similarity": 90,
                "description": "A remote Inca ruin high in the Andes, offering similar stone terraces and historic mystique with far fewer trekkers.",
                "highlight": "Off-the-beaten-path ruins, high-altitude trekking, and quiet heritage sites."
            },
            {
                "name": "Huchuy Qosqo, Peru",
                "coordinates": [-72.3967, -13.3773],
                "crowd_index": 28,
                "similarity": 86,
                "description": "A small Inca archaeological site above the Sacred Valley, delivering sweeping mountain views and fewer crowds.",
                "highlight": "Ancient terraces, panoramic valley views, and intimate archaeological discovery."
            }
        ]
    },
    "eiffel": {
        "name": "Eiffel Tower, Paris",
        "coordinates": [2.2945, 48.8584],
        "crowd_index": 95,
        "description": "The Eiffel Tower draws enormous tourist lines, busy Champs-Élysées crowds, and long waits for iconic photo spots.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Udaipur, Rajasthan",
                "coordinates": [73.7125, 26.9124],
                "crowd_index": 38,
                "similarity": 90,
                "description": "The lake city offers romantic palace views, historic gardens, and sunset boat rides with a calmer heritage atmosphere.",
                "highlight": "City Palace, Lake Pichola sunset cruises, and palace-lit evening promenades."
            },
            {
                "name": "Mysore Palace, Karnataka",
                "coordinates": [76.6394, 12.3051],
                "crowd_index": 33,
                "similarity": 86,
                "description": "A regal palace in a less congested city, known for its illuminated domes, ornate halls, and quieter courtly charm.",
                "highlight": "Evening palace illumination, royal art halls, and calm ceremonial spaces."
            }
        ]
    },
    "greatwall": {
        "name": "Great Wall at Badaling, China",
        "coordinates": [116.0200, 40.3620],
        "crowd_index": 94,
        "description": "Badaling is the most visited section of the Great Wall, with dense tourist groups and limited walking space along restored battlements.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Kumbhalgarh Fort, Rajasthan",
                "coordinates": [73.5715, 25.1530],
                "crowd_index": 29,
                "similarity": 88,
                "description": "A vast hill fort with sprawling walls and quiet mountain views, offering a dramatic historic walk away from the busiest crowds.",
                "highlight": "Long fort walls, peaceful sunset vistas, and immersive Rajput fort ambience."
            },
            {
                "name": "Chittorgarh Fort, Rajasthan",
                "coordinates": [74.6292, 24.8891],
                "crowd_index": 31,
                "similarity": 85,
                "description": "An ancient fortress with large ramparts, temples, and panoramic hilltop views, visited by fewer travelers than major landmark sections.",
                "highlight": "Rampart walks, historic palace ruins, and quiet cultural heritage discovery."
            }
        ]
    },
    "shibuya": {
        "name": "Shibuya Crossing, Tokyo",
        "coordinates": [139.7010, 35.6595],
        "crowd_index": 96,
        "description": "Shibuya Crossing is famed for its neon crowds and constant pedestrian surges, making it an exhilarating but overwhelming city landmark.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Chandni Chowk, Delhi",
                "coordinates": [77.2300, 28.6562],
                "crowd_index": 37,
                "similarity": 89,
                "description": "A lively heritage bazaar with narrow lanes, bright signage, and busy street energy, but far less global tourist saturation.",
                "highlight": "Street food alleys, historic market lanes, and authentic local bustle."
            },
            {
                "name": "Colaba Causeway, Mumbai",
                "coordinates": [72.8290, 18.9150],
                "crowd_index": 34,
                "similarity": 85,
                "description": "A busy downtown promenade with cafés, street vendors, and colorful commercial energy that still feels local and manageable.",
                "highlight": "Seaside shopping stretch, art galleries, and relaxed evening market vibes."
            }
        ]
    },
    "timessquare": {
        "name": "Times Square, New York",
        "coordinates": [-73.9855, 40.7580],
        "crowd_index": 97,
        "description": "Times Square is a nonstop hub of bright billboards, dense pedestrian flow, and queued attractions, making it a high-pressure city hotspot.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Marine Drive, Mumbai",
                "coordinates": [72.8220, 18.9481],
                "crowd_index": 35,
                "similarity": 87,
                "description": "A famous seaside promenade with city lights, evening walkers, and a more relaxed coastal city rhythm than a global urban core.",
                "highlight": "Nighttime skyline, ocean breeze walks, and iconic Mumbai boulevard energy."
            },
            {
                "name": "Connaught Place, Delhi",
                "coordinates": [77.2195, 28.6315],
                "crowd_index": 33,
                "similarity": 84,
                "description": "A historic circular commercial district with cafes, shops, and city buzz that feels spacious compared to more crowded world hubs.",
                "highlight": "Colonial arcades, relaxed café culture, and accessible urban shopping."
            }
        ]
    }
    ,
    "petra": {
        "name": "Petra, Jordan",
        "coordinates": [35.4444, 30.3285],
        "crowd_index": 85,
        "description": "The rose-red city carved into cliffs draws long guided tours and concentrated visitor flows in narrow canyon approaches.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Hampi, Karnataka",
                "coordinates": [76.4600, 15.3350],
                "crowd_index": 36,
                "similarity": 88,
                "description": "Ancient temple ruins set across dramatic boulder-strewn landscapes, offering a quieter archaeological experience.",
                "highlight": "Vast temple complexes, sunrise vistas across boulder fields, and calm rural surroundings."
            },
            {
                "name": "Pench National Park, Madhya Pradesh",
                "coordinates": [79.4275, 21.9899],
                "crowd_index": 29,
                "similarity": 82,
                "description": "Dense natural preserves and wildlife corridors that provide dramatic nature experiences without heavy historical-site crowds.",
                "highlight": "Wildlife safaris, quiet forest trails, and immersive nature-focused visits."
            }
        ]
    },
    "angkor": {
        "name": "Angkor Wat, Cambodia",
        "coordinates": [103.8667, 13.4125],
        "crowd_index": 94,
        "description": "Angkor's temple complex receives massive sunrise crowds and large tour groups that compress visitor routes.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Pondicherry, Tamil Nadu",
                "coordinates": [79.8083, 11.9416],
                "crowd_index": 34,
                "similarity": 86,
                "description": "Colonial-era architecture, quiet promenade life and cultural depth that feel restorative compared to busy temple circuits.",
                "highlight": "Promenade beach, French Quarter walks, and calm cultural cafés."
            },
            {
                "name": "Darjeeling, West Bengal",
                "coordinates": [88.2627, 27.0360],
                "crowd_index": 31,
                "similarity": 80,
                "description": "Hill-station vistas, tea gardens, and dispersed scenic viewpoints offering breathers away from packed heritage sites.",
                "highlight": "Tea garden tours, mountain viewpoints, and relaxed colonial hill-town charm."
            }
        ]
    },
    "banff": {
        "name": "Banff National Park, Canada",
        "coordinates": [-115.5729, 51.1784],
        "crowd_index": 82,
        "description": "Popular alpine lakes and trails see peak-season bottlenecks and crowded lakeshores at marquee viewpoints.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Valley of Flowers, Uttarakhand",
                "coordinates": [79.6044, 30.7485],
                "crowd_index": 28,
                "similarity": 84,
                "description": "High-altitude alpine meadows with seasonal blooms and quieter trekking routes compared to crowded lakeside lookouts.",
                "highlight": "Alpine floral displays, remote trekking, and serene high-mountain landscapes."
            },
            {
                "name": "Pangong Tso (off-peak), Ladakh",
                "coordinates": [78.7945, 33.8273],
                "crowd_index": 39,
                "similarity": 79,
                "description": "High-altitude lakes with dramatic color shifts that can be enjoyed with fewer crowds outside peak transit windows.",
                "highlight": "Azure lake colors, high-desert panoramas, and quiet lakeside camps."
            }
        ]
    },
    "cinqueterre": {
        "name": "Cinque Terre, Italy",
        "coordinates": [9.7055, 44.1279],
        "crowd_index": 90,
        "description": "Colorful cliffside villages along a narrow coastal trail attract heavy day-tripper flows and congested footpaths.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Kovalam, Kerala",
                "coordinates": [76.9486, 8.3626],
                "crowd_index": 35,
                "similarity": 85,
                "description": "Scenic coastal villages with charming beaches and a slower seaside rhythm compared to busy cliffside trails.",
                "highlight": "Palm-fringed beaches, lighthouse viewpoints, and relaxed coastal life."
            },
            {
                "name": "Gokarna, Karnataka",
                "coordinates": [74.3188, 14.5479],
                "crowd_index": 30,
                "similarity": 81,
                "description": "Undiscovered coves and relaxed beach trails that feel intimate and less trafficked than major coastal circuits.",
                "highlight": "Remote beach trails, quiet coves, and barefoot seaside village life."
            }
        ]
    },
    "borabora": {
        "name": "Bora Bora, French Polynesia",
        "coordinates": [-151.7415, -16.5004],
        "crowd_index": 78,
        "description": "Overwater bungalows and lagoon tours concentrate visitors in small resort zones during high season.",
        "danger_level": "Moderate",
        "alternatives": [
            {
                "name": "Andaman Islands (Havelock), India",
                "coordinates": [93.0000, 11.9600],
                "crowd_index": 42,
                "similarity": 86,
                "description": "Crystal-clear waters, coral snorkel sites and quiet island beaches that echo tropical lagoon charm.",
                "highlight": "Coral snorkeling, tranquil beaches, and simple island stays."
            },
            {
                "name": "Lakshadweep (Agatti), India",
                "coordinates": [72.7810, 10.8260],
                "crowd_index": 38,
                "similarity": 82,
                "description": "Remote coral atolls with strong marine life and low-volume tourism compared to high-end island resorts.",
                "highlight": "Clear lagoons, marine biodiversity, and low-key island life."
            }
        ]
    },
    "giza": {
        "name": "Pyramids of Giza, Egypt",
        "coordinates": [31.1342, 29.9792],
        "crowd_index": 95,
        "description": "Large day-tour volumes and concentrated visitor activity around pyramid sites put pressure on access routes.",
        "danger_level": "Critical",
        "alternatives": [
            {
                "name": "Kumbhalgarh Fort, Rajasthan",
                "coordinates": [73.5715, 25.1530],
                "crowd_index": 29,
                "similarity": 88,
                "description": "Expansive fortifications and historical ramparts that provide immersive fortress walks away from top global heritage crowds.",
                "highlight": "Long fort walls, panoramic hilltop views, and quiet heritage exploration."
            },
            {
                "name": "Chittorgarh Fort, Rajasthan",
                "coordinates": [74.6292, 24.8891],
                "crowd_index": 31,
                "similarity": 85,
                "description": "Ancient fortress complex with large ramparts and historic monuments that feel spacious compared to crowded pyramid circuits.",
                "highlight": "Rampart walks, sprawling courtyards, and reflective heritage sites."
            }
        ]
    },
    "sagrada": {
        "name": "Sagrada Familia, Barcelona",
        "coordinates": [2.1744, 41.4036],
        "crowd_index": 92,
        "description": "Antoni Gaudí's masterpiece sees heavy queues, audio-tour clusters, and limited interior flow during peak periods.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Pondicherry, Tamil Nadu",
                "coordinates": [79.8083, 11.9416],
                "crowd_index": 34,
                "similarity": 84,
                "description": "Quieter colonial architecture and chapel-lined promenades with contemplative public spaces and fewer tour groups.",
                "highlight": "Quiet churches, colonial streets, and seaside promenades."
            },
            {
                "name": "Mysore Palace, Karnataka",
                "coordinates": [76.6394, 12.3051],
                "crowd_index": 33,
                "similarity": 81,
                "description": "Ornate royal architecture with scheduled light shows and cultural programming that disperse visitors across time slots.",
                "highlight": "Evening palace illumination and calm royal halls."
            }
        ]
    },
    "halong": {
        "name": "Ha Long Bay, Vietnam",
        "coordinates": [107.0840, 20.9101],
        "crowd_index": 88,
        "description": "Karst island cruises concentrate tourist flows on common route segments and popular grotto stops.",
        "danger_level": "Severe",
        "alternatives": [
            {
                "name": "Andaman Islands (Havelock), India",
                "coordinates": [93.0000, 11.9600],
                "crowd_index": 42,
                "similarity": 83,
                "description": "Tropical archipelago experiences with quiet lagoon explorations that feel less tour-concentrated.",
                "highlight": "Diving, clear lagoons, and low-volume island experiences."
            },
            {
                "name": "Lakshadweep (Agatti), India",
                "coordinates": [72.7810, 10.8260],
                "crowd_index": 38,
                "similarity": 80,
                "description": "Remote atolls with strong marine life and calm coastal waters, good for off-grid snorkeling and quieter stays.",
                "highlight": "Pristine marine life and serene atoll beaches."
            }
        ]
    }
}

# In-memory database tables for User Field Reports and deflection Analytics
FIELD_REPORTS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "destination": "Orchha, Madhya Pradesh",
        "report_text": "Visited Orchha Cenotaphs at sunrise. The architecture is stunning and completely crowd-free. Highly recommended over Agra's queues!",
        "congestion_rating": "Quiet",
        "image_data": None
    },
    {
        "id": 2,
        "destination": "Jibhi, Himachal Pradesh",
        "report_text": "Amazing wood cottages and waterfall hikes. So peaceful compared to the traffic jam in Manali.",
        "congestion_rating": "Quiet",
        "image_data": None
    }
]

ANALYTICS_DB = {
    "total_searches": 482,
    "total_redirections": 154,
    "eco_passes_verified": 32,
    "hotspots": {
        "tajmahal": 182,
        "manali": 140,
        "goa": 160,
        "santorini": 78,
        "venice": 65,
        "kuta": 84,
        "machupicchu": 42,
        "eiffel": 0,
        "greatwall": 0,
        "shibuya": 0,
        "timessquare": 0
    },
    "alternatives": {
        "Orchha, Madhya Pradesh": 45,
        "Mandu, Madhya Pradesh": 28,
        "Jibhi, Himachal Pradesh": 38,
        "Landour, Uttarakhand": 17,
        "Gokarna, Karnataka": 15,
        "Tarkarli, Maharashtra": 11,
        "Milos, Greece": 0,
        "Naxos, Greece": 0,
        "Treviso, Italy": 0,
        "Chioggia, Italy": 0,
        "Amed, Bali": 0,
        "Munduk, Bali": 0,
        "Choquequirao, Peru": 0,
        "Huchuy Qosqo, Peru": 0,
        "Udaipur, Rajasthan": 0,
        "Mysore Palace, Karnataka": 0,
        "Kumbhalgarh Fort, Rajasthan": 0,
        "Chittorgarh Fort, Rajasthan": 0,
        "Chandni Chowk, Delhi": 0,
        "Colaba Causeway, Mumbai": 0,
        "Marine Drive, Mumbai": 0,
        "Connaught Place, Delhi": 0
    }
}

# Mock User Database for Role-Based Login
USERS_DB = {
    "traveler@alt.travel": {"password": "pass", "role": "Traveler", "name": "Aarav Sharma"},
    "admin@alt.travel": {"password": "admin", "role": "Admin", "name": "Priya Patel"}
}

# ================= SCHEMAS =================

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    role: str
    name: str
    message: str

class SwapRequest(BaseModel):
    destination: str
    hour: Optional[int] = Field(12, ge=8, le=22, description="Optional hour for predictive crowd forecasting.")

class SearchResult(BaseModel):
    name: str
    lat: str
    lon: str

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]

class AlternativeDetail(BaseModel):
    name: str
    coordinates: List[float]
    crowd_index: int
    similarity: int
    description: str
    highlight: str

class HotspotDetail(BaseModel):
    name: str
    coordinates: List[float]
    crowd_index: int
    danger_level: str
    description: str

class RealTimeGeminiSwap(BaseModel):
    aesthetic_traits: List[str] = Field(description="A list of 3-5 core aesthetic traits of the queried location.")
    vibe_description: str = Field(description="A short, descriptive, poetic summary of the destination's unique atmosphere (1-2 sentences).")
    hotspot: HotspotDetail = Field(description="The overcrowded tourist trap hotspot related to the query.")
    alternatives: List[AlternativeDetail] = Field(description="Exactly two lesser-known, under-visited alternative destinations in India that share a similar vibe.")
    direct_alternative_match: str = Field(description="If the query directly names or requests one of the alternatives, specify the exact full alternative name here. Otherwise return an empty string.")

class GeminiMeta(BaseModel):
    aesthetic_traits: List[str]
    vibe_description: str
    is_mock: bool
    direct_alternative_match: Optional[str] = None

class SwapResponse(BaseModel):
    success: bool
    query: str
    hotspot: HotspotDetail
    alternatives: List[AlternativeDetail]
    analysis: GeminiMeta

class CheckinRequest(BaseModel):
    destination_name: str
    latitude: float
    longitude: float

class CheckinResponse(BaseModel):
    verified: bool
    message: str
    voucher_code: Optional[str] = None
    reward: Optional[str] = None

class ItineraryDay(BaseModel):
    day: int
    destination: str

class ItineraryRequest(BaseModel):
    days: List[ItineraryDay]

class ItineraryResponse(BaseModel):
    balanced: bool
    original_footprint: str
    balanced_footprint: str
    days: List[ItineraryDay]
    details: str

class EcoGuideResponse(BaseModel):
    alternative: str
    morning_activity: str
    afternoon_activity: str
    evening_activity: str
    eco_transit: str
    local_eatery: str
    sustainable_tip: str

class VibeReportRequest(BaseModel):
    destination: str
    report_text: str
    congestion_rating: str
    image_data: Optional[str] = None  # Base64 data

class AnalyticsResponse(BaseModel):
    total_searches: int
    total_redirections: int
    eco_passes_verified: int
    redirection_rate: float
    hotspots: Dict[str, int]
    alternatives: Dict[str, int]

# ================= HELPER FUNCTIONS =================

def predict_crowd_index(base_index: int, hour: int) -> int:
    """Mathematical model simulating crowd fluctuations based on the hour of the day."""
    # Peak crowd is at 14:00 (2 PM). We use a cosine wave offset to shape the curve.
    rad = (hour - 14) * (math.pi / 10)  # spans from 8 to 22
    fluctuation = 18 * math.cos(rad)    # max +/- 18% variance
    forecasted = int(base_index - 10 + fluctuation)
    return max(15, min(100, forecasted))

def local_heuristic_analysis(destination: str) -> dict:
    dest_lower = destination.lower()
    direct_alt = None
    alternatives_list = [
        "Orchha, Madhya Pradesh", "Mandu, Madhya Pradesh",
        "Jibhi, Himachal Pradesh", "Landour, Uttarakhand",
        "Gokarna, Karnataka", "Tarkarli, Maharashtra",
        "Milos, Greece", "Naxos, Greece",
        "Treviso, Italy", "Chioggia, Italy",
        "Amed, Bali", "Munduk, Bali",
        "Choquequirao, Peru", "Huchuy Qosqo, Peru",
        "Udaipur, Rajasthan", "Mysore Palace, Karnataka",
        "Kumbhalgarh Fort, Rajasthan", "Chittorgarh Fort, Rajasthan",
        "Chandni Chowk, Delhi", "Colaba Causeway, Mumbai",
        "Marine Drive, Mumbai", "Connaught Place, Delhi"
    ]
    # Extend with newly added global hotspots mapped to Indian alternatives
    alternatives_list += [
        "Hampi, Karnataka", "Pench National Park, Madhya Pradesh",
        "Pondicherry, Tamil Nadu", "Darjeeling, West Bengal",
        "Valley of Flowers, Uttarakhand", "Pangong Tso, Ladakh",
        "Kovalam, Kerala", "Andaman Islands (Havelock)", "Lakshadweep (Agatti)",
        "Kumbhalgarh Fort, Rajasthan", "Chittorgarh Fort, Rajasthan"
    ]
    for alt in alternatives_list:
        if alt.split(",")[0].lower().strip() in dest_lower:
            direct_alt = alt
            break

    if any(k in dest_lower for k in ["taj", "mahal", "agra", "historic", "architecture", "monument", "orchha", "mandu", "palace", "tomb"]):
        hotspot_key = "tajmahal"
    elif any(k in dest_lower for k in ["goa", "beach", "coastal", "sea", "ocean", "gokarna", "tarkarli", "coastline", "sunsets"]):
        hotspot_key = "goa"
    elif any(k in dest_lower for k in ["santorini", "greece", "caldera", "oia", "fira", "cyclades"]):
        hotspot_key = "santorini"
    elif any(k in dest_lower for k in ["venice", "venezia", "canal", "rialto", "st." , "marko", "san marco"]):
        hotspot_key = "venice"
    elif any(k in dest_lower for k in ["kuta", "bali", "semniyak", "legian", "ubud", "indonesia"]):
        hotspot_key = "kuta"
    elif any(k in dest_lower for k in ["machu", "picchu", "peru", "cusco", "inca"]):
        hotspot_key = "machupicchu"
    elif any(k in dest_lower for k in ["eiffel", "paris", "louvre", "seine", "champ de mars", "arc de triomphe"]):
        hotspot_key = "eiffel"
    elif any(k in dest_lower for k in ["great wall", "badaling", "mutianyu", "beijing", "china"]):
        hotspot_key = "greatwall"
    elif any(k in dest_lower for k in ["shibuya", "tokyo", "neon", "crossing", "harajuku"]):
        hotspot_key = "shibuya"
    elif any(k in dest_lower for k in ["times square", "new york", "manhattan", "broadway", "midtown"]):
        hotspot_key = "timessquare"
    else:
        hotspot_key = "manali"

    h = HOTSPOTS_DB[hotspot_key]
    vibe_traits = {
        "tajmahal": ["Mughal Heritage", "Monumental Grandeur"],
        "goa": ["Beach Culture", "Coastal Nightlife"],
        "santorini": ["Caldera Sunsets", "Whitewashed Charm"],
        "venice": ["Canals", "Historic Romance"],
        "kuta": ["Surf Culture", "Tropical Energy"],
        "machupicchu": ["Ancient Ruins", "Mountain Mystique"],
        "eiffel": ["Iconic Landmarks", "Romantic Cityscape"],
        "greatwall": ["Historic Grandeur", "Ancient Fortifications"],
        "shibuya": ["Neon Urban Pulse", "Crowded City Energy"],
        "timessquare": ["Electric Street Life", "High-Energy Urban Theater"],
        "petra": ["Ancient Carved Architecture", "Canyon Approaches"],
        "angkor": ["Temple Grandeur", "Sunrise Rituals"],
        "banff": ["Alpine Lakes", "Glacial Peaks"],
        "cinqueterre": ["Cliffside Villages", "Coastal Trails"],
        "borabora": ["Tropical Lagoons", "Resort Serenity"],
        "giza": ["Ancient Monuments", "Desert Plateau"],
        "sagrada": ["Gaudí Complexity", "Ornate Facades"],
        "halong": ["Karst Islands", "Cruise Routes"],
        "manali": ["Culture", "Scenic Vistas", "Heritage"]
    }
    return {
        "aesthetic_traits": vibe_traits.get(hotspot_key, ["Scenic", "Cultural"]),
        "vibe_description": h["description"],
        "hotspot": {
            "name": h["name"],
            "coordinates": h["coordinates"],
            "crowd_index": h["crowd_index"],
            "danger_level": h["danger_level"],
            "description": h["description"]
        },
        "alternatives": h["alternatives"],
        "direct_alternative_match": direct_alt
    }

def run_gemini_analysis(destination: str) -> dict:
    if not GEMINI_API_KEY:
        logger.info("Using local heuristic analysis (no API key).")
        res = local_heuristic_analysis(destination)
        res["is_mock"] = True
        return res

    try:
        models_to_try = ["gemini-1.5-flash", "gemini-2.5-flash"]
        model = None
        error_msg = ""
        
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                break
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Model {model_name} failed: {e}.")
        
        if not model:
            raise Exception(f"All models failed. Last error: {error_msg}")
            
        prompt = (
            f"Analyze the travel destination or query: '{destination}'.\\n"
            "Identify its core aesthetic qualities and vibe.\\n"
            "Identify the most similar overcrowded Indian hotspot trap related to this query (e.g. Manali, Goa, Taj Mahal, Mysore Palace, Santorini, Venice, Eiffel Tower, Times Square, etc.) and generate its details.\\n"
            "Generate exactly two lesser-known, under-visited alternative destinations in India that share a similar vibe to the hotspot.\\n"
            "If the query directly names an alternative, put its name in 'direct_alternative_match' and provide two other alternatives.\\n"
            "Conform strictly to the JSON schema."
        )
        
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=RealTimeGeminiSwap
            )
        )
        
        import json
        data = json.loads(response.text)
        
        return {
            "aesthetic_traits": data.get("aesthetic_traits", ["Scenic", "Cultural"]),
            "vibe_description": data.get("vibe_description", "An appealing vacation spot with unique local charms."),
            "hotspot": data.get("hotspot"),
            "alternatives": data.get("alternatives", []),
            "is_mock": False,
            "direct_alternative_match": data.get("direct_alternative_match") if data.get("direct_alternative_match") else None
        }
        
    except Exception as ex:
        logger.error(f"Gemini API failure: {ex}. Falling back.")
        res = local_heuristic_analysis(destination)
        res["is_mock"] = True
        return res

def strip_exif_metadata(base64_image: str) -> str:
    """Decodes a base64 image string, strips EXIF tags, and re-encodes to base64."""
    try:
        if not base64_image:
            return ""
        
        header = "data:image/jpeg;base64"
        data_part = base64_image
        if "," in base64_image:
            header, data_part = base64_image.split(",", 1)
            
        image_bytes = base64.b64decode(data_part)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Save without EXIF tags
        clean_buffer = io.BytesIO()
        image.save(clean_buffer, format=image.format or 'JPEG', exif=b"")
        
        clean_base64 = base64.b64encode(clean_buffer.getvalue()).decode('utf-8')
        return f"{header},{clean_base64}"
    except Exception as e:
        logger.error(f"Image EXIF stripping failed: {e}. Returning original.")
        return base64_image

# ================= ENDPOINTS =================

@app.get("/api/swap", response_model=SwapResponse)
def swap_destination_get(
    destination: str = Query(..., description="Destination search query"),
    hour: int = Query(12, ge=8, le=22, description="Hour of prediction (8 AM - 10 PM)")
):
    if not destination.strip():
        raise HTTPException(status_code=400, detail="Destination cannot be empty.")
    
    # Run analysis
    analysis_res = run_gemini_analysis(destination)
    hotspot_data = analysis_res["hotspot"]
    alternatives_data = analysis_res["alternatives"]
    
    # Calculate forecasted crowd indexes
    hotspot_predicted = predict_crowd_index(hotspot_data["crowd_index"], hour)
    
    # Log search for B2B analytics
    ANALYTICS_DB["total_searches"] += 1
        
    return SwapResponse(
        success=True,
        query=destination,
        hotspot=HotspotDetail(
            name=hotspot_data["name"],
            coordinates=hotspot_data["coordinates"],
            crowd_index=hotspot_predicted,
            danger_level="Critical" if hotspot_predicted >= 80 else ("Severe" if hotspot_predicted >= 60 else "Moderate"),
            description=hotspot_data["description"]
        ),
        alternatives=[
            AlternativeDetail(
                name=alt["name"],
                coordinates=alt["coordinates"],
                crowd_index=predict_crowd_index(alt["crowd_index"], hour),
                similarity=alt["similarity"],
                description=alt["description"],
                highlight=alt["highlight"]
            )
            for alt in alternatives_data
        ],
        analysis=GeminiMeta(
            aesthetic_traits=analysis_res["aesthetic_traits"],
            vibe_description=analysis_res["vibe_description"],
            is_mock=analysis_res["is_mock"],
            direct_alternative_match=analysis_res.get("direct_alternative_match")
        )
    )

@app.post("/api/swap", response_model=SwapResponse)
def swap_destination_post(payload: SwapRequest):
    return swap_destination_get(destination=payload.destination, hour=payload.hour or 12)

@app.get("/api/search", response_model=SearchResponse)
async def search_destinations(
    query: str = Query(..., min_length=1, description="Search query for a destination or landmark."),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of results to return.")
):
    url = "https://nominatim.openstreetmap.org/search"
    headers = {
        "User-Agent": "AltTravel-SmartSearch/1.0 (contact: support@alttravel.example)"
    }
    params = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 0,
        "accept-language": "en"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as err:
        logger.error(f"Nominatim search failed: {err}")
        raise HTTPException(status_code=503, detail="External search service unavailable.")

    return SearchResponse(
        query=query,
        results=[
            SearchResult(name=item.get("display_name", ""), lat=item.get("lat", ""), lon=item.get("lon", ""))
            for item in data
        ]
    )

@app.post("/api/analytics/log-redirection")
def log_redirection(payload: Dict[str, str]):
    alternative_name = payload.get("alternative")
    if alternative_name in ANALYTICS_DB["alternatives"]:
        ANALYTICS_DB["alternatives"][alternative_name] += 1
        ANALYTICS_DB["total_redirections"] += 1
        return {"logged": True, "alternative": alternative_name}
    return {"logged": False, "message": "Alternative not found in B2B schema."}

@app.post("/api/eco-pass/verify", response_model=CheckinResponse)
def verify_eco_pass(payload: CheckinRequest):
    """Verifies user geolocation coordinates against alternative spots boundaries."""
    target_alt = None
    # Scan static database for alternative
    for key, data in HOTSPOTS_DB.items():
        for alt in data["alternatives"]:
            if alt["name"].lower().strip() == payload.destination_name.lower().strip():
                target_alt = alt
                break
                
    if not target_alt:
        return CheckinResponse(verified=False, message="Alternative destination unrecognized.")
        
    alt_coords = target_alt["coordinates"]  # [Lng, Lat]
    # Simple bounding radius calculation (~0.05 degrees threshold, ~5.5km)
    distance = math.sqrt((payload.longitude - alt_coords[0])**2 + (payload.latitude - alt_coords[1])**2)
    
    if distance <= 0.05:
        # Check-in success! Log stats
        ANALYTICS_DB["eco_passes_verified"] += 1
        
        # Generate clean randomized mock voucher codes
        import random
        pass_code = f"ECO-PASS-{random.randint(1000, 9999)}"
        
        # Determine reward
        reward = "Free Regional Heritage Site Entry Ticket"
        if "karnataka" in payload.destination_name.lower() or "gokarna" in payload.destination_name.lower():
            reward = "Free Coastal Trekking Tour Group Voucher"
        elif "madhya pradesh" in payload.destination_name.lower() or "orchha" in payload.destination_name.lower():
            reward = "Free Guided Heritage Palace Walk Pass in Orchha"
        elif "himachal" in payload.destination_name.lower() or "jibhi" in payload.destination_name.lower():
            reward = "Free Local Pine woodcraft Souvenir & Trout Meal"
            
        return CheckinResponse(
            verified=True,
            message=f"Success! Geo-checkin verified at {target_alt['name']}.",
            voucher_code=pass_code,
            reward=reward
        )
        
    # Failed checkin - too far away
    # We will log coordinates in detail for debugging
    logger.info(f"Checkin failed: User coords [{payload.latitude}, {payload.longitude}], Target alt [{alt_coords[1]}, {alt_coords[0]}], Dist={distance}")
    return CheckinResponse(
        verified=False,
        message=f"Verification failed. You are currently too far from {target_alt['name']} (distance: {round(distance * 111, 2)}km). You must physically visit the location to claim rewards."
    )

@app.post("/api/itinerary/optimize", response_model=ItineraryResponse)
def optimize_itinerary(payload: ItineraryRequest):
    """Checks for consecutive high-crowd hotspot days and balances them by swapping with alternatives."""
    optimized_days = []
    consecutive_hotspots = 0
    balanced = False
    original_traps = []
    balanced_swaps = []
    
    for item in payload.days:
        dest_lower = item.destination.lower()
        matched_hotspot_key = None
        
        # Check if destination corresponds to a hotspot
        for key in HOTSPOTS_DB.keys():
            if key in dest_lower:
                matched_hotspot_key = key
                break
                
        if matched_hotspot_key:
            consecutive_hotspots += 1
            # If user has visited 2 or more hotspots in a row, swap this day with the first alternative of this hotspot
            if consecutive_hotspots >= 2:
                alternative_dest = HOTSPOTS_DB[matched_hotspot_key]["alternatives"][0]["name"]
                optimized_days.append(ItineraryDay(day=item.day, destination=alternative_dest))
                balanced_swaps.append(f"Day {item.day}: Swapped {item.destination} for {alternative_dest}")
                balanced = True
            else:
                optimized_days.append(item)
                original_traps.append(item.destination)
        else:
            consecutive_hotspots = 0
            optimized_days.append(item)
            
    footprint_orig = "High Congestion (Consecutive Hotspots Scheduled)" if len(original_traps) > 1 else "Normal Footprint"
    footprint_bal = "Eco-Balanced (Diverted Routing Active)" if balanced else footprint_orig
    
    details_log = " || ".join(balanced_swaps) if balanced else "No consecutive crowded hotspots detected. Your itinerary footprint is balanced!"
    
    return ItineraryResponse(
        balanced=balanced,
        original_footprint=footprint_orig,
        balanced_footprint=footprint_bal,
        days=optimized_days,
        details=details_log
    )

@app.post("/api/vibe/submit")
def submit_vibe_report(payload: VibeReportRequest):
    """Processes user field reports, sanitizing base64 images by stripping metadata EXIF elements."""
    sanitized_image = None
    if payload.image_data:
        sanitized_image = strip_exif_metadata(payload.image_data)
        logger.info(f"Field Report received: Stripped image EXIF tags for destination: {payload.destination}")
        
    report_id = len(FIELD_REPORTS) + 1
    new_report = {
        "id": report_id,
        "destination": payload.destination,
        "report_text": payload.report_text,
        "congestion_rating": payload.congestion_rating,
        "image_data": sanitized_image
    }
    FIELD_REPORTS.append(new_report)
    return {"success": True, "message": "Raw objective report recorded successfully. Metadata stripped.", "report_id": report_id}

@app.get("/api/vibe/list")
def list_vibe_reports(destination: Optional[str] = None):
    if destination:
        return [r for r in FIELD_REPORTS if destination.lower() in r["destination"].lower()]
    return FIELD_REPORTS

# Auth token validation helper
def get_user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token or not token.startswith("ALTTRAVEL-SESSION-"):
        return None
    parts = token.split("-")
    if len(parts) < 4:
        return None
    role = parts[2]
    email = parts[3]
    user = USERS_DB.get(email)
    if user and user["role"].upper() == role:
        return user
    return None

@app.post("/api/auth/login", response_model=LoginResponse)
def auth_login(payload: LoginRequest):
    email_clean = payload.email.lower().strip()
    user = USERS_DB.get(email_clean)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = f"ALTTRAVEL-SESSION-{user['role'].upper()}-{email_clean}"
    return LoginResponse(
        success=True,
        token=token,
        role=user["role"],
        name=user["name"],
        message="Login successful."
    )

@app.delete("/api/vibe/moderate/{report_id}")
def moderate_vibe_report(report_id: int, token: Optional[str] = Query(None)):
    user = get_user_from_token(token)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=401, detail="Unauthorized. Admin rights required.")
    
    global FIELD_REPORTS
    initial_len = len(FIELD_REPORTS)
    FIELD_REPORTS = [r for r in FIELD_REPORTS if r["id"] != report_id]
    if len(FIELD_REPORTS) == initial_len:
        raise HTTPException(status_code=404, detail="Report not found.")
    return {"success": True, "message": f"Report {report_id} deleted successfully."}

@app.get("/api/analytics", response_model=AnalyticsResponse)
def get_analytics(token: str = Query(None, description="Admin verification token/session")):
    # Secure endpoint check supporting both old static pass and role-based session token
    user = get_user_from_token(token)
    is_admin = user and user["role"] == "Admin"
    if not is_admin and token != settings.admin_dashboard_password:
        raise HTTPException(status_code=401, detail="Unauthorized dashboard access token.")
        
    total_diverted = sum(ANALYTICS_DB["alternatives"].values())
    redirection_rate = round((total_diverted / ANALYTICS_DB["total_searches"]) * 100, 2) if ANALYTICS_DB["total_searches"] > 0 else 0.0
    
    return AnalyticsResponse(
        total_searches=ANALYTICS_DB["total_searches"],
        total_redirections=ANALYTICS_DB["total_redirections"],
        eco_passes_verified=ANALYTICS_DB["eco_passes_verified"],
        redirection_rate=redirection_rate,
        hotspots=ANALYTICS_DB["hotspots"],
        alternatives=ANALYTICS_DB["alternatives"]
    )

@app.get("/api/alternative/itinerary", response_model=EcoGuideResponse)
def get_alternative_itinerary(alternative: str = Query(..., description="The name of the alternative destination")):
    alt_clean = alternative.lower().strip()
    
    # Try using Gemini first if configured
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                f"Generate a 1-day uncrowded, sustainable travel itinerary for the destination '{alternative}'.\n"
                "It must share similar vibes to its congested counterpart.\n"
                "Provide detailed, premium, and poetic descriptions for:\n"
                "1. morning_activity (sunset/sunrise silent walk, photography, meditation, etc.)\n"
                "2. afternoon_activity (uncrowded sightseeing, local organic lunch, self-guided tours, etc.)\n"
                "3. evening_activity (peaceful sunset stroll, local crafts shopping, tranquil river views, etc.)\n"
                "4. eco_transit (non-motorized or low-emission transport, e.g. Bicycles, rowboats, walking, e-rickshaws)\n"
                "5. local_eatery (locally owned, organic, family run eateries supporting regional economy)\n"
                "6. sustainable_tip (specific eco-tip like packaging waste back, choosing reef-safe sunscreens, carrying copper flasks)\n"
                "Conform strictly to the JSON schema."
            )
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=EcoGuideResponse
                )
            )
            import json
            data = json.loads(response.text)
            return EcoGuideResponse(
                alternative=alternative,
                morning_activity=data.get("morning_activity", ""),
                afternoon_activity=data.get("afternoon_activity", ""),
                evening_activity=data.get("evening_activity", ""),
                eco_transit=data.get("eco_transit", ""),
                local_eatery=data.get("local_eatery", ""),
                sustainable_tip=data.get("sustainable_tip", "")
            )
        except Exception as ex:
            logger.error(f"Gemini Itinerary generation failed: {ex}. Falling back to pre-baked guides.")

    # Local fallback pre-baked guides
    fallbacks = {
        "orchha": {
            "morning": "Sunrise walk and silent photography at the Orchha Cenotaphs along the river.",
            "afternoon": "Relaxed organic lunch at the local Orchha Organic Cafe, followed by a quiet exploration of the Jahangir Mahal courtyards.",
            "evening": "Peaceful sunset viewing by the Betwa River ghats, enjoying silent water reflections.",
            "transit": "Walkable town center or rent a local single-gear bicycle to minimize noise and emissions.",
            "eatery": "Orchha Organic Cafe & Bundelkhand traditional local home-kitchen.",
            "tip": "Carry a reusable water flask to avoid buying single-use plastic bottles around the monuments."
        },
        "mandu": {
            "morning": "Sunrise stroll around the Jahaz Mahal (Ship Palace) amidst peaceful morning mist.",
            "afternoon": "Self-guided walk through the silent arches of Hindola Mahal and Baz Bahadur's Palace ruins.",
            "evening": "Scenic sunset reflection at the Rupmati Pavilion overlooking the peaceful Narmada valley.",
            "transit": "Shared electric rickshaws or explore the expansive ruins on foot.",
            "eatery": "Malwa local home-style kitchen serving hot Bafla Landoo and local spices.",
            "tip": "Hire a locally certified guide to support the local historic preservation community directly."
        },
        "jibhi": {
            "morning": "Pristine morning hike to the Jibhi waterfall surrounded by quiet pine woods.",
            "afternoon": "Quiet reading session by the Tirthan river banks near the rustic log bridges.",
            "evening": "Authentic stroll through the local slate-roofed villages of Chehni Kothar.",
            "transit": "Walk the forest trails or share a low-emissions local eco-cab.",
            "eatery": "Tirthan local organic homestay dining offering organic wood-fired trout and red rice.",
            "tip": "Pack all plastic waste back with you to preserve the delicate alpine valley ecosystem."
        },
        "landour": {
            "morning": "Sunrise forest stroll along the quiet Lal Tibba walking loop.",
            "afternoon": "Scenic reading session at the historic Landour Bakehouse with snow-capped peak views.",
            "evening": "Peaceful stroll through Sister's Bazaar as evening mist rolls in.",
            "transit": "Walk the paved pedestrian forest lanes; motorized transit is restricted in the core cantonment zone.",
            "eatery": "Landour Bakehouse & Char Dukan local tea stalls.",
            "tip": "Do not play loud music; respect the tranquil silent zone regulations of the cantonment hill."
        },
        "gokarna": {
            "morning": "Sunrise beach trail hike starting from Kudle beach to Half Moon beach.",
            "afternoon": "Quiet organic lunch at a cliffside eco-cafe overlooking Om Beach.",
            "evening": "Silent sunset viewing on the pristine, uncommercialized Paradise beach cove.",
            "transit": "Walk the scenic cliff pathways; boats and cabs are only for essential transit.",
            "eatery": "Prema Local Organic Restaurant & Om Beach cliff cafes.",
            "tip": "Avoid throwing plastic wrap or bottles on the sand; participate in local voluntary beach cleanups."
        },
        "tarkarli": {
            "morning": "Scenic sunrise boat ride to the offshore Sindhudurg sea fort ruins.",
            "afternoon": "Uncrowded swimming and low-impact snorkeling at Devbagh beach spit.",
            "evening": "Serene sunset walk along the quiet Karli river backwaters.",
            "transit": "Walk the sandy lanes or hire local non-motorized rowboats.",
            "eatery": "Authentic Malvani local home kitchen serving fresh Kokum Sherbet and Bhakri.",
            "tip": "Respect coral reefs by avoiding touching them or using non-biodegradable chemical sunscreens."
        },
        "treviso": {
            "morning": "Morning coffee along the quiet Buranelli canal walkways.",
            "afternoon": "Tranquil stroll through Piazza dei Signori and medieval brick houses.",
            "evening": "Aesthetic sunset glass of local prosecco at an uncrowded riverside osteria.",
            "transit": "Walkable city center; clean, local electric buses.",
            "eatery": "Osteria dalla Gigia (locally owned, traditional pasta).",
            "tip": "Support local bakeries by trying authentic tiramisu where it was invented."
        },
        "chioggia": {
            "morning": "Sunrise walk along the picturesque Vena Canal stone bridges.",
            "afternoon": "Quiet visits to local fish markets and maritime museums.",
            "evening": "Lagoon sunset views looking towards central Venice from a peaceful distance.",
            "transit": "Local wooden rowing boats or bicycle rentals.",
            "eatery": "Trattoria al Bersagliere (fresh, local lagoon seafood).",
            "tip": "Respect local fishing crews by keeping docks clear during morning harbor operations."
        },
        "amed": {
            "morning": "Sunrise outrigger boat ride looking back at Mount Agung.",
            "afternoon": "Low-impact snorkeling directly off the quiet black sand beaches.",
            "evening": "Quiet evening walk through seaside salt-farming villages.",
            "transit": "Walk along the coastal road or rent a local bicycle.",
            "eatery": "Warung Enak (traditional Balinese home cooking).",
            "tip": "Do not touch the coral reefs; use mineral-based, reef-safe sunscreens."
        },
        "munduk": {
            "morning": "Misty morning hike to the twin Munduk waterfalls.",
            "afternoon": "Organic coffee tasting at a small family-run mountain plantation.",
            "evening": "Tranquil sunset over the lush clove-scented green valleys.",
            "transit": "Pedestrian trekking trails; explore by walking.",
            "eatery": "Eco Cafe Munduk (organic mountain ingredients).",
            "tip": "Carry a compost bag for organic waste during forest and plantation hikes."
        }
    }
    
    # Match the closest keyword in the alternative name
    matched = None
    for key, data in fallbacks.items():
        if key in alt_clean:
            matched = data
            break
            
    if not matched:
        # Generic default high-quality eco-guide
        matched = {
            "morning": f"Sunrise peaceful walk around the scenic paths of {alternative}, breathing fresh local air.",
            "afternoon": "Aesthetic local organic lunch supporting family-run growers, followed by a self-guided nature or heritage walk.",
            "evening": "Silent sunset viewing from an uncrowded local vantage point, respecting natural soundscapes.",
            "transit": "Walk on foot or hire non-motorized vehicles (bicycles, rowing boats) to reduce carbon impact.",
            "eatery": "Small family-owned dining spot serving traditional seasonal local delicacies.",
            "tip": "Respect regional customs, avoid single-use plastics, and leave no trace behind."
        }
        
    return EcoGuideResponse(
        alternative=alternative,
        morning_activity=matched["morning"],
        afternoon_activity=matched["afternoon"],
        evening_activity=matched["evening"],
        eco_transit=matched["transit"],
        local_eatery=matched["eatery"],
        sustainable_tip=matched["tip"]
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
        "gemini_enabled": GEMINI_API_KEY is not None,
        "database_configured": bool(settings.database_url),
        "redis_configured": bool(settings.redis_url)
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
