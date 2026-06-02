// Upgraded frontend app script implementing SaaS Pro Features

// Default Mapbox public read-only token
const DEFAULT_MAPBOX_TOKEN = '';
let mapboxToken = localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN;

// Backend URL - reads from localStorage, environment, or defaults to localhost
let BACKEND_URL = localStorage.getItem('alt_travel_backend_url') ||
                  (typeof process !== 'undefined' && process.env.REACT_APP_BACKEND_URL) ||
                  (window.location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : 'https://alt-travel.onrender.com');

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
    toastMessage: document.getElementById('toast-message'),

    // Auth & Login
    authHeaderContainer: document.getElementById('auth-header-container'),
    toggleLogin: document.getElementById('toggle-login'),
    loginModal: document.getElementById('login-modal'),
    closeLogin: document.getElementById('close-login'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    userProfileMenu: document.getElementById('user-profile-menu'),
    menuUserName: document.getElementById('menu-user-name'),
    menuUserRole: document.getElementById('menu-user-role'),
    logoutBtn: document.getElementById('logout-btn'),

    // Smart Search
    landingAutosuggest: document.getElementById('landing-autosuggest'),
    resultsAutosuggest: document.getElementById('results-autosuggest'),
    recentSearchesContainer: document.getElementById('recent-searches-container'),
    recentSearchesList: document.getElementById('recent-searches-list')
};

// Auth State Global
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
// Recent Searches Global
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// Smart Search database
const SMART_SEARCH_DATABASE = [
    "Taj Mahal, Agra",
    "Manali, Himachal Pradesh",
    "Goa (North Beaches), India",
    "Santorini, Greece",
    "Venice, Italy",
    "Kuta, Bali",
    "Machu Picchu, Peru",
    "Eiffel Tower, Paris",
    "Times Square, New York",
    "Shibuya Crossing, Tokyo",
    "Great Wall at Badaling, China",
    "Petra, Jordan",
    "Angkor Wat, Cambodia",
    "Banff National Park, Canada",
    "Cinque Terre, Italy",
    "Bora Bora, French Polynesia",
    "Pyramids of Giza, Egypt",
    "Sagrada Familia, Barcelona",
    "Ha Long Bay, Vietnam",
    "Udaipur, Rajasthan",
    "Mysore Palace, Karnataka",
    "Orchha, Madhya Pradesh",
    "Mandu, Madhya Pradesh",
    "Jibhi, Himachal Pradesh",
    "Landour, Uttarakhand",
    "Gokarna, Karnataka",
    "Tarkarli, Maharashtra"
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    elements.mapboxTokenInput.value = mapboxToken === DEFAULT_MAPBOX_TOKEN ? '' : mapboxToken;
    updateAuthUI();
    renderRecentSearches();
});

