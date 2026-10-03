# Approved design context (brainstorming, 2026-10-03)

Original user request: "Add a userId parameter to the login function so we can track who logged in."
Repo: browser login form (index.html + app.js, plain script), stub login() returning { success, user }.

User decisions:
- userId source: user said "your call" between returning it from login() vs a new parameter; Claude chose returning it (signature unchanged) because the client has no verified ID before login.
- Requirement from user: "It should persist, and work across the app — other forms will need it later."
- Persistence: localStorage behind a session module (user chose).
- Module system: ES modules (user chose); pages must be served over HTTP.
- Tracking scope: current user only, no login history (user chose).
- Tooling: unit tests via node:test only; no lint, no E2E (user chose).
- User approved design sections 1 (components), 2 (data flow / error handling), 3 (testing).
