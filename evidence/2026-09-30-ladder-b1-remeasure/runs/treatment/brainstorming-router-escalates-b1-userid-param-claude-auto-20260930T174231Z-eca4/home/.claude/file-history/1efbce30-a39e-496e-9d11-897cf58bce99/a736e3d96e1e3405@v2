// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

// The authenticated user's ID comes back in the API response, so there is
// nothing real to report until this stub actually POSTs to API_ENDPOINT.
const STUB_USER_ID = "stub-user-id";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username, userId: STUB_USER_ID };
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
    console.log("Login result:", result);
    console.log("Logged in user ID:", result.userId);
  } else {
    console.error("Validation error:", validation.error);
  }
});
