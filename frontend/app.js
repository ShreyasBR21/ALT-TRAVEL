// Upgraded frontend app script implementing SaaS Pro Features

// Default Mapbox public read-only token
const DEFAULT_MAPBOX_TOKEN = '';
let mapboxToken = localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN;

// Local storage key for backend URL
const BACKEND_URL = localStorage.getItem('alt_travel_backend_url') || 'http://127.0.0.1:8000';

// Global variables
let mapInstance = null;
let mapMarkers = [];
let currentAlternatives = [];
let currentHotspot = null;
let searchQuery = "";
let currentHour = 12;

// Itinerary mock memory database
let itineraryData = [
    { day: 1, destination: "Taj Mahal, Agra" },
    { day: 2, destination: "Manali, Himachal Pradesh" },
    { day: 3, destination: "Taj Mahal, Agra" }
];

// DOM Elements
const elements = {
    landingView: document.getElementById('landing-view'),
    loadingView: document.getElementById('loading-view'),
    resultsView: document.getElementById('results-view'),
    searchForm: document.getElementById('search-form'),
    destinationInput: document.getElementById('destination-input'),
    resultsSearchInput: document.getElementById('results-search-input'),
    backToSearch: document.getElementById('back-to-search'),
    navLogo: document.getElementById('nav-logo'),
    
    // Settings modal
    toggleSettings: document.getElementById('toggle-settings'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    mapboxTokenInput: document.getElementById('mapbox-token-input'),
    saveTokenBtn: document.getElementById('save-token-btn'),
    cancelTokenBtn: document.getElementById('cancel-token-btn'),
    resetTokenBtn: document.getElementById('reset-token-btn'),
    
    // Hotspot display
    hotspotDangerLabel: document.getElementById('hotspot-danger-label'),
    hotspotCrowdPct: document.getElementById('hotspot-crowd-pct'),
    hotspotLoadBar: document.getElementById('hotspot-load-bar'),
    hotspotName: document.getElementById('hotspot-name'),
    hotspotDesc: document.getElementById('hotspot-desc'),
    timeTravelSlider: document.getElementById('time-travel-slider'),
    forecastTimeLabel: document.getElementById('forecast-time-label'),
    
    // AI analysis
    aiVibeText: document.getElementById('ai-vibe-text'),
    aiTraitsList: document.getElementById('ai-traits-list'),
    aiEngineStatus: document.getElementById('ai-engine-status'),
    
    // Alternatives display
    alternativesContainer: document.getElementById('alternatives-container'),
    
    // Geolocation Eco-Pass Modal
    ecopassModal: document.getElementById('ecopass-modal'),
    closeEcopass: document.getElementById('close-ecopass'),
    ecopassRewardName: document.getElementById('ecopass-reward-name'),
    ecopassDestName: document.getElementById('ecopass-dest-name'),
    ecopassCode: document.getElementById('ecopass-code'),
    ecopassCodeLabel: document.getElementById('ecopass-code-label'),
    claimEcopassBtn: document.getElementById('claim-ecopass-btn'),

    // Itinerary components
    toggleItinerary: document.getElementById('toggle-itinerary'),
    itineraryModal: document.getElementById('itinerary-modal'),
    closeItinerary: document.getElementById('close-itinerary'),
    itineraryListContainer: document.getElementById('itinerary-list-container'),
    addDayBtn: document.getElementById('add-day-btn'),
    resetItineraryBtn: document.getElementById('reset-itinerary-btn'),
    balanceItineraryBtn: document.getElementById('balance-itinerary-btn'),

    // B2B Analytics Dashboard components
    toggleAnalytics: document.getElementById('toggle-analytics'),
    analyticsPanel: document.getElementById('analytics-panel'),
    analyticsAuth: document.getElementById('analytics-auth'),
    analyticsPasskey: document.getElementById('analytics-passkey'),
    submitAnalyticsAuth: document.getElementById('submit-analytics-auth'),
    closeAnalyticsPanelAuth: document.getElementById('close-analytics-panel-auth'),
    closeAnalyticsPanelDash: document.getElementById('close-analytics-panel-dash'),
    analyticsDashboard: document.getElementById('analytics-dashboard'),
    logoutAnalyticsBtn: document.getElementById('logout-analytics-btn'),
    
    // Stats display elements
    statRedirects: document.getElementById('stat-redirects'),
    statRate: document.getElementById('stat-rate'),
    statClaims: document.getElementById('stat-claims'),
    analyticsHotspotsBars: document.getElementById('analytics-hotspots-bars'),
    analyticsAlternativesBars: document.getElementById('analytics-alternatives-bars'),

    // Field Reports components
    openReportForm: document.getElementById('open-report-form'),
    reportModal: document.getElementById('report-modal'),
    closeReport: document.getElementById('close-report'),
    reportForm: document.getElementById('report-form'),
    reportDestSelect: document.getElementById('report-dest-select'),
    reportTextInput: document.getElementById('report-text-input'),
    reportImageInput: document.getElementById('report-image-input'),
    reportsFeedContainer: document.getElementById('reports-feed-container'),
    
    // Toast notification
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    elements.mapboxTokenInput.value = mapboxToken === DEFAULT_MAPBOX_TOKEN ? '' : mapboxToken;
});

