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
  let contactCount = 1;
  const MAX_CONTACTS = 5;
  const API_BASE_URL = window.API_BASE_URL; // Global API URL from auth.js

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

  // Feature 2: Auto Number Capture (UPDATED)
  const uploadButton = document.getElementById("uploadButton");
  const fileInput = document.getElementById("fileInput");
  const previewArea = document.getElementById("previewArea");
  const photoMetadata = document.getElementById("photoMetadata");
  const extractedPlate = document.getElementById("extractedPlate");
  const photoTimestamp = document.getElementById("photoTimestamp");
  const photoLocation = document.getElementById("photoLocation");
  const uploadError = document.getElementById("uploadError");
  const captureSuccess = document.getElementById("captureSuccess"); // New success element

  // Feature 3: Trip Sharing
  const tripSharingForm = document.getElementById("tripSharingForm");
  const pickupLocation = document.getElementById("pickupLocation");
  const destination = document.getElementById("destination");
  const autoNumber = document.getElementById("autoNumber");
  const contactsList = document.getElementById("contactsList");
  const addContactBtn = document.getElementById("addContactBtn");
  const pickupError = document.getElementById("pickupError");
  const destinationError = document.getElementById("destinationError");
  const autoNumberError = document.getElementById("autoNumberError");

  // Feature 4: Night Mode Safety
  const nightModeToggle = document.getElementById("nightModeToggle");
  const nightModeStatus = document.getElementById("nightModeStatus");
  const nightModeCoords = document.getElementById("nightModeCoords");
  const nightModeLocation = document.getElementById("nightModeLocation");
  const nightModeTimestamp = document.getElementById("nightModeTimestamp");
  const nightModeError = document.getElementById("nightModeError");

  // Feature 5: Capture History (NEW)
  const historyList = document.getElementById("captureHistoryList");
  const historyLoading = document.getElementById("historyLoading");
  const noHistoryMessage = document.getElementById("noHistoryMessage");

  // ========================================
  // Initialization
  // ========================================

  // Add initial contact field for trip sharing
  addContactField();

  // FIX: Call history loading here, after DOM is ready and the function is defined.
  loadCaptureHistory();

  // Attach history loader globally
  window.loadCaptureHistory = loadCaptureHistory;

  // ========================================
  // FEATURE 1: EMERGENCY SOS (Skipping implementation details to focus on changes)
  // ========================================

  // ... (SOS logic remains the same) ...

  sosButton.addEventListener("click", function () {
    showSOSModal();
  });

  modalCancel.addEventListener("click", function () {
    hideSOSModal();
  });

  sosModal.addEventListener("click", function (e) {
    if (e.target === sosModal) {
      hideSOSModal();
    }
  });

  modalConfirm.addEventListener("click", function () {
    hideSOSModal();
    triggerEmergencyAlert();
  });

  function showSOSModal() {
    sosModal.classList.add("show");
  }

  function hideSOSModal() {
    sosModal.classList.remove("show");
  }

  async function triggerEmergencyAlert() {
    // ... (SOS logic body remains the same) ...
    console.log("SOS: Starting emergency alert process");
    sosSuccess.classList.add("hidden");
    sosError.classList.add("hidden");
    sosButton.disabled = true;
    sosButton.textContent = "Sending Alert...";

    try {
      if (typeof locationService === "undefined") {
        throw new Error("Location service not available");
      }

      const location = await locationService.captureSOSLocation();

      const response = await fetch(`${API_BASE_URL}/safety/sos/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        displaySOSSuccess(data);
        sosSuccess.classList.remove("hidden");
      } else {
        handleSOSError(data);
        sosError.classList.remove("hidden");
      }
    } catch (error) {
      console.error("SOS trigger error:", error);
      if (error.message.includes("Location") || error.message.includes("GPS")) {
        showSOSError(
          "Unable to get your location. Please enable location services and try again."
        );
      } else {
        showSOSError("Failed to send emergency alert. Please try again.");
      }
      sosError.classList.remove("hidden");
    } finally {
      sosButton.disabled = false;
      sosButton.textContent = "SOS";
    }
  }

  // ... (Other SOS helper functions remain the same) ...
  function displaySOSSuccess(data) {
    const locationDiv = sosLocation.querySelector(".coords");
    const successMsg = sosSuccess.querySelector("p");
    const accuracyWarning =
      data.location.accuracy > 1000
        ? `<br><small style="color: #ff9800;">⚠️ Location accuracy is low (${data.location.accuracy}m). GPS signal may be weak indoors.</small>`
        : "";

    locationDiv.innerHTML = `
            <strong>📍 Your Location:</strong> ${locationService.formatCoordinates(
              data.location.latitude,
              data.location.longitude
            )}<br>
            <small>Accuracy: ${locationService.getAccuracyDescription(
              data.location.accuracy
            )}</small>${accuracyWarning}<br>
            <a href="${locationService.generateGoogleMapsUrl(
              data.location.latitude,
              data.location.longitude
            )}" target="_blank" style="color: #2196f3; text-decoration: underline;">
                🗺️ View on Google Maps
            </a>
        `;
    successMsg.innerHTML = `
            ✅ <strong>Emergency Alert Sent Successfully!</strong><br>
            <small>Notified ${data.contactsNotified} of ${
      data.totalContacts
    } emergency contacts via email.</small>
            ${
              data.contactsNotified < data.totalContacts
                ? `<br><small style="color: #ff9800;">⚠️ Some contacts may not have received the alert.</small>`
                : ""
            }
        `;
    sosLocation.classList.remove("hidden");
  }

  function handleSOSError(data) {
    let errorMessage = data.message || "Failed to send emergency alert";
    if (data.requiresContacts) {
      errorMessage = `No emergency contacts found. Please add emergency contacts with email addresses in your <a href="profile.html" style="color: #2196f3;">Profile</a> before using SOS.`;
    } else if (data.requiresEmails) {
      errorMessage = `Some emergency contacts don't have email addresses. Please update your contacts in your <a href="profile.html" style="color: #2196f3;">Profile</a> to enable email alerts.`;
    } else if (data.requiresLocation) {
      errorMessage =
        "Location access is required for emergency alerts. Please enable location services and try again.";
    } else if (data.cooldownRemaining) {
      errorMessage = `Please wait ${data.cooldownRemaining} seconds before triggering another SOS alert.`;
    }
    showSOSError(errorMessage);
  }

  function showSOSError(message) {
    sosError.innerHTML = message; // Use innerHTML to support links
    sosError.classList.remove("hidden");
  }

  // ========================================
  // FEATURE 2: AUTO NUMBER CAPTURE (UPDATED)
  // ========================================

  // Upload button triggers hidden file input
  uploadButton.addEventListener("click", function () {
    fileInput.click();
  });

  // File input change event
  fileInput.addEventListener("change", function (event) {
    handleFileSelect(event);
  });

  /**
   * Handles file selection, preview, and API submission
   */
  async function handleFileSelect(event) {
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

    const reader = new FileReader();
    reader.onload = async function (e) {
      // Check if the image starts with the expected data URI prefix
      const dataUri = e.target.result;
      const prefix = dataUri.substring(0, dataUri.indexOf(",") + 1);

      // Extract only the base64 part
      const base64Image = dataUri.substring(prefix.length);

      displayImagePreview(dataUri);

      try {
        // 1. Get current location
        const location = await locationService.getCurrentLocation();
        const { latitude, longitude } = location;

        // Update UI with location/time
        photoTimestamp.textContent = formatDateTime(new Date());
        photoLocation.textContent = `Lat: ${latitude.toFixed(
          6
        )}, Lng: ${longitude.toFixed(6)}`;
        photoMetadata.classList.remove("hidden");

        uploadButton.textContent = "Extracting Plate (AI)...";

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

        if (!response.ok) {
          throw new Error(data.message || "Capture failed.");
        }

        // 3. Success: Show extracted plate and reload history
        extractedPlate.textContent = data.data.license_plate;
        captureSuccess.classList.remove("hidden");

        // Clear the file input so the same file can be selected again if needed
        fileInput.value = "";

        loadCaptureHistory();
      } catch (error) {
        console.error("Auto Capture Error:", error);
        const errorMessage = error.message.includes("AI")
          ? error.message
          : "Failed to capture auto. Please try again.";
        showUploadError(errorMessage);
        // Clear AI extracted field on error
        extractedPlate.textContent = "---";
      } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "📷 Capture/Upload Plate Photo";
      }
    };
    reader.readAsDataURL(file);
  }

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
    previewArea.classList.add("has-image");
    const img = document.createElement("img");
    img.src = dataURL;
    previewArea.appendChild(img);
  }

  function showUploadError(message) {
    uploadError.textContent = message;
    uploadError.classList.remove("hidden");
  }

  // ========================================
  // FEATURE 5: AUTO CAPTURE HISTORY (NEW)
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
  // FEATURE 3 & 4 (Skipping implementation details as they are unchanged)
  // ========================================

  // ... (Trip Sharing and Night Mode logic remains the same) ...

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

  function submitTripDetails() {
    clearFieldError(pickupError);
    clearFieldError(destinationError);
    clearFieldError(autoNumberError);
    let isValid = true;
    if (pickupLocation.value.trim() === "") {
      showFieldError(pickupError, "This field is required");
      isValid = false;
    }
    if (destination.value.trim() === "") {
      showFieldError(destinationError, "This field is required");
      isValid = false;
    }
    if (autoNumber.value.trim() === "") {
      showFieldError(autoNumberError, "This field is required");
      isValid = false;
    }
    if (!isValid) {
      return;
    }
    const formData = {
      pickup: pickupLocation.value.trim(),
      destination: destination.value.trim(),
      autoNumber: autoNumber.value.trim(),
      contacts: [],
    };
    const contactInputs = contactsList.querySelectorAll("input");
    contactInputs.forEach(function (input) {
      if (input.value.trim() !== "") {
        formData.contacts.push(input.value.trim());
      }
    });
    alert("Trip shared successfully with your contacts.");
  }

  function showFieldError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add("show");
  }

  function clearFieldError(errorElement) {
    errorElement.textContent = "";
    errorElement.classList.remove("show");
  }

  nightModeToggle.addEventListener("click", function () {
    toggleNightMode();
  });

  function toggleNightMode() {
    if (nightModeToggle.classList.contains("active")) {
      stopNightMode();
    } else {
      startNightMode();
    }
  }

  function startNightMode() {
    nightModeToggle.classList.add("active");
    nightModeError.classList.add("hidden");
    nightModeStatus.classList.remove("hidden");
    nightModeCoords.classList.remove("hidden");
    updateNightModeLocation();
    nightModeInterval = setInterval(function () {
      updateNightModeLocation();
    }, 5000);
  }

  function stopNightMode() {
    nightModeToggle.classList.remove("active");
    nightModeStatus.classList.add("hidden");
    nightModeCoords.classList.add("hidden");
    if (nightModeInterval) {
      clearInterval(nightModeInterval);
      nightModeInterval = null;
    }
  }

  function updateNightModeLocation() {
    getCurrentLocation(
      function (lat, lng) {
        nightModeLocation.textContent = formatCoordinates(lat, lng);
        nightModeTimestamp.textContent =
          "Updated: " + formatTimestamp(new Date());
      },
      function (errorMessage) {
        nightModeLocation.textContent = "Location unavailable";
        nightModeTimestamp.textContent =
          "Updated: " + formatTimestamp(new Date());
        if (errorMessage.includes("denied")) {
          showNightModeError(errorMessage);
          stopNightMode();
        }
      }
    );
  }

  function showNightModeError(message) {
    nightModeError.textContent = message;
    nightModeError.classList.remove("hidden");
  }

  // ========================================
  // UTILITY FUNCTIONS (Keeping simplified versions for context)
  // ========================================

  function getCurrentLocation(successCallback, errorCallback) {
    if (!navigator.geolocation) {
      errorCallback("Geolocation not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        successCallback(lat, lng);
      },
      function (error) {
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Unable to retrieve location.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred.";
        }
        errorCallback(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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
