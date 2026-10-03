# Login userId Tracking — Design

**Date:** 2026-10-03
**Status:** Approved in chat; awaiting spec review

## Goal

Track who logged in by passing a persistent, client-generated `userId` into
`login()`. The ID must persist across page loads and be reusable by other forms
added later.

## Decisions

- **userId is a client tracking ID**, not a backend account ID. It identifies a
  browser, not a verified person: it changes if storage is cleared or on another
  device, and it can be forged. It is suitable for analytics-style correlation,
  not for security or accountability.
- **userId is an input to `login()`**: `login(username, password, userId)`.
- **"Tracking" means log + return**: `login()` includes the userId in its console
  log and in its returned result. When the real POST to `API_ENDPOINT` is built
  (out of scope here), the userId goes in the request body.
- **Shared logic lives in a new classic script, `user-id.js`**, loaded before
  `app.js`, exposing a global `getUserId()`. ES modules were considered and
  rejected for now because module scripts do not run from `file://`; migrating
  later is cheap.

## Components

### `user-id.js` (new, repo root next to `app.js`)

`getUserId()`:

1. Try to read `localStorage.getItem("userId")`. If present, return it.
2. Otherwise generate `crypto.randomUUID()`, `localStorage.setItem("userId", id)`,
   and return it.
3. If any `localStorage` access throws (private browsing, storage disabled), fall
   back to a module-level in-memory ID generated once per page load and return
   that. Login must never fail because tracking cannot persist.

Exposure:
- Browser: a top-level `function getUserId()` in a classic script is a global.
- Node (tests): `if (typeof module !== "undefined" && module.exports) module.exports = { getUserId };`
  matching the CommonJS style of `src/utils.js`.

To keep it testable, `getUserId` reads `localStorage` and `crypto` from
`globalThis` at call time, so tests can install fakes.

### `app.js` (modified)

- `login(username, password, userId)`:
  - logs `Logging in: <username> (userId: <userId>)`
  - returns `{ success: true, user: username, userId }`
- Submit handler passes `getUserId()` as the third argument.
- `validateForm` is unchanged; userId is not user input.

### `index.html` (modified)

Add `<script src="user-id.js"></script>` immediately before
`<script src="app.js"></script>`.

## Data flow

Page load → form submit → handler reads username/password → `getUserId()`
returns persisted (or newly created, or in-memory fallback) ID →
`login(username, password, userId)` → logged and returned in result.

## Error handling

- `localStorage` unavailable or throwing → in-memory fallback, no error surfaced.
- `crypto.randomUUID` is assumed available. Assumption: target browsers support
  `crypto.randomUUID` (secure contexts; `localhost` and `file://` count in modern
  browsers), validate via manual check in the target browser during
  implementation.

## Testing

No test infrastructure exists. Add `test/user-id.test.js` using Node's built-in
`node:test` and `node:assert` (no new dependencies), plus a `"test": "node --test"`
script in `package.json`. Cases:

1. First call creates an ID and stores it in (fake) `localStorage`.
2. Subsequent calls return the same ID.
3. Persistence: with the same fake storage pre-populated, a fresh module load
   returns the stored ID.
4. Fallback: when `localStorage` methods throw, `getUserId()` still returns a
   string and returns the same value on repeated calls.

`login()` lives in `app.js`, which touches `document` at load time and is not
importable in Node; its change is verified manually by loading `index.html`,
submitting the form, and confirming the console shows the userId and the result
object contains it.

## Out of scope

- Implementing the real POST to `API_ENDPOINT`.
- Backend account IDs or linking the tracking ID to accounts.
- Refactoring `app.js` for testability or migrating to ES modules.
- Wiring userId into other forms (none exist yet).
