/**
 * Enhanced Map Module
 * Extends existing map functionality to display multiple route types simultaneously
 * Integrates with enhancedRouteFinder.js for route visualization
 */
class EnhancedMap {
  constructor() {
    this.mapInstance = null;
    this.routeLayers = new Map(); // Store layers by route ID
    this.markers = new Map(); // Store markers by type
    this.currentBounds = null;
    this.routeColors = {
      'stand_route': '#3b82f6', // Blue
      'hybrid_route': '#10b981', // Green
      'direct_auto': '#8b5cf6', // Purple
      'train_route': '#f97316'  // Orange
    };
    this.legendVisible = true;

    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.bindEvents();
  }

  bindEvents() {
    // Listen for map container requests
    document.addEventListener('initializeEnhancedMap', (e) => {
      this.createMap(e.detail.containerId);
    });

    // Listen for route display requests
    document.addEventListener('displayRoutesOnMap', (e) => {
      this.displayRoutes(e.detail.routes, e.detail.startLocation, e.detail.endLocation);
    });

    // Listen for single route highlighting
    document.addEventListener('highlightRoute', (e) => {
      this.highlightRoute(e.detail.routeId);
    });

    // Listen for clear map requests
    document.addEventListener('clearEnhancedMap', () => {
      this.clearAllRoutes();
    });
  }

  createMap(containerId = 'routeMap') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Map container with ID '${containerId}' not found`);
      return;
    }

    if (this.mapInstance) {
      // Map already exists, just ensure it's properly sized
      this.mapInstance.invalidateSize();
      return;
    }

    try {
      // Initialize Leaflet map centered on Mumbai
      this.mapInstance = L.map(containerId).setView([19.0760, 72.8777], 12);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 11
      }).addTo(this.mapInstance);

      // Create custom icons for different route types
      this.createCustomIcons();

      // Initialize legend
      this.createLegend();

    } catch (error) {
      console.error('Error initializing map:', error);
      this.showMapError(containerId, 'Failed to load map. Please refresh the page.');
    }
  }

  createCustomIcons() {
    // Start location icon (green)
    this.startIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="route-marker start-marker">📍</div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42]
    });

    // End location icon (red)
    this.endIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="route-marker end-marker">🏁</div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42]
    });

    // Train station icon
    this.trainIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="route-marker train-marker">🚆</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });

    // Auto stand icon
    this.standIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="route-marker stand-marker">🛺</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }

  createLegend() {
    if (!this.mapInstance) return;

    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'route-legend');
      div.innerHTML = `
        <h4>Route Types</h4>
        <div class="legend-item">
          <span class="legend-color" style="background: ${this.routeColors.stand_route};"></span>
          <span>Share Auto Routes</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: ${this.routeColors.hybrid_route};"></span>
          <span>Hybrid Routes</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: ${this.routeColors.direct_auto};"></span>
          <span>Direct Auto</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: ${this.routeColors.train_route};"></span>
          <span>Train Routes</span>
        </div>
      `;
      return div;
    };

    this.legendControl = legend;
    this.legendControl.addTo(this.mapInstance);
  }

  displayRoutes(routes, startLocation, endLocation) {
    if (!this.mapInstance) {
      console.error('Map not initialized');
      return;
    }

    // Clear existing routes
    this.clearAllRoutes();

    // Add start and end markers
    this.addLocationMarkers(startLocation, endLocation);

    // Display all route types
    this.displayRouteTypes(routes);

    // Fit map to show all routes
    this.fitAllRoutes();
  }

  displayRouteTypes(routes) {
    // Display stand routes
    if (routes.stand_routes && routes.stand_routes.length > 0) {
      routes.stand_routes.forEach(route => {
        this.displayRoute(route, this.routeColors.stand_route);
      });
    }

    // Display hybrid routes
    if (routes.hybrid_routes && routes.hybrid_routes.length > 0) {
      routes.hybrid_routes.forEach(route => {
        this.displayRoute(route, this.routeColors.hybrid_route);
      });
    }

    // Display direct auto route
    if (routes.direct_auto) {
      this.displayRoute(routes.direct_auto, this.routeColors.direct_auto);
    }

    // Display train route
    if (routes.train_route) {
      this.displayRoute(routes.train_route, this.routeColors.train_route);
    }
  }

  displayRoute(route, color) {
    if (!route || !this.mapInstance) return;

    // Create route polyline
    const polyline = this.createRoutePolyline(route, color);
    if (polyline) {
      this.routeLayers.set(route.id, polyline);
      polyline.addTo(this.mapInstance);
    }

    // Add intermediate markers for complex routes
    this.addIntermediateMarkers(route);
  }

  createRoutePolyline(route, color) {
    try {
      let coordinates;

      if (route.geometry && route.geometry.coordinates) {
        // Use OSRM geometry if available
        coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      } else {
        // Create simple line from segments
        coordinates = this.createCoordinatesFromSegments(route);
      }

      if (!coordinates || coordinates.length < 2) {
        console.warn('No valid coordinates for route:', route.id);
        return null;
      }

      const polyline = L.polyline(coordinates, {
        color: color,
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      });

      // Add popup with route details
      const popupContent = this.createRoutePopup(route);
      polyline.bindPopup(popupContent);

      // Add hover effect
      polyline.on('mouseover', () => {
        polyline.setStyle({ weight: 6, opacity: 1 });
      });

      polyline.on('mouseout', () => {
        polyline.setStyle({ weight: 4, opacity: 0.8 });
      });

      return polyline;

    } catch (error) {
      console.error('Error creating route polyline:', error);
      return null;
    }
  }

  createCoordinatesFromSegments(route) {
    const coordinates = [];

    // Get start location from global enhancedRouteFinder
    const startLoc = window.enhancedRouteFinder?.startLocation;
    const endLoc = window.enhancedRouteFinder?.endLocation;

    if (startLoc && startLoc.latitude && startLoc.longitude) {
      coordinates.push([startLoc.latitude, startLoc.longitude]);
    }

    // Add intermediate points from segments
    if (route.segments && route.segments.length > 0) {
      route.segments.forEach(segment => {
        // For simplicity, we don't have exact coordinates for segment points
        // In production, these would come from the API
      });
    }

    if (endLoc && endLoc.latitude && endLoc.longitude) {
      coordinates.push([endLoc.latitude, endLoc.longitude]);
    }

    return coordinates;
  }

  createRoutePopup(route) {
    const fareDisplay = route.total_fare !== undefined ? `₹${route.total_fare.toFixed(2)}` : 'N/A';
    const confidenceDisplay = Math.round((route.confidence || 0.8) * 100);

    return `
      <div class="route-popup">
        <h4>${route.title}</h4>
        <div class="route-stats">
          <div>⏱️ ${route.total_time} minutes</div>
          <div>📏 ${route.total_distance.toFixed(1)} km</div>
          <div>💰 ${fareDisplay}</div>
          <div>🎯 ${confidenceDisplay}% match</div>
        </div>
        ${route.segments ? `
          <div class="route-segments">
            <h5>Route Details:</h5>
            ${route.segments.map(segment => `
              <div class="popup-segment">
                ${this.getSegmentIcon(segment.mode)} ${segment.from} → ${segment.to}
                <br><small>${segment.distance.toFixed(1)}km • ${segment.time}min${segment.fare ? ` • ₹${segment.fare}` : ''}</small>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  getSegmentIcon(mode) {
    const icons = {
      'walk': '🚶',
      'auto': '🚖',
      'train': '🚆'
    };
    return icons[mode] || '🛣️';
  }

  addIntermediateMarkers(route) {
    if (!route.segments || !this.mapInstance) return;

    route.segments.forEach((segment, index) => {
      if (segment.mode === 'train' && index < route.segments.length - 1) {
        // Add train station markers (simplified - would need actual coordinates)
        // This is a placeholder implementation
      }
    });
  }

  addLocationMarkers(startLocation, endLocation) {
    if (!this.mapInstance) return;

    // Clear existing markers
    this.clearMarkers();

    // Add start marker
    if (startLocation && startLocation.latitude && startLocation.longitude) {
      const startMarker = L.marker([startLocation.latitude, startLocation.longitude], {
        icon: this.startIcon
      })
        .bindPopup(`<strong>Start:</strong> ${startLocation.address}`)
        .addTo(this.mapInstance);

      this.markers.set('start', startMarker);
    }

    // Add end marker
    if (endLocation && endLocation.latitude && endLocation.longitude) {
      const endMarker = L.marker([endLocation.latitude, endLocation.longitude], {
        icon: this.endIcon
      })
        .bindPopup(`<strong>End:</strong> ${endLocation.address}`)
        .addTo(this.mapInstance);

      this.markers.set('end', endMarker);
    }
  }

  highlightRoute(routeId) {
    if (!this.mapInstance) return;

    // Reset all routes to normal style
    this.routeLayers.forEach((layer, id) => {
      layer.setStyle({ weight: 4, opacity: 0.8 });
    });

    // Highlight selected route
    const selectedLayer = this.routeLayers.get(routeId);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 8, opacity: 1 });

