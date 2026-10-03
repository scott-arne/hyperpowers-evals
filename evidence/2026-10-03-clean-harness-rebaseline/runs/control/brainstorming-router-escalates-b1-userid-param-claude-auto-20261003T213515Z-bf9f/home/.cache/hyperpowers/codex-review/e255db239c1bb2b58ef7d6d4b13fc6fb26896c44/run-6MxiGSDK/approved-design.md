# Approved design decisions (from user, 2026-10-03)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- User: userId source is Claude's call; it must work across the app, persist, and other forms will need it later.
- Chosen: userId comes from login() result (server-issued), not a caller-supplied parameter.
- Persistence: sessionStorage (until tab closes).
- Tracking scope: store current user + emit a stubbed login event. No logout.
- Packaging: plain-script `Session` global in session.js loaded before app.js; no build, no ES modules.
- Section 1 (components/data flow) and Section 2 (error handling/testing) approved by user.
