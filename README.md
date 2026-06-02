# AltTravel - Uncrowd Your Journey 🌍✈️

AltTravel is a modern single-page web application designed to combat overtourism by algorithmically routing travelers away from heavily congested, viral tourist hotspots to under-visited but equally stunning nearby alternatives.

It leverages **FastAPI** for a lightweight async backend, **Gemini (gemini-1.5-flash / gemini-2.5-flash / gemini-3.5-flash)** via `google-generativeai` with strict Pydantic JSON schemas to analyze aesthetic vibes, and **Mapbox GL JS** on the frontend for rendering custom dark-themed interactive map canvas, complete with bounds recalculation and zoom flyovers.

---

## 📂 Project Structure

```
/
├── backend/
│   ├── main.py              # Async FastAPI server with local DB & Gemini parsing logic
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── index.html           # Tailwind CSS Single Page Layout
│   └── app.js               # Decoupled frontend modules, Fetch API & Mapbox handlers
└── README.md                # Local setup and instructions manual (this file)
```

---

## ⚡ Quick Start Instructions

Follow these steps to run AltTravel locally on your machine.

### 1. Backend Setup & Run

The backend server runs on Python 3.10+.

1. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```

2. **(Optional) Create a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create your `.env` file**:
   Copy the sample file and update the values for your environment.
   ```bash
   cd backend
   copy .env.example .env
   ```
   Make sure `ALLOWED_ORIGINS` is a comma-separated list, and set `ADMIN_DASHBOARD_PASSWORD` to a secure value for production.

5. **Configure Gemini API Key** (Optional):
   Set the API key in your `.env` file or directly in your environment. If no key is set, the backend runs seamlessly using a fallback local heuristic parser.
   
   * **Windows CMD**:
     ```cmd
     set GEMINI_API_KEY=your_gemini_api_key_here
     ```
   * **Windows PowerShell**:
     ```powershell
     $env:GEMINI_API_KEY="your_gemini_api_key_here"
     ```
   * **macOS/Linux**:
     ```bash
     export GEMINI_API_KEY="your_gemini_api_key_here"
     ```

6. **Start the FastAPI application**:
   ```bash
   uvicorn main:app --reload
   ```
   You can also run the backend with `python main.py` to use `HOST` and `PORT` from your `.env` file.

   The backend server will launch on `http://127.0.0.1:8000`. You can inspect the interactive API documentation at `http://127.0.0.1:8000/docs`.

## 🔗 Live Demo

Try the deployed instances:

- **Frontend (Vercel):** https://alt-travel-652a0whu7-shreyas-b-r-s-projects.vercel.app/
- **Backend (Render):** https://alt-travel.onrender.com

If you want the frontend to point to a different backend, set the `REACT_APP_BACKEND_URL` environment variable in your Vercel project settings and redeploy.

## Continuous Integration

A GitHub Actions workflow has been added in `.github/workflows/python-ci.yml` to validate backend Python syntax on pushes and pull requests to `main`.

---

### 2. Frontend Setup & Run

Since the frontend is built with pure Vanilla JavaScript (ES6 Modules), HTML5, and Tailwind via CDN, it needs to be served using a local HTTP server to prevent CORS issues with local files.

1. **Navigate to the frontend folder**:
   ```bash
   cd ../frontend
   ```

2. **Serve the files**:
   You can serve the directory using Python's built-in HTTP server or any other web server:
   
   * **Using Python**:
     ```bash
     python -m http.server 3000
     ```
   * **Using Node.js (`http-server` or `serve`)**:
     ```bash
     npx serve
     ```

3. **Open the App**:
   Visit `http://localhost:3000` (or the port specified by your Node.js serve command) in your browser.

---

## 🗺️ Customizing Mapbox Access Token

By default, the application runs out-of-the-box using Mapbox's official public demo token. If the map fails to render, or you want to customize styles, follow these steps:

1. Click on the **"Map Token"** button in the upper-right corner of the AltTravel header.
2. Enter your personal Mapbox Access Token (`pk.eyJ1Ijo...`).
3. Click **"Save Token"**. The token is securely stored in your browser's local storage and the map engine will re-initialize instantly.

---

## 🛠️ Testing sandbox verification

You can test the backend API `/api/swap` endpoint directly using `curl` or any API client:

* **Request**:
  ```bash
  curl "http://127.0.0.1:8000/api/swap?destination=Santorini"
  ```
* **Response Payload Format**:
  ```json
  {
    "success": true,
    "query": "Santorini",
    "hotspot": {
      "name": "Santorini, Greece",
      "coordinates": [25.4315, 36.3932],
      "crowd_index": 98,
      "danger_level": "Critical",
      "description": "Santorini's cliffside caldera walkways are choked with thousands of daily cruise visitors, causing severe pedestrian gridlocks."
    },
    "alternatives": [
      {
        "name": "Milos, Greece",
        "coordinates": [24.438, 36.7249],
        "crowd_index": 30,
        "similarity": 93,
        "description": "Boasts dramatic volcanic coastlines...",
        "highlight": "Lunar-like volcanic cliffs..."
      },
      ...
    ],
    "analysis": {
      "aesthetic_traits": ["Coastal Views", "Caldera Cliffs", "Sunsets", "White-washed Buildings"],
      "vibe_description": "Dramatic cliffside panoramas overlooking sapphire seas...",
      "is_mock": false
    }
  }
  ```

---

## 🚀 Advanced SaaS Pro Features

AltTravel is equipped with five advanced SaaS capabilities:

### 1. Dynamic Crowd Forecasting (Predictive AI)
- **Time-Travel Slider**: The warning card displays a slider allowing you to forecast density between 8:00 AM and 10:00 PM. 
- **Endpoint**: `GET /api/swap?destination=Venice&hour=14` returns the forecasted densities modeled by a sinusoidal time wave.

### 2. Tokenized "Eco-Pass" Web Check-ins
- **GPS Coordinates Verification**: Click **"Check-in"** on an alternative destination card. The app calls the browser's native Geolocation API to verify if you are within 0.05 degrees (~5.5km) of the spot.
- **QR Voucher**: Verification triggers a modal showing a mock QR pass and a local reward (e.g. Free Shuttle Transit or Matcha Tea). If coordinates are far away or denied, you can choose to simulate coordinates for local verification.
- **Endpoint**: `POST /api/eco-pass/verify`

### 3. Anti-Algorithmic Itinerary Builder
- **Route Balancer**: Click **"Trip Planner"** in the top header. You can plan a multi-day trip. If you schedule multiple congested hotspots back-to-back, click the **"1-Click Balance"** button to replace overcrowded days with uncrowded alternatives.
- **Endpoint**: `POST /api/itinerary/optimize`

### 4. User-Generated Field Reports
- **Anti-Social Vibe Logging**: Click **"Report Vibe"** to log raw text notes and raw photo snapshots. To maintain objective reporting, there are no photo filters, likes, or user profiles.
- **EXIF Stripper**: Uploaded photos are stripped of all EXIF metadata tags on the backend to preserve traveler privacy.
- **Endpoints**: `POST /api/vibe/submit` and `GET /api/vibe/list`

### 5. B2B Analytics Dashboard for Tourism Boards
- **Board Slide-out**: Click **"B2B Board"** in the header. Enter the board passcode `alt-travel-admin-pass-2026` to unlock real-time redirection metrics.
- **Deflection Bars**: Provides visual analytics charts of total search deflections, redirection rate percentages, and visits diverted to each local alternative.
- **Endpoint**: `GET /api/analytics?token=alt-travel-admin-pass-2026`

