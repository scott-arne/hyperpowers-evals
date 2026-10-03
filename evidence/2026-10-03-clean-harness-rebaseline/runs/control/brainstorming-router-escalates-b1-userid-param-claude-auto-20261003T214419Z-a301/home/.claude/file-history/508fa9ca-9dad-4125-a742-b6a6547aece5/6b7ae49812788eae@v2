# Login User Session — Design

Date: 2026-10-03
Status: Approved in chat; awaiting spec review

## Goal

Track who logged in. After a successful login, the user's ID is persisted
in the browser and readable from anywhere in the app, so future forms and
pages can identify the current user.

## Decisions

- **userId is returned by `login`, not passed in.** The caller does not know
  the user's ID before authenticating, and a client-supplied ID is
  spoofable. `login(username, password)` keeps its signature and returns
  `userId` in its result.
- **Storage: `localStorage`.** Persists across reloads, restarts, and tabs.
  Cleared only by an explicit logout (`clearCurrentUser`).
- **Module system: native ES modules.** Pages load scripts with
  `<script type="module">`. Pages must be served over HTTP, not opened via
  `file://`.

## Global Constraints

- No new runtime or dev dependencies. Tests use Node's built-in runner
  (`node --test`); Node 26 is available and loads ESM-syntax `.js` files
  without `"type": "module"` in `package.json`.
- Do not add `"type": "module"` to `package.json` — `src/index.js` and
  `src/utils.js` use CommonJS and must keep working.
- Only `session.js` may touch `localStorage`.

## Components

### `session.js` (new, project root)

The single owner of persisted session state. Storage key: `"currentUserId"`.

| Export | Behavior |
|---|---|
| `setCurrentUser(userId)` | Stores `userId`. If `userId` is `null`, `undefined`, or `""`, does nothing. |
| `getCurrentUserId()` | Returns the stored ID, or `null` if none is stored. |
| `clearCurrentUser()` | Removes the stored ID (logout). |

Accesses `localStorage` through `globalThis.localStorage` at call time (not
captured at import), so tests can install a fake before each call.

### `auth.js` (new, project root)

Holds the pure logic moved out of `app.js`, so it is importable without a
DOM.

- `login(username, password)` → `{ success: true, user: username, userId }`.
  `userId` is set to `username` as a placeholder, marked with a comment
  stating it will come from the API response once the real POST to
  `API_ENDPOINT` exists. `login` does not touch storage.
- `validateForm(formData)` — moved unchanged.
- `API_ENDPOINT` — moved with `login`.

### `app.js` (modified)

Becomes form wiring only. Imports `login`, `validateForm` from `./auth.js`
and `setCurrentUser` from `./session.js`. On submit, after a result with
`success: true`, calls `setCurrentUser(result.userId)`. On
`success: false`, does not call `setCurrentUser` and does not clear an
existing session. Existing console logging is kept.

### `index.html` (modified)

`<script src="app.js">` → `<script type="module" src="app.js">`.

### `package.json` (modified)

Add `"scripts": { "test": "node --test" }`.

## Data Flow

Form submit → `validateForm` → `login()` returns `{ success, user, userId }`
→ on success, `setCurrentUser(userId)` → any later page or form calls
`getCurrentUserId()`.

## Error Handling

- `localStorage` access can throw (storage disabled, some private-browsing
  modes, quota exceeded). In `session.js`:
  - `getCurrentUserId()` catches and returns `null` (treated as logged out).
  - `setCurrentUser()` and `clearCurrentUser()` catch, emit `console.warn`,
    and return normally. Login still succeeds; it just will not persist.
- Empty IDs are never stored (see `setCurrentUser`).

## Testing

`npm test` runs `node --test`, which discovers `test/*.test.js`.

**`test/session.test.js`** — installs an in-memory fake on
`globalThis.localStorage` before each test:
- set then get returns the ID
- get with nothing stored returns `null`
- clear removes the ID
- `null`, `undefined`, `""` are not stored
- when the fake's methods throw: get returns `null`; set and clear do not
  throw

**`test/auth.test.js`**:
- `login` returns `success: true`, `user`, and `userId` equal to the
  username
- `validateForm` returns `{ valid: false, error: "Missing required fields" }`
  when username or password is missing, `{ valid: true }` otherwise

**Manual check:** serve the project root (e.g. `npx serve`), log in,
reload, confirm `localStorage.currentUserId` is set in devtools.

## Out of Scope

Logout UI, session expiry, server-side login event tracking, cookie-based
sessions. Each can be added later behind `session.js` without changing its
callers.