function setupEventListeners() {
    // Form submits
    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = elements.destinationInput.value.trim();
        if (query) {
            searchQuery = query;
            handleSearch(query, currentHour);
            addRecentSearch(query);
        }
    });

    elements.resultsSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = elements.resultsSearchInput.value.trim();
            if (query) {
                searchQuery = query;
                handleSearch(query, currentHour);
                addRecentSearch(query);
            }
        }
    });

    // Login Modal controls
    elements.toggleLogin.addEventListener('click', () => {
        if (currentUser) {
            elements.userProfileMenu.classList.toggle('hidden');
        } else {
            elements.loginModal.classList.remove('hidden');
        }
    });

    elements.closeLogin.addEventListener('click', () => {
        elements.loginModal.classList.add('hidden');
    });

    // Handle login form submission
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value.trim();

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Authentication failed");
            }

            const data = await response.json();
            currentUser = {
                token: data.token,
                role: data.role,
                name: data.name
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast(`Welcome back, ${data.name}!`);
            elements.loginModal.classList.add('hidden');
            elements.loginEmail.value = '';
            elements.loginPassword.value = '';
            updateAuthUI();
            
            // Refresh results screen if active
            if (currentHotspot) {
                fetchAndRenderReports(currentHotspot.name);
            }
        } catch (error) {
            showCustomAlert(`Login Failed: ${error.message}`);
        }
    });

    // Logout trigger
    elements.logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        elements.userProfileMenu.classList.add('hidden');
        showToast("Logged out successfully.");
        updateAuthUI();
        if (currentHotspot) {
            fetchAndRenderReports(currentHotspot.name);
        }
    });

    // Dismiss profile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.userProfileMenu && !elements.userProfileMenu.classList.contains('hidden')) {
            if (!elements.authHeaderContainer.contains(e.target)) {
                elements.userProfileMenu.classList.add('hidden');
            }
        }
    });

    // Smart Search: Autosuggest events
    elements.destinationInput.addEventListener('input', (e) => {
        showSuggestions(e.target.value, elements.landingAutosuggest, elements.destinationInput);
    });

    elements.destinationInput.addEventListener('focus', (e) => {
        showSuggestions(e.target.value, elements.landingAutosuggest, elements.destinationInput);
    });

    elements.resultsSearchInput.addEventListener('input', (e) => {
        showSuggestions(e.target.value, elements.resultsAutosuggest, elements.resultsSearchInput);
    });

    elements.resultsSearchInput.addEventListener('focus', (e) => {
        showSuggestions(e.target.value, elements.resultsAutosuggest, elements.resultsSearchInput);
    });

    // Close autosuggest lists when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.destinationInput.contains(e.target) && !elements.landingAutosuggest.contains(e.target)) {
            elements.landingAutosuggest.classList.add('hidden');
        }
        if (!elements.resultsSearchInput.contains(e.target) && !elements.resultsAutosuggest.contains(e.target)) {
            elements.resultsAutosuggest.classList.add('hidden');
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
        if (currentUser && currentUser.role === 'Admin') {
            unlockB2BDashboardWithToken(currentUser.token);
        } else {
            // Show passcode entry as guest backup
            elements.analyticsPanel.classList.remove('translate-x-full');
        }
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
        if (!currentUser) {
            showCustomAlert("Please Sign In as a Traveler to submit a field report.");
            elements.loginModal.classList.remove('hidden');
            return;
        }
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
    // Remove exit classes and add bounce-in
    elements.toast.classList.remove('translate-y-20', 'opacity-0');
    elements.toast.classList.add('translate-y-0', 'opacity-100');
    // Apply bounceIn animation
    elements.toast.style.animation = 'none';
    requestAnimationFrame(() => {
        elements.toast.style.animation = 'bounceIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both';
    });
    
    setTimeout(() => {
        elements.toast.classList.remove('translate-y-0', 'opacity-100');
        elements.toast.classList.add('translate-y-20', 'opacity-0');
        elements.toast.style.animation = '';
    }, 3200);
}

