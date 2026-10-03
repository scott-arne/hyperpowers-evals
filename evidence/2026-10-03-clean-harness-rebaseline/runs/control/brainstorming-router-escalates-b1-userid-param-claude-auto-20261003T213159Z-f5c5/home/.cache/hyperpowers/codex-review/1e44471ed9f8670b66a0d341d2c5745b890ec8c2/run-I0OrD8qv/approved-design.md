# Approved design decisions (from user conversation, 2026-10-03)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- User accepted recommendation: userId comes from login()'s (server/stub) result, not as a caller-supplied param; signature unchanged.
- User: "It should work across the app and persist; other forms will need it later." -> reclassified architectural.
- Persistence: localStorage, wrapped in a session module (setUser/getUser/clear).
- Module format: browser ES modules (<script type="module">), no build step.
- Tooling: unit tests via node:test only (no lint, no E2E).
- Out of scope: logout UI, expiry, other forms.
- Note: extraction of login() into auth.js was added during spec writing for testability; not yet explicitly approved by user.
