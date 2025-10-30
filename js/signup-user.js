// User signup form logic
const API_BASE_URL = "http://localhost:3000/api";
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const submitBtn = document.getElementById("submit-btn");
  const generalError = document.getElementById("general-error");

  // Form fields
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  // Error elements
  const usernameError = document.getElementById("username-error");
  const emailError = document.getElementById("email-error");
  const phoneError = document.getElementById("phone-error");
  const passwordError = document.getElementById("password-error");
  const confirmPasswordError = document.getElementById(
    "confirm-password-error"
  );

  // Validation functions
  function validateUsername() {
    const username = usernameInput.value.trim();
    const regex = /^[a-zA-Z0-9_]{3,50}$/;

    if (!regex.test(username)) {
      usernameInput.classList.add("error");
      usernameError.classList.add("show");
      return false;
    }

    usernameInput.classList.remove("error");
    usernameError.classList.remove("show");
    return true;
  }

  function validateEmail() {
    const email = emailInput.value.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(email)) {
      emailInput.classList.add("error");
      emailError.classList.add("show");
      return false;
    }

    emailInput.classList.remove("error");
    emailError.classList.remove("show");
    return true;
  }

  function validatePhone() {
    const phone = phoneInput.value.trim();
    const regex = /^\d{10}$/;

    if (!regex.test(phone)) {
      phoneInput.classList.add("error");
      phoneError.classList.add("show");
      return false;
    }

    phoneInput.classList.remove("error");
    phoneError.classList.remove("show");
    return true;
  }

  function validatePassword() {
    const password = passwordInput.value;

    if (password.length < 6) {
      passwordInput.classList.add("error");
      passwordError.classList.add("show");
      return false;
    }

    passwordInput.classList.remove("error");
    passwordError.classList.remove("show");
    return true;
  }

  function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      confirmPasswordInput.classList.add("error");
      confirmPasswordError.classList.add("show");
      return false;
    }

    confirmPasswordInput.classList.remove("error");
    confirmPasswordError.classList.remove("show");
    return true;
  }

  // Add blur event listeners for validation
  usernameInput.addEventListener("blur", validateUsername);
  emailInput.addEventListener("blur", validateEmail);
  phoneInput.addEventListener("blur", validatePhone);
  passwordInput.addEventListener("blur", validatePassword);
  confirmPasswordInput.addEventListener("blur", validateConfirmPassword);

  // Clear errors on input
  usernameInput.addEventListener("input", () => {
    usernameInput.classList.remove("error");
    usernameError.classList.remove("show");
  });

  emailInput.addEventListener("input", () => {
    emailInput.classList.remove("error");
    emailError.classList.remove("show");
  });

  phoneInput.addEventListener("input", () => {
    phoneInput.classList.remove("error");
    phoneError.classList.remove("show");
  });

  passwordInput.addEventListener("input", () => {
    passwordInput.classList.remove("error");
    passwordError.classList.remove("show");
  });

  confirmPasswordInput.addEventListener("input", () => {
    confirmPasswordInput.classList.remove("error");
    confirmPasswordError.classList.remove("show");
  });

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide general error
    generalError.classList.remove("show");

    // Validate all fields
    const isUsernameValid = validateUsername();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();

    if (
      !isUsernameValid ||
      !isEmailValid ||
      !isPhoneValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid
    ) {
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Account...";

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          email: emailInput.value.trim(),
          phone_number: phoneInput.value.trim(),
          password: passwordInput.value,
          role: "user",
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userData", JSON.stringify(data.user));

        // Redirect to home page
        window.location.href = "index.html";
      } else {
        // Show error message
        generalError.textContent =
          data.message || "Something went wrong. Please try again.";
        generalError.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
    } catch (error) {
      console.error("Signup error:", error);
      generalError.textContent = "Unable to connect. Please try again.";
      generalError.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
    }
  });
});
