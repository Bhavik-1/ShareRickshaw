/**
 * Booking Page - Form Handling and API Integration
 * Manages user interactions for booking creation and status updates
 */

const API_BASE = 'http://localhost:3000/api';
let currentBookingId = null;
let mapInstance = null;
let mapModal = null;
let selectedLocation = { lat: 19.0760, lng: 72.8777 };
let isSelectingPickup = false;

// DOM Elements
const rideRequestForm = document.getElementById('rideRequestForm');
const pickupAddressInput = document.getElementById('pickupAddress');
const destinationAddressInput = document.getElementById('destinationAddress');
const pickupLatInput = document.getElementById('pickupLatitude');
const pickupLngInput = document.getElementById('pickupLongitude');
const destinationLatInput = document.getElementById('destinationLatitude');
const destinationLngInput = document.getElementById('destinationLongitude');
const estimatedFareInput = document.getElementById('estimatedFare');
const fareAmountDisplay = document.getElementById('fareAmount');
const requestRideBtn = document.getElementById('requestRideBtn');
const useMyLocationBtn = document.getElementById('useMyLocationBtn');
const pickOnMapBtn = document.getElementById('pickOnMapBtn');
const cancelBookingBtn = document.getElementById('cancelBookingBtn');
const newRideBtn = document.getElementById('newRideBtn');
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');

// Sections
const bookingFormSection = document.getElementById('bookingForm');
const bookingStatusSection = document.getElementById('bookingStatus');
const activeBookingSection = document.getElementById('activeBooking');
const tripCompletedSection = document.getElementById('tripCompleted');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  requireAuth();

  // Add event listeners
  rideRequestForm.addEventListener('submit', handleBookingSubmit);
  useMyLocationBtn.addEventListener('click', handleUseMyLocation);
  pickOnMapBtn.addEventListener('click', handlePickOnMap);
  cancelBookingBtn.addEventListener('click', handleCancelBooking);
  newRideBtn.addEventListener('click', handleNewRide);
  logoutBtn.addEventListener('click', handleLogout);
  logoutBtnMobile.addEventListener('click', handleLogout);

  // Initialize map modal
  initializeMapModal();

  // Calculate fare when addresses change
  pickupAddressInput.addEventListener('change', calculateFare);
  destinationAddressInput.addEventListener('change', calculateFare);
});

/**
 * Handle use my location button
 */
function handleUseMyLocation(e) {
  e.preventDefault();

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        console.log(`Got geolocation: ${latitude}, ${longitude}`);

        pickupLatInput.value = latitude.toFixed(8);
        pickupLngInput.value = longitude.toFixed(8);

        // Use reverse geocoding to get address (simplified)
        pickupAddressInput.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        console.log(`Set pickup coords - Lat: ${pickupLatInput.value}, Lng: ${pickupLngInput.value}`);

        // Trigger fare calculation if destination is also set
        setTimeout(() => {
          calculateFare();
        }, 100);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enter it manually.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser.');
  }
}

/**
 * Handle pick on map button
 */
function handlePickOnMap(e) {
  e.preventDefault();
  isSelectingPickup = false;
  mapModal.classList.remove('hidden');
}

/**
 * Initialize map modal with map functionality
 */
