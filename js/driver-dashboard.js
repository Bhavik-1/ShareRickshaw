/**
 * Driver Dashboard - Real-time booking management
 */

const API_BASE = "http://localhost:3000/api";
let socket = null;
let currentBookingId = null;
let isOnline = false;
let driverName = "";
let licensePlate = "";
let todaysTripsCount = 0;
let todaysEarnings = 0;

// DOM Elements
const onlineToggle = document.getElementById("onlineToggle");
const driverNameEl = document.getElementById("driverName");
const licensePlateEl = document.getElementById("licensePlate");
const bookingRequestsContainer = document.getElementById(
  "bookingRequestsContainer"
);
const activeBookingContainer = document.getElementById(
  "activeBookingContainer"
);
const logoutBtn = document.getElementById("logoutBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const startTripBtn = document.getElementById("startTripBtn");
const completeTripBtn = document.getElementById("completeTripBtn");
const updateLocationBtn = document.getElementById("updateLocationBtn");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const todaysTripsEl = document.getElementById("todaysTrips");
const todaysEarningsEl = document.getElementById("todaysEarnings");

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  // Check if user is autowala (driver)
  const userData = getUserData();

  console.log("User Data:", userData);
  console.log("User Role:", userData?.role);

  // Check if role is autowala
  if (!userData || userData.role !== "autowala") {
    console.warn("Access denied - User role:", userData?.role);
    showAccessDenied();
    return;
  }

  console.log("Access granted for autowala");
  loadDriverInfo();
  initializeSocket();
  setupEventListeners();
  updateOnlineStatus();
});

/**
 * Show access denied message
 */
function showAccessDenied() {
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5;">
      <div style="text-align: center; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🚫</div>
        <h1 style="margin: 0 0 0.5rem 0; color: #2C3E50;">Access Denied</h1>
        <p style="color: #666; margin: 0 0 1.5rem 0;">This dashboard is only for drivers (autowalas).</p>
        <a href="index.html" style="display: inline-block; padding: 0.75rem 1.5rem; background: #FF6B6B; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Back to Home</a>
      </div>
    </div>
  `;
}

/**
 * Load driver information from profile
 */
// File: js/driver-dashboard.js (Corrected loadDriverInfo function)

async function loadDriverInfo() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    // FIX: The backend returns data under the 'user' key, not data.data.autowala_details
    if (data.success && data.user) {
      // Data structure: { success: true, user: { driver_name: '...', license_plate: '...' } }
      const details = data.user;

      driverName = details.driver_name || "Driver";
      licensePlate = details.license_plate || "N/A";
      driverNameEl.textContent = driverName;
      licensePlateEl.textContent = licensePlate;
    }
  } catch (error) {
    console.error("Failed to load driver info:", error);
  }
}

/**
 * Initialize WebSocket connection
 */
function initializeSocket() {
  const token = getAuthToken();

  socket = io("http://localhost:3000", {
    auth: {
      token: token,
    },
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("booking_request", onIncomingBookingRequest);
  socket.on("booking_accepted", onBookingAccepted);
  socket.on("booking_cancelled", onBookingCancelled);
  socket.on("new_message", onNewMessage);
  socket.on("trip_started", onTripStarted);
  socket.on("trip_completed", onTripCompleted);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  onlineToggle.addEventListener("click", toggleOnlineStatus);
  logoutBtn.addEventListener("click", handleLogout);
  startTripBtn.addEventListener("click", handleStartTrip);
  completeTripBtn.addEventListener("click", handleCompleteTrip);
  updateLocationBtn.addEventListener("click", handleUpdateLocation);
  sendChatBtn.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSendMessage();
  });

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", switchTab);
  });
}

/**
 * Toggle online/offline status
 */
async function toggleOnlineStatus() {
  try {
    const token = getAuthToken();
    const newStatus = !isOnline;

    const response = await fetch(`${API_BASE}/driver-status/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        is_online: newStatus,
        availability_status: newStatus ? "available" : "busy",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update status");
    }

    isOnline = newStatus;
    updateOnlineStatus();
    showNotification(
      newStatus ? "You are now online" : "You are now offline",
      "info"
    );
  } catch (error) {
    console.error("Status update error:", error);
    showNotification(error.message, "error");
  }
}

/**
 * Update UI for online status
 */
function updateOnlineStatus() {
  if (isOnline) {
    onlineToggle.classList.remove("offline");
    onlineToggle.classList.add("online");
    onlineToggle.innerHTML =
      '<span class="status-indicator"></span><span class="status-text">Online</span>';
  } else {
    onlineToggle.classList.remove("online");
    onlineToggle.classList.add("offline");
    onlineToggle.innerHTML =
      '<span class="status-indicator"></span><span class="status-text">Offline</span>';
  }
}

