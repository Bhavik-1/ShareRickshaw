// Safety Features JavaScript
document.addEventListener('DOMContentLoaded', function() {
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

    // ========================================
    // DOM Element References
    // ========================================

    // Feature 1: Emergency SOS
    const sosButton = document.getElementById('sosButton');
    const sosModal = document.getElementById('sosModal');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    const sosLocation = document.getElementById('sosLocation');
    const sosSuccess = document.getElementById('sosSuccess');
    const sosError = document.getElementById('sosError');

    // Feature 2: Auto Number Capture
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('fileInput');
    const previewArea = document.getElementById('previewArea');
    const photoMetadata = document.getElementById('photoMetadata');
    const photoTimestamp = document.getElementById('photoTimestamp');
    const photoLocation = document.getElementById('photoLocation');
    const uploadError = document.getElementById('uploadError');

    // Feature 3: Trip Sharing
    const tripSharingForm = document.getElementById('tripSharingForm');
    const pickupLocation = document.getElementById('pickupLocation');
    const destination = document.getElementById('destination');
    const autoNumber = document.getElementById('autoNumber');
    const contactsList = document.getElementById('contactsList');
    const addContactBtn = document.getElementById('addContactBtn');
    const pickupError = document.getElementById('pickupError');
    const destinationError = document.getElementById('destinationError');
    const autoNumberError = document.getElementById('autoNumberError');

    // Feature 4: Night Mode Safety
    const nightModeToggle = document.getElementById('nightModeToggle');
    const nightModeStatus = document.getElementById('nightModeStatus');
    const nightModeCoords = document.getElementById('nightModeCoords');
    const nightModeLocation = document.getElementById('nightModeLocation');
    const nightModeTimestamp = document.getElementById('nightModeTimestamp');
    const nightModeError = document.getElementById('nightModeError');

    // ========================================
    // Initialization
    // ========================================

    // Add initial contact field for trip sharing
    addContactField();

    // ========================================
    // FEATURE 1: EMERGENCY SOS
    // ========================================

    // Show modal when SOS button clicked
    sosButton.addEventListener('click', function() {
        showSOSModal();
    });

    // Modal cancel button
    modalCancel.addEventListener('click', function() {
        hideSOSModal();
    });

    // Modal overlay click (close modal)
    sosModal.addEventListener('click', function(e) {
        if (e.target === sosModal) {
            hideSOSModal();
        }
    });

    // Modal confirm button
    modalConfirm.addEventListener('click', function() {
        hideSOSModal();
        triggerEmergencyAlert();
    });

    function showSOSModal() {
        sosModal.classList.add('show');
    }

    function hideSOSModal() {
        sosModal.classList.remove('show');
    }

    async function triggerEmergencyAlert() {
        console.log('SOS: Starting emergency alert process');
        console.log('SOS: Checking dependencies...');
        console.log('SOS: locationService available:', typeof locationService !== 'undefined');
        console.log('SOS: API_BASE_URL available:', typeof API_BASE_URL !== 'undefined');
        console.log('SOS: getToken available:', typeof getToken !== 'undefined');

        // Hide any previous messages
        sosSuccess.classList.add('hidden');
        sosError.classList.add('hidden');

        // Show loading state
        sosButton.disabled = true;
        sosButton.textContent = 'Sending Alert...';

        try {
            // Check if locationService is available
            if (typeof locationService === 'undefined') {
                console.error('SOS: locationService is not defined');
                throw new Error('Location service not available');
            }

            // Get current location using location service
            console.log('SOS: Getting current location...');
            const location = await locationService.captureSOSLocation();
            console.log('SOS: Location captured:', location);

            // Send SOS alert to backend
            const response = await fetch(`${API_BASE_URL}/safety/sos/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy
                    }
                })
            });

            const data = await response.json();
            console.log('SOS: Response received:', data);

            if (data.success) {
                // Success: Show detailed success message
                console.log('SOS: Showing success message');
                displaySOSSuccess(data);
                sosSuccess.classList.remove('hidden');
            } else {
                // Handle specific error cases
                console.log('SOS: Showing error message:', data.message);
                handleSOSError(data);
                sosError.classList.remove('hidden');
            }

        } catch (error) {
            console.error('SOS trigger error:', error);

            // Check if it's a location error
            if (error.message.includes('Location') || error.message.includes('GPS')) {
                showSOSError('Unable to get your location. Please enable location services and try again.');
            } else {
                showSOSError('Failed to send emergency alert. Please try again.');
            }
            sosError.classList.remove('hidden');
        } finally {
            // Reset button state
            sosButton.disabled = false;
            sosButton.textContent = 'SOS';
        }
    }

    function displaySOSSuccess(data) {
        const locationDiv = sosLocation.querySelector('.coords');
        const successMsg = sosSuccess.querySelector('p');

        // Update location display
        const accuracyWarning = data.location.accuracy > 1000 ?
            `<br><small style="color: #ff9800;">⚠️ Location accuracy is low (${data.location.accuracy}m). GPS signal may be weak indoors.</small>` : '';

        locationDiv.innerHTML = `
            <strong>📍 Your Location:</strong> ${locationService.formatCoordinates(data.location.latitude, data.location.longitude)}<br>
            <small>Accuracy: ${data.location.accuracyDescription}</small>${accuracyWarning}<br>
            <a href="${data.location.googleMapsUrl}" target="_blank" style="color: #2196f3; text-decoration: underline;">
                🗺️ View on Google Maps
            </a>
        `;

        // Update success message
        successMsg.innerHTML = `
            ✅ <strong>Emergency Alert Sent Successfully!</strong><br>
            <small>Notified ${data.contactsNotified} of ${data.totalContacts} emergency contacts via email.</small>
            ${data.contactsNotified < data.totalContacts ? `<br><small style="color: #ff9800;">⚠️ Some contacts may not have received the alert.</small>` : ''}
        `;

        // Show location section
        sosLocation.classList.remove('hidden');
    }

    function handleSOSError(data) {
        let errorMessage = data.message || 'Failed to send emergency alert';

        // Handle specific error cases with helpful messages
        if (data.requiresContacts) {
            errorMessage = `No emergency contacts found. Please add emergency contacts with email addresses in your <a href="profile.html" style="color: #2196f3;">Profile</a> before using SOS.`;
        } else if (data.requiresEmails) {
            errorMessage = `Some emergency contacts don't have email addresses. Please update your contacts in your <a href="profile.html" style="color: #2196f3;">Profile</a> to enable email alerts.`;
        } else if (data.requiresLocation) {
            errorMessage = 'Location access is required for emergency alerts. Please enable location services and try again.';
        } else if (data.cooldownRemaining) {
            errorMessage = `Please wait ${data.cooldownRemaining} seconds before triggering another SOS alert.`;
        }

        showSOSError(errorMessage);
    }

    function showSOSError(message) {
        sosError.innerHTML = message; // Use innerHTML to support links
        sosError.classList.remove('hidden');
    }

    function displaySOSLocation(lat, lng) {
        const coordsDiv = sosLocation.querySelector('.coords');
        coordsDiv.textContent = formatCoordinates(lat, lng);
    }

    // ========================================
    // FEATURE 2: AUTO NUMBER CAPTURE
    // ========================================

    // Upload button triggers hidden file input
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });

    // File input change event
    fileInput.addEventListener('change', function(event) {
        handleFileSelect(event);
    });

    function handleFileSelect(event) {
        const file = event.target.files[0];

        if (!file) return;

        // Hide previous errors
        uploadError.classList.add('hidden');

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showUploadError('Please upload a valid image file');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showUploadError('Image too large. Please upload image under 5MB');
            return;
        }

        // Read and display image
        const reader = new FileReader();
        reader.onload = function(e) {
            displayImagePreview(e.target.result);
            capturePhotoMetadata();
        };
        reader.readAsDataURL(file);
    }

    function displayImagePreview(dataURL) {
        // Clear preview area
        previewArea.innerHTML = '';
        previewArea.classList.add('has-image');

        // Create and append image
        const img = document.createElement('img');
        img.src = dataURL;
        previewArea.appendChild(img);
    }

    function capturePhotoMetadata() {
        // Get current timestamp
        const timestamp = formatDateTime(new Date());
        photoTimestamp.textContent = timestamp;

        // Fetch current location
        getCurrentLocation(
            function(lat, lng) {
                photoLocation.textContent = formatCoordinates(lat, lng);
                photoMetadata.classList.remove('hidden');
            },
            function(errorMessage) {
                photoLocation.textContent = 'Not available (access denied)';
                photoMetadata.classList.remove('hidden');
            }
        );
    }

    function showUploadError(message) {
        uploadError.textContent = message;
        uploadError.classList.remove('hidden');
    }

    // ========================================
    // FEATURE 3: TRIP SHARING
    // ========================================

    // Add contact button
    addContactBtn.addEventListener('click', function() {
        if (contactCount < MAX_CONTACTS) {
            addContactField();
        }
    });

    // Form submission
    tripSharingForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitTripDetails();
    });

    // Clear errors on input
    pickupLocation.addEventListener('input', function() {
        clearFieldError(pickupError);
    });

    destination.addEventListener('input', function() {
        clearFieldError(destinationError);
    });

    autoNumber.addEventListener('input', function() {
        clearFieldError(autoNumberError);
    });

    function addContactField() {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'contact-item';
        contactDiv.innerHTML = `
            <input type="text" placeholder="Phone or Email">
            <button type="button" class="remove-btn">✕</button>
        `;

        // Attach remove event listener
        const removeBtn = contactDiv.querySelector('.remove-btn');
        removeBtn.addEventListener('click', function() {
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
        // Clear previous errors
        clearFieldError(pickupError);
        clearFieldError(destinationError);
        clearFieldError(autoNumberError);

        // Validate form
        let isValid = true;

        if (pickupLocation.value.trim() === '') {
            showFieldError(pickupError, 'This field is required');
            isValid = false;
        }

        if (destination.value.trim() === '') {
            showFieldError(destinationError, 'This field is required');
            isValid = false;
        }

        if (autoNumber.value.trim() === '') {
            showFieldError(autoNumberError, 'This field is required');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Collect form data
        const formData = {
            pickup: pickupLocation.value.trim(),
            destination: destination.value.trim(),
            autoNumber: autoNumber.value.trim(),
            contacts: []
        };

        // Collect non-empty contact values
        const contactInputs = contactsList.querySelectorAll('input');
        contactInputs.forEach(function(input) {
            if (input.value.trim() !== '') {
                formData.contacts.push(input.value.trim());
            }
        });

        // Show success message
        alert('Trip shared successfully with your contacts.');
    }

    function showFieldError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function clearFieldError(errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    // ========================================
    // FEATURE 4: NIGHT MODE SAFETY
    // ========================================

    nightModeToggle.addEventListener('click', function() {
        toggleNightMode();
    });

    function toggleNightMode() {
        if (nightModeToggle.classList.contains('active')) {
            // Turn off
            stopNightMode();
        } else {
            // Turn on
            startNightMode();
        }
    }

    function startNightMode() {
        // Add active class to toggle
        nightModeToggle.classList.add('active');

        // Hide error if any
        nightModeError.classList.add('hidden');

        // Show status message
        nightModeStatus.classList.remove('hidden');

        // Show coordinates display
        nightModeCoords.classList.remove('hidden');

        // Fetch initial location
        updateNightModeLocation();

        // Start interval for updates every 5 seconds
        nightModeInterval = setInterval(function() {
            updateNightModeLocation();
        }, 5000);
    }

    function stopNightMode() {
        // Remove active class from toggle
        nightModeToggle.classList.remove('active');

        // Hide status message
        nightModeStatus.classList.add('hidden');

        // Hide coordinates display
        nightModeCoords.classList.add('hidden');

        // Clear interval
        if (nightModeInterval) {
            clearInterval(nightModeInterval);
            nightModeInterval = null;
        }
    }

    function updateNightModeLocation() {
        getCurrentLocation(
            function(lat, lng) {
                // Success: Update coordinates and timestamp
                nightModeLocation.textContent = formatCoordinates(lat, lng);
                nightModeTimestamp.textContent = 'Updated: ' + formatTimestamp(new Date());
            },
            function(errorMessage) {
                // Error: Show error in coordinates area
                nightModeLocation.textContent = 'Location unavailable';
                nightModeTimestamp.textContent = 'Updated: ' + formatTimestamp(new Date());

                // If first attempt and denied, stop night mode
                if (errorMessage.includes('denied')) {
                    showNightModeError(errorMessage);
                    stopNightMode();
                }
            }
        );
    }

    function showNightModeError(message) {
        nightModeError.textContent = message;
        nightModeError.classList.remove('hidden');
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    function getCurrentLocation(successCallback, errorCallback) {
        if (!navigator.geolocation) {
            errorCallback('Geolocation not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude.toFixed(4);
                const lng = position.coords.longitude.toFixed(4);
                successCallback(lat, lng);
            },
            function(error) {
                let errorMessage;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Unable to retrieve location.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                    default:
                        errorMessage = 'An unknown error occurred.';
                }
                errorCallback(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    function formatCoordinates(lat, lng) {
        return 'Lat: ' + lat + ', Long: ' + lng;
    }

    function formatDateTime(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds;
    }

    function formatTimestamp(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return hours + ':' + minutes + ':' + seconds;
    }

});
