# Approved design decisions (user-confirmed in chat, 2026-10-03)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- User chose: login() keeps (username, password) and RETURNS userId (no caller-supplied userId param; spoofable).
- User clarified tracking: "It should persist and work across the app; other forms will need it later."
- User chose persistence: shared session.js module backed by sessionStorage (not localStorage, not server cookie).
- User approved design sections: components/data flow, error handling.
- User chose tooling: node:test unit tests only (no lint, no E2E).