/**
 * Handle incoming booking request
 */
function onIncomingBookingRequest(data) {
  console.log("New booking request:", data);

  if (!isOnline) return; // Ignore requests if offline

  const card = createRequestCard(data);
  bookingRequestsContainer.innerHTML = "";
  bookingRequestsContainer.appendChild(card);
  showNotification("New booking request!", "success");
}

/**
 * Create booking request card
 */
function createRequestCard(bookingData) {
  const card = document.createElement("div");
  card.className = "request-card";

  const pickupAddress = bookingData.pickup_address || "Pickup";
  const destAddress = bookingData.destination_address || "Destination";
  const fare = bookingData.estimated_fare || 0;

  card.innerHTML = `
    <div class="request-header">
      <div>
        <div class="request-time">Just now</div>
      </div>
      <div class="request-fare">₹${fare}</div>
    </div>
    <div class="request-location">
      <span>📍</span>
      <div>
        <div><strong>From:</strong> ${pickupAddress}</div>
        <div><strong>To:</strong> ${destAddress}</div>
      </div>
    </div>
    <div class="request-actions">
      <button class="btn-accept" onclick="acceptBooking(${bookingData.booking_id})">Accept</button>
      <button class="btn-reject" onclick="rejectBooking(${bookingData.booking_id})">Reject</button>
    </div>
  `;

  return card;
}

/**
 * Accept booking
 */
async function acceptBooking(bookingId) {
  try {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE}/bookings/${bookingId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to accept booking");
    }

    currentBookingId = bookingId;
    showNotification("Booking accepted!", "success");
    clearRequests();
    loadBookingDetails(bookingId);
  } catch (error) {
    console.error("Accept booking error:", error);
    showNotification(error.message, "error");
  }
}

/**
 * Reject booking
 */
async function rejectBooking(bookingId) {
  const reason = prompt("Reason for rejection (optional):");

  try {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE}/bookings/${bookingId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: reason || "Driver rejected",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to reject booking");
    }

    showNotification("Booking rejected", "info");
    clearRequests();
  } catch (error) {
    console.error("Reject booking error:", error);
    showNotification(error.message, "error");
  }
}

/**
 * Handle booking accepted
 */
function onBookingAccepted(data) {
  console.log("Booking accepted:", data);
  currentBookingId = data.booking_id;
  loadBookingDetails(data.booking_id);
}

/**
 * Handle booking cancelled
 */
function onBookingCancelled(data) {
  console.log("Booking cancelled:", data);
  showNotification(`Booking cancelled: ${data.reason}`, "warning");
  clearBooking();
}

/**
 * Load booking details
 */
async function loadBookingDetails(bookingId) {
  try {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load booking");
    }

    const booking = data.data;

    // Update UI
    document.getElementById("tripPickup").textContent = booking.pickup_address;
    document.getElementById("tripDestination").textContent =
      booking.destination_address;
    document.getElementById(
      "tripFare"
    ).textContent = `₹${booking.estimated_fare}`;
    document.getElementById("tripStatus").textContent = booking.status;

    // Update buttons
    if (booking.status === "accepted") {
      startTripBtn.classList.remove("hidden");
      completeTripBtn.classList.add("hidden");
    } else if (booking.status === "in_transit") {
      startTripBtn.classList.add("hidden");
      completeTripBtn.classList.remove("hidden");
    }

    // Load messages
    loadChatHistory(bookingId);

    // Update active booking display
    updateActiveBookingDisplay(booking);
  } catch (error) {
    console.error("Load booking error:", error);
  }
}

/**
 * Update active booking display
 */
function updateActiveBookingDisplay(booking) {
  const card = document.createElement("div");
  card.className = "active-booking-card";

  card.innerHTML = `
    <div class="booking-header">Active Booking</div>
    <div class="booking-detail">
      <span class="detail-label">From:</span>
      <span class="detail-value">${booking.pickup_address}</span>
    </div>
    <div class="booking-detail">
      <span class="detail-label">To:</span>
      <span class="detail-value">${booking.destination_address}</span>
    </div>
    <div class="booking-detail">
      <span class="detail-label">Fare:</span>
      <span class="detail-value">₹${booking.estimated_fare}</span>
    </div>
    <div class="booking-detail">
      <span class="detail-label">Status:</span>
      <span class="detail-value">${booking.status.toUpperCase()}</span>
    </div>
  `;

  activeBookingContainer.innerHTML = "";
  activeBookingContainer.appendChild(card);
}

/**
 * Handle start trip
 */
async function handleStartTrip() {
  if (!currentBookingId) return;

  try {
    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE}/bookings/${currentBookingId}/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to start trip");
    }

    showNotification("Trip started!", "success");
    startTripBtn.classList.add("hidden");
    completeTripBtn.classList.remove("hidden");
    loadBookingDetails(currentBookingId);
  } catch (error) {
    console.error("Start trip error:", error);
    showNotification(error.message, "error");
  }
}

