# Persistent User Identity — Design

Date: 2026-09-16
Status: approved (design), pending implementation plan
Branch: `feature/webapp-enhancement`

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in." Clarification established that the desired outcome is
not a parameter: the identifier must be *real* (not client-asserted), must
persist across page loads and browser restarts, must be readable from anywhere
in the app, and will be consumed by additional forms that do not exist yet.

A real user identifier cannot be passed *into* `login()`. Before authentication
the app knows only what was typed into a form, and a client-chosen identifier is
self-asserted rather than authoritative. The server mints the canonical
identifier and returns it on successful login. `login()` therefore *returns* a
`userId`; it does not accept one. The requested signature change is replaced by
a small identity layer.

## Scope

In scope:

- A session module owning storage, retrieval, expiry, and clearing of the
  authenticated identity.
- A defined login response contract that the current stub honors and the real
  endpoint must honor later.
- Moving the page to ES modules so later forms can import the session module.
- A logout affordance, required by the choice of durable storage.
- Zero-dependency unit tests for the session module.

Out of scope:

- Wiring `login()` to `API_ENDPOINT`. The stub remains; swapping it for `fetch`
  later is a change to one function.
- Emitting analytics or tracking events. This work makes "track who logged in"
  *possible* by establishing a durable identity; there is no telemetry system in
  this repository to emit into. Adding one is a separate request.
- Session tokens or credentials. See "Security notes" for why this boundary
  matters.
- Any change to `src/index.js` or `src/utils.js`, which are unrelated Node
  CommonJS files.

## Global Constraints

- **Testing:** zero-dependency unit tests using the built-in `node:test` runner.
  No new dependencies are added to `package.json`; a `test` script is added.
  This was an explicit selection — the repository currently has no test
  infrastructure at all.
- **No bundler and no build step.** Native ES modules only.
- **No new runtime dependencies.**
- The page must be served over `http` rather than opened via `file://`, because
  ES modules are subject to CORS. This is an accepted consequence of the module
  decision.

## Approach

Selected: **read-through session module**. `localStorage` is the single source of
truth. Every read hits storage and validates expiry; no copy is cached in
memory, so two tabs cannot disagree and there is no cache to invalidate.

Two alternatives were considered and rejected for now, both because they buy
capability before a consumer needs it:

- *Observable store* (in-memory cache, `subscribe()`, cross-tab `storage`
  events) — adds live cross-tab reactivity at the cost of cache coherence and
  subscription lifecycle. A `subscribe()` function can be added later without
  changing any signature defined here.
- *Pure rules + injected storage adapter* — best testability and the cleanest
  seam for future token handling, but the most structure for an app this size.
  Its pure-rules split can be extracted from this module's internals later.

Neither is foreclosed by starting here.

## Components

### `session.js` (new)

An ES module exporting exactly three functions. It is the only code in the app
that touches `localStorage`.

- `saveSession({ userId, username, expiresIn })` — writes the record, computing
  absolute `issuedAt` and `expiresAt` from `expiresIn` (seconds) at write time.
  Returns the stored record, or `null` if persistence failed. Rejects a missing
  or empty `userId` by returning `null` without writing; this guard lives here,
  not in the caller, so the partial-record rule holds for every future consumer
  and is unit-testable. The submit handler is responsible only for checking
  `success` before calling.
- `getSession()` — returns the valid stored record, or `null`. Deletes the
  stored key when the record is expired, malformed, or of an unrecognized
  version.
- `clearSession()` — removes the stored key. This is the logout path.

Storage access goes through `globalThis.localStorage` rather than the bare
`localStorage` global, so tests can substitute a fake. This is the minimum seam
needed to make the module testable without a DOM harness.

### `app.js` (modified)

- Becomes an ES module; imports from `session.js`.
- `login(username, password)` keeps its current two-parameter signature and
  returns the login response contract below instead of
  `{ success: true, user: username }`.
- The submit handler persists the returned identity via `saveSession()` and
  re-renders.
- Page load reads `getSession()` and renders the corresponding state.
- A logout handler calls `clearSession()` and re-renders.

