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

  if (isLoggedIn()) {
    const userData = getUserData();
    const username = userData?.username || userData?.driver_name || "User";

    // Create auth navigation items
    const authItems = `
      <li><a href="profile.html">Profile</a></li>
      <li><a href="#" onclick="logout(); return false;" style="color: #d32f2f;">Logout</a></li>
    `;

    // Add to desktop nav
    navLinks.innerHTML = `
      <li><a href="index.html">Home</a></li>
      <li><a href="fare-calculator.html">Fare Calculator</a></li>
      <li><a href="stands-map.html">Find Stands</a></li>
      <li><a href="route-finder.html">Route Finder</a></li>
      <li><a href="safety.html">Safety</a></li>
      ${authItems}
    `;

    // Add to mobile nav if exists
    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = `
        <li><a href="index.html">Home</a></li>
        <li><a href="fare-calculator.html">Fare Calculator</a></li>
        <li><a href="stands-map.html">Find Stands</a></li>
        <li><a href="route-finder.html">Route Finder</a></li>
        <li><a href="safety.html">Safety</a></li>
        ${authItems}
      `;
    }
  } else {
    // User not logged in - show login/signup links
    const guestItems = `
      <li><a href="login.html">Login</a></li>
      <li><a href="signup.html" style="color: #2196F3; font-weight: 600;">Sign Up</a></li>
    `;

    // Add to desktop nav
    navLinks.innerHTML = `
      <li><a href="index.html">Home</a></li>
      <li><a href="fare-calculator.html">Fare Calculator</a></li>
      <li><a href="stands-map.html">Find Stands</a></li>
      <li><a href="route-finder.html">Route Finder</a></li>
      <li><a href="safety.html">Safety</a></li>
      ${guestItems}
    `;

    // Add to mobile nav if exists
    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = `
        <li><a href="index.html">Home</a></li>
        <li><a href="fare-calculator.html">Fare Calculator</a></li>
        <li><a href="stands-map.html">Find Stands</a></li>
        <li><a href="route-finder.html">Route Finder</a></li>
        <li><a href="safety.html">Safety</a></li>
        ${guestItems}
      `;
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
