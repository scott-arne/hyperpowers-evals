# Login User Tracking — Design

Date: 2026-10-03
Status: Approved design, pending spec review

## Goal

Record who logged in, and make the logged-in user's `userId` available to
other parts of the app (other forms, added later) for the lifetime of the
browser tab.

## Decisions

- **Source of `userId`:** returned by `login()` (i.e. the server response),
  not passed in by the caller. A client-supplied ID would be spoofable and
  the client does not know the ID before authenticating.
  `login(username, password)` keeps its current signature.
- **Persistence:** `sessionStorage` — survives reloads, cleared when the tab
  closes.
- **Tracking scope:** store the current user, plus emit a login event.
  No logout in this version.
- **Packaging:** plain browser script exposing a single `Session` global,
  loaded before `app.js`. No build step, no ES modules (they do not load over
  `file://`).

## Components

### `session.js` (new, repo root next to `app.js`)

Defines a global `Session` object:

| Function | Behavior |
|----------|----------|
| `setUser({ userId, username })` | Writes `JSON.stringify({ userId, username })` to `sessionStorage` under key `"session.user"`. |
| `getUser()` | Returns `{ userId, username }`, or `null` if the key is absent, the JSON is invalid, or storage throws. |
| `getUserId()` | Returns `getUser()?.userId ?? null`. |
| `recordLogin({ userId, username })` | Emits `{ type: "login", userId, username, timestamp }` where `timestamp` is an ISO-8601 string from `new Date().toISOString()`. Current sink: `console.log("Login event:", event)`, with a comment marking where a real tracking POST would go. Returns the event object (for testing). |

At the bottom, a guard exports the object for Node tests without affecting
the browser:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = Session;
}
```

`Session` reads `sessionStorage` from the global scope at call time (not at
load time), so tests can install an in-memory stand-in on `globalThis`
before calling functions.

### `app.js` (changed)

- `login(username, password)` stub returns
  `{ success: true, user: username, userId: "user-" + username }`.
  The placeholder `userId` stands in for a server-issued ID.
- In the submit handler, after `login()`: if `result.success` and
  `result.userId` are truthy, call
  `Session.setUser({ userId: result.userId, username: result.user })`
  then `Session.recordLogin(...)` with the same object. Otherwise do not
  touch the session.

### `index.html` (changed)

Add `<script src="session.js"></script>` immediately before
`<script src="app.js"></script>`.

## Data Flow

submit → `validateForm` → `login()` → (stubbed server) returns `userId` →
`Session.setUser` → `Session.recordLogin` → later consumers call
`Session.getUserId()`.

## Error Handling

- `setUser`: wraps the storage write in `try/catch`; on failure logs with
  `console.error` and returns without throwing. Login still succeeds —
  tracking is best-effort.
- `getUser`: returns `null` on missing key, invalid JSON, or storage throwing.
- `recordLogin`: never throws; it does not depend on storage.
- Failed login (`success: false`) or missing `userId`: no session write, no
  event.

## Testing

- New `test/session.test.js` using `node:test` and `node:assert`, with an
  in-memory `sessionStorage` stand-in installed on `globalThis` per test.
- Cases:
  1. `setUser` then `getUser` / `getUserId` round-trip.
  2. Empty storage → `getUser()` and `getUserId()` return `null`.
  3. Corrupted JSON under `"session.user"` → `getUser()` returns `null`.
  4. Storage whose `setItem`/`getItem` throw → `setUser` does not throw;
     `getUser` returns `null`.
  5. `recordLogin` returns an event with `type: "login"`, the given
     `userId`/`username`, and a valid ISO-8601 `timestamp`.
- `package.json` gains `"scripts": { "test": "node --test" }`. No
  dependencies added.
- `app.js` DOM wiring is verified manually in a browser (submit form, check
  console for the login event and `sessionStorage["session.user"]`). No DOM
  test harness in this scope.

## Out of Scope

- `logout()` / clearing the session.
- Real backend calls (login or tracking POST).
- Converting the app to ES modules or adding a bundler.
- Consuming `Session` from other forms (they do not exist yet).
