// Login event tracking, console-backed for now.
// Replacing the body of trackLogin with a real sink should not require
// changes in any caller. A network-backed version must swallow its own
// errors so a failed tracking call can never break a login.
function trackLogin(userId, username) {
  console.log("Login tracked:", {
    userId,
    username,
    at: new Date().toISOString(),
  });
}
