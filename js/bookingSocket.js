/**
 * Booking Socket.io Client
 * Handles real-time WebSocket communication for booking status updates
 */

let socket = null;
let currentBookingId = null;

/**
 * Initialize WebSocket connection
 */
function initializeSocket() {
  const token = localStorage.getItem('authToken');

  if (!token) {
    console.error('No auth token found');
    return;
  }

  // Connect to server
  socket = io('http://localhost:3000', {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection events
  socket.on('connect', onSocketConnect);
  socket.on('disconnect', onSocketDisconnect);
  socket.on('connect_error', onSocketError);

  // Booking events
  socket.on('booking_accepted', onBookingAccepted);
  socket.on('booking_rejected', onBookingRejected);
  socket.on('trip_started', onTripStarted);
  socket.on('trip_completed', onTripCompleted);
  socket.on('booking_cancelled', onBookingCancelled);
  socket.on('driver_location_update', onDriverLocationUpdate);
  socket.on('new_message', onNewMessage);
}

/**
 * Socket connected
 */
function onSocketConnect() {
  console.log('WebSocket connected');
}

/**
 * Socket disconnected
 */
function onSocketDisconnect() {
  console.log('WebSocket disconnected');
}

/**
 * Socket error
 */
function onSocketError(error) {
  console.error('WebSocket error:', error);
}

/**
 * Booking accepted by driver
 */
function onBookingAccepted(data) {
  console.log('Booking accepted:', data);

  if (!window.bookingPageFunctions) return;

  // Update current booking ID
  currentBookingId = data.booking_id;

  // Show active booking section
  window.bookingPageFunctions.showActiveBooking({
    driver_name: data.driver_name,
    license_plate: data.license_plate
  });

  // Show notification
  showNotification('Driver accepted your booking!', 'success');
}

/**
 * Booking rejected by driver
 */
function onBookingRejected(data) {
  console.log('Booking rejected:', data);

  showNotification(`Booking rejected: ${data.reason}`, 'error');

  // Optionally return to form or try again
  setTimeout(() => {
    if (window.bookingPageFunctions) {
      window.bookingPageFunctions.handleNewRide();
    }
  }, 2000);
}

/**
 * Trip started by driver
 */
function onTripStarted(data) {
  console.log('Trip started:', data);

  currentBookingId = data.booking_id;

  // Update trip status display
  const tripStatusEl = document.getElementById('tripStatus');
  if (tripStatusEl) {
    tripStatusEl.textContent = 'Trip started - Driver is coming';
  }

  showNotification('Driver has started the trip', 'info');
}

/**
 * Trip completed by driver
 */
function onTripCompleted(data) {
  console.log('Trip completed:', data);

  currentBookingId = data.booking_id;

  // Show trip completed section
  if (window.bookingPageFunctions) {
    window.bookingPageFunctions.showTripCompleted();
  }

  showNotification('Trip completed! Thank you for using ShareRickshaw.', 'success');
}

/**
 * Booking cancelled by user
 */
function onBookingCancelled(data) {
  console.log('Booking cancelled:', data);

  showNotification('Booking was cancelled', 'info');
}

/**
 * Driver location update (for users in active booking)
 */
function onDriverLocationUpdate(data) {
  console.log('Driver location update:', data);

  if (data.booking_id !== currentBookingId) return;

  // Update map with new driver location
  updateDriverLocationOnMap(data.latitude, data.longitude);

  // Calculate distance from user to driver
  calculateAndDisplayDistance(data.latitude, data.longitude);

  // Update ETA if possible
  updateETA(data);
}

/**
 * New message from other party
 */
function onNewMessage(data) {
  console.log('New message:', data);

  if (data.booking_id !== currentBookingId) return;

  // Add message to chat
  addMessageToChat({
    sender_role: data.sender_role,
    message_text: data.message_text,
    created_at: data.created_at
  });

  // Show notification if chat is not focused
  if (!isChatFocused()) {
    showNotification(`${data.sender_role === 'driver' ? 'Driver' : 'You'}: ${data.message_text}`, 'info');
  }
}

/**
 * Update driver location on map
 */
function updateDriverLocationOnMap(latitude, longitude) {
  // This would be integrated with actual map library
  console.log(`Driver location: ${latitude}, ${longitude}`);

  // Update map marker
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.title = `Driver at: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

/**
 * Update ETA display
 */
function updateETA(locationData) {
  // This would calculate ETA based on driver location and destination
  const etaEl = document.querySelector('.eta');
  if (etaEl) {
    etaEl.textContent = 'ETA: ~5 minutes';
  }
}

/**
 * Add message to chat display
 */
function addMessageToChat(message) {
  const messagesList = document.getElementById('messagesList');
  if (!messagesList) return;

  const messageEl = document.createElement('div');
  messageEl.className = `message ${message.sender_role}`;

  const now = new Date(message.created_at);
  const timeStr = now.toLocaleTimeString();

  messageEl.innerHTML = `
    <div>${message.message_text}</div>
    <div class="message-time">${timeStr}</div>
  `;

  messagesList.appendChild(messageEl);
  messagesList.scrollTop = messagesList.scrollHeight;
}

/**
 * Check if chat is focused
 */
function isChatFocused() {
  const chatPanel = document.getElementById('chatPanel');
  return chatPanel && !chatPanel.classList.contains('hidden');
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Simple notification display
  console.log(`[${type.toUpperCase()}] ${message}`);

  // Could integrate with toast library here
  if (type === 'success') {
    console.log('✓', message);
  } else if (type === 'error') {
    console.error('✗', message);
  }
}

/**
 * Send chat message via WebSocket
 */
function sendMessageViaSocket(bookingId, message) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }

  socket.emit('send_message', {
    booking_id: bookingId,
    message: message
  });

  return true;
}

/**
 * Set current booking ID
 */
function setCurrentBookingId(bookingId) {
  currentBookingId = bookingId;
}

/**
 * Get current booking ID
 */
function getCurrentBookingId() {
  return currentBookingId;
}

/**
 * Disconnect socket
 */
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}

// Initialize socket when page loads
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    initializeSocket();
  }
});

// Disconnect socket when page unloads
window.addEventListener('beforeunload', () => {
  disconnectSocket();
});

/**
 * Export functions for global access
 */
window.bookingSocket = {
  initializeSocket,
  setCurrentBookingId,
  getCurrentBookingId,
  sendMessageViaSocket,
  disconnectSocket,
  addMessageToChat
};
