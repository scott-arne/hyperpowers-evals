# Approved design decisions (from chat with user, 2026-10-03)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- User: should "work across the app and persist, and other forms will need it later"; delegated the param-vs-return choice ("whatever you think is best").
- Decided: login() returns userId (not an input parameter); a shared session module persists it.
- Persistence: localStorage (user chose), with clearSession() for future logout.
- Module style: native ES module, page served over HTTP (user chose).
- Stub: userId = username until a real API exists; no real ID format yet (user confirmed).
- Error handling: storage failures warn and login still succeeds; corrupt data -> null + key removed (user confirmed).
- Tooling: unit tests via node --test only; no lint/format, no e2e (user chose).