function setupEventListeners() {
    // Form submits
    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = elements.destinationInput.value.trim();
        if (query) {
            searchQuery = query;
            handleSearch(query, currentHour);
        }
    });

    elements.resultsSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = elements.resultsSearchInput.value.trim();
            if (query) {
                searchQuery = query;
                handleSearch(query, currentHour);
            }
        }
    });

    // Time-Travel Forecast Slider change
    elements.timeTravelSlider.addEventListener('input', (e) => {
        const hour = parseInt(e.target.value);
        currentHour = hour;
        
        // Format label
        let displayHour = hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
        if (hour === 12) displayHour = "12:00 PM";
        elements.forecastTimeLabel.textContent = displayHour;
    });

    elements.timeTravelSlider.addEventListener('change', () => {
        if (searchQuery) {
            handleSearch(searchQuery, currentHour);
        }
    });

    // Suggestion pills
    document.querySelectorAll('.pill-suggestion').forEach(pill => {
        pill.addEventListener('click', () => {
            const query = pill.getAttribute('data-val');
            elements.destinationInput.value = query;
            searchQuery = query;
            handleSearch(query, currentHour);
        });
    });

    // Reset back to landing
    elements.backToSearch.addEventListener('click', showLanding);
    elements.navLogo.addEventListener('click', showLanding);

    // Settings Modal controls
    elements.toggleSettings.addEventListener('click', () => elements.settingsModal.classList.remove('hidden'));
    elements.closeSettings.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
    elements.cancelTokenBtn.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));

    elements.saveTokenBtn.addEventListener('click', () => {
        const token = elements.mapboxTokenInput.value.trim();
        if (token) {
            mapboxToken = token;
            localStorage.setItem('mapbox_token', token);
            showToast('Saved custom Mapbox token!');
        } else {
            mapboxToken = DEFAULT_MAPBOX_TOKEN;
            localStorage.removeItem('mapbox_token');
            showToast('Cleared custom token. Default active.');
        }
        elements.settingsModal.classList.add('hidden');
        if (mapInstance) {
            initializeMap(mapInstance.getCenter().lng, mapInstance.getCenter().lat);
        }
    });

    elements.resetTokenBtn.addEventListener('click', () => {
        elements.mapboxTokenInput.value = '';
        mapboxToken = DEFAULT_MAPBOX_TOKEN;
        localStorage.removeItem('mapbox_token');
        showToast('Reset to default Mapbox token');
        elements.settingsModal.classList.add('hidden');
        if (mapInstance) {
            initializeMap(mapInstance.getCenter().lng, mapInstance.getCenter().lat);
        }
    });

    // Eco-Pass Modals
    elements.closeEcopass.addEventListener('click', () => elements.ecopassModal.classList.add('hidden'));
    elements.claimEcopassBtn.addEventListener('click', () => {
        elements.ecopassModal.classList.add('hidden');
        showToast('Eco-Pass rewards claimed successfully!');
    });

    // Itinerary controls
    elements.toggleItinerary.addEventListener('click', () => {
        renderItineraryItems();
        elements.itineraryModal.classList.remove('hidden');
    });
    elements.closeItinerary.addEventListener('click', () => elements.itineraryModal.classList.add('hidden'));
    
    elements.addDayBtn.addEventListener('click', () => {
        const dayNum = itineraryData.length + 1;
        // Default suggestions based on current search or Venice
        const defaultDest = currentHotspot ? currentHotspot.name : "Manali, Himachal Pradesh";
        itineraryData.push({ day: dayNum, destination: defaultDest });
        renderItineraryItems();
    });

    elements.resetItineraryBtn.addEventListener('click', () => {
        itineraryData = [];
        renderItineraryItems();
        showToast('Itinerary wiped clean.');
    });

    elements.balanceItineraryBtn.addEventListener('click', runItineraryOptimization);

    // B2B Dashboard triggers
    elements.toggleAnalytics.addEventListener('click', () => {
        elements.analyticsPanel.classList.remove('translate-x-full');
    });
    
    elements.closeAnalyticsPanelAuth.addEventListener('click', () => {
        elements.analyticsPanel.classList.add('translate-x-full');
    });

    elements.closeAnalyticsPanelDash.addEventListener('click', () => {
        elements.analyticsPanel.classList.add('translate-x-full');
    });

    elements.submitAnalyticsAuth.addEventListener('click', unlockB2BDashboard);
    
    elements.logoutAnalyticsBtn.addEventListener('click', () => {
        elements.analyticsDashboard.classList.add('hidden');
        elements.analyticsAuth.classList.remove('hidden');
        elements.analyticsPasskey.value = '';
        showToast('B2B Dashboard panel locked.');
    });

    // Field reports modal
    elements.openReportForm.addEventListener('click', () => {
        // Populate select list with hotspot and alternatives options
        if (currentHotspot && currentAlternatives) {
            elements.reportDestSelect.innerHTML = `
                <option value="${escapeHTML(currentHotspot.name)}">${escapeHTML(currentHotspot.name)} (Hotspot)</option>
                ${currentAlternatives.map(alt => `<option value="${escapeHTML(alt.name)}">${escapeHTML(alt.name)} (Alternative)</option>`).join('')}
            `;
        } else {
            elements.reportDestSelect.innerHTML = `
                <option value="Orchha, Madhya Pradesh">Orchha, Madhya Pradesh</option>
                <option value="Jibhi, Himachal Pradesh">Jibhi, Himachal Pradesh</option>
                <option value="Gokarna, Karnataka">Gokarna, Karnataka</option>
            `;
        }
        elements.reportModal.classList.remove('hidden');
    });
    elements.closeReport.addEventListener('click', () => elements.reportModal.classList.add('hidden'));
    
    elements.reportForm.addEventListener('submit', handleReportSubmission);
}