      // Open popup
      selectedLayer.openPopup();

      // Pan to route if it's not visible
      const bounds = selectedLayer.getBounds();
      if (!this.mapInstance.getBounds().intersects(bounds)) {
        this.mapInstance.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  fitAllRoutes() {
    if (!this.mapInstance) return;

    const allLayers = [...this.routeLayers.values(), ...this.markers.values()];

    if (allLayers.length === 0) return;

    try {
      const group = L.featureGroup(allLayers);
      this.mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
    } catch (error) {
      console.error('Error fitting bounds:', error);
      // Fallback to Mumbai bounds
      this.mapInstance.setView([19.0760, 72.8777], 12);
    }
  }

  clearAllRoutes() {
    // Clear route layers
    this.routeLayers.forEach(layer => {
      this.mapInstance.removeLayer(layer);
    });
    this.routeLayers.clear();

    // Clear markers
    this.clearMarkers();
  }

  clearMarkers() {
    this.markers.forEach(marker => {
      this.mapInstance.removeLayer(marker);
    });
    this.markers.clear();
  }

  toggleLegend() {
    if (!this.mapInstance) return;

    if (this.legendVisible) {
      this.mapInstance.removeControl(this.legendControl);
    } else {
      this.legendControl.addTo(this.mapInstance);
    }

    this.legendVisible = !this.legendVisible;
  }

  showMapError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="map-error">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
        </div>
      `;
    }
  }

  // Utility methods for external access
  getMapInstance() {
    return this.mapInstance;
  }

  getRouteCount() {
    return this.routeLayers.size;
  }

  getRouteLayer(routeId) {
    return this.routeLayers.get(routeId);
  }
}

// Initialize enhanced map when script loads
window.enhancedMap = new EnhancedMap();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedMap;
}