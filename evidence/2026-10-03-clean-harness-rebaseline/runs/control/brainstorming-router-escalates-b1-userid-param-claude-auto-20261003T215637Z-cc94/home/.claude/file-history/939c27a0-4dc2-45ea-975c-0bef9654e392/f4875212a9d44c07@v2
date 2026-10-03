# Login User Session — Design

**Date:** 2026-10-03
**Status:** Draft, pending user review

## Goal

Track who logged in by capturing a `userId` on successful login and making it
available across the app (reloads, navigation, and future forms) for the life of
the browser tab.

## Decisions

- **The userId comes from the login result, not from the caller.** `login()` keeps
  the signature `login(username, password)` and returns the `userId`. We dropped
  the literal "add a userId parameter" request: no caller has an ID before
  authentication, and an ID the caller supplies can be faked.
- **Persistence:** a shared `session.js` module backed by `sessionStorage`. It
  survives reloads and navigation and clears when the tab closes. No backend is
  required.
- **Tooling:** Node's built-in test runner (`node --test`), with no new
  dependencies. No linter or E2E tests for now.

## Global Constraints

- No runtime or dev dependencies are added.
- Unit tests run with `npm test` (`node --test`).
- Browser behavior is unchanged except for the additions described here.

## Components

### `session.js` (new, repo root)

A plain browser script loaded by `index.html` before `app.js`. It defines a global
`Session` object, and also exports it via `module.exports` when `module` is
defined, so Node tests can load it.

| Function | Behavior |
|---|---|
| `setCurrentUser({ userId, username })` | Writes `JSON.stringify({ userId, username })` to `sessionStorage["currentUser"]`. Throws `Error` if `userId` is missing or an empty string. |
| `getCurrentUser()` | Returns `{ userId, username }` or `null`. |
| `getCurrentUserId()` | Returns `getCurrentUser()?.userId ?? null`. |
| `clearSession()` | Removes `sessionStorage["currentUser"]`. |

The storage backend is resolved when each function is called (the
`sessionStorage` global), so tests can install a fake before calling.

A header comment states the trust boundary: the stored ID is client-side context
only, and servers must check identity from their own session or token.

### `app.js` (modified)

- `login(username, password)` returns `{ success, user, userId }`. The API is
  still a stub, so `userId` is a stand-in derived from the username (for example
  `"stub-" + username`), marked with a `// Stub:` comment like the existing one.
- On submit, if `result.success` is true, it calls
  `Session.setCurrentUser({ userId: result.userId, username: result.user })`.
- The DOM wiring runs only when `typeof document !== "undefined"`.
- When `module` is defined, it exports `{ login, validateForm }`.

### `index.html` (modified)

Adds `<script src="session.js"></script>` before `<script src="app.js"></script>`.

### Consumers (future forms)

Future forms call `Session.getCurrentUserId()` and never read `sessionStorage`
directly.

## Data Flow

1. The user submits the form, and `validateForm` passes.
2. `login(username, password)` returns `{ success, user, userId }`.
3. On success, `Session.setCurrentUser(...)` saves the user to `sessionStorage`.
4. Any page or script in the tab later calls `Session.getCurrentUserId()`.

## Error Handling

- **Storage unavailable (access or quota errors):** each `Session` function catches
  the error and calls `console.warn`. `setCurrentUser` does nothing, and the
  getters return `null`. Login still succeeds.
- **Corrupt or invalid stored value** (unparseable JSON, or no `userId`):
  `getCurrentUser()` calls `clearSession()` and returns `null`.
- **Missing or empty `userId` passed to `setCurrentUser`:** throws, because that
  is a bug in the calling code. Validation happens before any storage access, so
  it throws even when storage is unavailable.
- **Failed login:** nothing is written, and any previously saved user is left as
  it is. Logging out happens only through an explicit `clearSession()`.

## Testing

Tests go in `tests/`, run with `node --test`. `package.json` gains
`"scripts": { "test": "node --test" }`.

`tests/session.test.js` uses a fake `sessionStorage` (a Map-backed
`getItem`/`setItem`/`removeItem`) installed on `globalThis`, and covers:
- set, then get, returning `{ userId, username }`
- `getCurrentUserId()` returns the ID, or `null` when empty
- `clearSession()` empties the storage
- `setCurrentUser` throws when `userId` is missing or empty
- a corrupt JSON value returns `null`, and the key is removed
- a stored value with no `userId` returns `null`, and the key is removed
- storage that throws: setter and getters don't crash, getters return `null`, and
  a warning is logged

`tests/app.test.js`:
- `login("alice", "pw")` returns `success: true`, `user: "alice"`, and a
  non-empty `userId`
- loading `app.js` without `document` doesn't throw

Manual check: open `index.html`, log in, confirm `currentUser` appears under
DevTools → Application → Session Storage, and confirm a reload keeps it.

## Out of Scope

- Logout UI, session expiry, and sharing the session across tabs.
- A real auth endpoint or server-side session.
- Linting and E2E tooling.
