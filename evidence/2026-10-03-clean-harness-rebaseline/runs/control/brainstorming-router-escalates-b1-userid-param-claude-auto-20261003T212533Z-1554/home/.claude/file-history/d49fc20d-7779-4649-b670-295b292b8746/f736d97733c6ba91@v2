# Login User Tracking — Design

**Date:** 2026-10-03
**Status:** Approved design, pending spec review

## Goal

Track who logged in. Login records must persist durably, and the logged-in
user's identity must be available to other forms in the app (current and future).

## Key Decision: userId is an output of login, not an input

The original request was "add a `userId` parameter to `login`". At call time the
client does not yet know the user's ID — establishing identity is what login
does — and a client-supplied ID is spoofable, so it cannot back an audit trail.
Instead, the server authenticates, records the login, and returns `userId`.
`login(username, password)` keeps its signature.

## Global Constraints

- No bundler or build step. Browser code is loaded via plain `<script>` tags.
- Unit tests use Node's built-in `node:test` runner (zero dependencies), run via
  `npm test`. No lint/format or end-to-end tooling in this scope.
- `src/` (Node CommonJS entry point) is out of scope and stays untouched.

## Architecture

### Login API contract (backend-owned; stubbed in this repo)

- Request: `POST /login` with JSON `{ username, password }`.
- Success response: `{ success: true, userId: string, username: string }`.
- Failure response: `{ success: false, error: string }`.
- The **server** writes the audit record (at minimum `userId` and timestamp).
  The client does not write or send audit records.

Assumption: the real backend will implement this contract, validate via review
with the backend owner before replacing the stub.

### `session.js` (new, repo root) — shared session module

Single responsibility: hold the current user's identity for the browser tab.

- Storage: `sessionStorage`, one key (`"currentUser"`), value is JSON
  `{ userId, username }`. Survives reloads and navigation within the tab;
  cleared on tab close.
- API:
  - `setCurrentUser({ userId, username })` — writes the record.
  - `getCurrentUser()` — returns `{ userId, username }` or `null`.
  - `clearCurrentUser()` — removes the record (for failed login and future logout).
- Exposure: browser global `window.Session`. Ends with a guard
  `if (typeof module !== "undefined") module.exports = …` so Node tests can
  `require` it.
- The storage object is injectable (e.g. a factory `createSession(storage)`
  with the global bound to `sessionStorage`) so tests can supply a fake or a
  throwing storage.

### `app.js` (modified)

- `login(username, password)` signature unchanged. It remains a pure API call
  and does not touch storage. The stub returns the contract's success shape with
  a deterministic fake ID (`"user-" + username`), clearly commented as a stub.
- Remove the `console.log("Logging in:", username)` line; the audit trail lives
  server-side.
- Form submit handler: on `success: true`, call
  `Session.setCurrentUser({ userId, username })`; on `success: false`, call
  `Session.clearCurrentUser()` and report the error.
- The submit-handling logic is extracted into a function that takes its
  dependencies (login, session) so it can be unit tested in Node; DOM wiring
  stays a thin layer that only runs when `document` exists. Same
  `module.exports` guard as `session.js`.

### `index.html` (modified)

Add `<script src="session.js"></script>` before `<script src="app.js"></script>`.

## Data Flow

1. User submits the form → `validateForm` (unchanged).
2. `login(username, password)` → `{ success, userId, username }` or `{ success: false, error }`.
3. Success → `Session.setCurrentUser({ userId, username })`.
   Failure → `Session.clearCurrentUser()`.
4. Any form, any page in the tab → `Session.getCurrentUser()?.userId`.

## Error Handling

- **Failed login:** nothing written; any existing session cleared so a previous
  user's ID cannot persist past a failed login.
- **Storage unavailable** (private mode, quota exceeded, disabled, access throws):
  `session.js` catches. `setCurrentUser` logs a warning and does not throw —
  login still succeeds. `getCurrentUser` returns `null`. `clearCurrentUser`
  is a no-op.
- **Corrupt stored value** (invalid JSON or missing `userId`): `getCurrentUser`
  returns `null` and removes the key.

## Testing

Runner: `node:test` via `npm test` (`"test": "node --test"` in `package.json`).

`session.js`:
- set → get round-trip returns `{ userId, username }`.
- get on empty storage returns `null`.
- clear after set → get returns `null`.
- corrupt JSON → get returns `null` and the key is removed.
- storage whose methods throw → set does not throw, get returns `null`.

`app.js` submit logic:
- successful login writes `{ userId, username }` to the session.
- failed login clears a pre-existing session and writes nothing.
- invalid form does not call `login` and does not touch the session.

## Out of Scope

- Implementing the backend endpoint or the audit store.
- Logout UI, session expiry, cross-tab persistence.
- Linting/formatting, end-to-end tests.
- Changes under `src/`.
