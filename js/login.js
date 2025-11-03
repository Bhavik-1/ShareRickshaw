// Login form logic
const API_BASE_URL = "http://localhost:3000/api";
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const submitBtn = document.getElementById("submit-btn");
  const generalError = document.getElementById("general-error");

  // Form fields
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Error elements
  const emailError = document.getElementById("email-error");
  const passwordError = document.getElementById("password-error");

  // Validation functions
  function validateEmail() {
    const email = emailInput.value.trim();

    if (!email) {
      emailInput.classList.add("error");
      emailError.classList.add("show");
      return false;
    }

    emailInput.classList.remove("error");
    emailError.classList.remove("show");
    return true;
  }

  function validatePassword() {
    const password = passwordInput.value;

    if (!password) {
      passwordInput.classList.add("error");
      passwordError.classList.add("show");
      return false;
    }

    passwordInput.classList.remove("error");
    passwordError.classList.remove("show");
    return true;
  }

  // Add blur event listeners for validation
  emailInput.addEventListener("blur", validateEmail);
  passwordInput.addEventListener("blur", validatePassword);

  // Clear errors on input
  emailInput.addEventListener("input", () => {
    emailInput.classList.remove("error");
    emailError.classList.remove("show");
    generalError.classList.remove("show");
  });

  passwordInput.addEventListener("input", () => {
    passwordInput.classList.remove("error");
    passwordError.classList.remove("show");
    generalError.classList.remove("show");
  });

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide general error
    generalError.classList.remove("show");

    // Validate all fields
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userData", JSON.stringify(data.user));

        // Redirect based on user role
        if (data.user.role === 'autowala') {
          window.location.href = "driver-dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      } else {
        // Show error message
        generalError.textContent = data.message || "Invalid email or password";
        generalError.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    } catch (error) {
      console.error("Login error:", error);
      generalError.textContent = "Unable to connect. Please try again.";
      generalError.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }
  });
});