function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('translate-y-20', 'opacity-0');
    elements.toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        elements.toast.classList.remove('translate-y-0', 'opacity-100');
        elements.toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function showLanding() {
    elements.resultsView.classList.add('hidden');
    elements.landingView.classList.remove('hidden');
    elements.destinationInput.value = '';
    elements.resultsSearchInput.value = '';
    searchQuery = "";
}

async function handleSearch(query, hour = 12) {
    elements.loadingView.classList.remove('hidden');

    try {
        const response = await fetch(`${BACKEND_URL}/api/swap?destination=${encodeURIComponent(query)}&hour=${hour}`);
        
        if (!response.ok) {
            throw new Error(`Server returned code ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            renderResults(data);
        } else {
            alert('Failure: Swapping failed to compile suggestions.');
            elements.loadingView.classList.add('hidden');
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        alert(`Failed to speak to the backend server. Make sure FastAPI is running on ${BACKEND_URL}.\nError: ${error.message}`);
        elements.loadingView.classList.add('hidden');
    }
}

function renderResults(payload) {
    const { hotspot, alternatives, analysis } = payload;
    currentAlternatives = alternatives;
    currentHotspot = hotspot;

    // 1. Render Hotspot Column
    elements.hotspotName.textContent = hotspot.name;
    elements.hotspotDesc.textContent = hotspot.description;
    elements.hotspotCrowdPct.textContent = `${hotspot.crowd_index}%`;
    elements.hotspotLoadBar.style.width = `${hotspot.crowd_index}%`;
    
    // Update danger label text based on density
    elements.hotspotDangerLabel.textContent = hotspot.danger_level === 'Critical' ? 'CRITICALLY CONGESTED' : 'SEVERE OVERTOURISM';
    elements.resultsSearchInput.value = payload.query;

    // 2. Render AI Vibe Analysis
    elements.aiVibeText.innerHTML = `"${analysis.vibe_description}"`;
    elements.aiTraitsList.innerHTML = analysis.aesthetic_traits.map(trait => 
        `<span class="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">${escapeHTML(trait)}</span>`
    ).join('');
    
    elements.aiEngineStatus.textContent = analysis.is_mock 
        ? 'Local Heuristic Analysis Engine Active' 
        : 'Gemini AI Structured Schema Enforced';

    // 3. Render Alternatives Card List
    elements.alternativesContainer.innerHTML = alternatives.map((alt, index) => `
        <div class="group glass-panel hover:border-emerald-500/40 hover:bg-emerald-500/5 transition duration-300 p-5 rounded-2xl glow-green cursor-pointer space-y-3" data-index="${index}">
            <div class="flex items-start justify-between">
                <div>
                    <div class="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase mb-1">
                        ${alt.similarity}% Vibe Match
                    </div>
                    <h4 class="font-outfit font-bold text-lg text-white group-hover:text-emerald-300 transition">${escapeHTML(alt.name)}</h4>
                </div>
                <div class="text-right">
                    <span class="block text-emerald-400 font-extrabold text-lg">${alt.crowd_index}%</span>
                    <span class="block text-[10px] text-gray-500 uppercase font-semibold">Crowd Index</span>
                </div>
            </div>
            <p class="text-gray-400 text-xs leading-relaxed line-clamp-2">
                ${escapeHTML(alt.description)}
            </p>
            
            <div class="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                <div class="flex items-center space-x-1.5 text-[10px] text-gray-300 bg-white/5 border border-white/5 px-2 py-1 rounded-lg truncate flex-1">
                    <span class="font-bold text-emerald-400 uppercase shrink-0">Vibe:</span>
                    <span class="truncate">${escapeHTML(alt.highlight)}</span>
                </div>
                
                <!-- Eco Pass Check-in trigger -->
                <button 
                    class="eco-checkin-btn px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-darkBg rounded-lg text-[10px] font-bold transition flex items-center gap-1 whitespace-nowrap"
                    data-dest="${escapeHTML(alt.name)}"
                >
                    <i class="fa-solid fa-location-crosshairs"></i>
                    <span>Check-in</span>
                </button>
            </div>
        </div>
    `).join('');

    // Attach card event listeners
    const cards = elements.alternativesContainer.querySelectorAll('[data-index]');
    cards.forEach(card => {
        // Prevent click events in card if button is clicked
        card.addEventListener('click', (e) => {
            if (e.target.closest('.eco-checkin-btn')) return;
            
            const index = card.getAttribute('data-index');
            const targetAlt = currentAlternatives[index];
            if (targetAlt && mapInstance) {
                mapInstance.flyTo({
                    center: targetAlt.coordinates,
                    zoom: 11,
                    essential: true,
                    duration: 2000
                });
                
                // Track redirection metrics for B2B Dashboard
                fetch(`${BACKEND_URL}/api/analytics/log-redirection`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ alternative: targetAlt.name })
                }).catch(err => console.error("Analytics log error:", err));

                mapMarkers.forEach(m => {
                    const markerLngLat = m.getLngLat();
                    if (Math.abs(markerLngLat.lng - targetAlt.coordinates[0]) < 0.0001 &&
                        Math.abs(markerLngLat.lat - targetAlt.coordinates[1]) < 0.0001) {
                        m.togglePopup();
                    }
                });
            }
        });
    });

    // Attach Eco-Pass check-in buttons event listeners
    const checkinBtns = elements.alternativesContainer.querySelectorAll('.eco-checkin-btn');
    checkinBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const destinationName = btn.getAttribute('data-dest');
            triggerEcoPassCheckin(destinationName);
        });
    });

    // 4. Load Field Reports feed list
    fetchAndRenderReports(hotspot.name);

    // 5. Reveal Results screen
    elements.landingView.classList.add('hidden');
    elements.loadingView.classList.add('hidden');
    elements.resultsView.classList.remove('hidden');

    // 6. Initialize Map
    initializeMapAndPins(hotspot, alternatives);
}

function initializeMapAndPins(hotspot, alternatives) {
    try {
        mapboxgl.accessToken = mapboxToken;

        mapMarkers.forEach(marker => marker.remove());
        mapMarkers = [];

        if (!mapInstance) {
            mapInstance = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/dark-v11',
                center: hotspot.coordinates,
                zoom: 8,
                attributionControl: false
            });
            mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
        }

        // Add Hotspot Marker
        const hotspotEl = document.createElement('div');
        hotspotEl.className = 'w-7 h-7 rounded-full bg-rose-500 border-4 border-white flex items-center justify-center shadow-lg text-white text-[10px] font-bold cursor-pointer pulse-danger';
        hotspotEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
        
        const hotspotPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="space-y-1 text-xs">
                <div class="font-bold text-rose-400 uppercase tracking-widest text-[9px]">Congested Hotspot</div>
                <h4 class="font-bold text-white text-sm">${escapeHTML(hotspot.name)}</h4>
                <div class="flex items-center space-x-1.5 text-rose-400 font-extrabold mt-1">
                    <i class="fa-solid fa-people-group"></i>
                    <span>Crowd Index: ${hotspot.crowd_index}%</span>
                </div>
            </div>
        `);

        const hotspotMarker = new mapboxgl.Marker({ element: hotspotEl })
            .setLngLat(hotspot.coordinates)
            .setPopup(hotspotPopup)
            .addTo(mapInstance);
            
        mapMarkers.push(hotspotMarker);

        // Add Alternative Markers
        alternatives.forEach(alt => {
            const altEl = document.createElement('div');
            altEl.className = 'w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg text-white text-[10px] font-bold cursor-pointer hover:scale-125 transition-transform duration-300';
            altEl.innerHTML = `<i class="fa-solid fa-leaf"></i>`;

            const altPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="space-y-1 text-xs">
                    <div class="font-bold text-emerald-400 uppercase tracking-widest text-[9px]">${alt.similarity}% Vibe Match</div>
                    <h4 class="font-bold text-white text-sm">${escapeHTML(alt.name)}</h4>
                    <div class="flex items-center space-x-1.5 text-emerald-400 font-extrabold mt-1">
                        <i class="fa-solid fa-users-slash"></i>
                        <span>Crowd: ${alt.crowd_index}%</span>
                    </div>
                </div>
            `);

            const altMarker = new mapboxgl.Marker({ element: altEl })
                .setLngLat(alt.coordinates)
                .setPopup(altPopup)
                .addTo(mapInstance);
                
            mapMarkers.push(altMarker);
        });

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(hotspot.coordinates);
        alternatives.forEach(alt => bounds.extend(alt.coordinates));
        
        mapInstance.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 60, right: 60 },
            maxZoom: 11,
            duration: 1800
        });

    } catch (e) {
        console.error("Mapbox Rendering Error:", e);
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-4">
                <i class="fa-solid fa-circle-exclamation text-rose-400 text-3xl"></i>
                <h4 class="font-bold text-white">Map Initialization Error</h4>
                <p class="text-xs text-gray-500 max-w-sm">Mapbox GL JS failed to load. Please configure a valid Access Token.</p>
                <button id="fallback-settings-btn" class="px-4 py-2 bg-emerald-500 text-darkBg text-xs font-bold rounded-lg hover:bg-emerald-400 transition">
                    Configure Mapbox Token
                </button>
            </div>
        `;
        document.getElementById('fallback-settings-btn').addEventListener('click', () => {
            elements.settingsModal.classList.remove('hidden');
        });
    }
}

function initializeMap(lng, lat) {
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }
    try {
        mapboxgl.accessToken = mapboxToken;
        mapInstance = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [lng, lat],
            zoom: 8,
            attributionControl: false
        });
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
        showToast('Map engine re-initialized!');
    } catch (e) {
        console.error(e);
    }
}

