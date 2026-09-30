// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

// userId is optional tracking metadata, not a credential, so callers without
// one still succeed.
function login(username, password, userId = null) {
  console.log("Logging in:", username, userId ? `(userId: ${userId})` : "(no userId)");
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
  // An unpopulated hidden field reads as "" — normalize it to absent.
  const userId = document.getElementById("user-id").value || null;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password, userId);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
