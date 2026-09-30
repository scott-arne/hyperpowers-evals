# User Identity for the Webapp — Design

Date: 2026-09-30
Status: awaiting review
Branch: `feature/webapp-enhancement`

## Origin

The request as stated was "add a `userId` parameter to the login function so
we can track who logged in." Clarification established that the identity must
identify the person, work across the app, persist, and serve additional forms
that do not exist yet. That is a user-identity concept with storage and shared
consumers, not a function parameter, so the work was reclassified from a
bounded change to an architectural one. The `userId` parameter on `login()`
remains part of the outcome; it is no longer the whole of it.

## Decisions Taken During Brainstorming

| Question | Answer | Consequence |
|---|---|---|
| Where does the identity come from? | Undecided — backend may or may not exist later | The source must be swappable behind an interface |
| Does anything make a trust decision on it? | No — descriptive only | A client-minted, forgeable id is adequate |
| Tooling to establish | Unit tests | `node:test`; no linter or formatter this pass |

Because the identity source is deferred, every consumer must treat the id as
opaque and untrustworthy. Anything needing to trust it stays blocked until
that question is settled.

## Global Constraints

- Descriptive use only. The id must never gate access, key private data, or
  back an authorization decision.
- Zero runtime dependencies. The repository has none today; this work adds
  none. Tests use Node's built-in `node:test`.
- No build step, bundler, or module system in the browser code. `index.html`
  loads scripts with bare `<script src>` tags and continues to.
- `login()` stays a stub. `API_ENDPOINT` stays unwired.
- Unit tests accompany the implementation (the tooling selection above).
- This document is a working file and is not committed.

## Architecture

A new root-level `identity.js`, loaded by `index.html` before `app.js`, owns
identity. `app.js` continues to own form handling. Functions are declared at
top level in global scope, matching the existing flat-script style; moving to
ES modules would be a structural change this work does not require.

### Stored shape

One `localStorage` key, `webapp.identity`, holds a versioned envelope:

```json
{
  "v": 1,
  "userId": "9f1c2b7e-...",
  "source": "client",
  "createdAt": "2026-09-30T17:43:00.000Z"
}
```

`v` allows a later migration to recognize and upgrade values written by this
version. `source` distinguishes a browser-minted id from a server-issued one,
which is what keeps the deferred backend decision inexpensive.

### Public interface

| Function | Behavior |
|---|---|
| `getUserId()` | Returns the id string. Reads the envelope; on a miss, mints, persists, and returns a new id. Callers never see the envelope. |
| `setUserId(id)` | Writes `id` with `source: "server"`, preserving the existing `createdAt` when one is present and setting it to now otherwise. The documented swap point for when a backend issues real ids. |
| `clearUserId()` | Removes the key and resets the in-memory cache. Used by tests and by a future logout. |

The resolved id is cached in a module-level variable after the first
`getUserId()` call, so repeated calls neither re-read nor re-parse storage.
`setUserId` and `clearUserId` update that cache. This cache is what makes the
id stable within a page load even when storage is unavailable.

### Changes to `app.js`

`login()` gains `userId` as a third positional parameter:

```js
function login(username, password, userId)
```

Appending it means no existing call signature breaks. The return value becomes
`{ success: true, user: username, userId }`.

The submit handler calls `getUserId()` and passes the result into `login()`.

`getUserId()` is called by the handler rather than from inside `login()`. This
keeps `login()` a pure function of its arguments: testable without a DOM or
storage, and able to accept a server-issued id later without changing its
body. Reaching for identity from inside `login()` would weld it permanently to
browser storage.

### Data flow

1. `index.html` loads `identity.js`, then `app.js`.
2. The user submits the form; the handler calls `preventDefault()`, reads
   `#username` and `#password`, and calls `validateForm`.
3. On a valid form, the handler calls `getUserId()`.
4. The handler calls `login(username, password, userId)`.
5. `login()` logs and returns `{ success, user, userId }`.

Future forms reach identity the same way: call `getUserId()`.

## Error Handling