// ================= GEOLOCATION ECO-PASS CHECKIN =================

function triggerEcoPassCheckin(destinationName) {
    showToast(`Requesting browser GPS check-in at ${destinationName}...`);
    
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await sendVerificationPayload(destinationName, latitude, longitude);
        },
        async (error) => {
            console.warn("GPS access denied or timed out. Initiating simulated check-in for testing...");
            // Because users are usually testing on localhost, we offer coordinate simulation
            const acceptSimulation = confirm(
                `GPS failed/denied: ${error.message}.\n` +
                `Would you like to simulate being physically located at ${destinationName} to test the Eco-Pass QR voucher generation?`
            );
            
            if (acceptSimulation) {
                // Find target coordinates
                let testLat = 25.3488; // default Orchha
                let testLng = 78.6436;
                
                if (destinationName.includes("Jibhi")) {
                    testLat = 31.6372;
                    testLng = 77.3489;
                } else if (destinationName.includes("Landour")) {
                    testLat = 30.4578;
                    testLng = 78.0934;
                } else if (destinationName.includes("Gokarna")) {
                    testLat = 14.5479;
                    testLng = 74.3188;
                } else if (destinationName.includes("Tarkarli")) {
                    testLat = 16.0601;
                    testLng = 73.4913;
                } else if (destinationName.includes("Mandu")) {
                    testLat = 22.3552;
                    testLng = 75.2618;
                }
                
                await sendVerificationPayload(destinationName, testLat, testLng);
            }
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
}

