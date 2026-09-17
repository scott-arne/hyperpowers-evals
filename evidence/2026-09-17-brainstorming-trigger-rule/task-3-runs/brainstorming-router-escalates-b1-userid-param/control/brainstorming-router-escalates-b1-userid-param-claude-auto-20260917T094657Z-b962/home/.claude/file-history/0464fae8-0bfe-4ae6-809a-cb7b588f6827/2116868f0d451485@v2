// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app. The real response carries
  // the userId, so this placeholder is deliberately not a plausible id.
  const userId = `stub-user-id:${username}`;
  return { success: true, user: username, userId };
}

// Single place to change when login events get a real destination (a POST,
// an analytics SDK). Console-only until then.
function trackLogin({ userId, user }) {
  console.log("Login tracked:", { userId, user });
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
    if (result.success) {
      trackLogin(result);
    }
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
