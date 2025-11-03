// Profile page logic

document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is logged in
  if (!requireAuth()) {
    return;
  }

  // NOTE: API_BASE_URL is now accessed globally from js/auth.js

  // Get DOM elements
  const userProfileSection = document.getElementById("user-profile-section");
  const autowalaProfileSection = document.getElementById(
    "autowala-profile-section"
  );
  const emergencyContactsSection = document.getElementById(
    "emergency-contacts-section"
  );

  // Fetch profile data
  try {
    // Use the globally available API_BASE_URL
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();

    if (!data.success) {
      if (response.status === 401) {
        // Token invalid or expired
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        window.location.href = "login.html";
        return;
      }
      throw new Error(data.message);
    }

    const user = data.user;

    // Render profile based on role
    if (user.role === "user") {
      renderUserProfile(user);
    } else if (user.role === "autowala") {
      renderAutowalaProfile(user);
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    alert("Failed to load profile. Please try again.");
  }

  // Render user profile
  function renderUserProfile(user) {
    userProfileSection.classList.remove("hidden");
    emergencyContactsSection.classList.remove("hidden");

    // Fill in profile data - using ?? 'N/A' for textContent assignment robustness
    document.getElementById("display-username").textContent =
      user.username ?? "N/A";
    document.getElementById("display-email").textContent = user.email ?? "N/A";
    document.getElementById("user-phone").value = user.phone_number || "";

    // Render emergency contacts
    renderEmergencyContacts(user.emergency_contacts || []);

    // Set up event listeners
    setupUserProfileEvents();
    setupEmergencyContactsEvents();
  }

  // Render autowala profile
  function renderAutowalaProfile(user) {
    autowalaProfileSection.classList.remove("hidden");

    // Fill in profile data - using ?? 'N/A' for textContent assignment robustness
    document.getElementById("autowala-email").textContent = user.email ?? "N/A";
    document.getElementById("autowala-driver-name").value =
      user.driver_name || "";
    document.getElementById("autowala-phone").value = user.phone_number || "";
    document.getElementById("autowala-location").value =
      user.operating_location || "";
    document.getElementById("autowala-license-plate").textContent =
      user.license_plate ?? "N/A";

    // Set up event listeners
    setupAutowalaProfileEvents();
  }

  // Render emergency contacts list
  function renderEmergencyContacts(contacts) {
    const contactsList = document.getElementById("contacts-list");
    const emptyState = document.getElementById("empty-contacts-state");

    if (contacts.length === 0) {
      contactsList.innerHTML = "";
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      contactsList.innerHTML = contacts
        .map(
          (contact) => `
        <div class="contact-item">
          <div class="contact-info">
            <div class="contact-name">${contact.contact_name}</div>
            <div class="contact-phone">📱 ${contact.contact_phone}</div>
            ${contact.contact_email ? `<div class="contact-email">✉️ ${contact.contact_email}</div>` : ''}
          </div>
          <button class="btn-delete" data-contact-id="${contact.id}">Delete</button>
        </div>
      `
        )
        .join("");

      // Add delete event listeners
      document.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          const contactId = btn.getAttribute("data-contact-id");
          deleteEmergencyContact(contactId);
        });
      });
    }
  }

  // Set up user profile events
  function setupUserProfileEvents() {
    const updateBtn = document.getElementById("update-user-profile");
    const phoneInput = document.getElementById("user-phone");
    const successMsg = document.getElementById("profile-success");
    const errorMsg = document.getElementById("profile-error");

    updateBtn.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();

      // Validate phone
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        errorMsg.textContent = "Phone number must be exactly 10 digits";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      updateBtn.disabled = true;
      updateBtn.textContent = "Updating...";

      try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            phone_number: phone,
          }),
        });

        const data = await response.json();

        if (data.success) {
          successMsg.textContent = "Profile updated successfully";
          successMsg.classList.add("show");
          setTimeout(() => successMsg.classList.remove("show"), 5000);
        } else {
          errorMsg.textContent = data.message || "Failed to update profile";
          errorMsg.classList.add("show");
          setTimeout(() => errorMsg.classList.remove("show"), 5000);
        }
      } catch (error) {
        console.error("Update error:", error);
        errorMsg.textContent = "Failed to update profile";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
      } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = "Update Profile";
      }
    });
  }

  // Set up autowala profile events
  function setupAutowalaProfileEvents() {
    const updateBtn = document.getElementById("update-autowala-profile");
    const driverNameInput = document.getElementById("autowala-driver-name");
    const phoneInput = document.getElementById("autowala-phone");
    const locationInput = document.getElementById("autowala-location");
    const successMsg = document.getElementById("autowala-profile-success");
    const errorMsg = document.getElementById("autowala-profile-error");

    updateBtn.addEventListener("click", async () => {
      const driverName = driverNameInput.value.trim();
      const phone = phoneInput.value.trim();
      const location = locationInput.value.trim();

      // Validate fields
      if (driverName && (driverName.length < 2 || driverName.length > 100)) {
        errorMsg.textContent = "Driver name must be 2-100 characters";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      const phoneRegex = /^\d{10}$/;
      if (phone && !phoneRegex.test(phone)) {
        errorMsg.textContent = "Phone number must be exactly 10 digits";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      if (location && (location.length < 2 || location.length > 100)) {
        errorMsg.textContent = "Operating location must be 2-100 characters";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      updateBtn.disabled = true;
      updateBtn.textContent = "Updating...";

      try {
        const body = {};
        if (driverName) body.driver_name = driverName;
        if (phone) body.phone_number = phone;
        if (location) body.operating_location = location;

        const response = await fetch(`${API_BASE_URL}/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (data.success) {
          successMsg.textContent = "Profile updated successfully";
          successMsg.classList.add("show");
          setTimeout(() => successMsg.classList.remove("show"), 5000);
        } else {
          errorMsg.textContent = data.message || "Failed to update profile";
          errorMsg.classList.add("show");
          setTimeout(() => errorMsg.classList.remove("show"), 5000);
        }
      } catch (error) {
        console.error("Update error:", error);
        errorMsg.textContent = "Failed to update profile";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
      } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = "Update Profile";
      }
    });
  }

  // Set up emergency contacts events
  function setupEmergencyContactsEvents() {
    const showFormBtn = document.getElementById("show-add-contact-form");
    const addContactForm = document.getElementById("add-contact-form");
    const saveContactBtn = document.getElementById("save-contact");
    const cancelBtn = document.getElementById("cancel-add-contact");
    const contactNameInput = document.getElementById("new-contact-name");
    const contactPhoneInput = document.getElementById("new-contact-phone");
    const contactEmailInput = document.getElementById("new-contact-email");

  // Check if all required elements are found
  if (!contactEmailInput) {
    console.error('Email input field not found!');
    return; // Exit if email field is not found
  }

  console.log('All elements found successfully');
    const successMsg = document.getElementById("contacts-success");
    const errorMsg = document.getElementById("contacts-error");

    // Show add contact form
    showFormBtn.addEventListener("click", () => {
      addContactForm.classList.add("show");
      showFormBtn.style.display = "none";
    });

    // Cancel add contact
    cancelBtn.addEventListener("click", () => {
      addContactForm.classList.remove("show");
      showFormBtn.style.display = "block";
      contactNameInput.value = "";
      contactPhoneInput.value = "";
      contactEmailInput.value = "";
    });

    // Save contact
    saveContactBtn.addEventListener("click", async () => {
      const name = contactNameInput.value.trim();
      const phone = contactPhoneInput.value.trim();
      const email = contactEmailInput.value.trim();

      // Validate
      if (name.length < 2 || name.length > 100) {
        errorMsg.textContent = "Contact name must be 2-100 characters";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        errorMsg.textContent = "Contact phone must be exactly 10 digits";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errorMsg.textContent = "Please enter a valid email address";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
        return;
      }

      saveContactBtn.disabled = true;
      saveContactBtn.textContent = "Saving...";

      try {
        const response = await fetch(
          `${API_BASE_URL}/profile/emergency-contacts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({
              contact_name: name,
              contact_phone: phone,
              contact_email: email,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          successMsg.textContent = "Emergency contact added";
          successMsg.classList.add("show");
          setTimeout(() => successMsg.classList.remove("show"), 5000);

          // Reload profile to show new contact
          location.reload();
        } else {
          errorMsg.textContent = data.message || "Failed to add contact";
          errorMsg.classList.add("show");
          setTimeout(() => errorMsg.classList.remove("show"), 5000);
        }
      } catch (error) {
        console.error("Add contact error:", error);
        errorMsg.textContent = "Failed to add contact";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
      } finally {
        saveContactBtn.disabled = false;
        saveContactBtn.textContent = "Save Contact";
      }
    });
  }

  // Delete emergency contact
  async function deleteEmergencyContact(contactId) {
    if (!confirm("Are you sure you want to delete this contact?")) {
      return;
    }

    const successMsg = document.getElementById("contacts-success");
    const errorMsg = document.getElementById("contacts-error");

    try {
      const response = await fetch(
        `${API_BASE_URL}/profile/emergency-contacts/${contactId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        successMsg.textContent = "Emergency contact deleted";
        successMsg.classList.add("show");
        setTimeout(() => successMsg.classList.remove("show"), 5000);

        // Reload profile to show updated list
        location.reload();
      } else {
        errorMsg.textContent = data.message || "Failed to delete contact";
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 5000);
      }
    } catch (error) {
      console.error("Delete contact error:", error);
      errorMsg.textContent = "Failed to delete contact";
      errorMsg.classList.add("show");
      setTimeout(() => errorMsg.classList.remove("show"), 5000);
    }
  }
});
