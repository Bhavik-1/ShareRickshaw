/**
 * Location Service
 * Handles GPS location capturing, map generation, and location utilities
 */

class LocationService {
  constructor() {
    this.lastKnownLocation = null;
    this.watchId = null;
    this.isTracking = false;
  }

  /**
   * Get current GPS location with high accuracy
   * @param {Object} options - Location options
   * @returns {Promise<Object>} Location data
   */
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds
      maximumAge: 30000 // 30 seconds
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };

          // Store last known location
          this.lastKnownLocation = location;

          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unknown error occurred';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your GPS connection.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }

          reject(new Error(errorMessage));
        },
        finalOptions
      );
    });
  }

  /**
   * Start continuous location tracking
   * @param {Function} callback - Callback function for location updates
   * @param {Object} options - Location options
   */
  startLocationTracking(callback, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    const finalOptions = { ...defaultOptions, ...options };

    if (this.isTracking) {
      this.stopLocationTracking();
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        this.lastKnownLocation = location;
        callback(location);
      },
      (error) => {
        console.error('Location tracking error:', error);
        callback(null, error);
      },
      finalOptions
    );

    this.isTracking = true;
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  /**
   * Get last known location (from cache)
   * @returns {Object|null} Last known location or null
   */
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  /**
   * Generate Google Maps URL for coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} zoom - Zoom level (default: 18)
   * @returns {string} Google Maps URL
   */
  generateGoogleMapsUrl(latitude, longitude, zoom = 18) {
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`;
  }

  /**
   * Generate Apple Maps URL for coordinates (for iOS devices)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {string} Apple Maps URL
   */
  generateAppleMapsUrl(latitude, longitude) {
    return `maps://maps.google.com/maps?q=${latitude},${longitude}`;
  }

  /**
   * Generate static map image URL using OpenStreetMap
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {Object} options - Map options
   * @returns {string} Static map URL
   */
  generateStaticMapUrl(latitude, longitude, options = {}) {
    const defaultOptions = {
      width: 600,
      height: 400,
      zoom: 16,
      markerColor: 'red'
    };

    const opts = { ...defaultOptions, ...options };

    // Using OpenStreetMap via static map provider
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${opts.zoom}&size=${opts.width}x${opts.height}&maptype=mapnik&markers=${latitude},${longitude},red`;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Format coordinates for display
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {string} Formatted coordinates
   */
  formatCoordinates(latitude, longitude) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  /**
   * Get location accuracy description
   * @param {number} accuracy - Accuracy in meters
   * @returns {string} Accuracy description
   */
  getAccuracyDescription(accuracy) {
    if (accuracy < 10) {
      return 'Excellent (±' + Math.round(accuracy) + 'm)';
    } else if (accuracy < 50) {
      return 'Good (±' + Math.round(accuracy) + 'm)';
    } else if (accuracy < 100) {
      return 'Fair (±' + Math.round(accuracy) + 'm)';
    } else {
      return 'Poor (±' + Math.round(accuracy) + 'm)';
    }
  }

  /**
   * Check if location is within Mumbai bounds (approximate)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {boolean} True if within Mumbai bounds
   */
  isWithinMumbai(latitude, longitude) {
    // Approximate Mumbai bounds
    const mumbaiBounds = {
      north: 19.27,
      south: 18.89,
      east: 72.99,
      west: 72.77
    };

    return latitude >= mumbaiBounds.south &&
           latitude <= mumbaiBounds.north &&
           longitude >= mumbaiBounds.west &&
           longitude <= mumbaiBounds.east;
  }

  /**
   * Get address from coordinates using reverse geocoding
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<Object>} Address data
   */
  async reverseGeocode(latitude, longitude) {
    try {
      // Using Nominatim reverse geocoding (free OpenStreetMap service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ShareRickshaw App (emergency location service)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();

      return {
        display_name: data.display_name,
        address: data.address,
        city: data.address?.city || data.address?.town || 'Unknown',
        state: data.address?.state || 'Unknown',
        country: data.address?.country || 'Unknown',
        postcode: data.address?.postcode || null
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Create location object for API calls
   * @param {Object} locationData - Raw location data
   * @returns {Object} Formatted location object
   */
  createLocationObject(locationData) {
    return {
      latitude: parseFloat(locationData.latitude.toFixed(6)),
      longitude: parseFloat(locationData.longitude.toFixed(6)),
      accuracy: Math.round(locationData.accuracy),
      timestamp: new Date().toISOString(),
      googleMapsUrl: this.generateGoogleMapsUrl(locationData.latitude, locationData.longitude),
      appleMapsUrl: this.generateAppleMapsUrl(locationData.latitude, locationData.longitude),
      staticMapUrl: this.generateStaticMapUrl(locationData.latitude, locationData.longitude),
      coordinatesFormatted: this.formatCoordinates(locationData.latitude, locationData.longitude),
      accuracyDescription: this.getAccuracyDescription(locationData.accuracy),
      isWithinMumbai: this.isWithinMumbai(locationData.latitude, locationData.longitude)
    };
  }

  /**
   * Capture current location for SOS alert
   * @returns {Promise<Object>} Location data ready for SOS
   */
  async captureSOSLocation() {
    try {
      console.log('LocationService: Starting SOS location capture...');

      // First try: High accuracy location with longer timeout
      let rawLocation = await this.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds timeout for emergency
        maximumAge: 5000 // Use very fresh location (5 seconds max age)
      });

      console.log('LocationService: First attempt - Accuracy:', rawLocation.accuracy, 'meters');

      // If accuracy is poor (>1000m), try again with different settings
      if (rawLocation.accuracy > 1000) {
        console.log('LocationService: Poor accuracy detected, retrying...');

        try {
          // Second attempt: Moderate accuracy settings
          rawLocation = await this.getCurrentLocation({
            enableHighAccuracy: true,
            timeout: 25000,
            maximumAge: 1000
          });
          console.log('LocationService: Second attempt - Accuracy:', rawLocation.accuracy, 'meters');
        } catch (error) {
          console.warn('LocationService: Second attempt failed:', error.message);
        }
      }

      // If still poor accuracy, try one more time with different settings
      if (rawLocation.accuracy > 1000) {
        console.log('LocationService: Still poor accuracy, final attempt...');

        try {
          // Third attempt: Standard GPS settings
          rawLocation = await this.getCurrentLocation({
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 30000
          });
          console.log('LocationService: Final attempt - Accuracy:', rawLocation.accuracy, 'meters');
        } catch (error) {
          console.warn('LocationService: Final attempt failed:', error.message);
        }
      }

      // Create formatted location object
      const location = this.createLocationObject(rawLocation);

      // Log final accuracy
      console.log('LocationService: Final location accuracy:', location.accuracy, 'meters');

      // Show user-friendly accuracy warning if needed
      if (location.accuracy > 1000) {
        console.warn('LocationService: Warning - Location accuracy is poor:', this.getAccuracyDescription(location.accuracy));
      }

      // Try to get address (non-blocking, don't fail if geocoding fails)
      this.reverseGeocode(rawLocation.latitude, rawLocation.longitude)
        .then(address => {
          if (address) {
            location.address = address;
          }
        })
        .catch(error => {
          console.log('Could not get address for location:', error.message);
        });

      return location;

    } catch (error) {
      // If GPS fails, try to use last known location
      if (this.lastKnownLocation) {
        console.warn('GPS failed, using last known location:', error.message);
        return this.createLocationObject(this.lastKnownLocation);
      }

      throw error;
    }
  }

  /**
   * Check location permissions
   * @returns {Promise<string>} Permission state
   */
  async checkLocationPermissions() {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
      } catch (error) {
        // Some browsers don't support permissions API
        return 'unknown';
      }
    }

    return 'unknown';
  }

  /**
   * Request location permissions
   * @returns {Promise<Object>} Location data or error
   */
  async requestLocationPermissions() {
    try {
      return await this.getCurrentLocation({
        enableHighAccuracy: false, // Low accuracy for permission request
        timeout: 5000,
        maximumAge: 60000 // Accept old location for permission check
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopLocationTracking();
    this.lastKnownLocation = null;
  }
}

// Create singleton instance
const locationService = new LocationService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = locationService;
} else if (typeof window !== 'undefined') {
  window.locationService = locationService;
}