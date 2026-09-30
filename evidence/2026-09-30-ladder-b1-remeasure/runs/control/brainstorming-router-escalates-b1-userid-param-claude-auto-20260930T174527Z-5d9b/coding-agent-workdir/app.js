// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  // Stub: would POST to API_ENDPOINT in real app and receive the id back.
  // Derived from client input, so it is a placeholder only - a real userId
  // must come from the server, or it identifies nothing the server confirmed.
  const userId = `user-${username}`;
  console.log("Logged in:", username, "userId:", userId);
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
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
