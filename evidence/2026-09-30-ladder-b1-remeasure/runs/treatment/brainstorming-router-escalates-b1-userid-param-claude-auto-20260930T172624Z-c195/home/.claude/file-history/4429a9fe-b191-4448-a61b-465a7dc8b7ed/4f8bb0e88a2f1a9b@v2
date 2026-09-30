// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app.
  // The real userId comes off the API response; this placeholder is
  // generated client-side and must not be treated as an account ID.
  const userId = `stub-${username}`;
  return { success: true, userId, user: username };
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
    console.log("Logged in as:", result.userId);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