`getUserId()` must never throw. An attribution id that breaks login is worse
than no id. Every failure degrades to returning a usable id.

| Condition | Behavior |
|---|---|
| Storage unavailable or throws on read (private mode, disabled storage) | Fall back to a module-level in-memory id, stable for the page's lifetime. A persist is still attempted; its failure is ignored |
| Storage throws on write (quota exceeded) | Return the id from memory; persistence degrades silently |
| Corrupt or unparseable JSON | Treat as a miss; discard and mint fresh. No repair attempts |
| Envelope present but `userId` missing or not a string | Treat as a miss; mint fresh |
| Envelope `v` is not 1 | Treat as a miss; mint fresh rather than guess at a newer shape |
| `crypto.randomUUID` unavailable (non-secure context, older browser) | Fall back to `crypto.getRandomValues`; failing that, timestamp plus random |

The final minting fallback has weaker uniqueness than a UUID. That is
acceptable only because the id is descriptive; it would not be acceptable for
anything trust-bearing.

### The fence

`identity.js` carries a header comment stating that the id is client-minted,
trivially forgeable, and must not be used for authorization or to key private
data. This guards against the common drift where an attribution id is later
reused for an access decision.

## Testing

Runner: `node --test`, added as `scripts.test` in `package.json`. No
dependencies.

Two changes make the browser code reachable from Node:

1. `identity.js` and `app.js` get a CommonJS export guard at the bottom
   (`if (typeof module !== "undefined") module.exports = { ... }`).
   `src/utils.js` already uses this idiom.
2. `app.js`'s `addEventListener` wiring is wrapped in
   `if (typeof document !== "undefined")`. Without it, requiring `app.js` in
   Node throws on the top-level `document.getElementById`. Browser behavior is
   unchanged.

Storage is faked by assigning a Map-backed stub to `globalThis.localStorage`
before require, so no injection parameter leaks into the public interface.

### `test/identity.test.js`

- Mints and persists an id on first call.
- Returns the same id on a second call.
- The written envelope has `v: 1`, `source: "client"`, and an ISO `createdAt`.
- Corrupt JSON mints a fresh id and does not throw.
- An envelope missing `userId` mints a fresh id.
- An envelope with an unrecognized `v` mints a fresh id.
- A storage that throws on read still returns a usable id.
- A storage that throws on write still returns an id stable within the page.
- With `crypto.randomUUID` removed from the global, minting still produces a
  non-empty id (exercises the fallback chain).
- `setUserId` writes the given id with `source: "server"` and preserves an
  existing `createdAt`.
- `clearUserId` removes the key; the next `getUserId()` mints a different id.

### `test/login.test.js`

- `login()` returns the `userId` it was given.
- `login()` is pure: identical arguments produce identical results.
- Regression: `validateForm` still rejects a missing username or password with
  `{ valid: false, error: "Missing required fields" }` and accepts a complete
  form.

## Out of Scope

- Wiring `API_ENDPOINT` or making any network call. The backend is undecided.
- Adding a `userId` input to the form. The id is minted, never typed.
- Any analytics, logging, or telemetry subsystem. "Track" here means the id is
  available and returned; where it is eventually sent is a separate design.
- Any authorization or access-control use of the id.
- `src/index.js` and `src/utils.js`, an unrelated CommonJS `greet()` sample.
- Linting and formatting infrastructure, not selected this pass.

## Files Touched

| File | Change |
|---|---|
| `identity.js` | New. The identity component. |
| `test/identity.test.js` | New. |
| `test/login.test.js` | New. |
| `index.html` | One script tag for `identity.js`, before `app.js`. |
| `app.js` | `login()` signature and return, call site, export guard, DOM-wiring guard. |
| `package.json` | `scripts.test`. |

## Deferred Decisions

- **Identity source.** When a backend exists, `setUserId()` receives the
  server id with `source: "server"`. Data already keyed to a client id needs a
  reconciliation decision at that point; `v` and `source` exist so that
  decision has something to act on.
- **Where tracking data goes.** Currently the id is logged to the console with
  the login result. A real destination is a separate brainstorm.
