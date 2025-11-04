// Safety Features JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in
  if (!requireAuth()) {
    return;
  }

  // ========================================
  // Global Variables
  // ========================================
  let nightModeInterval = null;
  const TRACKING_INTERVAL_MS = 120000; // 2 minutes
  const NIGHT_START_HOUR = 22; // 10 PM
  const NIGHT_END_HOUR = 5; // 5 AM
  let contactCount = 1;
  const MAX_CONTACTS = 5;
  const API_BASE_URL = window.API_BASE_URL; // Global API URL from auth.js
  let nightModePlate = null; // Stores the confirmed license plate for tracking

  // ========================================
  // DOM Element References
  // ========================================

  // Feature 1: Emergency SOS
  const sosButton = document.getElementById("sosButton");
  const sosModal = document.getElementById("sosModal");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");
  const sosLocation = document.getElementById("sosLocation");
  const sosSuccess = document.getElementById("sosSuccess");
  const sosError = document.getElementById("sosError");

  // Feature 2: Auto Number Capture
  const uploadButton = document.getElementById("uploadButton");
  const fileInput = document.getElementById("fileInput");
  const previewArea = document.getElementById("previewArea");
  const extractedPlate = document.getElementById("extractedPlate");
  const photoTimestamp = document.getElementById("photoTimestamp");
  const photoLocation = document.getElementById("photoLocation");
  const uploadError = document.getElementById("uploadError");
  const captureSuccess = document.getElementById("captureSuccess");

  // Feature 4: Night Mode Safety
  const nightModeCard = document.getElementById("nightModeCard");
  const nightModeToggle = document.getElementById("nightModeToggle");
  const nightModeStatus = document.getElementById("nightModeStatus");
  const nightModeCoords = document.getElementById("nightModeCoords");
  const nightModeLocation = document.getElementById("nightModeLocation");
  const nightModeTimestamp = document.getElementById("nightModeTimestamp");
  const nightModeError = document.getElementById("nightModeError");
  const nightModePlateDisplay = document.getElementById(
    "nightModePlateDisplay"
  ); // New Display Element

  // Feature 5: Capture History
  const historyList = document.getElementById("captureHistoryList");
  const historyLoading = document.getElementById("historyLoading");
  const noHistoryMessage = document.getElementById("noHistoryMessage");

  // Feature 3: Trip Sharing
  const contactsList = document.getElementById("contactsList");
  const addContactBtn = document.getElementById("addContactBtn");

  // NEW: Capture Modal Elements
  const captureModal = document.getElementById("captureModal");
  const captureModalYes = document.getElementById("captureModalYes");
  const captureModalNo = document.getElementById("captureModalNo");
  const captureModalClose = document.getElementById("captureModalClose");

  // ========================================
  // Initialization
  // ========================================

  addContactField();
  loadCaptureHistory();
  window.loadCaptureHistory = loadCaptureHistory;

  // NEW: Initial check for time and auto-start logic
  initializeNightMode();

  // Setup Capture Modal Listeners
  captureModalYes.addEventListener("click", handleCaptureModalYes);
  captureModalNo.addEventListener("click", handleCaptureModalNo);
  captureModalClose.addEventListener("click", closeCaptureModal);

  // ========================================
  // NIGHT MODE LOGIC
  // ========================================

  /**
   * Checks the time and enables/disables the Night Mode UI and auto-start.
   */
  function initializeNightMode() {
    nightModeError.classList.add("hidden");
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    // Check if current time is between 10 PM (22) and 5 AM (5)
    const isNightTime =
      currentHour >= NIGHT_START_HOUR || currentHour < NIGHT_END_HOUR;

    if (isNightTime) {
      nightModeCard.classList.remove("hidden"); // Show the card

      // Auto-on by default
      startNightMode(true); // Pass true to trigger the plate check flow
    } else {
      // Show the card and display time restriction message
      nightModeCard.classList.remove("hidden");
      stopNightMode(false);

      nightModeStatus.classList.remove("hidden");
      nightModeStatus.textContent = `Night Mode is only available between ${NIGHT_START_HOUR}:00 and ${
        NIGHT_END_HOUR < 10 ? "0" + NIGHT_END_HOUR : NIGHT_END_HOUR
      }:00 (10 PM - 5 AM).`;
      nightModeStatus.style.background = "#fff3cd";
      nightModeStatus.style.color = "#856404";
    }
  }

  nightModeToggle.addEventListener("click", function () {
    toggleNightMode();
  });

  function toggleNightMode() {
    nightModeError.classList.add("hidden");
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const isNightTime =
      currentHour >= NIGHT_START_HOUR || currentHour < NIGHT_END_HOUR;

    if (!isNightTime) {
      showNightModeError(
        `Night Mode can only be manually toggled ON/OFF during night hours (${NIGHT_START_HOUR}:00 to ${
          NIGHT_END_HOUR < 10 ? "0" + NIGHT_END_HOUR : NIGHT_END_HOUR
        }:00).`
      );
      return;
    }

    if (nightModeToggle.classList.contains("active")) {
      stopNightMode();
    } else {
      startNightMode(true); // Start the flow when manually turned on
    }
  }

  /**
   * Starts Night Mode and initiates the plate capture flow if requested.
   * @param {boolean} triggerPlateCheck - Whether to ask the user for a plate capture.
   */
  async function startNightMode(triggerPlateCheck = false) {
    // 1. Update UI to active state
    nightModeToggle.classList.add("active");
    nightModeError.classList.add("hidden");
    nightModeStatus.classList.remove("hidden");
    nightModeStatus.textContent = `✓ Night mode active — Initializing tracking...`;
    nightModeStatus.style.background = "#e8f5e9";
    nightModeStatus.style.color = "#2e7d32";
    nightModeCoords.classList.remove("hidden");
    nightModePlateDisplay.textContent = "Auto Plate: N/A"; // Reset plate display

    // 2. Clear existing interval
    if (nightModeInterval) {
      clearInterval(nightModeInterval);
    }

    // 3. Handle Plate Capture Flow (Only on initial start/toggle ON)
    if (triggerPlateCheck) {
      await checkPlateCaptureStatus();
    } else {
      // If not checking plate, start tracking immediately (no plate data for now)
      nightModePlate = null;
      startTrackingInterval();
    }
  }

  /**
   * Checks database for recent plate capture, then prompts user.
   */
  async function checkPlateCaptureStatus() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/safety/night-track/recent-capture`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      const data = await response.json();

      if (data.success && data.isRecent) {
        // Plate found in last 3 hours, use it immediately
        nightModePlate = data.license_plate;
        nightModePlateDisplay.textContent = `Auto Plate: ${nightModePlate} (Recent Capture)`;
        startTrackingInterval();
        showNotification(
          `Using recently captured plate: ${nightModePlate}`,
          "info"
        );
      } else {
        // No recent plate, ask the user to capture now
        captureModal.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Error checking recent capture status:", error);
      // Fallback: Start tracking without plate
      startTrackingInterval();
      showNightModeError(
        "Failed to check plate history. Starting tracking without auto number."
      );
    }
  }

  /**
   * Starts the 2-minute location reporting loop.
   */
  function startTrackingInterval() {
    // Send initial update immediately
    sendLocationUpdateToBackend();

    // Start interval
    nightModeInterval = setInterval(
      sendLocationUpdateToBackend,
      TRACKING_INTERVAL_MS
    );

    // Update status message with confirmed plate status
    const plateStatus = nightModePlate
      ? `Auto ${nightModePlate}`
      : "No auto plate recorded.";
    nightModeStatus.textContent = `✓ Night mode active (${plateStatus}) — Sharing every 2 minutes.`;
  }

  function stopNightMode(resetUI = true) {
    if (nightModeInterval) {
      clearInterval(nightModeInterval);
      nightModeInterval = null;
    }

    // Reset plate variable and close modal
    nightModePlate = null;
    closeCaptureModal();

    if (resetUI) {
      nightModeToggle.classList.remove("active");
      nightModeStatus.classList.remove("hidden");
      nightModeStatus.textContent = "Night Mode is OFF. Live tracking stopped.";
      nightModeStatus.style.background = "#ffebee";
      nightModeStatus.style.color = "#d32f2f";
      nightModeCoords.classList.add("hidden");
      nightModeLocation.textContent = "Tracking stopped.";
      nightModeTimestamp.textContent =
        "Stopped: " + formatTimestamp(new Date());
      nightModePlateDisplay.textContent = "Auto Plate: N/A";
    }
    console.log("Night Mode stopped.");
  }

  /**
   * Fetches location and sends it to the backend safety controller.
   */
  async function sendLocationUpdateToBackend() {
    nightModeLocation.textContent = "Fetching location...";
    nightModeTimestamp.textContent = "Updated: In Progress...";

    try {
      // Use locationService to get the latest coordinates
      const location = await locationService.getCurrentLocation();
      const { latitude, longitude, accuracy } = location;

      // 1. Update local display immediately
      nightModeLocation.textContent = `Lat: ${latitude.toFixed(
        6
      )}, Lng: ${longitude.toFixed(6)}`;
      nightModeTimestamp.textContent =
        "Updated: " + formatTimestamp(new Date());
      nightModePlateDisplay.textContent = `Auto Plate: ${
        nightModePlate || "N/A"
      }`;

      // 2. Call backend endpoint
      const response = await fetch(
        `${API_BASE_URL}/safety/night-track/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            location: {
              latitude: latitude,
              longitude: longitude,
              accuracy: accuracy,
            },
            autoNumber: nightModePlate, // Send the stored plate number
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        console.log(
          "Night Mode update successful. Contacts notified:",
          data.data.contactsSent
        );

        // Update status with confirmed plate status
        const plateStatus = nightModePlate
          ? `Auto ${nightModePlate}`
          : "No auto plate recorded.";
        nightModeStatus.textContent = `✓ Tracking active (${plateStatus}) — Updates sent to ${data.data.contactsSent} contacts.`;

        nightModeError.classList.add("hidden");
      } else if (data.noContacts) {
        // No contacts with email configured, stop tracking
        stopNightMode();
        showNightModeError(
          "Night Mode stopped: Please add emergency contacts with email addresses in your profile."
        );
      } else {
        throw new Error(data.message || "Failed to notify contacts.");
      }
    } catch (error) {
      console.error("Night Mode Tracking Error:", error);

      // Use local fallback coordinates if API failed
      const lastKnown = locationService.getLastKnownLocation();
      if (lastKnown) {
        nightModeLocation.textContent = `Lat: ${lastKnown.latitude.toFixed(
          6
        )}, Lng: ${lastKnown.longitude.toFixed(6)} (LAST KNOWN)`;
      } else {
        nightModeLocation.textContent = "Location unavailable";
      }

      showNightModeError(
        "Failed to send update. Check internet connection or profile contacts."
      );
    }
  }

  function showNightModeError(message) {
    nightModeError.innerHTML = message; // Use innerHTML to support links
    nightModeError.classList.remove("hidden");
    nightModeStatus.classList.add("hidden");
  }

  // ========================================
  // NEW CAPTURE MODAL HANDLERS
  // ========================================

  function closeCaptureModal() {
    captureModal.classList.add("hidden");
  }

  function handleCaptureModalYes() {
    closeCaptureModal();
    // Directly trigger the photo capture mechanism (using the existing file input flow)
    // Since we need the result before starting the timer, we must redefine the capture function flow.

    // Open the file dialog for the user to select the image
    fileInput.click();
  }

  function handleCaptureModalNo() {
    closeCaptureModal();
    nightModePlate = null; // Confirm no plate
    startTrackingInterval(); // Start tracking without plate
  }

  // NOTE: We must override the existing `handleFileSelect` logic temporarily for the Night Mode flow
  // to ensure that AFTER a successful capture, the Night Mode tracking starts.

  // Keep a reference to the original handleFileSelect to use its core logic
  const originalHandleFileSelect = handleFileSelect;

  // New handler that is aware of the Night Mode context
  fileInput.addEventListener("change", function (event) {
    if (!nightModeToggle.classList.contains("active")) {
      // If Night Mode is not active, run the original capture flow (standalone)
      originalHandleFileSelect(event);
      return;
    }

    // If Night Mode IS active, run the capture but immediately use the result for tracking
    handleNightModeFileSelect(event);
  });

  /**
   * Modified file selection handler for Night Mode.
   */
  async function handleNightModeFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous results/errors in the standalone section
    clearCaptureMessages();
    uploadButton.disabled = true;
    uploadButton.textContent = "Processing for Night Mode...";

    const reader = new FileReader();
    reader.onload = async function (e) {
      const dataUri = e.target.result;
      const prefix = dataUri.substring(0, dataUri.indexOf(",") + 1);
      const base64Image = dataUri.substring(prefix.length);

      try {
        // 1. Get location
        const location = await locationService.getCurrentLocation();
        const { latitude, longitude } = location;

        // 2. Send to backend for Gemini processing and storage
        const response = await fetch(`${API_BASE_URL}/safety/capture-auto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            imageBase64: base64Image,
            latitude: latitude,
            longitude: longitude,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Capture failed.");
        }

        // 3. Success: Set the plate, start tracking, and update history
        nightModePlate = data.data.license_plate;
        nightModePlateDisplay.textContent = `Auto Plate: ${nightModePlate}`;
        startTrackingInterval(); // Start the interval with the plate!

        showNotification(
          `Plate Captured! Tracking started with Auto: ${nightModePlate}`,
          "success"
        );

        // Update the manual capture section as well for visual confirmation
        displayImagePreview(dataUri);
        extractedPlate.textContent = nightModePlate;
        photoTimestamp.textContent = formatDateTime(new Date());
        photoLocation.textContent = `Lat: ${latitude.toFixed(
          6
        )}, Lng: ${longitude.toFixed(6)}`;
        document.getElementById("photoMetadata").classList.remove("hidden");
        captureSuccess.classList.remove("hidden");

        loadCaptureHistory();
      } catch (error) {
        console.error("Night Mode Capture Error:", error);
        // On failure, start tracking without a plate
        nightModePlate = null;
        startTrackingInterval();

        // Notify user of capture failure but proceeding with location
        showNightModeError(
          `Plate capture failed (${error.message}). Tracking location only.`
        );
      } finally {
        fileInput.value = ""; // Clear file input
        uploadButton.disabled = false;
        uploadButton.textContent = "📷 Capture/Upload Plate Photo";
      }
    };
    reader.readAsDataURL(file);
  }

  // --- Utility functions from original handleFileSelect needed for reuse ---
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous results/errors
    clearCaptureMessages();
    uploadButton.disabled = true;
    uploadButton.textContent = "Processing...";

    // Validate file type and size
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showUploadError("Invalid file. Please upload an image under 5MB.");
      uploadButton.disabled = false;
      uploadButton.textContent = "📷 Capture/Upload Plate Photo";
      return;
    }

    // Rerun the original logic in the file selector listener (which calls the backend)
    handleNightModeFileSelect(event);
  }

  // ========================================
  // REST OF LOGIC (KEPT FOR COMPLETENESS)
  // ========================================

  /**
   * Clears all status and result messages for the capture feature.
   */
  function clearCaptureMessages() {
    uploadError.classList.add("hidden");
    captureSuccess.classList.add("hidden");
    extractedPlate.textContent = "---";
    photoTimestamp.textContent = "---";
    photoLocation.textContent = "---";
  }

  function displayImagePreview(dataURL) {
    // Clear preview area
    previewArea.innerHTML = "";
    const photoMetadata = document.getElementById("photoMetadata");
    if (photoMetadata) photoMetadata.classList.add("hidden"); // Ensure metadata is hidden first
    previewArea.classList.add("has-image");
    const img = document.createElement("img");
    img.src = dataURL;
    previewArea.appendChild(img);
  }

  function showUploadError(message) {
    uploadError.textContent = message;
    uploadError.classList.remove("hidden");
  }

  /**
   * Fetches and displays the user's auto number capture history.
   */
  async function loadCaptureHistory() {
    // Show loading state
    historyLoading.style.display = "block";
    noHistoryMessage.style.display = "none";
    historyList.innerHTML = "";

    try {
      const response = await fetch(`${API_BASE_URL}/safety/capture-history`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch history data.");
      }

      historyLoading.style.display = "none";

      if (data.history.length === 0) {
        noHistoryMessage.style.display = "block";
        return;
      }

      renderHistory(data.history);
    } catch (error) {
      console.error("Loading history error:", error);
      historyLoading.textContent = "Error loading history. Please refresh.";
    }
  }

  /**
   * Renders the capture history list from the fetched data.
   * @param {Array<Object>} history - Array of capture history objects.
   */
  function renderHistory(history) {
    history.forEach((item) => {
      const card = document.createElement("div");
      card.className = "history-card";

      // Format date/time
      const date = new Date(item.captured_at);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      card.innerHTML = `
                <div class="history-details">
                    <div class="history-plate">${item.license_plate}</div>
                    <div class="history-location">📍 ${item.location}</div>
                    <div class="history-time">🕒 ${dateStr} at ${timeStr}</div>
                </div>
                <a href="${locationService.generateGoogleMapsUrl(
                  item.latitude,
                  item.longitude
                )}" target="_blank" class="history-map-link">
                    View Location
                </a>
            `;

      historyList.appendChild(card);
    });
  }

  // ========================================
  // TRIP SHARING LOGIC (REMAINS THE SAME)
  // ========================================

  function addContactField() {
    const contactDiv = document.createElement("div");
    contactDiv.className = "contact-item";
    contactDiv.innerHTML = `
            <input type="text" placeholder="Phone or Email">
            <button type="button" class="remove-btn">✕</button>
        `;

    // Attach remove event listener
    const removeBtn = contactDiv.querySelector(".remove-btn");
    removeBtn.addEventListener("click", function () {
      removeContactField(contactDiv);
    });

    contactsList.appendChild(contactDiv);
    contactCount++;
    updateAddButtonState();
  }

  function removeContactField(element) {
    element.remove();
    contactCount--;
    updateAddButtonState();
  }

  function updateAddButtonState() {
    if (contactCount >= MAX_CONTACTS) {
      addContactBtn.disabled = true;
    } else {
      addContactBtn.disabled = false;
    }
  }

  function showNotification(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // ========================================
  // UTILITY FUNCTIONS (REMAINS THE SAME)
  // ========================================

  function formatCoordinates(lat, lng) {
    return "Lat: " + lat + ", Long: " + lng;
  }

  function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return (
      day +
      "/" +
      month +
      "/" +
      year +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds
    );
  }

  function formatTimestamp(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return hours + ":" + minutes + ":" + seconds;
  }

  // ========================================
  // SOS LOGIC (REMAINS THE SAME)
  // ========================================

  // ... (omitted for brevity)
});
