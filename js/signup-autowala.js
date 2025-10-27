// Autowala signup form logic

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('submit-btn');
  const generalError = document.getElementById('general-error');

  // Form fields
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const driverNameInput = document.getElementById('driver-name');
  const phoneInput = document.getElementById('phone');
  const locationInput = document.getElementById('location');
  const licensePlateInput = document.getElementById('license-plate');

  // Error elements
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const confirmPasswordError = document.getElementById('confirm-password-error');
  const driverNameError = document.getElementById('driver-name-error');
  const phoneError = document.getElementById('phone-error');
  const locationError = document.getElementById('location-error');
  const licensePlateError = document.getElementById('license-plate-error');

  // Validation functions
  function validateEmail() {
    const email = emailInput.value.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(email)) {
      emailInput.classList.add('error');
      emailError.classList.add('show');
      return false;
    }

    emailInput.classList.remove('error');
    emailError.classList.remove('show');
    return true;
  }

  function validatePassword() {
    const password = passwordInput.value;

    if (password.length < 6) {
      passwordInput.classList.add('error');
      passwordError.classList.add('show');
      return false;
    }

    passwordInput.classList.remove('error');
    passwordError.classList.remove('show');
    return true;
  }

  function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      confirmPasswordInput.classList.add('error');
      confirmPasswordError.classList.add('show');
      return false;
    }

    confirmPasswordInput.classList.remove('error');
    confirmPasswordError.classList.remove('show');
    return true;
  }

  function validateDriverName() {
    const driverName = driverNameInput.value.trim();

    if (driverName.length < 2 || driverName.length > 100) {
      driverNameInput.classList.add('error');
      driverNameError.classList.add('show');
      return false;
    }

    driverNameInput.classList.remove('error');
    driverNameError.classList.remove('show');
    return true;
  }

  function validatePhone() {
    const phone = phoneInput.value.trim();
    const regex = /^\d{10}$/;

    if (!regex.test(phone)) {
      phoneInput.classList.add('error');
      phoneError.classList.add('show');
      return false;
    }

    phoneInput.classList.remove('error');
    phoneError.classList.remove('show');
    return true;
  }

  function validateLocation() {
    const location = locationInput.value.trim();

    if (location.length < 2 || location.length > 100) {
      locationInput.classList.add('error');
      locationError.classList.add('show');
      return false;
    }

    locationInput.classList.remove('error');
    locationError.classList.remove('show');
    return true;
  }

  function validateLicensePlate() {
    const licensePlate = licensePlateInput.value.trim().toUpperCase();
    const regex = /^[A-Z0-9]{5,20}$/;

    if (!regex.test(licensePlate)) {
      licensePlateInput.classList.add('error');
      licensePlateError.classList.add('show');
      return false;
    }

    licensePlateInput.classList.remove('error');
    licensePlateError.classList.remove('show');
    return true;
  }

  // Add blur event listeners for validation
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);
  confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
  driverNameInput.addEventListener('blur', validateDriverName);
  phoneInput.addEventListener('blur', validatePhone);
  locationInput.addEventListener('blur', validateLocation);
  licensePlateInput.addEventListener('blur', validateLicensePlate);

  // Clear errors on input
  emailInput.addEventListener('input', () => {
    emailInput.classList.remove('error');
    emailError.classList.remove('show');
  });

  passwordInput.addEventListener('input', () => {
    passwordInput.classList.remove('error');
    passwordError.classList.remove('show');
  });

  confirmPasswordInput.addEventListener('input', () => {
    confirmPasswordInput.classList.remove('error');
    confirmPasswordError.classList.remove('show');
  });

  driverNameInput.addEventListener('input', () => {
    driverNameInput.classList.remove('error');
    driverNameError.classList.remove('show');
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.classList.remove('error');
    phoneError.classList.remove('show');
  });

  locationInput.addEventListener('input', () => {
    locationInput.classList.remove('error');
    locationError.classList.remove('show');
  });

  // Auto-uppercase license plate input
  licensePlateInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    licensePlateInput.classList.remove('error');
    licensePlateError.classList.remove('show');
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide general error
    generalError.classList.remove('show');

    // Validate all fields
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    const isDriverNameValid = validateDriverName();
    const isPhoneValid = validatePhone();
    const isLocationValid = validateLocation();
    const isLicensePlateValid = validateLicensePlate();

    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid ||
        !isDriverNameValid || !isPhoneValid || !isLocationValid || !isLicensePlateValid) {
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup-autowala`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
          driver_name: driverNameInput.value.trim(),
          phone_number: phoneInput.value.trim(),
          operating_location: locationInput.value.trim(),
          license_plate: licensePlateInput.value.trim().toUpperCase(),
          role: 'autowala'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));

        // Redirect to home page
        window.location.href = 'index.html';
      } else {
        // Show error message
        generalError.textContent = data.message || 'Something went wrong. Please try again.';
        generalError.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Autowala Account';
      }
    } catch (error) {
      console.error('Signup error:', error);
      generalError.textContent = 'Unable to connect. Please try again.';
      generalError.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Autowala Account';
    }
  });
});