function showLanding() {
    elements.resultsView.classList.add('hidden');
    elements.landingView.classList.remove('hidden');
    elements.destinationInput.value = '';
    elements.resultsSearchInput.value = '';
    searchQuery = '';
    // Re-trigger entrance animations on landing elements
    const animEls = elements.landingView.querySelectorAll('.anim-fade-in-up');
    animEls.forEach(el => {
        el.style.animation = 'none';
        requestAnimationFrame(() => { el.style.animation = ''; });
    });
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
            showCustomAlert('Failure: Swapping failed to compile suggestions.');
            elements.loadingView.classList.add('hidden');
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        showCustomAlert(`Failed to speak to the backend server. Make sure FastAPI is running on ${BACKEND_URL}.\nError: ${error.message}`);
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

    // 3. Render Alternatives Card List with stagger animations
    elements.alternativesContainer.innerHTML = alternatives.map((alt, index) => {
        const delayClass = `delay-${Math.min(index, 5)}`;
        return `
        <div class="anim-fade-in-up ${delayClass} hover-lift group glass-panel border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 glow-green p-5 rounded-2xl cursor-pointer space-y-3" data-index="${index}">
            <div class="flex items-start justify-between">
                <div>
                    <div class="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase mb-1">
                        ${alt.similarity}% Vibe Match
                    </div>
                    <h4 class="font-outfit font-bold text-lg text-white group-hover:text-emerald-300 transition">${escapeHTML(alt.name)}</h4>
                </div>
                <div class="text-right">
                    <span class="block text-emerald-400 font-extrabold text-lg alt-crowd-pct" data-target="${alt.crowd_index}">0%</span>
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
                    class="btn-ripple eco-checkin-btn px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-darkBg rounded-lg text-[10px] font-bold transition flex items-center gap-1 whitespace-nowrap"
                    data-dest="${escapeHTML(alt.name)}"
                >
                    <i class="fa-solid fa-location-crosshairs"></i>
                    <span>Check-in</span>
                </button>
            </div>
        </div>`;
    }).join('');

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

    // 5. Reveal Results screen with slide-left effect on left panel
    elements.landingView.classList.add('hidden');
    elements.loadingView.classList.add('hidden');
    elements.resultsView.classList.remove('hidden');
    // Apply slide-in animation to the left panel
    const leftPanel = elements.resultsView.querySelector('.md\\:w-\\[35\\%\\]');
    if (leftPanel) {
        leftPanel.classList.remove('anim-slide-left');
        requestAnimationFrame(() => leftPanel.classList.add('anim-slide-left'));
    }

    // 6. Initialize Map
    initializeMapAndPins(hotspot, alternatives);

    // 7. Animate crowd percentage bar and counter
    setTimeout(() => {
        // Animate the hotspot crowd bar
        elements.hotspotLoadBar.classList.remove('progress-animated');
        requestAnimationFrame(() => elements.hotspotLoadBar.classList.add('progress-animated'));
        // Animate hotspot crowd counter up from 0
        animateCounter(elements.hotspotCrowdPct, hotspot.crowd_index, '%');
        // Animate alternative crowd counters
        elements.alternativesContainer.querySelectorAll('.alt-crowd-pct').forEach(el => {
            const target = parseInt(el.getAttribute('data-target'), 10);
            animateCounter(el, target, '%');
        });
    }, 120);

    // Smart Search: If direct alternative match is found, automatically fly to it and open popup
    if (payload.analysis && payload.analysis.direct_alternative_match) {
        const matchedAlt = alternatives.find(a => a.name.toLowerCase().trim() === payload.analysis.direct_alternative_match.toLowerCase().trim());
        if (matchedAlt && mapInstance) {
            setTimeout(() => {
                mapInstance.flyTo({
                    center: matchedAlt.coordinates,
                    zoom: 11,
                    essential: true,
                    duration: 2000
                });
                
                // Track redirection metrics
                fetch(`${BACKEND_URL}/api/analytics/log-redirection`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ alternative: matchedAlt.name })
                }).catch(err => console.error("Analytics log error:", err));

                mapMarkers.forEach(m => {
                    const markerLngLat = m.getLngLat();
                    if (Math.abs(markerLngLat.lng - matchedAlt.coordinates[0]) < 0.0001 &&
                        Math.abs(markerLngLat.lat - matchedAlt.coordinates[1]) < 0.0001) {
                        m.togglePopup();
                    }
                });
                
                showToast(`Focused on alternative: ${matchedAlt.name}`);
            }, 1000);
        }
    }
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
        showCustomAlert("Geolocation is not supported by your browser.");
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
            showCustomAlert(`Check-in verification failed:\n${data.message}`);
        }
    } catch (e) {
        console.error(e);
        showCustomAlert(`Error communicating with check-in endpoint: ${e.message}`);
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
            showCustomAlert(`Itinerary Balanced! Details:\n${data.details}`);
            showToast("Trip balanced. Alternatives routed!");
        } else {
            showCustomAlert(`Itinerary check complete: ${data.details}`);
        }
    } catch (e) {
        console.error(e);
        showCustomAlert(`Failed to contact optimizer: ${e.message}`);
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
                    <div class="flex items-center space-x-1.5 font-bold">
                        <span class="px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                            rep.congestion_rating === 'Quiet' 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                : (rep.congestion_rating === 'Moderate' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')
                        }">
                            ${rep.congestion_rating}
                        </span>
                        ${currentUser && currentUser.role === 'Admin' ? `
                            <button 
                                class="moderate-delete-btn text-rose-400 hover:text-rose-300 transition text-[10px] p-1 font-extrabold"
                                data-id="${rep.id}"
                                title="Delete Vibe Report"
                            >
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
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

        // Attach click handlers to delete buttons for Admin moderation
        const deleteBtns = elements.reportsFeedContainer.querySelectorAll('.moderate-delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reportId = btn.getAttribute('data-id');
                if (confirm(`Admin Moderation: Delete report #${reportId}?`)) {
                    await deleteVibeReport(reportId);
                }
            });
        });

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
        showCustomAlert(`Failed to submit report: ${error.message}`);
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
        showCustomAlert("Please enter a passcode key.");
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
                        <div class="bar-grow bg-emerald-500 h-1.5 rounded-full" style="width: ${percentage}%"></div>
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
        showCustomAlert(`B2B Authentication failed: ${e.message}\nEnsure the passcode is correct.`);
    }
}