function initializeMapModal() {
  mapModal = document.getElementById('mapModal');
  const mapElement = document.getElementById('mapModalMap');
  const confirmBtn = document.getElementById('confirmMapBtn');
  const cancelBtn = document.getElementById('cancelMapBtn');
  const closeBtn = document.getElementById('closeMapModal');

  confirmBtn.addEventListener('click', confirmMapSelection);
  cancelBtn.addEventListener('click', closeMapModal);
  closeBtn.addEventListener('click', closeMapModal);

  // Predefined locations in Mumbai for easy selection
  const mumbaiLocations = [
    { name: 'Gateway of India', lat: 18.9520, lng: 72.8347 },
    { name: 'Bandra', lat: 19.0596, lng: 72.8295 },
    { name: 'Dadar', lat: 19.0176, lng: 72.8479 },
    { name: 'Andheri', lat: 19.1136, lng: 72.8697 },
    { name: 'Borivali', lat: 19.2183, lng: 72.8506 },
    { name: 'Thane', lat: 19.2183, lng: 72.9781 },
    { name: 'Colaba', lat: 18.9676, lng: 72.8194 },
    { name: 'Worli', lat: 19.0176, lng: 72.8194 }
  ];

  // Create location buttons in map element
  mapElement.style.background = '#f5f5f5';
  mapElement.style.display = 'grid';
  mapElement.style.gridTemplateColumns = 'repeat(2, 1fr)';
  mapElement.style.gap = '10px';
  mapElement.style.padding = '15px';
  mapElement.style.overflowY = 'auto';
  mapElement.innerHTML = '';

  mumbaiLocations.forEach(location => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      padding: 12px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    `;
    btn.textContent = location.name;
    btn.addEventListener('mouseover', () => {
      btn.style.borderColor = '#FF6B6B';
      btn.style.background = '#fff5f5';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.borderColor = '#ddd';
      btn.style.background = 'white';
    });
    btn.addEventListener('click', () => {
      selectedLocation = {
        lat: location.lat,
        lng: location.lng
      };
      console.log(`Selected location: ${location.name} - (${location.lat}, ${location.lng})`);
      btn.style.borderColor = '#51CF66';
      btn.style.background = '#f1fae4';
    });
    mapElement.appendChild(btn);
  });

  // Add custom location input at the bottom
  const customDiv = document.createElement('div');
  customDiv.style.cssText = `
    grid-column: 1 / -1;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 6px;
    background: #f9f9f9;
  `;
  customDiv.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: 600;">Or enter coordinates:</div>
    <input type="number" id="customLat" placeholder="Latitude (18.8-19.3)" step="0.0001" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 4px;">
    <input type="number" id="customLng" placeholder="Longitude (72.7-73.0)" step="0.0001" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
  `;
  mapElement.appendChild(customDiv);

  // Handle custom coordinates
  mapElement.addEventListener('change', (e) => {
    if (e.target.id === 'customLat' || e.target.id === 'customLng') {
      const customLat = parseFloat(document.getElementById('customLat').value);
      const customLng = parseFloat(document.getElementById('customLng').value);
      if (customLat && customLng && customLat >= 18.8 && customLat <= 19.3 && customLng >= 72.7 && customLng <= 73.0) {
        selectedLocation = {
          lat: customLat,
          lng: customLng
        };
        console.log(`Selected custom location: (${customLat}, ${customLng})`);
      }
    }
  });
}

/**
 * Close map modal
 */
function closeMapModal() {
  mapModal.classList.add('hidden');
}

/**
 * Confirm map selection
 */
function confirmMapSelection() {
  destinationLatInput.value = selectedLocation.lat.toFixed(8);
  destinationLngInput.value = selectedLocation.lng.toFixed(8);
  destinationAddressInput.value = `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`;

  console.log(`Set destination coords - Lat: ${destinationLatInput.value}, Lng: ${destinationLngInput.value}`);

  closeMapModal();

  // Trigger fare calculation
  setTimeout(() => {
    calculateFare();
  }, 100);
}

/**
 * Calculate estimated fare (simplified)
 */
function calculateFare() {
  const pickupLat = parseFloat(pickupLatInput.value);
  const pickupLng = parseFloat(pickupLngInput.value);
  const destLat = parseFloat(destinationLatInput.value);
  const destLng = parseFloat(destinationLngInput.value);

  // Check if all coordinates are present and valid
  if (!pickupLat || !pickupLng || !destLat || !destLng ||
      isNaN(pickupLat) || isNaN(pickupLng) || isNaN(destLat) || isNaN(destLng)) {
    console.log('Not all coordinates set yet');
    return;
  }

  console.log(`Calculating fare from (${pickupLat}, ${pickupLng}) to (${destLat}, ${destLng})`);

  // Simplified fare calculation based on distance
  const distance = calculateDistance(pickupLat, pickupLng, destLat, destLng);
  console.log(`Distance: ${distance.toFixed(2)} km`);

  const farePerKm = 15; // ₹15 per km
  const baseFare = 50; // ₹50 base fare
  const fare = Math.round(baseFare + distance * farePerKm);

  console.log(`Calculated fare: ₹${fare}`);

  // Ensure fare is within bounds
  const finalFare = Math.max(10, Math.min(1000, fare));

  estimatedFareInput.value = finalFare;
  fareAmountDisplay.textContent = `₹${finalFare}`;

  console.log(`Final fare: ₹${finalFare}`);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Handle booking form submission
 */
async function handleBookingSubmit(e) {
  e.preventDefault();

  // Clear previous errors
  clearErrors();

  // Validate form
  const errors = validateBookingForm();
  if (Object.keys(errors).length > 0) {
    displayErrors(errors);
    return;
  }

  // Show loading state
  requestRideBtn.disabled = true;
  requestRideBtn.textContent = 'Creating booking...';

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pickup_latitude: parseFloat(pickupLatInput.value),
        pickup_longitude: parseFloat(pickupLngInput.value),
        pickup_address: pickupAddressInput.value,
        destination_latitude: parseFloat(destinationLatInput.value),
        destination_longitude: parseFloat(destinationLngInput.value),
        destination_address: destinationAddressInput.value,
        estimated_fare: parseFloat(estimatedFareInput.value)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create booking');
    }

    // Success - store booking ID and show confirmation
    currentBookingId = data.data.booking_id;
    showBookingConfirmation(data.data);

  } catch (error) {
    console.error('Booking error:', error);
    document.getElementById('formError').textContent = error.message;
    document.getElementById('formError').style.display = 'block';
  } finally {
    requestRideBtn.disabled = false;
    requestRideBtn.textContent = 'Request Ride';
  }
}

