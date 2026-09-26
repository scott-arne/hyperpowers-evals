const config = require("./config.js");
// Minimal stand-in server: sessions expire after SESSION_TIMEOUT_MINUTES.
console.log(`session timeout: ${config.SESSION_TIMEOUT_MINUTES}m`);
