/**
 * Enhanced Route Finder
 * Handles the enhanced route finding logic with start/end location inputs
 * and multi-modal route calculation as specified in planning.md
 */
class EnhancedRouteFinder {
  constructor() {
    this.currentRoutes = null;
    this.currentTab = 'all-routes';
    this.mapInstance = null;
    this.routeLayers = [];
    this.markers = [];
    this.startLocation = null;
    this.endLocation = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupAutoComplete();
    this.loadRecentSearches();
  }

  bindEvents() {
    // Form submission
    document.getElementById('findRouteBtn').addEventListener('click', () => this.findRoutes());
    document.getElementById('resetBtn').addEventListener('click', () => this.resetForm());

    // Current location buttons
    document.getElementById('useCurrentLocationStart').addEventListener('click', () => this.useCurrentLocation('start'));
    document.getElementById('useCurrentLocationEnd').addEventListener('click', () => this.useCurrentLocation('end'));

    // Select on map buttons
    document.getElementById('selectOnMapStart').addEventListener('click', () => this.selectOnMap('start'));
    document.getElementById('selectOnMapEnd').addEventListener('click', () => this.selectOnMap('end'));

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Map controls
    document.getElementById('zoomFitRoutes').addEventListener('click', () => this.fitAllRoutes());
    document.getElementById('toggleRouteLegend').addEventListener('click', () => this.toggleLegend());

    // Form validation on input
    document.getElementById('startLocationInput').addEventListener('input', () => this.clearError('start'));
    document.getElementById('endLocationInput').addEventListener('input', () => this.clearError('end'));
  }

  setupAutoComplete() {
    // Setup autocomplete for location inputs using existing geocoding service
    const startInput = document.getElementById('startLocationInput');
    const endInput = document.getElementById('endLocationInput');

    [startInput, endInput].forEach(input => {
      let debounceTimer;

      input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 3) {
          this.hideSuggestions(input);
          return;
        }

        debounceTimer = setTimeout(() => {
          this.getAutocompleteSuggestions(query, input);
        }, 300);
      });

