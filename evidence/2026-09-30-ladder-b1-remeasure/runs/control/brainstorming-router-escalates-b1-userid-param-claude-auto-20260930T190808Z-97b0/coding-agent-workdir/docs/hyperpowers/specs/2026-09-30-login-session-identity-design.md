# Login Session Identity — Design

Date: 2026-09-30
Status: Approved for planning
Branch: `feature/webapp-enhancement`

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." Clarification established that `userId` means the user's account
ID, that it must be available across the app and persist, that other forms will
need it later, and that the login itself must be persisted.

The requested shape is not implementable as stated. `login` currently receives
`username` and `password` read directly from the form, and the account ID is not
known to the browser before authentication — it is something the server
determines once credentials are verified. The account ID is therefore an
**output** of login, not an input.

What the request actually needs is two things the repository does not have:

1. A place for authenticated identity to live on the client, readable by other
   forms after login.
2. A durable record of login events.

## Scope

**In scope.** Client-side session identity: a module that owns the authenticated
user's account ID and persists it for the browser tab; the login call that
obtains it; unit tests for both.

**In scope as specification only.** The server contract — the request/response
shape for login and the server's responsibility to record the login event. No
backend exists in this repository (`API_ENDPOINT` points at `api.example.com`
and is currently referenced only in a comment), so this design defines the
contract the client codes against and stops there.

**Out of scope.** User-facing error UI, logout, session expiry, end-to-end
tests, lint/format tooling.

## Global Constraints

- **Native ES modules** on the browser side. No bundler, no build step, no
  runtime dependencies.
- **`package.json` gains `"type": "module"`**, and `src/index.js` /
  `src/utils.js` convert from CommonJS to ESM. This is required for correctness:
  Node will not treat `.js` as ESM otherwise, and the existing `require` calls
  would break. It is roughly three lines across two files and removes the
  repository's CommonJS/ESM split rather than working around it.
- **Unit tests from the start**, using Node's built-in `node:test` and
  `node:assert`. No test framework dependency.
- **`userId` is an identifier, never authorization.** Client-stored identity
  states who the client claims to be, not who they have proven to be. Any
  server endpoint must derive identity from a server-side session, never from a
  `userId` supplied by the client. This constraint is what allows a later move
  to server-owned sessions without a rewrite.
- Serving over a local HTTP server is required from now on. Module scripts are
  blocked over `file://`, so opening `index.html` directly from disk no longer
  works.

## Architecture

Three browser modules, each with a single purpose and no hidden coupling:

| Module | Purpose | Depends on |
|---|---|---|
| `session.js` | Sole owner of "who is logged in." Reads and writes the stored identity. | `sessionStorage` (injectable) |
| `auth.js` | `login(username, password)` — calls the API and returns the result. Knows nothing about storage. | `fetch` (injectable) |
| `app.js` | DOM wiring: read the form, validate, call `auth`, hand the result to `session`. | both |

`session.js` and `auth.js` have no DOM dependency, which is what makes them
unit-testable outside a browser. `validateForm` stays in `app.js`; it is
form-specific and has no consumer elsewhere.

`index.html` changes its script tag to `<script type="module" src="app.js">`.

### `session.js` interface

```js
setSession({ userId, username })  // store the authenticated identity
getSession()                      // → { userId, username } | null
getUserId()                       // → string | null
clearSession()                    // forget it
```

The module exports `createSession(storage)` as a factory plus a default instance
bound to `sessionStorage`. The factory exists for test injection; application
code uses the default instance. Constructing the default instance must not
throw when `sessionStorage` is unavailable — environments that block storage
can throw on property *access*, so the default instance resolves storage lazily
inside a guarded accessor rather than at module load.

`setSession` rejects an argument missing either `userId` or `username` by
throwing, rather than storing a partial record. This enforces the all-or-nothing
invariant at the storage boundary as well as at the call site, so a future
caller cannot bypass it.

Storage key: `app.session`. Stored value: JSON `{ "userId": …, "username": … }`.

