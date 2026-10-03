// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

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
  const userId = document.getElementById("userId").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password, userId);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
