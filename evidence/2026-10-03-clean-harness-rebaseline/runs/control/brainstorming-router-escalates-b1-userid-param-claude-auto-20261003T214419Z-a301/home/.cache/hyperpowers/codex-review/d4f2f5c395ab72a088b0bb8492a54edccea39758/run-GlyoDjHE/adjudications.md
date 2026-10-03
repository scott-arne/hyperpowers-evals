# Approved design decisions (from chat with the user)

- Original request: "Add a userId parameter to the login function so we can track who logged in."
- Pushed back: a userId *parameter* is unknowable pre-auth and spoofable. User approved instead: login(username, password) keeps its signature and RETURNS userId (placeholder = username until a real API exists).
- User added: the ID "should work across the app and persist; other forms will need it later." Escalated to architectural path.
- User chose localStorage for persistence (over sessionStorage / cookie).
- User chose native ES modules (over global script / bundler); accepted that pages must be served over HTTP.
- User approved Section 1 (session.js owns storage; login stays storage-free; submit handler persists; index.html uses type="module"; logout UI, expiry, server tracking out of scope).
- User approved Section 2 (try/catch storage errors -> null / console.warn; reject empty IDs; failed login neither sets nor clears; node --test with in-memory localStorage fake; extract login/validateForm into auth.js for testability; manual check via npx serve).