/**
 * Handle complete trip
 */
async function handleCompleteTrip() {
  if (!currentBookingId) return;

  try {
    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE}/bookings/${currentBookingId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to complete trip");
    }

    // Update earnings
    const booking = await loadBookingDetails(currentBookingId);

    showNotification("Trip completed! Thank you!", "success");
    setTimeout(() => {
      clearBooking();
    }, 2000);
  } catch (error) {
    console.error("Complete trip error:", error);
    showNotification(error.message, "error");
  }
}

/**
 * Handle trip started event
 */
function onTripStarted(data) {
  console.log("Trip started:", data);
  startTripBtn.classList.add("hidden");
  completeTripBtn.classList.remove("hidden");
}

/**
 * Handle trip completed event
 */
function onTripCompleted(data) {
  console.log("Trip completed:", data);
  todaysTripsCount++;
  todaysTripsEl.textContent = todaysTripsCount;

  const fareEl = document.getElementById("tripFare");
  if (fareEl && fareEl.textContent) {
    const fare = parseInt(fareEl.textContent.replace("₹", "")) || 0;
    todaysEarnings += fare;
    todaysEarningsEl.textContent = `₹${todaysEarnings}`;
  }

  showNotification("Trip completed!", "success");
  clearBooking();
}

/**
 * Handle update location
 */
async function handleUpdateLocation() {
  if (!navigator.geolocation) {
    showNotification("Geolocation not supported", "error");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const token = getAuthToken();

        const response = await fetch(`${API_BASE}/driver-status/location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: latitude,
            longitude: longitude,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to update location");
        }

        document.getElementById(
          "currentLocation"
        ).textContent = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(
          4
        )}`;
        document.getElementById("locationStatus").textContent =
          "Location updated ✓";
        showNotification("Location updated", "success");
      } catch (error) {
        console.error("Location update error:", error);
        showNotification(error.message, "error");
      }
    },
    (error) => {
      showNotification("Failed to get location: " + error.message, "error");
    }
  );
}

/**
 * Load chat history
 */
async function loadChatHistory(bookingId) {
  try {
    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE}/bookings/${bookingId}/messages?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load messages");
    }

    chatMessages.innerHTML = "";

    data.data.messages.forEach((msg) => {
      addMessageToChat({
        sender_role: msg.sender_role,
        message_text: msg.message_text,
        created_at: msg.created_at,
      });
    });
  } catch (error) {
    console.error("Load chat error:", error);
  }
}

/**
 * Handle send message
 */
async function handleSendMessage() {
  const message = chatInput.value.trim();

  if (!message || !currentBookingId) {
    return;
  }

  try {
    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE}/bookings/${currentBookingId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send message");
    }

    addMessageToChat({
      sender_role: "driver",
      message_text: message,
      created_at: new Date().toISOString(),
    });

    chatInput.value = "";
  } catch (error) {
    console.error("Send message error:", error);
    showNotification(error.message, "error");
  }
}

/**
 * Handle new message
 */
function onNewMessage(data) {
  console.log("New message:", data);
  addMessageToChat({
    sender_role: data.sender_role,
    message_text: data.message_text,
    created_at: data.created_at,
  });
}

/**
 * Add message to chat UI
 */
function addMessageToChat(message) {
  const msgEl = document.createElement("div");
  msgEl.className = `chat-message ${message.sender_role}`;

  const time = new Date(message.created_at).toLocaleTimeString();

  msgEl.innerHTML = `
    <div>${message.message_text}</div>
    <div class="chat-message-time">${time}</div>
  `;

  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Switch tabs
 */
function switchTab(e) {
  const tabName = e.target.dataset.tab;

  // Update buttons
  tabButtons.forEach((btn) => btn.classList.remove("active"));
  e.target.classList.add("active");

  // Update content
  tabContents.forEach((content) => content.classList.remove("active"));
  document.getElementById(tabName + "Tab").classList.add("active");
}

/**
 * Clear booking
 */
function clearBooking() {
  currentBookingId = null;
  activeBookingContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🚕</div>
      <p>No active booking</p>
    </div>
  `;
  chatMessages.innerHTML = "";
  chatInput.value = "";
  startTripBtn.classList.add("hidden");
  completeTripBtn.classList.add("hidden");
}

/**
 * Clear requests
 */
function clearRequests() {
  bookingRequestsContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <p>Waiting for booking requests...</p>
    </div>
  `;
}

/**
 * Show notification
 */
function showNotification(message, type = "info") {
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Get auth token
 */
function getAuthToken() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

/**
 * Handle logout
 */
function handleLogout(e) {
  e.preventDefault();
  logout();
}
