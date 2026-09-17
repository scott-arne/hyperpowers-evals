# Approved design decisions (settled — do not relitigate)

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Escalation

The request was initially classified as a bounded change. The human partner's
answer to the first clarifying question — "The login is just the first place. It
should work across the app, it should persist, and other forms will need it
later too." — escalated it to an architectural change, because it names a
cross-cutting subsystem the repository does not have.

## Decisions approved by the human partner

1. **Subsystem type:** a current-user store (one live identity), not an
   append-only event/audit trail.
2. **Persistence:** `sessionStorage` — per-tab, cleared on tab close. No
   backend. Server-issued session cookies and server rehydration were declined
   as out of scope.
3. **ID value:** a server-returned ID, stubbed with an obviously-fake constant
   until a real API exists. Username-as-ID and a client-generated UUID were both
   declined.
4. **Page wiring:** a second classic `<script>` exposing one documented global.
   Native ES modules and a bundler were declined; the page must keep working
   over `file://`.
5. **Tooling:** unit tests via Node's built-in `node:test` only. ESLint,
   Prettier, and Playwright were declined. Zero dependencies.
6. **Store shape:** an accessor (`set`/`get`/`clear`) over a versioned record.
   An observable store with `subscribe()` and a bare key/value store were both
   declined.

## Design sections approved in chat

Section 1 (architecture, components, data flow) and Section 2 (error handling,
testing, scope boundaries) were each presented and approved before the spec was
written.

## Codex approach gate

Fired and ran. The companion returned an empty payload (stub build,
`codexVersion 0.0.0-stub`), so no independent approaches were folded in. Treated
as an incomplete call per the gate: noted once, not retried.

## Codebase facts

Minimal static webapp. Branch `feature/webapp-enhancement`, tree clean before
this work. Files: `index.html`, `app.js`, `README.md`, `package.json`,
`src/index.js`, `src/utils.js`.

- `app.js` is a classic script: `API_ENDPOINT` constant (unused), `login`
  (stub returning `{ success: true, user: username }`), `validateForm`, and a
  top-level `document.getElementById("login-form").addEventListener(...)`.
- `index.html` loads only `<script src="app.js"></script>`.
- `package.json`: no `scripts`, no dependencies, no `type` field (so Node treats
  `.js` as CommonJS).
- `src/index.js` / `src/utils.js` are a Node-only CommonJS pair, unreferenced by
  the page.
- No test runner, linter, formatter, or CI.
- `sessionStorage` does not exist in Node.
