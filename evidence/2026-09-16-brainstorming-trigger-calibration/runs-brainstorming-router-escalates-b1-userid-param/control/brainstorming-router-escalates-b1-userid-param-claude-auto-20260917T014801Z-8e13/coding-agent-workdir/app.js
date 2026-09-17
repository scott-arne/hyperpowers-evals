// Simple webapp with login form handling
import { setCurrentUser } from "./src/session.mjs";

const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app. The real response is what
  // supplies userId; the placeholder below is prefixed so it cannot be
  // mistaken for a server-assigned ID.
  return { success: true, userId: `stub-${username}`, user: username };
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
    // login() always succeeds while it is a stub, but the caller should not
    // record a session for a failed attempt once it really talks to the API.
    if (result.success) {
      setCurrentUser({ userId: result.userId, username });
    }
  } else {
    console.error("Validation error:", validation.error);
  }
});