async function sendVerificationPayload(destinationName, lat, lng) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/eco-pass/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destination_name: destinationName,
                latitude: lat,
                longitude: lng
            })
        });

        const data = await response.json();
        if (data.verified) {
            // Render QR Pass modal
            elements.ecopassRewardName.textContent = data.reward.toUpperCase();
            elements.ecopassDestName.textContent = `Verified at ${destinationName}`;
            elements.ecopassCode.textContent = data.voucher_code;
            elements.ecopassCodeLabel.textContent = data.voucher_code;
            
            elements.ecopassModal.classList.remove('hidden');
            showToast("Eco-Pass geofence check-in successful!");
        } else {
            alert(`Check-in verification failed:\n${data.message}`);
        }
    } catch (e) {
        console.error(e);
        alert(`Error communicating with check-in endpoint: ${e.message}`);
    }
}

// ================= ITINERARY ROUTE BUILDER =================

function renderItineraryItems() {
    elements.itineraryListContainer.innerHTML = itineraryData.map((item, index) => `
        <div class="flex items-center space-x-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition">
            <div class="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400 font-bold">
                D${item.day}
            </div>
            <div class="flex-1">
                <input 
                    type="text" 
                    class="itinerary-dest-input bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-xs text-white font-medium w-full py-0.5" 
                    value="${escapeHTML(item.destination)}"
                    data-index="${index}"
                >
            </div>
            <button 
                class="remove-day-btn text-gray-500 hover:text-rose-400 transition text-xs px-2 py-1"
                data-index="${index}"
            >
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');

    // Attach change handlers to inputs
    elements.itineraryListContainer.querySelectorAll('.itinerary-dest-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = e.target.getAttribute('data-index');
            itineraryData[index].destination = e.target.value;
        });
    });

    // Attach delete buttons
    elements.itineraryListContainer.querySelectorAll('.remove-day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'));
            itineraryData.splice(index, 1);
            // Re-index days
            itineraryData.forEach((item, idx) => item.day = idx + 1);
            renderItineraryItems();
        });
    });
}

async function runItineraryOptimization() {
    if (itineraryData.length === 0) {
        showToast("Please add days to the itinerary first!");
        return;
    }
    
    showToast("Evaluating routing footprint and balancing nodes...");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/itinerary/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: itineraryData })
        });
        
        const data = await response.json();
        
        if (data.balanced) {
            itineraryData = data.days;
            renderItineraryItems();
            alert(`Itinerary Balanced! Details:\n${data.details}`);
            showToast("Trip balanced. Alternatives routed!");
        } else {
            alert(`Itinerary check complete: ${data.details}`);
        }
    } catch (e) {
        console.error(e);
        alert(`Failed to contact optimizer: ${e.message}`);
    }
}

// ================= USER VIBE REPORTS =================

async function fetchAndRenderReports(destinationName) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/vibe/list?destination=${encodeURIComponent(destinationName)}`);
        const reports = await response.json();
        
        if (reports.length === 0) {
            elements.reportsFeedContainer.innerHTML = `
                <div class="text-center py-4 bg-white/5 border border-white/5 rounded-xl text-gray-500 text-xs">
                    <i class="fa-solid fa-sheet-plastic block text-lg mb-1.5"></i>
                    No field reports logged yet for this alternative zone. Be the first to report!
                </div>
            `;
            return;
        }

        elements.reportsFeedContainer.innerHTML = reports.reverse().map(rep => `
            <div class="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-white">${escapeHTML(rep.destination)}</span>
                    <span class="px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                        rep.congestion_rating === 'Quiet' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : (rep.congestion_rating === 'Moderate' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')
                    }">
                        ${rep.congestion_rating}
                    </span>
                </div>
                <p class="text-gray-300 font-light leading-relaxed">${escapeHTML(rep.report_text)}</p>
                ${rep.image_data ? `
                    <div class="mt-2 rounded-lg overflow-hidden border border-white/5">
                        <img src="${rep.image_data}" alt="User raw upload" class="w-full h-auto object-cover max-h-36">
                        <div class="bg-slate-950/80 px-2 py-1 text-[9px] text-gray-500 font-mono flex items-center justify-between">
                            <span><i class="fa-solid fa-shield-halved text-emerald-400"></i> EXIF metadata stripped</span>
                            <span>RAW SNAPSHOT</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `).join('');

    } catch (e) {
        console.error("Vibe list fetch failure:", e);
    }
}

async function handleReportSubmission(e) {
    e.preventDefault();
    const destination = elements.reportDestSelect.value;
    
    // Find selected radio
    const checkedRadio = elements.reportForm.querySelector('input[name="congestion_rating"]:checked');
    const rating = checkedRadio ? checkedRadio.value : "Quiet";
    
    const reportText = elements.reportTextInput.value.trim();
    const file = elements.reportImageInput.files[0];
    
    let base64Image = null;
    
    if (file) {
        showToast("Converting snapshot and stripping headers...");
        base64Image = await convertFileToBase64(file);
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/vibe/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destination: destination,
                report_text: reportText,
                congestion_rating: rating,
                image_data: base64Image
            })
        });

        const data = await response.json();
        
        if (data.success) {
            elements.reportModal.classList.add('hidden');
            elements.reportTextInput.value = '';
            elements.reportImageInput.value = '';
            showToast("Report submitted successfully. EXIF stripped!");
            // Re-render feed
            if (currentHotspot) {
                fetchAndRenderReports(currentHotspot.name);
            }
        }
    } catch (error) {
        console.error(error);
        alert(`Failed to submit report: ${error.message}`);
    }
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ================= B2B ANALYTICS PANEL & LOGIN =================

async function unlockB2BDashboard() {
    const key = elements.analyticsPasskey.value.trim();
    if (!key) {
        alert("Please enter a passcode key.");
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/analytics?token=${encodeURIComponent(key)}`);
        
        if (!response.ok) {
            throw new Error(`Unauthorized (code ${response.status})`);
        }

        const data = await response.json();
        
        // Render B2B dashboard stats
        elements.statRedirects.textContent = data.total_redirections;
        elements.statRate.textContent = `${data.redirection_rate}%`;
        elements.statClaims.textContent = `${data.eco_passes_verified} check-ins`;

        // Render Hotspots bar charts
        elements.analyticsHotspotsBars.innerHTML = Object.entries(data.hotspots).map(([hKey, count]) => {
            const maxVal = Math.max(...Object.values(data.hotspots), 1);
            const percentage = (count / maxVal) * 100;
            const label = hKey === 'tajmahal' ? 'Taj Mahal' : (hKey === 'manali' ? 'Manali' : (hKey === 'goa' ? 'Goa' : hKey));
            return `
                <div class="space-y-1 text-xs">
                    <div class="flex justify-between font-semibold text-gray-300">
                        <span>${label} search requests</span>
                        <span>${count}</span>
                    </div>
                    <div class="w-full bg-slate-900 rounded-full h-1.5">
                        <div class="bg-rose-500 h-1.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Render Alternatives bar charts
        elements.analyticsAlternativesBars.innerHTML = Object.entries(data.alternatives).map(([altName, count]) => {
            const maxVal = Math.max(...Object.values(data.alternatives), 1);
            const percentage = (count / maxVal) * 100;
            return `
                <div class="space-y-1 text-xs">
                    <div class="flex justify-between font-semibold text-gray-300">
                        <span>${escapeHTML(altName)}</span>
                        <span class="text-emerald-400 font-bold">${count} visits</span>
                    </div>
                    <div class="w-full bg-slate-900 rounded-full h-1.5">
                        <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Swap views inside analytics panel
        elements.analyticsAuth.classList.add('hidden');
        elements.analyticsDashboard.classList.remove('hidden');
        showToast("B2B Deflection Board unlocked successfully!");

    } catch (e) {
        console.error(e);
        alert(`B2B Authentication failed: ${e.message}\nEnsure the passcode is correct.`);
    }
}

// Simple HTML escaping helper
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
