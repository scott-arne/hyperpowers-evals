// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

// Single place to swap console logging for a real analytics or audit call
// once login talks to API_ENDPOINT.
function trackLogin(result) {
  if (!result.success) return;
  console.log("Login tracked:", { user: result.user, at: new Date().toISOString() });
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password);
    trackLogin(result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
