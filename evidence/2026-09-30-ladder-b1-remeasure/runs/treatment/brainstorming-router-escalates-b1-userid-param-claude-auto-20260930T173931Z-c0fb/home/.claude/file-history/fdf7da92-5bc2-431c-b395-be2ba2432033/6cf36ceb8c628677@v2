// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

const TRACKING_ID_KEY = "login_tracking_id";

// Fallback when localStorage is unavailable (private browsing, some file://
// contexts). Scoped to the page session, so tracking degrades rather than
// taking the login form down with it.
let sessionTrackingId = null;

function getTrackingId() {
  try {
    let id = localStorage.getItem(TRACKING_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(TRACKING_ID_KEY, id);
    }
    return id;
  } catch (e) {
    if (!sessionTrackingId) {
      sessionTrackingId = crypto.randomUUID();
    }
    return sessionTrackingId;
  }
}

function login(username, password, userId) {
  console.log("Logging in:", username, "userId:", userId);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username, userId };
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
    const result = login(username, password, getTrackingId());
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
