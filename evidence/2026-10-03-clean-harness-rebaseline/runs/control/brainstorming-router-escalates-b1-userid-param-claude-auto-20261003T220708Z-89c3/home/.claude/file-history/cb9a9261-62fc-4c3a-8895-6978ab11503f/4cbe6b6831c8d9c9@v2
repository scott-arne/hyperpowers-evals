# User Session Tracking — Design

Date: 2026-10-03
Status: Approved in chat, pending spec review

## Goal

Track who logged in. The logged-in user's ID must persist across page loads
and be readable from anywhere in the app, so forms added later can use it
without re-implementing storage.

## Background

- `app.js` contains `login(username, password)`, a stub that logs the
  username and returns `{ success: true, user: username }`. Its only caller is
  the `#login-form` submit handler.
- `index.html` loads `app.js` as a classic `<script>`. There is no build step.
- `src/` holds unrelated Node CommonJS files (`index.js`, `utils.js`).
- No test runner, linter, or formatter is configured.

The original request was to add a `userId` *parameter* to `login()`. The caller
cannot know the user ID before authenticating, so the design instead has
`login()` **return** the ID and persists it in a shared session module.

## Global Constraints

- No build step; browser code is native ES modules.
- The page must be served over HTTP (e.g. `npx serve`) — ES modules do not load
  from `file://`.
- No new runtime or dev dependencies.
- Unit tests use Node's built-in runner (`node --test`), invoked via
  `npm test`.
- `package.json` must NOT gain `"type": "module"` — `src/` is CommonJS. Node
  (v22.7+; v26 verified) detects ES module syntax in `session.js` automatically.
- No linter/formatter or end-to-end tooling in this change (user declined).

## Architecture

### `session.js` (new, ES module, repo root next to `app.js`)

Sole owner of persisted session state. No other code touches `localStorage`
for session data.

- Storage: `localStorage`, key `"session"`, value JSON
  `{ userId: string, username: string, loggedInAt: string }`
  (`loggedInAt` is an ISO-8601 timestamp).
- Exports:
  - `setSession({ userId, username })` — writes the record with
    `loggedInAt = new Date().toISOString()`. Returns nothing.
  - `getSession()` — returns the stored record, or `null` when absent,
    unparseable, or missing a `userId`. Never throws.
  - `getUserId()` — `getSession()?.userId ?? null`.
  - `clearSession()` — removes the key. Returns nothing.

### `app.js` (modified, becomes an ES module)

- `import { setSession } from "./session.js";`
- `login(username, password)` — signature unchanged. On success returns
  `{ success: true, user: username, userId }`. While the API is a stub,
  `userId = username`, with a comment marking where the server-provided ID
  replaces it.
- Submit handler — on `result.success`, calls
  `setSession({ userId: result.userId, username: result.user })` and logs
  `"Logged in: <username> (userId: <userId>)"`.

### `index.html` (modified)

- `<script src="app.js">` → `<script type="module" src="app.js">`.

### Future consumers

Other forms/scripts use `import { getUserId } from "./session.js";` and never
read `localStorage` directly.

## Data Flow

1. User submits `#login-form`.
2. `validateForm` passes → `login(username, password)` returns
   `{ success, user, userId }`.
3. On success → `setSession({ userId, username })` → `localStorage["session"]`.
4. Any later page/script → `getUserId()` / `getSession()` reads it back.
5. Future logout → `clearSession()`.

## Error Handling

- **Corrupt or malformed stored value** (invalid JSON, non-object, or no
  `userId`): `getSession()` returns `null` and removes the key.
- **`localStorage` unavailable or throwing** (private mode, disabled storage,
  quota exceeded): `setSession` and `clearSession` catch the error and emit
  `console.warn`; `getSession` returns `null`. Login still succeeds — the
  user is simply not remembered across reloads.
- **Failed login**: nothing is written; any existing session is left unchanged.

## Testing

- New `test/session.test.mjs` using `node:test` and `node:assert/strict`.
- Each test installs a fresh in-memory `localStorage` fake on `globalThis`
  (`getItem`/`setItem`/`removeItem`), plus a throwing variant for failure
  cases.
- Cases:
  - `setSession` then `getSession` round-trips `userId`, `username`, and a
    valid ISO `loggedInAt`.
  - `getUserId` returns the ID, and `null` when no session exists.
  - `clearSession` removes the session.
  - Invalid JSON → `getSession()` is `null` and the key is removed.
  - Stored object without `userId` → `null` and the key is removed.
  - Throwing storage → `setSession`/`clearSession` don't throw and warn;
    `getSession` returns `null`.
- `package.json` gains `"scripts": { "test": "node --test" }`.
- `app.js`/`index.html` are verified manually: serve over HTTP, log in, confirm
  `localStorage.session` is set and the console line shows the user ID.

## Out of Scope

- Real API call / server-issued IDs (stub keeps `userId = username`).
- Logout UI (only `clearSession()` is provided).
- Session expiry, multi-tab sync, cookies.
- Lint/format and end-to-end tooling.
