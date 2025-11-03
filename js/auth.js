// Auth utility functions for navigation and authentication

// API base URL
const API_BASE_URL = "http://localhost:3000/api";
// Get JWT token from localStorage
function getToken() {
  return localStorage.getItem("authToken");
}

// Get user data from localStorage
function getUserData() {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

// Check if user is logged in
function isLoggedIn() {
  return getToken() !== null;
}

// Logout function
function logout() {
  // Clear localStorage
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");

  // Redirect to home page
  window.location.href = "index.html";
}

// Update navigation bar based on auth status
function updateNavBar() {
  const navLinks = document.getElementById("nav-links");
  const mobileNavLinks = document.getElementById("mobile-nav-links");

  if (!navLinks) return; // If nav-links doesn't exist, skip

  // Get user role
  const userData = getUserData();
  const userRole = userData?.role; // 'user' or 'autowala'

  if (userRole === 'autowala') {
    // Show driver navigation
    const driverNav = `
      <li><a href="driver-dashboard.html">🚗 Dashboard</a></li>
      <li><a href="#" onclick="logout(); return false;" style="color: #d32f2f;">🚪 Logout</a></li>
    `;

    navLinks.innerHTML = driverNav;

    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = driverNav;
    }
  } else if (userRole === 'user') {
    // Show user navigation with all user features
    const userNav = `
      <li><a href="index.html">🏠 Home</a></li>
      <li><a href="fare-calculator.html">💰 Fare Calculator</a></li>
      <li><a href="stands-map.html">🗺️ Find Stands</a></li>
      <li><a href="route-finder.html">🎯 Route Finder</a></li>
      <li><a href="safety.html">🚨 Safety</a></li>
      <li><a href="booking.html">📱 Booking</a></li>
      <li><a href="profile.html">👤 Profile</a></li>
      <li><a href="#" onclick="logout(); return false;" style="color: #d32f2f;">🚪 Logout</a></li>
    `;

    navLinks.innerHTML = userNav;

    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = userNav;
    }
  } else {
    // Show guest navigation with login/signup
    const guestNav = `
      <li><a href="index.html">🏠 Home</a></li>
      <li><a href="fare-calculator.html">💰 Fare Calculator</a></li>
      <li><a href="stands-map.html">🗺️ Find Stands</a></li>
      <li><a href="route-finder.html">🎯 Route Finder</a></li>
      <li><a href="login.html">🔐 Login</a></li>
      <li><a href="signup.html" style="color: #2196F3; font-weight: 600;">✍️ Sign Up</a></li>
    `;

    navLinks.innerHTML = guestNav;

    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = guestNav;
    }
  }
}

// Check if user is authenticated (for protected pages)
function requireAuth() {
  if (!isLoggedIn()) {
    // Redirect to login page
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  updateNavBar();
});

// Export functions for use in other scripts
window.getToken = getToken;
window.getUserData = getUserData;
window.isLoggedIn = isLoggedIn;
window.logout = logout;
window.updateNavBar = updateNavBar;
window.requireAuth = requireAuth;
window.API_BASE_URL = API_BASE_URL;