### `index.html` (modified)

- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
- Adds a signed-in region: the identity display and a logout button. The page
  currently has no logout control of any kind.

## Data contracts

### Stored record

Key: `auth.session`. Value: JSON.

```json
{
  "v": 1,
  "userId": "usr_3f9c2a",
  "username": "alice",
  "issuedAt": 1789000000000,
  "expiresAt": 1789043200000
}
```

`issuedAt` and `expiresAt` are epoch milliseconds. The `v` field exists so this
shape can change later without mis-reading records already sitting in users'
browsers — with `localStorage`, old records genuinely persist indefinitely.

### Login response contract

The shape the stub returns today and the real endpoint must return later:

```json
{ "success": true, "userId": "usr_3f9c2a", "username": "alice", "expiresIn": 43200 }
```

Failure:

```json
{ "success": false, "error": "Invalid credentials" }
```

`expiresIn` is in seconds and is server-supplied, so session lifetime is the
server's decision rather than a constant baked into the client. The stub
defaults it to 43200 (12 hours).

The stub derives its placeholder `userId` deterministically from the username,
so repeated logins as the same person yield the same identifier — matching real
server behavior. A random-per-login identifier would mask bugs in any consumer
that compares IDs.

## Data flow

1. **Page load** — `getSession()`. A valid record renders the signed-in state
   (identity shown, logout available, form hidden); `null` renders the login
   form.
2. **Submit** — `validateForm()` → `login()` → on `success`, `saveSession()` →
   render signed-in state.
3. **Logout** — `clearSession()` → render login form.
4. **Expiry** — enforced at read time inside `getSession()`, not by a timer. No
   background scheduling is needed, and a tab left open overnight cannot keep
   using a dead session.

## Error handling

Every failure mode resolves to "no session" rather than a thrown exception.

| Condition | Behavior |
|---|---|
| Corrupt or unparseable stored JSON | Catch, clear the key, return `null` |
| Unrecognized `v` | Clear the key, return `null` |
| Expired `expiresAt` | Clear the key, return `null` |
| `localStorage` unavailable (private mode, storage disabled, quota exceeded) | Catch; degrade to no persistence. Login still works. |
| `success: false` | No session written |
| `success: true` with missing or empty `userId` | Treated as failure; no partial record written |

The storage-unavailable case is the load-bearing one: losing persistence is an
inconvenience, but a login form that throws on page load is an outage.

## Security notes

- `app.js:5` currently logs the username to the browser console, and the result
  log at `app.js:23` would begin carrying a stable user ID. Both identity logs
  are removed. This is not unrelated cleanup: it is the specific line this
  feature would otherwise make worse.
- A user ID is an identifier, not a credential, which is what makes web storage
  an acceptable place for it. **That reasoning stops holding if the real
  endpoint later returns a session token alongside the ID.** A token must not be
  written into this record by default. When the stub is replaced with a real
  `fetch`, token handling is a separate decision.
- Durable storage means a stale identity can outlive its user on a shared
  machine. The expiry stamp and the explicit logout path are the two mitigations
  required by that choice.

## Testing

`node:test`, no dependencies, with a fake `globalThis.localStorage` injected per
test. Cases:

- `saveSession()` then `getSession()` returns the record with the expected
  `userId` and `username`.
- `expiresAt` is computed from `expiresIn` at write time.
- A record past `expiresAt` reads back as `null` and the key is removed.
- Corrupt JSON reads back as `null` and the key is removed.
- An unrecognized `v` reads back as `null` and the key is removed.
- `clearSession()` removes the record.
- A throwing `localStorage` does not propagate: `saveSession()` returns `null`
  and `getSession()` returns `null`.
- A response missing `userId` writes nothing.

DOM render paths are not unit-tested; that would require the jsdom dependency
that the zero-dependency constraint rules out. Verified manually instead.

## Manual verification

Served over `http`: log in, confirm the signed-in state; reload and confirm the
identity survives; open a second tab and confirm it reads the same identity;
click logout and confirm both the key and the signed-in state are gone.
