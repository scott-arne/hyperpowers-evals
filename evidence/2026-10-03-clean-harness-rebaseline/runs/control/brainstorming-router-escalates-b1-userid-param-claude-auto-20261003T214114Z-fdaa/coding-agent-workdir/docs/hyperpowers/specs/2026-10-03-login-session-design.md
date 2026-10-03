# Login Session Design

Date: 2026-10-03
Status: Draft — awaiting user review

## Goal

Track who logged in, and make the logged-in user available across the app
(persisting across reloads) so future forms can read it.

## Decisions

- **userId comes from the login result, not an input parameter.** The client
  does not know a user's ID before authenticating; accepting it as input would
  let any caller assert any identity. `login(username, password)` keeps its
  signature and returns `userId`.
- **Persistence is a client-side session** in `localStorage`, lasting until
  logout. No server-side login history.
- **Sharing is via an ES module** (`session.js`), loaded with
  `<script type="module">`.
- **Placeholder userId:** until a real API exists, the `login()` stub derives
  `userId` as `"user-" + username`, marked with a comment as a placeholder for
  the server-issued ID.
- **No logout button** for now; `logout()` is exported for future use.

## Global Constraints

- Tests use Node's built-in runner (`node --test`), no dependencies.
- No linting/formatting setup.
- `package.json` keeps its current (CommonJS) type; `src/` is untouched.
- The page must be served over HTTP (ES modules do not load from `file://`).

## Components

### `session.js` (new) — sole owner of session storage

```js
const SESSION_KEY = "session";

export function saveSession({ userId, username })
export function getCurrentUser()
export function clearSession()
```

- Stored value: JSON `{ userId, username, loggedInAt }` under `SESSION_KEY`,
  where `loggedInAt` is an ISO-8601 timestamp set at save time.
- `saveSession`:
  - throws `Error` if `userId` is missing (programming error);
  - returns `true` on success;
  - if `localStorage` throws (unavailable, quota), logs via `console.error`
    and returns `false`.
- `getCurrentUser`: returns the stored object, or `null` if the key is absent,
  the JSON is invalid, the object lacks `userId`, or storage throws.
- `clearSession`: removes the key; swallows storage errors (logs via
  `console.error`).
- No DOM dependencies; reads `globalThis.localStorage` at call time so tests
  can supply a stub.

### `app.js` (modified)

- Becomes an ES module; imports `saveSession`, `clearSession` from
  `./session.js`.
- `login(username, password)` returns `{ success, user, userId }`.
- Submit handler: on `result.success`, calls
  `saveSession({ userId: result.userId, username: result.user })`. Nothing is
  saved on failure.
- `export function logout()` calls `clearSession()`.

### `index.html` (modified)

- `<script type="module" src="app.js"></script>`.

## Data Flow

1. Submit → `validateForm` → `login(username, password)` →
   `{ success, user, userId }`.
2. On success → `saveSession(...)` writes `{ userId, username, loggedInAt }`.
3. Other forms: `import { getCurrentUser } from "./session.js"` → object or
   `null`.

## Testing

`test/session.test.mjs`, run with `npm test` (`"test": "node --test"` added to
`package.json` scripts). Uses an in-memory `localStorage` stub on `globalThis`.

Cases:
- save then `getCurrentUser` returns `userId`, `username`, and a valid ISO
  `loggedInAt`;
- `getCurrentUser` returns `null` when empty;
- returns `null` on corrupt JSON;
- returns `null` when the stored object lacks `userId`;
- `clearSession` removes the session;
- `saveSession` throws when `userId` is missing;
- `saveSession` returns `false` (no throw) when storage `setItem` throws;
- `getCurrentUser` returns `null` when storage `getItem` throws.

The `app.js` submit flow is verified manually in a browser (no e2e harness).

Assumption: Node imports the ESM-syntax `session.js` from a `.mjs` test without
`"type": "module"` via module syntax detection (Node ≥ 22.12), validate via
running `npm test` — confirmed working on local Node v26.10.0.

## Out of Scope

- Server-side login history / audit trail.
- Logout button or other UI changes.
- Real API integration and real user IDs.
- Linting, formatting, e2e tests.
