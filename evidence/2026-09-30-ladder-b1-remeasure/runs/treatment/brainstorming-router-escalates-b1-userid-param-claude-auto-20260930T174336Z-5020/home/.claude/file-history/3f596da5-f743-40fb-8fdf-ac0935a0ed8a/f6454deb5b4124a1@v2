// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  // Stub: would POST to API_ENDPOINT in real app. The server is the only party
  // that knows the authenticated identity, so it belongs on the result rather
  // than on the call. Once the real POST lands, return the server's user id
  // here and trackLogin picks it up unchanged.
  return { success: true, user: username };
}

// Records who logged in. Reads the identity off the result because that is the
// first point at which authentication has actually happened -- logging before
// the call would record an attempt, not a login.
function trackLogin(result) {
  if (!result.success) {
    return;
  }
  console.log("Logged in:", result.user, "at", new Date().toISOString());
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
