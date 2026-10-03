# Current-User Session — Design

Date: 2026-10-03
Status: Approved in brainstorming, pending spec review

## Goal

Record which user logged in, persist it across page loads, and expose it
through one shared module that the login form and future forms all use.

Original request: "Add a userId parameter to the login function so we can
track who logged in." Decided instead: `login()` **returns** the userId
rather than taking it as a parameter. The client has no verified userId
before login; identity should come from whatever verified the credentials.

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| userId source | Returned by `login()`, signature unchanged | Caller cannot know a verified ID before login |
| Persistence | `localStorage`, behind a session module | Survives reloads/restarts, shared across tabs; module keeps it swappable |
| Module system | ES modules (`<script type="module">`) | Explicit dependencies; cheapest to adopt while there is one form |
| Tracking scope | Current user only (no login history) | Cross-form reuse needs "who am I"; client-side history is not a trustworthy audit trail |
| Tooling | Unit tests via `node:test` only | Zero dependencies; lint and E2E deferred |

## Global Constraints

- Unit tests run with `npm test` (`node --test`); no test dependencies.
- No new runtime or dev dependencies.
- Existing CommonJS code in `src/` is left untouched; do not add
  `"type": "module"` to `package.json`.
- Pages must be served over HTTP (ES modules do not load from `file://`).

## Components

### `session.js` (new, repo root, ES module)

The only code that reads or writes the stored user.

```js
export function createSession(storage = globalThis.localStorage) {
  return { setCurrentUser, getCurrentUser, clearCurrentUser };
}
export const session = createSession();
```

- Storage key: `"currentUser"`.
- Stored value: JSON `{ "userId": string, "username": string, "loggedInAt": string }`
  where `loggedInAt` is an ISO-8601 timestamp set by `setCurrentUser`.
- `setCurrentUser({ userId, username })`: validates, stamps `loggedInAt`,
  writes JSON.
- `getCurrentUser()`: returns the parsed record or `null`.
- `clearCurrentUser()`: removes the key.
- `createSession(storage)` accepts any object with `getItem`, `setItem`,
  and `removeItem`. Tests pass an in-memory fake; a server-backed version
  can replace it later without changing any form.
- `session` is created when the module loads. In Node, `globalThis.localStorage`
  may be undefined. Creating the default instance must not throw in that
  case; calls on it then follow the "storage not available" rules below.

### `app.js` (modified)

- Add `import { session } from './session.js';`.
- `login(username, password)`: signature unchanged; returns
  `{ success, user, userId }`. The stub sets `userId = username` and has a
  comment marking where the real API response's ID will come from.
- Submit handler: on `result.success`, call
  `session.setCurrentUser({ userId: result.userId, username: result.user })`.
  Writing the session is the caller's job, not `login()`'s.

### `index.html` (modified)

- `<script src="app.js">` becomes `<script type="module" src="app.js">`.

### `package.json` (modified)

- Add `"scripts": { "test": "node --test" }`.

## Data Flow

form submit → `validateForm` → `login(username, password)` →
`{ success, user, userId }` → if `success`:
`session.setCurrentUser({ userId, username: user })` → any form:
`session.getCurrentUser()`.

## Error Handling

- **Failed login** (`success: false`): the session is not touched; the
  previously logged-in user stays logged in.
- **Corrupt stored data** (JSON that won't parse, a non-object value, or
  `userId` missing or not a string): `getCurrentUser()` returns `null`
  and removes the entry.
- **Storage not available** (missing `localStorage`, or `getItem`/`setItem`/`removeItem`
  throwing, e.g. Safari private mode or quota exceeded):
  - `setCurrentUser` catches the error, calls `console.error`, and does not throw.
  - `getCurrentUser` returns `null`.
  - `clearCurrentUser` catches the error, calls `console.error`, and does not throw.
- **Programming error**: `setCurrentUser` called with `userId` missing or
  not a non-empty string throws `TypeError`. Input is validated before any
  storage access.

## Testing

`test/session.test.js` imports `../session.js`. Each test builds a fresh
in-memory fake storage and passes it to `createSession`.

1. set then get returns `userId`, `username`, and a valid ISO `loggedInAt`.
2. get with nothing stored returns `null`.
3. clear removes the stored user.
4. A second set overwrites the first.
5. JSON that won't parse under `currentUser`: get returns `null` and the entry is removed.
6. A stored record with no `userId`: get returns `null`.
7. Storage whose `setItem` throws: set does not throw and `console.error` is called.
8. Storage whose `getItem` throws: get returns `null`.
9. set with no `userId` throws `TypeError`.
10. `createSession(undefined)` does not throw; get returns `null` and set does not throw.

Assumption: Node detects ES module syntax in `session.js` and the test file
without `"type": "module"`. Validate by running `npm test` on Node 26.

`app.js` has no automated tests (it runs DOM code at load, and the new
logic is just wiring). Check it by hand: serve the repo over HTTP, log in,
confirm `localStorage.currentUser` holds the record, reload, and confirm it
is still there.

Implementation is TDD: write the session tests first and see them fail,
then write the module to make them pass.

## Out of Scope

- Logout UI (`clearCurrentUser` exists for when one is added).
- Login history or audit trail.
- Server-side sessions and the real API call.
- Lint/format and E2E tooling.
