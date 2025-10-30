// ============================================
// Route Finder JavaScript
// Mumbai Share Auto Finder
// ============================================

// Global Variables
let standsData = []; // Stores all stands with routes from API
let recentSearches = []; // Array of recent search objects (max 3)
const MAX_RECENT_SEARCHES = 3;

// API Configuration: API_BASE_URL is now accessed globally from js/auth.js

// DOM Elements
let standSelect;
let destinationInput;
let findRouteBtn;
let resetBtn;
let resultsContainer;
let resultsHeader;
let routeCardsContainer;
let noResultsMessage;
let recentSearchesContainer;
let recentSearchesList;
let standError;
let destinationError;

// ============================================
// Page Initialization
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in
  // This now works because js/auth.js is loaded first
  if (!requireAuth()) {
    return;
  }

  // Get DOM elements
  standSelect = document.getElementById("standSelect");
  destinationInput = document.getElementById("destinationInput");
  findRouteBtn = document.getElementById("findRouteBtn");
  resetBtn = document.getElementById("resetBtn");
  resultsContainer = document.getElementById("resultsContainer");
  resultsHeader = document.getElementById("resultsHeader");
  routeCardsContainer = document.getElementById("routeCardsContainer");
  noResultsMessage = document.getElementById("noResultsMessage");
  recentSearchesContainer = document.getElementById("recentSearchesContainer");
  recentSearchesList = document.getElementById("recentSearchesList");
  standError = document.getElementById("standError");
  destinationError = document.getElementById("destinationError");

  // Fetch stands data from API
  fetchStands();

  // Attach event listeners
  findRouteBtn.addEventListener("click", handleFindRoute);
  resetBtn.addEventListener("click", handleReset);

  // Enter key in destination input triggers find route
  destinationInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFindRoute();
    }
  });

  // Clear error messages when user starts typing
  standSelect.addEventListener("change", function () {
    clearErrorMessage("stand");
  });

  destinationInput.addEventListener("input", function () {
    clearErrorMessage("destination");
  });
});

// ============================================
// Fetch Stands Data
// ============================================
function fetchStands() {
  // FIX: API_BASE_URL includes '/api', so we only append '/stands' here.
  fetch(`${window.API_BASE_URL}/stands`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch stands");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        standsData = data.stands;
        populateStandDropdown(standsData);
      } else {
        throw new Error("Failed to load stands");
      }
    })
    .catch((error) => {
      console.error("Error fetching stands:", error);
      showError(
        "Failed to load stands. Please ensure the backend is running and you are logged in."
      );
      findRouteBtn.disabled = true;
    });
}

// ============================================
// Populate Stand Dropdown
// ============================================
function populateStandDropdown(stands) {
  // Clear existing options (except placeholder)
  standSelect.innerHTML = '<option value="">-- Select a Stand --</option>';

  // Sort stands alphabetically by name
  const sortedStands = stands
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  // Add options for each stand
  sortedStands.forEach((stand) => {
    const option = document.createElement("option");
    option.value = stand.id;
    option.textContent = stand.name;
    standSelect.appendChild(option);
  });
}

// ============================================
// Handle Find Route (Main Function)
// ============================================
function handleFindRoute() {
  // Clear previous error messages
  clearErrorMessage("stand");
  clearErrorMessage("destination");

  // Get form values
  const selectedStandId = standSelect.value;
  const destinationTerm = destinationInput.value.trim();

  // Validation
  let hasError = false;

  // Check stand selection
  if (!selectedStandId || selectedStandId === "") {
    showErrorMessage("stand", "Please select a stand");
    hasError = true;
  }

  // Check destination input
  if (!destinationTerm || destinationTerm === "") {
    showErrorMessage("destination", "Please enter a destination");
    hasError = true;
  }

  // If validation fails, return early
  if (hasError) {
    return;
  }

  // Set button to loading state
  setButtonLoading(true);

  // Find selected stand object
  const selectedStand = standsData.find(
    (stand) => stand.id === parseInt(selectedStandId)
  );

  if (!selectedStand) {
    showError("Selected stand not found. Please try again.");
    setButtonLoading(false);
    return;
  }

  // Search routes
  const matchedRoutes = searchRoutes(
    selectedStand,
    destinationTerm.toLowerCase()
  );

  // Add to recent searches only if results found
  if (matchedRoutes.length > 0) {
    addToRecentSearches(selectedStand.id, selectedStand.name, destinationTerm);
  }

  // Display results
  displayResults(matchedRoutes, selectedStand.name, destinationTerm);

  // Remove button loading state
  setButtonLoading(false);
}

// ============================================
// Search Routes (Filter & Calculate Distance)
// ============================================
function searchRoutes(stand, searchTerm) {
  // Get routes array from stand
  const routes = stand.routes || [];

  // Filter routes where destination includes searchTerm (case-insensitive)
  const matchedRoutes = routes.filter((route) =>
    route.destination.toLowerCase().includes(searchTerm)
  );

  // Calculate distance for each matched route
  matchedRoutes.forEach((route) => {
    if (route.destination_lat && route.destination_lng) {
      route.calculatedDistance = calculateDistance(
        stand.latitude,
        stand.longitude,
        route.destination_lat,
        route.destination_lng
      );
    } else {
      // If coordinates missing, set distance as N/A
      route.calculatedDistance = null;
      console.warn(`Missing coordinates for route: ${route.destination}`);
    }
  });

  return matchedRoutes;
}

// ============================================
// Calculate Distance (Haversine Formula)
// ============================================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers

  // Convert degrees to radians
  const toRad = (degrees) => degrees * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  // Return distance rounded to 1 decimal place
  return Math.round(distance * 10) / 10;
}