      // Hide suggestions on blur
      input.addEventListener('blur', () => {
        setTimeout(() => this.hideSuggestions(input), 200);
      });
    });
  }

  async getAutocompleteSuggestions(query, inputElement) {
    try {
      // Use existing geocoding service if available
      if (window.locationService && window.locationService.reverseGeocode) {
        // For now, just show loading state
        // In production, this would call a geocoding API
        this.hideSuggestions(inputElement);
      }
    } catch (error) {
      console.error('Error getting autocomplete suggestions:', error);
      this.hideSuggestions(inputElement);
    }
  }

  hideSuggestions(inputElement) {
    // Remove any existing suggestions dropdown
    const existingDropdown = inputElement.parentNode.querySelector('.autocomplete-suggestions');
    if (existingDropdown) {
      existingDropdown.remove();
    }
  }

  async useCurrentLocation(type) {
    try {
      this.showLoading(`Getting your current location...`);

      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const address = await this.reverseGeocode(latitude, longitude);

      const location = {
        address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude
      };

      if (type === 'start') {
        this.startLocation = location;
        document.getElementById('startLocationInput').value = location.address;
      } else {
        this.endLocation = location;
        document.getElementById('endLocationInput').value = location.address;
      }

      this.hideLoading();
      this.showSuccess(`Current location set: ${location.address}`);

    } catch (error) {
      this.hideLoading();
      this.showError(type, error.message);
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async selectOnMap(type) {
    try {
      // Show map modal for location selection
      this.showMapModal(type);
    } catch (error) {
      console.error('Error opening map selection:', error);
      this.showError(type, 'Failed to open map selection');
    }
  }

  showMapModal(type) {
    // Create modal for map selection
    const modal = document.createElement('div');
    modal.className = 'map-modal';
    modal.innerHTML = `
      <div class="map-modal-content">
        <div class="map-modal-header">
          <h3>Select ${type === 'start' ? 'Start' : 'End'} Location on Map</h3>
          <button class="map-modal-close">&times;</button>
        </div>
        <div class="map-modal-body">
          <div id="selectionMap" class="selection-map"></div>
          <p class="map-instruction">Click on the map to select location</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Initialize map
    this.initializeSelectionMap(modal, type);

    // Handle modal close
    modal.querySelector('.map-modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Handle backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  initializeSelectionMap(modal, type) {
    // Initialize Leaflet map for location selection
    const map = L.map('selectionMap').setView([19.0760, 72.8777], 12); // Mumbai center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Handle map click
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;

      try {
        const address = await this.reverseGeocode(lat, lng);

        const location = {
          address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng
        };

        if (type === 'start') {
          this.startLocation = location;
          document.getElementById('startLocationInput').value = location.address;
        } else {
          this.endLocation = location;
          document.getElementById('endLocationInput').value = location.address;
        }

        // Close modal
        document.body.removeChild(modal);

      } catch (error) {
        console.error('Error geocoding selected location:', error);
      }
    });
  }

  async reverseGeocode(lat, lng) {
    try {
      // Use Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MumbaiShareAuto/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async findRoutes() {
    try {
      if (!this.validateForm()) {
        return;
      }

      this.showLoading();
      this.hideResults();

      // Get coordinates for both locations
      const startCoords = await this.geocodeLocation(this.startLocation);
      const endCoords = await this.geocodeLocation(this.endLocation);

      if (!startCoords || !endCoords) {
        throw new Error('Could not find coordinates for locations');
      }

      // Call enhanced route API
      const response = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          startLat: startCoords.latitude,
          startLng: startCoords.longitude,
          endLat: endCoords.latitude,
          endLng: endCoords.longitude,
          startAddress: this.startLocation.address,
          endAddress: this.endLocation.address
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate routes');
      }

      const data = await response.json();
      this.currentRoutes = data.data;

      // Display results
      this.displayRoutes();
      this.initializeMap();
      this.saveToRecentSearches();

      this.hideLoading();

    } catch (error) {
      this.hideLoading();
      this.showResults();
      this.showNoResults(error.message);
    }
  }

  async geocodeLocation(location) {
    if (location.latitude && location.longitude) {
      return location;
    }

    try {
      // Use Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'MumbaiShareAuto/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.length === 0) {
        throw new Error('Location not found');
      }

      return {
        address: location.address,
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };

    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  displayRoutes() {
    this.showResults();
    const container = document.getElementById('routeCardsContainer');
    container.innerHTML = '';

    if (!this.currentRoutes) {
      this.showNoResults();
      return;
    }

    const routes = this.getFilteredRoutes();

    if (routes.length === 0) {
      this.showNoResults();
      return;
    }

    // Display route cards
    routes.forEach(route => {
      const card = this.createRouteCard(route);
      container.appendChild(card);
    });
  }

  getFilteredRoutes() {
    if (!this.currentRoutes) return [];

    const allRoutes = [
      ...(this.currentRoutes.routes.stand_routes || []),
      ...(this.currentRoutes.routes.hybrid_routes || []),
      ...(this.currentRoutes.routes.direct_auto ? [this.currentRoutes.routes.direct_auto] : []),
      ...(this.currentRoutes.routes.train_route ? [this.currentRoutes.routes.train_route] : [])
    ];

    switch (this.currentTab) {
      case 'fastest':
        return allRoutes.sort((a, b) => a.total_time - b.total_time);
      case 'cheapest':
        return allRoutes.sort((a, b) => (a.total_fare || 999) - (b.total_fare || 999));
      case 'shortest':
        return allRoutes.sort((a, b) => a.total_distance - b.total_distance);
      default:
        return allRoutes;
    }
  }

  createRouteCard(route) {
    const card = document.createElement('div');
    card.className = `route-card route-${route.type}`;
    card.dataset.routeId = route.id;

    const typeIcon = this.getRouteTypeIcon(route.type);
    const fareDisplay = route.total_fare !== undefined ? `₹${route.total_fare.toFixed(2)}` : 'N/A';

    card.innerHTML = `
      <div class="route-header">
        <div class="route-type">
          <span class="route-icon">${typeIcon}</span>
          <span class="route-title">${route.title}</span>
        </div>
        <div class="route-confidence">
          <span class="confidence-badge">${Math.round((route.confidence || 0.8) * 100)}% match</span>
        </div>
      </div>

      <div class="route-stats">
        <div class="stat">
          <span class="stat-icon">⏱️</span>
          <span class="stat-value">${route.total_time} min</span>
        </div>
        <div class="stat">
          <span class="stat-icon">📏</span>
          <span class="stat-value">${route.total_distance.toFixed(1)} km</span>
        </div>
        <div class="stat">
          <span class="stat-icon">💰</span>
          <span class="stat-value">${fareDisplay}</span>
        </div>
      </div>

      <div class="route-segments">
        ${route.segments.map(segment => this.createSegmentHTML(segment)).join('')}
      </div>

      <div class="route-actions">
        <button class="btn btn-primary btn-sm" onclick="enhancedRouteFinder.showRouteOnMap('${route.id}')">
          🗺️ Show on Map
        </button>
        <button class="btn btn-secondary btn-sm" onclick="enhancedRouteFinder.startNavigation('${route.id}')">
          🧭 Start Navigation
        </button>
      </div>
    `;

    return card;
  }

  createSegmentHTML(segment) {
    const modeIcon = this.getSegmentModeIcon(segment.mode);
    const fareDisplay = segment.fare !== undefined ? ` • ₹${segment.fare}` : '';

    return `
      <div class="segment">
        <span class="segment-mode">${modeIcon}</span>
        <span class="segment-path">${segment.from} → ${segment.to}</span>
        <span class="segment-details">${segment.distance.toFixed(1)}km • ${segment.time}min${fareDisplay}</span>
      </div>
    `;
  }

  getRouteTypeIcon(type) {
    const icons = {
      'stand_route': '🚖',
      'hybrid_route': '🔄',
      'direct_auto': '🚙',
      'train_route': '🚆'
    };
    return icons[type] || '🛣️';
  }

  getSegmentModeIcon(mode) {
    const icons = {
      'walk': '🚶',
      'auto': '🚖',
      'train': '🚆'
    };
    return icons[mode] || '🛣️';
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Re-display routes with new filter
    this.displayRoutes();
  }

  initializeMap() {
    if (!this.currentRoutes) return;

    const mapContainer = document.getElementById('mapContainer');
    mapContainer.style.display = 'block';

    // Initialize enhanced map
    if (window.enhancedMap) {
      const mapInstance = window.enhancedMap.getMapInstance();
      if (!mapInstance) {
        // Trigger map initialization
        document.dispatchEvent(new CustomEvent('initializeEnhancedMap', {
          detail: { containerId: 'routeMap' }
        }));
      }

      // Display routes using enhanced map
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('displayRoutesOnMap', {
          detail: {
            routes: this.currentRoutes.routes,
            startLocation: this.startLocation,
            endLocation: this.endLocation
          }
        }));
      }, 100);
    }
  }

  displayAllRoutes() {
    if (!this.currentRoutes || !this.mapInstance) return;

    // Display start and end markers
    this.displayStartEndMarkers();

    // Display each route type with different colors
    this.displayRouteType('stand_routes', '#3b82f6');
    this.displayRouteType('hybrid_routes', '#10b981');

    if (this.currentRoutes.routes.direct_auto) {
      this.displaySingleRoute(this.currentRoutes.routes.direct_auto, '#8b5cf6');
    }

    if (this.currentRoutes.routes.train_route) {
      this.displaySingleRoute(this.currentRoutes.routes.train_route, '#f97316');
    }
  }

  displayStartEndMarkers() {
    const start = this.startLocation;
    const end = this.endLocation;

    if (start && start.latitude && start.longitude) {
      const startMarker = L.marker([start.latitude, start.longitude])
        .addTo(this.mapInstance)
        .bindPopup(`Start: ${start.address}`);

      this.markers.push(startMarker);
    }

    if (end && end.latitude && end.longitude) {
      const endMarker = L.marker([end.latitude, end.longitude])
        .addTo(this.mapInstance)
        .bindPopup(`End: ${end.address}`);

      this.markers.push(endMarker);
    }
  }

  displayRouteType(routeType, color) {
    const routes = this.currentRoutes.routes[routeType] || [];

    routes.forEach(route => {
      this.displaySingleRoute(route, color);
    });
  }

  displaySingleRoute(route, color) {
    if (!route.geometry) {
      // Create simple line if no geometry
      this.createSimpleRouteLine(route, color);
      return;
    }

    try {
      // Parse GeoJSON geometry from OSRM
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      const polyline = L.polyline(coordinates, {
        color: color,
        weight: 4,
        opacity: 0.7
      }).addTo(this.mapInstance);

      polyline.bindPopup(`
        <strong>${route.title}</strong><br>
        Time: ${route.total_time} min<br>
        Distance: ${route.total_distance.toFixed(1)} km<br>
        Fare: ₹${(route.total_fare || 0).toFixed(2)}
      `);

      this.routeLayers.push(polyline);
    } catch (error) {
      console.error('Error displaying route:', error);
      this.createSimpleRouteLine(route, color);
    }
  }

  createSimpleRouteLine(route, color) {
    if (!this.startLocation || !this.endLocation) return;

    const coordinates = [
      [this.startLocation.latitude, this.startLocation.longitude],
      [this.endLocation.latitude, this.endLocation.longitude]
    ];

    const polyline = L.polyline(coordinates, {
      color: color,
      weight: 4,
      opacity: 0.7,
      dashArray: '5, 10'
    }).addTo(this.mapInstance);

    this.routeLayers.push(polyline);
  }

  clearMapLayers() {
    // Clear existing route layers
    this.routeLayers.forEach(layer => {
      this.mapInstance.removeLayer(layer);
    });
    this.routeLayers = [];

    // Clear markers
    this.markers.forEach(marker => {
      this.mapInstance.removeLayer(marker);
    });
    this.markers = [];
  }

  fitAllRoutes() {
    if (!this.mapInstance || this.routeLayers.length === 0) return;

    const group = new L.featureGroup([...this.routeLayers, ...this.markers]);
    this.mapInstance.fitBounds(group.getBounds().pad(0.1));
  }

  showRouteOnMap(routeId) {
    // Highlight specific route on map
    const routeCard = document.querySelector(`[data-route-id="${routeId}"]`);
    if (routeCard) {
      routeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      routeCard.classList.add('highlighted');

      setTimeout(() => {
        routeCard.classList.remove('highlighted');
      }, 3000);
    }
  }

  startNavigation(routeId) {
    const route = this.findRouteById(routeId);
    if (!route) return;

    // Open navigation in Google Maps or similar service
    const start = `${this.startLocation.latitude},${this.startLocation.longitude}`;
    const end = `${this.endLocation.latitude},${this.endLocation.longitude}`;

    const url = `https://www.google.com/maps/dir/${start}/${end}`;
    window.open(url, '_blank');
  }

  findRouteById(routeId) {
    if (!this.currentRoutes) return null;

    const allRoutes = [
      ...(this.currentRoutes.routes.stand_routes || []),
      ...(this.currentRoutes.routes.hybrid_routes || []),
      ...(this.currentRoutes.routes.direct_auto ? [this.currentRoutes.routes.direct_auto] : []),
      ...(this.currentRoutes.routes.train_route ? [this.currentRoutes.routes.train_route] : [])
    ];

    return allRoutes.find(route => route.id === routeId);
  }

  toggleLegend() {
    const legend = document.getElementById('routeLegend');
    legend.style.display = legend.style.display === 'none' ? 'block' : 'none';
  }

  validateForm() {
    let isValid = true;

    // Validate start location
    const startInput = document.getElementById('startLocationInput');
    if (!startInput.value.trim()) {
      this.showError('start', 'Start location is required');
      isValid = false;
    } else {
      this.startLocation = { address: startInput.value.trim() };
    }

    // Validate end location
    const endInput = document.getElementById('endLocationInput');
    if (!endInput.value.trim()) {
      this.showError('end', 'End location is required');
      isValid = false;
    } else {
      this.endLocation = { address: endInput.value.trim() };
    }

    // Check if locations are the same
    if (isValid && this.startLocation.address === this.endLocation.address) {
      this.showError('end', 'Start and end locations cannot be the same');
      isValid = false;
    }

    return isValid;
  }

  resetForm() {
    document.getElementById('startLocationInput').value = '';
    document.getElementById('endLocationInput').value = '';
    this.startLocation = null;
    this.endLocation = null;
    this.currentRoutes = null;

    this.clearError('start');
    this.clearError('end');
    this.hideResults();
    this.hideLoading();
  }

  showError(type, message) {
    const errorElement = document.getElementById(`${type}LocationError`);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  clearError(type) {
    const errorElement = document.getElementById(`${type}LocationError`);
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }

  showLoading(message = 'Calculating best routes...') {
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.querySelector('p').textContent = message;
    loadingContainer.style.display = 'block';

    document.getElementById('findRouteBtn').disabled = true;
  }

  hideLoading() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('findRouteBtn').disabled = false;
  }

  showResults() {
    document.getElementById('resultsContainer').style.display = 'block';
  }

  hideResults() {
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('mapContainer').style.display = 'none';
  }

  showNoResults(message = 'No routes found. Please check your locations and try again.') {
    document.getElementById('noResultsMessage').style.display = 'block';
    document.getElementById('routeCardsContainer').innerHTML = '';
  }

  showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  getAuthToken() {
    // Get auth token from window (set by auth.js)
    if (window.user && window.user.token) {
      return window.user.token;
    }

    // Fallback to localStorage
    return localStorage.getItem('authToken');
  }

  saveToRecentSearches() {
    if (!this.startLocation || !this.endLocation) return;

    const search = {
      start: this.startLocation.address,
      end: this.endLocation.address,
      timestamp: new Date().toISOString()
    };

    let recentSearches = JSON.parse(localStorage.getItem('recentRouteSearches') || '[]');

    // Remove duplicates
    recentSearches = recentSearches.filter(s =>
      !(s.start === search.start && s.end === search.end)
    );

    // Add to beginning
    recentSearches.unshift(search);

    // Keep only last 5 searches
    recentSearches = recentSearches.slice(0, 5);

    localStorage.setItem('recentRouteSearches', JSON.stringify(recentSearches));
    this.displayRecentSearches();
  }

  loadRecentSearches() {
    const recentSearches = JSON.parse(localStorage.getItem('recentRouteSearches') || '[]');

    if (recentSearches.length > 0) {
      this.displayRecentSearches();
    }
  }

  displayRecentSearches() {
    const recentSearches = JSON.parse(localStorage.getItem('recentRouteSearches') || '[]');

    if (recentSearches.length === 0) {
      document.getElementById('recentSearchesContainer').style.display = 'none';
      return;
    }

    const container = document.getElementById('recentSearchesContainer');
    const list = document.getElementById('recentSearchesList');

    list.innerHTML = '';

    recentSearches.forEach(search => {
      const item = document.createElement('div');
      item.className = 'recent-search-item';
      item.innerHTML = `
        <span class="recent-search-text">${search.start} → ${search.end}</span>
        <button class="btn btn-sm btn-secondary" onclick="enhancedRouteFinder.loadRecentSearch('${search.start}', '${search.end}')">
          Load
        </button>
      `;
      list.appendChild(item);
    });

    container.style.display = 'block';
  }

  loadRecentSearch(start, end) {
    document.getElementById('startLocationInput').value = start;
    document.getElementById('endLocationInput').value = end;

    this.startLocation = { address: start };
    this.endLocation = { address: end };

    this.clearError('start');
    this.clearError('end');
  }
}

// Initialize the enhanced route finder when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedRouteFinder = new EnhancedRouteFinder();
});