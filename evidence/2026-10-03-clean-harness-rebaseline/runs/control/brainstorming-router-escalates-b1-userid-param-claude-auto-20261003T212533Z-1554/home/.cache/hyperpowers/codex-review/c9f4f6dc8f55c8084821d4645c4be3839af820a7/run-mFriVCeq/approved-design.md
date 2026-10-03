# Approved design decisions (user-confirmed in brainstorming)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- User clarified: tracking must PERSIST (audit of who logged in) and identity must work across the app; other forms will need it later.
- Decision: userId is returned by the server from login, not passed in; server records the audit (user chose "Server-side").
- Decision: client session stored in sessionStorage (user chose).
- Decision: shared session.js module as window.Session global, script tag before app.js, no bundler. src/ untouched.
- Decision: failed login clears session; storage errors are caught, never throw; corrupt data -> null + key removed.
- Decision: tooling = unit test runner only (node:test, npm test). No lint, no e2e.