This interface is the contract other forms consume later, so it is the part of
this design most worth stability.

### `auth.js` interface

```js
login(username, password, { fetch } = {})  // → Promise<Result>
```

`Result` is `{ success: true, userId, username }` or
`{ success: false, error }`. The `fetch` override exists for test injection.

`login` becomes asynchronous; the submit handler in `app.js` awaits it.

## Data Flow

```
submit → validateForm → await auth.login(username, password)
                              ↓ POST API_ENDPOINT { username, password }
                        server verifies, records the login event,
                        returns { userId, username }
                              ↓
                        app.js → session.setSession({ userId, username })
                              ↓
                        sessionStorage["app.session"]
```

Other forms, later, call `session.getUserId()`. They never receive the ID as a
parameter and never read storage directly.

## Server Contract (specified, not implemented)

- `POST` to `API_ENDPOINT`, body `{ username, password }`.
- `200` → `{ userId, username }`.
- `401` → `{ error }` for invalid credentials.
- The server persists the login record: who logged in and when, plus whatever
  request metadata is wanted. This is the durable half of "track who logged
  in." The client half only makes the ID available to other forms; it is not an
  audit trail and must not be treated as one.

## Error Handling

The governing invariant: **a session is written only on a fully valid success,
all or nothing.** A partially populated identity is worse than none, because
every consumer downstream trusts `getUserId()`.

| Case | Behavior |
|---|---|
| `fetch` rejects (offline, DNS, CORS) | `{ success: false, error: "network" }`. No session written. |
| `401` | `{ success: false, error: "invalid credentials" }`. No session written. |
| `200` with body missing `userId` | Treated as a failure, not a success. A malformed success is how a null ID leaks into storage and surfaces as a defect in an unrelated form. |
| Other non-2xx | `{ success: false, error: "server error" }`. No session written. |
| `sessionStorage` throws on write (private mode, storage disabled) | `session.js` falls back to an in-memory object. The application keeps working for the tab; the ID does not survive reload. Degrade, do not crash. |
| Stored JSON is corrupt on read | Treat as no session and clear the key, rather than throwing during page load. |

`app.js` reports failures through the existing `console.error` path, matching
current behavior. User-facing error presentation is out of scope.

A failed login leaves any existing session untouched. A failure is not an
implicit logout: clearing identity on a mistyped password would silently sign
out a user who was already authenticated in that tab.

## Testing

Runner: `node:test` with `node:assert`. `package.json` gains
`"scripts": { "test": "node --test" }`.

- **`session.js`** — set/get round trip; `getUserId` returns `null` on empty
  storage; `clearSession` empties it; a throwing storage falls back to memory;
  corrupt stored JSON reads as no session.
- **`auth.js`** — success returns the `userId`; `401` path; network rejection;
  the malformed-`200` case.
- **`validateForm`** — pins the existing missing-field behavior.
- **`setSession` rejection** — a partial record (missing `userId` or
  `username`) throws and leaves storage unchanged.

`app.js` is not unit-tested. It is DOM wiring, and with end-to-end tests out of
scope, covering it would require a DOM shim for little return. This is a known
and accepted coverage gap.

## Rejected Alternatives

- **`localStorage` instead of `sessionStorage`.** Buys persistence across
  browser restarts, but costs a stale-identity problem: on a shared machine the
  previous user's ID persists indefinitely. Correctness would require explicit
  logout and an expiry policy, neither of which is in scope.
- **Server-owned session via `HttpOnly` cookie, client re-hydrating from a
  `/me` endpoint.** The correct end state for real authentication — the client
  cannot lie about identity and XSS cannot exfiltrate the session. Rejected for
  now only because no backend exists. The `userId`-is-not-authorization
  constraint above keeps this migration cheap.
- **Adding a bundler.** Unnecessary for three modules, and it would introduce a
  dependency tree into a repository that has none.
- **Passing `userId` into `login` as a parameter**, as originally requested.
  Not implementable: the value does not exist client-side before
  authentication.
