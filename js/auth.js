// Auth utility functions for navigation and authentication

// API base URL for Project 1's backend
const API_BASE_URL = "http://localhost:3000/api";
// Absolute URL for Project 2's frontend
const BOOKING_URL = "http://localhost:5500";

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
  // Clear Project 1 localStorage
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");

  // Clear Project 2 localStorage (in case it was used)
  localStorage.removeItem("sr_token");
  localStorage.removeItem("sr_user");

  // Redirect to home page
  window.location.href = "index.html";
}

// Function to check if a path matches the current location
function isCurrentPage(linkHref) {
  const currentPagePath = window.location.href;
  // Check for relative path match
  if (currentPagePath.endsWith(linkHref)) {
    return true;
  }
  // Check for absolute URL match (Project 2 URL)
  if (linkHref === BOOKING_URL && currentPagePath.startsWith(BOOKING_URL)) {
    return true;
  }
  // Handle index.html vs root path
  if (
    linkHref === "index.html" &&
    (currentPagePath.endsWith("/index.html") || currentPagePath.endsWith("/"))
  ) {
    return true;
  }
  return false;
}

// Update navigation bar based on auth status
function updateNavBar() {
  const navLinks = document.getElementById("nav-links");
  const mobileNavLinks = document.getElementById("mobile-nav-links");

  if (!navLinks) return; // If nav-links doesn't exist, skip

  // Get user role
  const userData = getUserData();
  const userRole = userData?.role; // 'user' or 'autowala'

  if (userRole === "autowala") {
    // Show driver navigation
    const driverNav = `
      <li><a href="driver-dashboard.html" class="${
        isCurrentPage("driver-dashboard.html") ? "active" : ""
      }">🚗 Dashboard</a></li>
      <li><a href="autowala-profile.html" class="${
        isCurrentPage("autowala-profile.html") ? "active" : ""
      }">👤 Profile</a></li>
      <li><a href="#" onclick="logout(); return false;" style="color: #d32f2f;">🚪 Logout</a></li>
    `;

    navLinks.innerHTML = driverNav;

    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = driverNav;
    }
  } else if (userRole === "user") {
    // Show user navigation with all user features
    const userNav = `
      <li><a href="index.html" class="${
        isCurrentPage("index.html") ? "active" : ""
      }">🏠 Home</a></li>
      <li><a href="fare-calculator.html" class="${
        isCurrentPage("fare-calculator.html") ? "active" : ""
      }">💰 Fare Calculator</a></li>
      <li><a href="stands-map.html" class="${
        isCurrentPage("stands-map.html") ? "active" : ""
      }">🗺️ Find Stands</a></li>
      <li><a href="route-finder.html" class="${
        isCurrentPage("route-finder.html") ? "active" : ""
      }">🎯 Route Finder</a></li>
      <li><a href="safety.html" class="${
        isCurrentPage("safety.html") ? "active" : ""
      }">🚨 Safety</a></li>
      <!-- UPDATED LINK -->
      <li><a href="${BOOKING_URL}" class="${
      isCurrentPage(BOOKING_URL) ? "active" : ""
    }">📱 Booking</a></li>
      <li><a href="profile.html" class="${
        isCurrentPage("profile.html") ? "active" : ""
      }">👤 Profile</a></li>
      <li><a href="#" onclick="logout(); return false;" style="color: #d32f2f;">🚪 Logout</a></li>
    `;

    navLinks.innerHTML = userNav;

    if (mobileNavLinks) {
      mobileNavLinks.innerHTML = userNav;
    }
  } else {
    // Show guest navigation with login/signup
    const guestNav = `
      <li><a href="index.html" class="${
        isCurrentPage("index.html") ? "active" : ""
      }">🏠 Home</a></li>
      <li><a href="fare-calculator.html" class="${
        isCurrentPage("fare-calculator.html") ? "active" : ""
      }">💰 Fare Calculator</a></li>
      <li><a href="stands-map.html" class="${
        isCurrentPage("stands-map.html") ? "active" : ""
      }">🗺️ Find Stands</a></li>
      <li><a href="route-finder.html" class="${
        isCurrentPage("route-finder.html") ? "active" : ""
      }">🎯 Route Finder</a></li>
      <li><a href="login.html" class="${
        isCurrentPage("login.html") ? "active" : ""
      }">🔐 Login</a></li>
      <li><a href="signup.html" class="${
        isCurrentPage("signup.html") ? "active" : ""
      }" style="color: #2196F3; font-weight: 600;">✍️ Sign Up</a></li>
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
