from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import math
import io
import base64
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
        "goa": 160
    },
    "alternatives": {
        "Orchha, Madhya Pradesh": 45,
        "Mandu, Madhya Pradesh": 28,
        "Jibhi, Himachal Pradesh": 38,
        "Landour, Uttarakhand": 17,
        "Gokarna, Karnataka": 15,
        "Tarkarli, Maharashtra": 11
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
        "Gokarna, Karnataka", "Tarkarli, Maharashtra"
    ]
    for alt in alternatives_list:
        if alt.split(",")[0].lower().strip() in dest_lower:
            direct_alt = alt
            break

    if any(k in dest_lower for k in ["taj", "mahal", "agra", "historic", "architecture", "monument", "orchha", "mandu", "palace", "tomb"]):
        hotspot_key = "tajmahal"
    elif any(k in dest_lower for k in ["goa", "beach", "coastal", "sea", "ocean", "gokarna", "tarkarli", "coastline", "sunsets"]):
        hotspot_key = "goa"
    else:
        hotspot_key = "manali"

    h = HOTSPOTS_DB[hotspot_key]
    return {
        "aesthetic_traits": ["Culture", "Scenic Vistas", "Heritage"] if hotspot_key == "manali" else ["Mughal Heritage"] if hotspot_key == "tajmahal" else ["White Sand Beaches"],
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
            "Identify the most similar overcrowded Indian hotspot trap related to this query (e.g. Manali, Goa, Taj Mahal, Mysore Palace, etc.) and generate its details.\\n"
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
        host=APP_HOST,
        port=APP_PORT,
        reload=DEBUG_MODE,
    )