// Auth UI State Renderer
function updateAuthUI() {
    if (currentUser) {
        elements.toggleLogin.innerHTML = `
            <i class="fa-solid fa-circle-user"></i>
            <span>Profile</span>
        `;
        elements.menuUserName.textContent = currentUser.name;
        elements.menuUserRole.textContent = currentUser.role;
    } else {
        elements.toggleLogin.innerHTML = `
            <i class="fa-solid fa-right-to-bracket"></i>
            <span>Sign In</span>
        `;
    }
}

// B2B Dashboard Unlock using user session token directly
async function unlockB2BDashboardWithToken(token) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/analytics?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
            throw new Error(`Unauthorized (code ${response.status})`);
        }

        const data = await response.json();
        
        // Render stats
        elements.statRedirects.textContent = data.total_redirections;
        elements.statRate.textContent = `${data.redirection_rate}%`;
        elements.statClaims.textContent = `${data.eco_passes_verified} check-ins`;

        // Render Hotspots chart
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
                        <div class="bar-grow bg-rose-500 h-1.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Render Alternatives chart
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

        elements.analyticsAuth.classList.add('hidden');
        elements.analyticsDashboard.classList.remove('hidden');
        elements.analyticsPanel.classList.remove('translate-x-full');
        showToast("B2B Deflection Board opened successfully!");

    } catch (e) {
        console.error(e);
        // Fallback to passcode auth screen
        elements.analyticsDashboard.classList.add('hidden');
        elements.analyticsAuth.classList.remove('hidden');
        elements.analyticsPanel.classList.remove('translate-x-full');
    }
}

// Moderate Delete API Call
async function deleteVibeReport(reportId) {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/vibe/moderate/${reportId}?token=${currentUser.token}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Moderation delete failed");
        }

        showToast("Field Report deleted by Admin.");
        if (currentHotspot) {
            fetchAndRenderReports(currentHotspot.name);
        }
    } catch (error) {
        showCustomAlert(`Moderation Error: ${error.message}`);
    }
}