/**
 * Validate booking form
 */
function validateBookingForm() {
  const errors = {};

  if (!pickupAddressInput.value.trim() || pickupAddressInput.value.trim().length < 5) {
    errors.pickup = 'Pickup address required (5+ characters)';
  }

  if (!destinationAddressInput.value.trim() || destinationAddressInput.value.trim().length < 5) {
    errors.destination = 'Destination address required (5+ characters)';
  }

  if (!pickupLatInput.value || !pickupLngInput.value) {
    errors.pickup_location = 'Pickup location not set';
  }

  if (!destinationLatInput.value || !destinationLngInput.value) {
    errors.destination_location = 'Destination location not set';
  }

  const fare = parseFloat(estimatedFareInput.value);
  if (!fare || fare < 10 || fare > 1000) {
    errors.fare = 'Invalid fare (must be ₹10 - ₹1000)';
  }

  return errors;
}

/**
 * Display form errors
 */
function displayErrors(errors) {
  if (errors.pickup) {
    showError('pickupAddressError', errors.pickup);
  }
  if (errors.destination) {
    showError('destinationAddressError', errors.destination);
  }
  if (errors.fare) {
    document.getElementById('formError').textContent = errors.fare;
    document.getElementById('formError').style.display = 'block';
  }
}

/**
 * Show error message
 */
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

/**
 * Clear all errors
 */
function clearErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

/**
 * Show booking status section
 */
function showBookingStatus() {
  bookingFormSection.classList.remove('active');
  bookingStatusSection.classList.add('active');

  // Populate status details
  document.getElementById('statusPickup').textContent = pickupAddressInput.value;
  document.getElementById('statusDestination').textContent = destinationAddressInput.value;
  document.getElementById('statusFare').textContent = `₹${estimatedFareInput.value}`;
  document.getElementById('statusBookingId').textContent = currentBookingId;
}

/**
 * Handle cancel booking
 */
async function handleCancelBooking(e) {
  e.preventDefault();

  if (!currentBookingId) return;

  if (!confirm('Are you sure you want to cancel this booking?')) {
    return;
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/bookings/${currentBookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reason: 'User cancelled'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel booking');
    }

    // Return to form
    handleNewRide();

  } catch (error) {
    console.error('Cancel booking error:', error);
    alert('Error cancelling booking: ' + error.message);
  }
}

/**
 * Handle new ride button
 */
function handleNewRide() {
  // Reset form
  rideRequestForm.reset();
  pickupLatInput.value = '';
  pickupLngInput.value = '';
  destinationLatInput.value = '';
  destinationLngInput.value = '';
  estimatedFareInput.value = '0';
  fareAmountDisplay.textContent = '₹0';
  currentBookingId = null;

  // Clear errors
  clearErrors();

  // Show form section
  bookingFormSection.classList.add('active');
  bookingStatusSection.classList.remove('active');
  activeBookingSection.classList.remove('active');
  tripCompletedSection.classList.remove('active');
}

/**
 * Show active booking section with map
 */
function showActiveBooking(driverData) {
  bookingStatusSection.classList.remove('active');
  activeBookingSection.classList.add('active');

  // Update driver info
  if (driverData) {
    document.getElementById('driverName').textContent = driverData.driver_name || 'Driver';
    document.getElementById('licenseePlate').textContent = driverData.license_plate || 'N/A';
  }

  // Initialize map (simplified)
  initializeMap();
}

/**
 * Initialize map on active booking
 */
function initializeMap() {
  const mapContainer = document.getElementById('map');
  mapContainer.style.background = '#e0e0e0';
  mapContainer.innerHTML = '<p style="padding: 20px; text-align: center;">Live driver location map</p>';
}

/**
 * Show trip completed section
 */
function showTripCompleted() {
  activeBookingSection.classList.remove('active');
  tripCompletedSection.classList.add('active');

  // Populate trip summary (simplified)
  const now = new Date();
  document.getElementById('startTime').textContent = now.toLocaleTimeString();
  document.getElementById('endTime').textContent = new Date(now.getTime() + 10 * 60000).toLocaleTimeString();
  document.getElementById('tripDuration').textContent = '10 minutes';
  document.getElementById('tripFare').textContent = `₹${estimatedFareInput.value}`;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

/**
 * Handle logout
 */
function handleLogout(e) {
  e.preventDefault();
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
}

/**
 * Export functions for bookingSocket.js
 */
window.bookingPageFunctions = {
  showActiveBooking,
  showTripCompleted,
  handleNewRide
};