// ============================================
// Display Results
// ============================================
function displayResults(matchedRoutes, standName, destinationTerm) {
  // Show results container with fade-in
  resultsContainer.classList.add("show");

  // Clear previous results
  routeCardsContainer.innerHTML = "";

  // If no results found
  if (matchedRoutes.length === 0) {
    resultsHeader.textContent = "No Results";
    noResultsMessage.style.display = "block";
    return;
  }

  // Hide no results message
  noResultsMessage.style.display = "none";

  // Update results header
  resultsHeader.textContent = `Found ${matchedRoutes.length} Route${
    matchedRoutes.length > 1 ? "s" : ""
  }`;

  // Create route cards
  matchedRoutes.forEach((route) => {
    const routeCard = document.createElement("div");
    routeCard.className = "route-card";

    // Route destination (header)
    const header = document.createElement("div");
    header.className = "route-card-header";
    header.textContent = route.destination;

    // Route details (distance, fare, time)
    const details = document.createElement("div");
    details.className = "route-card-details";

    // Distance
    const distanceItem = document.createElement("span");
    distanceItem.className = "route-detail-item";
    distanceItem.innerHTML =
      route.calculatedDistance !== null
        ? `&#x1F3C3; ${route.calculatedDistance} km` // Using Unicode emoji for the icon
        : "&#x1F3C3; N/A";

    // Fare
    const fareItem = document.createElement("span");
    fareItem.className = "route-detail-item";
    const fareValue =
      route.fare % 1 === 0 ? Math.floor(route.fare) : route.fare;
    fareItem.innerHTML = `&#x20B9;${fareValue}`; // Using Unicode emoji for the icon

    // Time
    const timeItem = document.createElement("span");
    timeItem.className = "route-detail-item";
    timeItem.innerHTML = `&#x23F1; ${route.travel_time}`; // Using Unicode emoji for the icon

    // Append details
    details.appendChild(distanceItem);
    details.appendChild(fareItem);
    details.appendChild(timeItem);

    // Append to card
    routeCard.appendChild(header);
    routeCard.appendChild(details);

    // Append card to container
    routeCardsContainer.appendChild(routeCard);
  });

  // Update recent searches display
  displayRecentSearches();
}

// ============================================
// Recent Searches - Add
// ============================================
function addToRecentSearches(standId, standName, destination) {
  // Create search object
  const searchObject = {
    standId: standId,
    standName: standName,
    destination: destination,
    timestamp: Date.now(),
  };

  // Check if identical search already exists
  const existingIndex = recentSearches.findIndex(
    (search) =>
      search.standId === standId &&
      search.destination.toLowerCase() === destination.toLowerCase()
  );

  // If exists, remove old entry
  if (existingIndex !== -1) {
    recentSearches.splice(existingIndex, 1);
  }

  // Add new search to beginning of array
  recentSearches.unshift(searchObject);

  // If array exceeds max length, remove last item
  if (recentSearches.length > MAX_RECENT_SEARCHES) {
    recentSearches.pop();
  }
}

// ============================================
// Recent Searches - Display
// ============================================
function displayRecentSearches() {
  // If no recent searches, hide container
  if (recentSearches.length === 0) {
    recentSearchesContainer.style.display = "none";
    return;
  }

  // Show container
  recentSearchesContainer.style.display = "block";

  // Clear existing cards
  recentSearchesList.innerHTML = "";

  // Create card for each recent search
  recentSearches.forEach((search, index) => {
    const card = document.createElement("div");
    card.className = "recent-search-card";
    card.textContent = `From ${search.standName} to ${search.destination}`;
    card.dataset.index = index;

    // Add click event to restore search
    card.addEventListener("click", function () {
      restoreSearch(index);
    });

    recentSearchesList.appendChild(card);
  });
}

// ============================================
// Recent Searches - Restore
// ============================================
function restoreSearch(index) {
  const search = recentSearches[index];

  if (!search) {
    return;
  }

  // Set form values
  standSelect.value = search.standId;
  destinationInput.value = search.destination;

  // Trigger search automatically
  handleFindRoute();
}

// ============================================
// Handle Reset
// ============================================
function handleReset() {
  // Clear form fields
  standSelect.value = "";
  destinationInput.value = "";

  // Hide results container
  resultsContainer.classList.remove("show");

  // Clear error messages
  clearErrorMessage("stand");
  clearErrorMessage("destination");

  // Note: Do NOT clear recent searches (they persist until page refresh)
}

// ============================================
// Error Handling - Show Error Message
// ============================================
function showErrorMessage(field, message) {
  if (field === "stand") {
    standError.textContent = message;
    standError.classList.add("show");
  } else if (field === "destination") {
    destinationError.textContent = message;
    destinationError.classList.add("show");
  }
}

// ============================================
// Error Handling - Clear Error Message
// ============================================
function clearErrorMessage(field) {
  if (field === "stand") {
    standError.textContent = "";
    standError.classList.remove("show");
  } else if (field === "destination") {
    destinationError.textContent = "";
    destinationError.classList.remove("show");
  }
}

// ============================================
// Error Handling - Show General Error
// ============================================
function showError(message) {
  // You could implement a toast notification here
  // For now, just alert the user
  alert(message);
}

// ============================================
// Button Loading State
// ============================================
function setButtonLoading(isLoading) {
  if (isLoading) {
    findRouteBtn.textContent = "Searching...";
    findRouteBtn.disabled = true;
  } else {
    findRouteBtn.textContent = "Find Route";
    findRouteBtn.disabled = false;
  }
}
