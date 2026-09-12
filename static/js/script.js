const OWM_API_KEY = "YOUR_OPENWEATHER_API_KEY"; // Keep your key here

// ==========================================
// 1. MARKDOWN PARSER
// ==========================================
function parseMarkdown(rawText) {
    if (!rawText) return '';
    let html = rawText.replace(/\r/g, '');

    html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="chat-divider">');
    html = html.replace(/^#### (.*$)/gm, '<div class="chat-heading-4">$1</div>');
    html = html.replace(/^### (.*$)/gm, '<div class="chat-heading-3">$1</div>');
    html = html.replace(/^## (.*$)/gm, '<div class="chat-heading-2">$1</div>');
    html = html.replace(/^# (.*$)/gm, '<div class="chat-heading-2">$1</div>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gm, '<div class="chat-bullet"><span class="bullet-dot">•</span><span>$1</span></div>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gm, '<div class="chat-bullet"><span class="bullet-num">$1.</span><span>$2</span></div>');
    html = html.replace(/\n\n+/g, '<div class="chat-gap"></div>');
    html = html.replace(/\n/g, '<br>');

    return html;
}

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 2. HERO WIDGET
    // ==========================================
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');
    const resultDiv = document.getElementById('weather-result');

    if (searchBtn && cityInput && resultDiv) {
        searchBtn.addEventListener('click', async () => {
            const city = cityInput.value.trim();
            if (!city) return;
            resultDiv.innerHTML = "Gathering insights...";
            try {
                const formData = new FormData();
                formData.append('city', city);
                const res = await fetch('/get_weather', { method: 'POST', body: formData });
                const data = await res.json();
                if (res.ok) {
                    resultDiv.innerHTML = `<p><strong>${data.city}, ${data.country}</strong></p><p>🌡️ Temp: ${data.temperature}°C</p><p>☁️ Weather: ${data.description}</p><p>💧 Humidity: ${data.humidity}% | 💨 Wind: ${data.wind_speed} m/s</p>`;
                } else {
                    resultDiv.innerHTML = `<span style='color:red;'>${data.error}</span>`;
                }
            } catch (err) {
                resultDiv.innerHTML = "<span style='color:red;'>Server connection failed.</span>";
            }
        });
    }

    // ==========================================
    // 3. PERSISTENT MULTI-SESSION AI CHAT
    // ==========================================
    const aiBtn = document.getElementById('ai-modal-btn');
    const chatModal = document.getElementById('chat-modal');
    const closeChat = document.getElementById('close-chat');
    const sendChat = document.getElementById('send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const chatTitle = document.getElementById('chat-modal-title');

    const chatStores = {
        'general': [], 'srv-trip': [], 'srv-agri': [], 'srv-event': [], 'srv-aero': [], 'srv-disaster': []
    };

    const apiHistory = {
        'general': [], 'srv-trip': [], 'srv-agri': [], 'srv-event': [], 'srv-aero': [], 'srv-disaster': []
    };

    const serviceTitles = {
        'general': 'AtmosVision Assistant',
        'srv-trip': '🚗 AI Trip & Route Optimizer',
        'srv-agri': '🌾 Agri-Weather Intelligence',
        'srv-event': '🎪 Event Risk Management',
        'srv-aero': '✈️ Aviation & Marine Advisor',
        'srv-disaster': '🚨 AI Disaster & Hazard Alert'
    };

    const serviceGreetings = {
        'general': "Hello! I am AtmosVision. Ask me about weather conditions, temperatures, or atmospheric forecasts for any city.",
        'srv-trip': "Hello! Welcome to **AI Trip & Route Optimizer**.\n\nPlease share your **starting location**, **destination**, and **travel dates**. I will evaluate road hazards and the safest transit corridors.",
        'srv-agri': "Hello! Welcome to **Agri-Weather Intelligence**.\n\nPlease provide your **crop name**, and **farming location**. I will provide a date-sorted agricultural forecast covering soil moisture and pest alerts.",
        'srv-event': "Hello! Welcome to **Event Risk Management**.\n\nTell me about your **outdoor event, venue location, and scheduled date**. I will assess rain probabilities and wind gust risks.",
        'srv-aero': "Hello! Welcome to **Aviation & Marine Advisor**.\n\nPlease provide your **departure point, destination, and flight/cruise level**. I will analyze cloud ceilings, visibility, and wind shear.",
        'srv-disaster': "Hello! Welcome to **Disaster & Hazard Alerts**.\n\nPlease share your **current location** or region. I will scan for impending natural disasters, extreme weather warnings, and critical safety guidelines."
    };

    const servicePlaceholders = {
        'general': 'Ask about the weather...',
        'srv-trip': 'Enter start, destination & travel date...',
        'srv-agri': 'Enter crop name, location, or farm details...',
        'srv-event': 'Enter event type, venue location & date...',
        'srv-aero': 'Enter departure, destination & route...',
        'srv-disaster': 'Enter your city or region for hazard alerts...'
    };

    let activeService = 'general';

    // GLOBAL LOCATION VARIABLES
    let userLat = 0;
    let userLon = 0;
    let locationVerified = false; 

    function renderCurrentSession() {
        if (!chatHistory) return;
        chatHistory.innerHTML = '';
        chatStores[activeService].forEach(msg => {
            chatHistory.innerHTML += `<div class="chat-message ${msg.sender}-msg">${msg.html}</div>`;
        });
        chatHistory.scrollTop = chatHistory.scrollHeight;

        if (chatTitle) chatTitle.innerText = serviceTitles[activeService] || 'AtmosVision AI';
        if (chatInput) {
            chatInput.value = '';
            chatInput.placeholder = servicePlaceholders[activeService] || 'Ask about the weather...';
        }
    }

    function openChatModal(serviceKey = 'general') {
        activeService = serviceKey;
        if (chatStores[activeService].length === 0 && serviceGreetings[activeService]) {
            chatStores[activeService].push({ sender: 'ai', html: parseMarkdown(serviceGreetings[activeService]) });
        }
        renderCurrentSession();
        if (chatModal) chatModal.style.display = 'flex';
        if (chatInput) chatInput.focus();
    }

    if (aiBtn) aiBtn.addEventListener('click', () => openChatModal('general'));
    if (closeChat && chatModal) closeChat.addEventListener('click', () => { chatModal.style.display = 'none'; });

    async function sendMessage() {
        if (!chatInput || !chatHistory || !chatInput.value.trim()) return;
        const rawMessage = chatInput.value.trim();

        chatStores[activeService].push({ sender: 'user', html: rawMessage });
        chatHistory.innerHTML += `<div class="chat-message user-msg">${rawMessage}</div>`;
        chatInput.value = '';
        chatHistory.scrollTop = chatHistory.scrollHeight;

        const loadingId = 'loading-' + Date.now();
        chatHistory.innerHTML += `<div id="${loadingId}" class="chat-message ai-msg">Consulting ${serviceTitles[activeService]}...</div>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: rawMessage, 
                    service: activeService,
                    history: apiHistory[activeService] // Sends past messages to backend
                })
            });
            const data = await response.json();
            document.getElementById(loadingId)?.remove();

            // Saves this specific interaction so the AI remembers it next time
            apiHistory[activeService].push({ role: 'user', content: rawMessage });
            apiHistory[activeService].push({ role: 'assistant', content: data.reply });

            const formattedHTML = parseMarkdown(data.reply);
            chatStores[activeService].push({ sender: 'ai', html: formattedHTML });
            chatHistory.innerHTML += `<div class="chat-message ai-msg">${formattedHTML}</div>`;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } catch (error) {
            document.getElementById(loadingId).innerText = "Error connecting to AI service.";
        }
    }

    if (sendChat && chatInput) {
        sendChat.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }

    // ==========================================
    // 4. SERVICE TILE CLICK HANDLERS
    // ==========================================
    // Auto-prompts removed. Just opens the modal cleanly.
    // Service Cards Click
    ['srv-trip', 'srv-agri', 'srv-event', 'srv-aero', 'srv-disaster'].forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            card.addEventListener('click', () => {
                openChatModal(id);
            });
        }
    });
    // ==========================================
    // 5. MAP & HIGH-ACCURACY GEOLOCATION
    // ==========================================
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const mapElement = document.getElementById('interactive-map');
    let map = null;
    let markersLayer = null;

    if (mapElement) {
        const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' });
        const darkMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });
        const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });

        map = L.map('interactive-map', { center: [20, 0], zoom: 2, layers: [streetMap] });
        L.control.layers({ "Streets": streetMap, "Dark Mode": darkMap, "Satellite": satelliteMap }, null, { position: 'bottomright' }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);

        setTimeout(() => { map.invalidateSize(); }, 500);

        const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLat = position.coords.latitude;
                    userLon = position.coords.longitude;
                    locationVerified = true; 
                    
                    map.flyTo([userLat, userLon], 12, { duration: 3 });
                    markersLayer.clearLayers();
                    L.marker([userLat, userLon]).addTo(markersLayer).bindPopup("<b>Your Current Location</b>").openPopup();
                },
                (error) => { 
                    console.log("User denied location or it is unavailable. Keeping global view."); 
                },
                geoOptions
            );
        }

        const rainRadar = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`, { opacity: 0.6 });
        let radarActive = false;

        document.getElementById('btn-radar')?.addEventListener('click', function () {
            if (radarActive) { map.removeLayer(rainRadar); this.classList.remove('radar-active'); radarActive = false; }
            else { map.addLayer(rainRadar); this.classList.add('radar-active'); radarActive = true; }
        });

        document.getElementById('btn-locate')?.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        userLat = position.coords.latitude;
                        userLon = position.coords.longitude;
                        locationVerified = true;
                        map.flyTo([userLat, userLon], 14, { duration: 1.5 });
                        markersLayer.clearLayers();
                        L.marker([userLat, userLon]).addTo(markersLayer).bindPopup("<b>Your Exact Location</b>").openPopup();
                    },
                    (error) => { alert("Cannot access location. Please ensure location permissions are allowed in your browser."); },
                    geoOptions
                );
            }
        });

        map.on('click', (e) => {
            const lat = e.latlng.lat.toFixed(4);
            const lon = e.latlng.lng.toFixed(4);
            markersLayer.clearLayers();
            L.marker([lat, lon]).addTo(markersLayer).bindPopup("Analyzing coordinates...").openPopup();
            const mapChatInput = document.getElementById('map-chat-input');
            if (mapChatInput) {
                mapChatInput.value = `What is the weather at Latitude ${lat}, Longitude ${lon}?`;
                sendMapMessage();
            }
        });
    }

    // ==========================================
    // 6. MAP INTELLIGENCE AGENT
    // ==========================================
    const weatherIcons = { sunny: '☀️', rainy: '🌧️', cloudy: '☁️', snowy: '❄️', windy: '💨', thunderstorm: '⛈️', default: '🌍' };
    const mapChatInput = document.getElementById('map-chat-input');
    const mapSendBtn = document.getElementById('map-send-btn');
    const mapChatHistory = document.getElementById('map-chat-history');

    async function sendMapMessage() {
        if (!mapChatInput || !mapChatHistory || !mapChatInput.value.trim()) return;
        const message = mapChatInput.value.trim();
        mapChatHistory.innerHTML += `<div class="chat-message user-msg">${message}</div>`;
        mapChatInput.value = '';
        mapChatHistory.scrollTop = mapChatHistory.scrollHeight;

        const loadingId = 'map-loading-' + Date.now();
        mapChatHistory.innerHTML += `<div id="${loadingId}" class="chat-message ai-msg">Analyzing atmosphere & coordinates...</div>`;
        mapChatHistory.scrollTop = mapChatHistory.scrollHeight;

        try {
            const response = await fetch('/map_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });
            const rawText = await response.text();
            const aiData = JSON.parse(rawText);

            document.getElementById(loadingId)?.remove();
            let formattedReply = parseMarkdown(aiData.text_reply || '');
            mapChatHistory.innerHTML += `<div class="chat-message ai-msg">${formattedReply}</div>`;
            mapChatHistory.scrollTop = mapChatHistory.scrollHeight;

            if (aiData.update_map && map && markersLayer) {
                const lat = parseFloat(aiData.target_lat);
                const lon = parseFloat(aiData.target_lon);
                map.flyTo([lat, lon], parseInt(aiData.zoom_level) || 12, { duration: 2, easeLinearity: 0.25 });

                markersLayer.clearLayers();
                L.marker([lat, lon]).addTo(markersLayer).bindPopup(`<b>${aiData.location_name}</b><br>${aiData.temperature || ''} - ${aiData.condition_summary || ''}`).openPopup();

                const weatherBox = document.getElementById('weather-animation-box');
                if (weatherBox) {
                    const key = (aiData.weather_type || 'default').toLowerCase().trim();
                    weatherBox.innerHTML = `<div class="weather-badge-icon">${weatherIcons[key] || weatherIcons.default}</div><div class="weather-badge-details"><span class="weather-badge-temp">${aiData.temperature || '--'}</span><span class="weather-badge-desc">${aiData.condition_summary || key}</span></div>`;
                }
            }
        } catch (error) {
            document.getElementById(loadingId).innerText = "Error analyzing map data.";
        }
    }

    if (mapSendBtn && mapChatInput) {
        mapSendBtn.addEventListener('click', sendMapMessage);
        mapChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMapMessage(); });
    }
    // ==========================================
    // 3D CLIMATE GLOBE (Centered & Formatted)
    // ==========================================
    const globeContainer = document.getElementById('globe-viz-container');

    if (globeContainer && typeof Globe !== 'undefined') {
        // Initialize 3D Globe with exact container dimensions
        const world = Globe()(globeContainer)
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
            .showGraticules(true)
            .width(globeContainer.clientWidth)
            .height(600)
            .htmlElement(d => {
                const el = document.createElement('div');
                el.className = 'globe-marker';
                
                if (d.loading) {
                    el.innerHTML = `
                        <h4>⏳ Atmospheric Scan</h4>
                        <div><strong>Status:</strong> Scanning coordinates...</div>
                        <div><strong>Lat:</strong> ${d.lat.toFixed(2)}° | <strong>Lon:</strong> ${d.lng.toFixed(2)}°</div>
                    `;
                } else {
                    el.innerHTML = `
                        <h4>${d.name}</h4>
                        <div>🌡️ <strong>Temp:</strong> ${d.temp}</div>
                        <div>☁️ <strong>Condition:</strong> ${d.cond}</div>
                        <div>📍 <strong>Coords:</strong> ${d.lat.toFixed(2)}°, ${d.lng.toFixed(2)}°</div>
                    `;
                }
                return el;
            });

        // Set initial camera target centered over South Asia / India
        world.pointOfView({ lat: 20, lng: 80, altitude: 2 });

        // Maintain center alignment on browser resize
        window.addEventListener('resize', () => {
            if (globeContainer) {
                world.width(globeContainer.clientWidth);
            }
        });

        // Handle Globe Click Event
        world.onGlobeClick(async (coords) => {
            const lat = coords.lat;
            const lon = coords.lng;

            // 1. Show loading state on click pin
            world.htmlElementsData([{ lat: lat, lng: lon, loading: true }]);

            try {
                // 2. Fetch live data from backend
                const response = await fetch('/map_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `What is the weather at Latitude ${lat}, Longitude ${lon}?` })
                });

                const aiData = await response.json();

                // 3. Render clean formatted popup text
                world.htmlElementsData([{
                    lat: lat,
                    lng: lon,
                    loading: false,
                    name: aiData.location_name || "Unknown Region",
                    temp: aiData.temperature || "--",
                    cond: aiData.condition_summary || "No data"
                }]);

                // Smoothly focus camera on clicked location
                world.pointOfView({ lat: lat, lng: lon, altitude: 1.2 }, 1200);

            } catch (error) {
                world.htmlElementsData([{
                    lat: lat,
                    lng: lon,
                    loading: false,
                    name: "Connection Error",
                    temp: "--",
                    cond: "Unable to reach satellite stream"
                }]);
            }
        });
    }
});
// --- ATMOSVISION DISASTER MODULE (SATELLITE & SMS DISPATCH) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LOGIN SYSTEM (LOCAL STORAGE) ---
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const saveLoginBtn = document.getElementById('save-login-btn');
    const closeLoginBtn = document.getElementById('close-login-btn');
    
    let pendingSOS = false; 

    // Check on page load. If credentials exist, change button to Update Profile.
    if (localStorage.getItem('atmosPhone')) {
        if(loginBtn) {
            loginBtn.innerText = "Update Profile";
            loginBtn.style.backgroundColor = "#2ea043";
        }
    }

    // Open Modal (Pre-fills existing data so the user can edit it)
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            document.getElementById('user-email').value = localStorage.getItem('atmosEmail') || '';
            document.getElementById('user-phone').value = localStorage.getItem('atmosPhone') || '';
        });
    }

    // Close Modal
    closeLoginBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        pendingSOS = false;
    });

    // Save/Update Credentials
    saveLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('user-email').value;
        const phone = document.getElementById('user-phone').value;
        
        if(email && phone) {
            // Overwrites old data with the newly entered data
            localStorage.setItem('atmosEmail', email);
            localStorage.setItem('atmosPhone', phone);
            
            if(loginBtn) {
                loginBtn.innerText = "Update Profile";
                loginBtn.style.backgroundColor = "#2ea043";
            }
            
            loginModal.style.display = 'none'; 
            alert("Credentials securely updated on device.");
            
            if (pendingSOS) {
                pendingSOS = false;
                document.getElementById('simulate-sos-btn').click();
            }
        } else {
            alert("Please enter both email and phone number.");
        }
    }); 
    // Save Credentials & Auto-Return
    saveLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('user-email').value;
        const phone = document.getElementById('user-phone').value;
        
        if(email && phone) {
            localStorage.setItem('atmosEmail', email);
            localStorage.setItem('atmosPhone', phone);
            
            if(loginBtn) {
                loginBtn.innerText = "Logged In";
                loginBtn.style.backgroundColor = "#2ea043";
            }
            
            // Close modal immediately and show success message
            loginModal.style.display = 'none'; 
            alert("Credentials saved securely.");
            
            // NEW: If they clicked SOS to get here, auto-trigger the SOS now
            if (pendingSOS) {
                pendingSOS = false;
                document.getElementById('simulate-sos-btn').click();
            }
        } else {
            alert("Please enter both email and phone number.");
        }
    });

    // --- 2. SATELLITE MAP & MESH ROUTING ---
    const mapContainer = document.getElementById('mesh-map-container');
    if (!mapContainer) return;

    const meshMap = L.map('mesh-map-container').setView([20.5937, 78.9629], 5);

    // Esri World Imagery (High-Res Satellite Tiles)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(meshMap);

    const createPulseIcon = (color) => L.divIcon({
        className: 'mesh-node-icon',
        html: `<div style="background-color:${color}; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 12px ${color};"></div>`,
        iconSize: [16, 16]
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            meshMap.setView([userLat, userLng], 16); // Zoomed in closer for satellite view

            const strandedUser = [userLat, userLng];
            const relayNode1 = [userLat + 0.001, userLng - 0.001];
            const activeGateway = [userLat + 0.003, userLng - 0.002];

            L.marker(activeGateway, {icon: createPulseIcon('#2ea043')}).addTo(meshMap).bindPopup("<b>Rescue Base Camp</b><br>Active Cellular Uplink");
            L.marker(relayNode1, {icon: createPulseIcon('#d29922')}).addTo(meshMap).bindPopup("<b>Drone Repeater</b>");
            L.marker(strandedUser, {icon: createPulseIcon('#f85149')}).addTo(meshMap).bindPopup("<b>Your Location</b>");

            const transmissionRoute = L.polyline([strandedUser, relayNode1, activeGateway], {
                color: '#ff3e3e', weight: 3, dashArray: '8, 8', opacity: 0 
            }).addTo(meshMap);

            // --- 3. NATIVE SMS DISPATCH ---
            const simBtn = document.getElementById('simulate-sos-btn');
            if(simBtn) {
                simBtn.addEventListener('click', () => {
                    const savedPhone = localStorage.getItem('atmosPhone');
                    if(!savedPhone) {
                        alert("Please register your device for emergency broadcasts first.");
                        pendingSOS = true; 
                        loginModal.style.display = 'flex';
                        return;
                    }

                    // 1. The "Cliffhanger" Prompt intercepts the flow
                    const userCondition = window.prompt("EMERGENCY MEDICAL STATUS:\nPlease type your current condition briefly (e.g., 'Trapped under rubble', 'Broken leg', 'Safe but stranded'):", "");
                    
                    // 2. Fallback logic: If they cancel or leave it blank, default to Unknown
                    const finalCondition = userCondition ? userCondition.trim() : "Unknown/Unresponsive";

                    simBtn.innerText = "Dispatching SOS via SMS Protocol...";
                    simBtn.style.backgroundColor = "#ff3e3e";
                    transmissionRoute.setStyle({ opacity: 1 });
                    
                    // 3. Compile the text message replacing randomized vitals with user input
                    const emergencyNumbers = "112,100,108,1078"; 
                    const emergencyText = `SOS ALERT: AtmosVision Mesh. Target Offline. Lat: ${userLat.toFixed(5)}, Lng: ${userLng.toFixed(5)}. Condition: ${finalCondition}. Registered Phone: ${savedPhone}. Requesting immediate extraction.`;
                    
                    setTimeout(() => {
                        simBtn.innerText = "SMS Queued to Cellular Radio";
                        
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                        if (isIOS) {
                            window.location.href = `sms:${emergencyNumbers}&body=${encodeURIComponent(emergencyText)}`;
                        } else {
                            window.location.href = `sms:${emergencyNumbers}?body=${encodeURIComponent(emergencyText)}`;
                        }

                        setTimeout(() => {
                            transmissionRoute.setStyle({ opacity: 0 });
                            simBtn.innerText = "Initialize SOS Broadcast Simulation";
                            simBtn.style.backgroundColor = "#1f6feb";
                        }, 3000);
                    }, 1000);
                });
            }
        });
    }
});