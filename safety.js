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
  const NIGHT_START_HOUR = 22; // 10 PM (Kept for reference, but no longer enforces restriction)
  const NIGHT_END_HOUR = 5; // 5 AM (Kept for reference, but no longer enforces restriction)
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

  // Feature 3: Trip Sharing
  const tripSharingForm = document.getElementById("tripSharingForm");
  const pickupLocationInput = document.getElementById("pickupLocation");
  const destinationInput = document.getElementById("destination");
  const autoNumberInput = document.getElementById("autoNumber");
  const contactsList = document.getElementById("contactsList");
  const addContactBtn = document.getElementById("addContactBtn");

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

  // NEW: Capture Modal Elements
  const captureModal = document.getElementById("captureModal");
  const captureModalYes = document.getElementById("captureModalYes");
  const captureModalNo = document.getElementById("captureModalNo");
  const captureModalClose = document.getElementById("captureModalClose");

  // ========================================
  // Initialization
  // ========================================

  // We need to load initial contacts count from the profile or database later
  // For now, ensure there is at least one input field for Trip Sharing
  if (contactsList.children.length === 0) {
    addContactField(); // Ensure one contact field is always present initially
  } else {
    updateAddButtonState(); // Update state if fields exist from previous state/template
  }

  loadCaptureHistory();
  window.loadCaptureHistory = loadCaptureHistory;

  // NEW: Initial check for time and auto-start logic
  initializeNightMode();

  // Setup Capture Modal Listeners
  captureModalYes.addEventListener("click", handleCaptureModalYes);
  captureModalNo.addEventListener("click", handleCaptureModalNo);
  captureModalClose.addEventListener("click", closeCaptureModal);

  // ========================================
  // FIX: ADD MISSING EVENT LISTENERS HERE
  // ========================================

  // Feature 1: Emergency SOS (FIXED)
  if (sosButton) {
    sosButton.addEventListener("click", handleSosButton);
  }
  if (modalCancel) {
    modalCancel.addEventListener("click", () =>
      sosModal.classList.remove("show")
    );
  }
  if (modalConfirm) {
    modalConfirm.addEventListener("click", handleConfirmSos);
  }

  // Feature 2: Auto Number Capture (Trigger file input) (FIXED)
  if (uploadButton && fileInput) {
    uploadButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelect); // Use the combined handler
  }

  // Feature 3: Trip Sharing (FIXED)
  if (addContactBtn) {
    addContactBtn.addEventListener("click", addContactField);
  }
  if (tripSharingForm) {
    tripSharingForm.addEventListener("submit", handleTripSharingSubmit);
  }

  // Feature 4: Night Mode Toggle (FIXED)
  if (nightModeToggle) {
    nightModeToggle.addEventListener("click", function () {
      toggleNightMode();
    });
  }

  // ========================================
  // HANDLER FUNCTIONS
  // ========================================

  // --- SOS Handlers ---

  // Handle SOS Button click: opens the modal and fetches location
  function handleSosButton() {
    sosSuccess.classList.add("hidden");
    sosError.classList.add("hidden");
    sosModal.classList.add("show"); // Show modal immediately to provide feedback

    // Immediately try to fetch location for display
    sosLocation.querySelector(".coords").textContent = "Fetching location...";

    // Use locationService to get location
    locationService
      .getCurrentLocation()
      .then((location) => {
        const { latitude, longitude, accuracy } = location;
        sosLocation.querySelector(
          ".coords"
        ).textContent = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(
          6
        )}`;
      })
      .catch((error) => {
        sosLocation.querySelector(
          ".coords"
        ).textContent = `Error: ${error.message.substring(0, 30)}...`;
        console.error("SOS location error:", error);
      });
  }

  // Handle the confirmation inside the SOS modal
  async function handleConfirmSos() {
    sosModal.classList.remove("show");
    sosButton.disabled = true;
    sosButton.textContent = "Sending SOS...";
    sosError.classList.add("hidden");
    let lat = 0,
      lng = 0,
      accuracy = 0;

    try {
      // Get the most accurate location from the service
      const finalLocation = await locationService.captureSOSLocation();
      lat = finalLocation.latitude;
      lng = finalLocation.longitude;
      accuracy = finalLocation.accuracy;
    } catch (e) {
      console.warn("Final SOS location capture failed:", e.message);
      // Fallback location will be 0,0 if locationService couldn't even get a last known location.
      // The backend will handle the invalid location.
    }

    // --- Send to Backend Logic ---
    try {
      const response = await fetch(`${API_BASE_URL}/safety/sos/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          location: {
            latitude: lat,
            longitude: lng,
            accuracy: accuracy,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle backend errors
        if (data.requiresContacts || data.requiresEmails) {
          sosError.innerHTML =
            data.message +
            ' <a href="profile.html">Add them in your Profile.</a>';
        } else {
          sosError.textContent = data.message || "Failed to trigger SOS.";
        }
        sosError.classList.remove("hidden");
        return;
      }

      // Success
      sosSuccess.querySelector("p").textContent = data.message;
      sosSuccess.classList.remove("hidden");
      sosLocation.querySelector(".coords").textContent = `Lat: ${lat.toFixed(
        6
      )}, Lng: ${lng.toFixed(6)}`;
      showNotification("SOS triggered!", "danger");
    } catch (error) {
      console.error("SOS trigger API error:", error);
      sosError.textContent =
        "Unable to connect to safety server. Please check the backend connection.";
      sosError.classList.remove("hidden");
    } finally {
      sosButton.disabled = false;
      sosButton.textContent = "🚨 SOS EMERGENCY 🚨";
    }
  }

  // --- Trip Sharing Handler ---

  async function handleTripSharingSubmit(e) {
    e.preventDefault();

    // Clear previous errors
    document
      .querySelectorAll("#tripSharingForm .error-message")
      .forEach((el) => el.classList.add("hidden"));

    const pickup = pickupLocationInput.value.trim();
    const destination = destinationInput.value.trim();
    const autoNumber = autoNumberInput.value.trim();

    // Collect all contacts (phone or email)
    const rawContacts = Array.from(
      contactsList.querySelectorAll('input[type="text"]')
    ).map((input) => input.value.trim());

    const validContacts = rawContacts.filter((contact) => contact.length > 0);

    let isValid = true;
    let location;
    const shareTripBtn = tripSharingForm.querySelector('button[type="submit"]');

    if (pickup.length < 5) {
      document.getElementById("pickupError").textContent =
        "Pickup location must be at least 5 characters.";
      document.getElementById("pickupError").classList.remove("hidden");
      isValid = false;
    }

    if (destination.length < 5) {
      document.getElementById("destinationError").textContent =
        "Destination must be at least 5 characters.";
      document.getElementById("destinationError").classList.remove("hidden");
      isValid = false;
    }

    // Basic auto number validation (optional, allow empty)
    if (autoNumber.length > 0 && autoNumber.length < 5) {
      document.getElementById("autoNumberError").textContent =
        "Auto number is too short (min 5 chars).";
      document.getElementById("autoNumberError").classList.remove("hidden");
      isValid = false;
    }

    if (validContacts.length === 0) {
      document.getElementById("pickupError").textContent =
        "Please add at least one contact (phone or email).";
      document.getElementById("pickupError").classList.remove("hidden");
      isValid = false;
    }

    if (!isValid) return;

    // Show loading state
    shareTripBtn.disabled = true;
    shareTripBtn.textContent = "Sharing...";

    try {
      // 1. Get current location for the share
      location = await locationService.getCurrentLocation();
      const { latitude, longitude, accuracy } = location;

      // 2. Format a simple link for SMS/WhatsApp
      const googleMapsUrl = locationService.generateGoogleMapsUrl(
        latitude,
        longitude
      );
      const mapLinkShort = googleMapsUrl.substring(0, 50) + "..."; // Shorten link for display

      // 3. Construct the share message
      const shareMessage = `I'm on a trip via Share Rickshaw. Pickup: ${pickup}, Destination: ${destination}. Auto No: ${
        autoNumber || "N/A"
      }. My current live location: ${googleMapsUrl}`;

      // 4. Send to Backend for SMS/Email sharing to contacts
      // NOTE: The backend API /safety/share-trip does not exist in the provided files.
      // We will simulate the backend call and notify the user about the simulation.

      // Placeholder for real API call:
      // const response = await fetch(`${API_BASE_URL}/safety/share-trip`, { ... });

      // Since the backend endpoint for this feature is missing, we use console logging
      // and a local success notification.

      console.log("SIMULATED API CALL: Trip Share Triggered");
      console.log("Message Sent:", shareMessage);
      console.log("Shared with contacts:", validContacts);

      showNotification(
        `Trip details simulated: Shared via SMS/Email to ${validContacts.length} contacts.`,
        "success"
      );
      // Clear form after success
      tripSharingForm.reset();
      contactsList.innerHTML = ""; // Clear dynamic contacts
      addContactField(); // Re-add one empty field
    } catch (error) {
      console.error("Trip sharing failed:", error);
      document.getElementById("pickupError").textContent =
        error.message ||
        "Failed to get location for sharing. Please try again.";
      document.getElementById("pickupError").classList.remove("hidden");
    } finally {
      shareTripBtn.disabled = false;
      shareTripBtn.textContent = "Share Trip Details";
    }
  }

  // --- Capture Handlers (Keep original logic but ensure the handler uses fileInput.click() and is hooked) ---

  /**
   * Clears all status and result messages for the capture feature.
   */
  function clearCaptureMessages() {
    uploadError.classList.add("hidden");
    captureSuccess.classList.add("hidden");
    extractedPlate.textContent = "---";
    photoTimestamp.textContent = "---";
    photoLocation.textContent = "---";
    document.getElementById("photoMetadata").classList.add("hidden");
  }

  function displayImagePreview(dataURL) {
    // Clear preview area
    previewArea.innerHTML = "";
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
   * Combined file selection handler for standalone and Night Mode.
   */
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Determine if we are in the Night Mode flow
    const isNightModeFlow =
      nightModeToggle.classList.contains("active") &&
      nightModeInterval === null;

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

    const reader = new FileReader();
    reader.onload = async function (e) {
      const dataUri = e.target.result;
      const prefix = dataUri.substring(0, dataUri.indexOf(",") + 1);
      const base64Image = dataUri.substring(prefix.length);
      let location;
      let plate = null;
      let captureError = null;

      try {
        // 1. Get location
        location = await locationService.getCurrentLocation();
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

        plate = data.data.license_plate;

        // 3. Update the manual capture section for visual confirmation
        displayImagePreview(dataUri);
        extractedPlate.textContent = plate;
        photoTimestamp.textContent = formatDateTime(new Date());
        photoLocation.textContent = `Lat: ${latitude.toFixed(
          6
        )}, Lng: ${longitude.toFixed(6)}`;
        document.getElementById("photoMetadata").classList.remove("hidden");
        captureSuccess.classList.remove("hidden");
        loadCaptureHistory();
      } catch (error) {
        console.error("Capture Error:", error);
        captureError = error;

        // Display generic error in the standalone section
        showUploadError(
          plate
            ? `Plate '${plate}' detected but failed to save history. `
            : `AI processing failed. Check connection or try again. `
        );
      } finally {
        // Handle Night Mode flow continuation
        if (isNightModeFlow) {
          if (plate) {
            // If plate was successfully extracted and processed
            nightModePlate = plate;
            nightModePlateDisplay.textContent = `Auto Plate: ${nightModePlate}`;
            startTrackingInterval();
            showNotification(
              `Plate Captured! Tracking started with Auto: ${nightModePlate}`,
              "success"
            );
          } else {
            // On failure, start tracking without a plate
            nightModePlate = null;
            startTrackingInterval();
            showNightModeError(`Plate capture failed. Tracking location only.`);
          }
        }

        fileInput.value = ""; // Clear file input
        uploadButton.disabled = false;
        uploadButton.textContent = "📷 Capture/Upload Plate Photo";
      }
    };
    reader.readAsDataURL(file);
  }

  // --- Night Mode Handlers ---

  /**
   * Checks the time and enables/disables the Night Mode UI and auto-start.
   * FIX: This function is simplified to always show the card and reset the state,
   * making the feature always available for manual toggle.
   */
  function initializeNightMode() {
    nightModeCard.classList.remove("hidden"); // Always show the card
    stopNightMode(false); // Ensure the state is OFF initially

    // Display a neutral prompt instead of a restriction message
    nightModeStatus.classList.remove("hidden");
    nightModeStatus.textContent =
      "Night Mode allows live tracking to contacts. Toggle ON to start.";
    nightModeStatus.style.background = "#e3f2fd";
    nightModeStatus.style.color = "#1565c0";
  }

  // FIX: Moved toggle listener setup to initialization section

  /**
   * Toggles Night Mode ON or OFF regardless of the time of day.
   * FIX: Removed time-of-day restriction.
   */
  function toggleNightMode() {
    nightModeError.classList.add("hidden");

    if (nightModeToggle.classList.contains("active")) {
      stopNightMode(true); // Stop and reset UI
    } else {
      startNightMode(true); // Start the flow when manually turned on (with plate check)
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
        "Failed to check plate history. Starting tracking location only."
      );
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
    nightModeStatus.textContent = `✓ Tracking active (${plateStatus}) — Sharing every 2 minutes.`;
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

  // --- Night Mode Modal Handlers ---
  function closeCaptureModal() {
    captureModal.classList.add("hidden");
  }

  function handleCaptureModalYes() {
    closeCaptureModal();
    // Directly trigger the photo capture mechanism (using the existing file input flow)
    fileInput.click();
  }

  function handleCaptureModalNo() {
    closeCaptureModal();
    nightModePlate = null; // Confirm no plate
    startTrackingInterval(); // Start tracking without plate
  }

  // ========================================
  // TRIP SHARING LOGIC
  // ========================================

  function addContactField() {
    const contactDiv = document.createElement("div");
    contactDiv.className = "contact-item";
    // FIX: Changed input type to allow both phone and email, placeholder is updated
    contactDiv.innerHTML = `
            <input type="text" placeholder="Phone number (10 digits) or Email" pattern="^(\\d{10}|[\\w._%+-]+@[\\w.-]+\\.[a-zA-Z]{2,4})$">
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
    // FIX: Clear error messages if a field is removed
    document
      .querySelectorAll("#tripSharingForm .error-message")
      .forEach((el) => el.classList.add("hidden"));
  }

  function updateAddButtonState() {
    // Only allow up to MAX_CONTACTS fields
    if (contactsList.children.length >= MAX_CONTACTS) {
      addContactBtn.disabled = true;
    } else {
      addContactBtn.disabled = false;
    }
  }

  // ========================================
  // CAPTURE HISTORY LOGIC
  // ========================================

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
                <a href="${window.locationService.generateGoogleMapsUrl(
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
  // UTILITY FUNCTIONS
  // ========================================

  function showNotification(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

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
});