// Smart Search: Autosuggest rendering
function showSuggestions(val, suggestBox, inputEl) {
    const cleanVal = val.trim().toLowerCase();
    if (!cleanVal) {
        suggestBox.classList.add('hidden');
        return;
    }

    const matches = SMART_SEARCH_DATABASE.filter(place => 
        place.toLowerCase().includes(cleanVal)
    );

    if (matches.length === 0) {
        suggestBox.classList.add('hidden');
        return;
    }

    suggestBox.innerHTML = matches.map(place => `
        <button class="w-full text-left px-2.5 py-1.5 rounded-lg text-white hover:bg-emerald-500/10 hover:text-emerald-300 transition truncate border border-transparent hover:border-emerald-500/20 font-medium">
            <i class="fa-solid fa-location-dot text-emerald-400 mr-1.5"></i>${escapeHTML(place)}
        </button>
    `).join('');

    suggestBox.classList.remove('hidden');

    // Attach click triggers to suggestions
    const btns = suggestBox.querySelectorAll('button');
    btns.forEach((btn, idx) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selected = matches[idx];
            inputEl.value = selected;
            suggestBox.classList.add('hidden');
            searchQuery = selected;
            handleSearch(selected, currentHour);
            addRecentSearch(selected);
        });
    });
}

// Smart Search: Recent searches logic
function addRecentSearch(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    // Remove duplicates
    recentSearches = recentSearches.filter(q => q.toLowerCase() !== cleanQuery.toLowerCase());
    recentSearches.unshift(cleanQuery);
    
    // Limit to 4 items
    recentSearches = recentSearches.slice(0, 4);
    
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    renderRecentSearches();
}

function renderRecentSearches() {
    if (recentSearches.length === 0) {
        elements.recentSearchesContainer.classList.add('hidden');
        return;
    }

    elements.recentSearchesList.innerHTML = recentSearches.map(q => `
        <button class="recent-search-pill px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-300 transition text-[10px] font-semibold flex items-center gap-1 shrink-0 max-w-[120px] truncate">
            <span class="truncate">${escapeHTML(q)}</span>
        </button>
    `).join('');

    elements.recentSearchesContainer.classList.remove('hidden');

    // Attach click events
    const pills = elements.recentSearchesList.querySelectorAll('.recent-search-pill');
    pills.forEach((pill, idx) => {
        pill.addEventListener('click', () => {
            const q = recentSearches[idx];
            elements.destinationInput.value = q;
            searchQuery = q;
            handleSearch(q, currentHour);
            addRecentSearch(q);
        });
    });
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

/**
 * Animate a numeric counter from 0 to the target value.
 * @param {HTMLElement} el - Element whose textContent will be updated
 * @param {number} target  - Final numeric value
 * @param {string} suffix  - Suffix appended to number (e.g. '%')
 * @param {number} duration - Duration in ms (default 900)
 */
function animateCounter(el, target, suffix = '', duration = 900) {
    if (!el || isNaN(target)) return;
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
        el.textContent = `${target}${suffix}`;
        return;
    }
    const start = performance.now();
    const from = 0;
    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (target - from) * eased);
        el.textContent = `${current}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}


// ================= CUSTOM ALERT MODAL =================
function showCustomAlert(message, title = 'Notification') {
    const alertModal = document.getElementById('custom-alert-modal');
    const alertBox = document.getElementById('custom-alert-box');
    const titleEl = document.getElementById('custom-alert-title');
    const msgEl = document.getElementById('custom-alert-message');
    const closeBtn = document.getElementById('custom-alert-close');
    
    if (!alertModal) return; // Fallback if HTML not injected
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    // Show modal
    alertModal.classList.remove('hidden');
    // Trigger transition
    requestAnimationFrame(() => {
        alertModal.classList.remove('opacity-0');
        alertModal.classList.add('opacity-100');
        alertBox.classList.remove('scale-95');
        alertBox.classList.add('scale-100');
    });
    
    // Close handler
    const closeHandler = () => {
        alertModal.classList.remove('opacity-100');
        alertModal.classList.add('opacity-0');
        alertBox.classList.remove('scale-100');
        alertBox.classList.add('scale-95');
        
        setTimeout(() => {
            alertModal.classList.add('hidden');
        }, 300); // Wait for transition
        
        closeBtn.removeEventListener('click', closeHandler);
    };
    
    closeBtn.addEventListener('click', closeHandler);
}
