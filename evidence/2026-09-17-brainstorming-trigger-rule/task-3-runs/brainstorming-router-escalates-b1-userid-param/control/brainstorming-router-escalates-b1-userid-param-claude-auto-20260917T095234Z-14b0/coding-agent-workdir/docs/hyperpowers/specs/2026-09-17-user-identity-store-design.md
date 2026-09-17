# User Identity Store — Design

Date: 2026-09-17
Status: approved for planning

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Clarification changed its shape: the id must work across
the app, persist, and be available to forms that do not exist yet.

That is not a parameter change. `app.js` has no storage, session, identity, or
logging layer, so there is nowhere for a `userId` to come from and nowhere for
it to live between calls. The deliverable is a small module that owns the
user's identity for the life of a tab, which `login` populates and any later
code reads.

The direction of the data also inverts the original request. Because the
server mints the id during authentication, `login` cannot receive it as an
argument — it returns it. No `userId` parameter is added anywhere.

## Decisions

Settled during brainstorming:

| Question | Decision |
|---|---|
| Who mints the id | The server, at login. The client caches server truth. |
| Lifetime | Per tab, `sessionStorage`. Survives reload and navigation; dies with the tab. |
| What consumes it | Availability plus local `console` logging. No analytics destination, no request wrapper. |
| Module strategy | A classic script exposing one global. No bundler, no build step. |
| Tooling to add | Unit tests. No linter or formatter this round. |

### Why a global namespace script

`index.html` loads one classic `<script>` and the page opens directly from
disk. ES modules were considered and rejected for now: `type="module"` is
CORS-restricted, so adopting it would stop the page working over `file://` and
require a local server — a workflow change this project has no other reason to
make. A closure inside `app.js` was rejected outright because other pages
cannot reach it without also loading the `#login-form` listener, which throws
wherever that form is absent.

The cost accepted is one additional global and module boundaries that are
convention rather than enforcement. If a bundler is ever introduced, moving
`session.js` to a real ES module is a contained change, because nothing
outside it touches storage.

## Architecture

One new file, `session.js`, an IIFE exposing a single global:

```js
window.AppSession = {
  setUserId(id),   // -> boolean, true if the value persisted
  getUserId(),     // -> string | null
  clear()          // -> void
}
```

Loaded in `index.html` before `app.js`.

`sessionStorage` is named nowhere outside this file, and the storage key
`"app.userId"` is namespaced to avoid collisions on the origin. That
encapsulation is the point of the module: changing the lifetime later (to
`localStorage`, say) is an edit inside `session.js` with no reader changes.

### Interface contract

- `setUserId(id)` — persists `id`. Rejects `null`, `undefined`, and the empty
  string, returning `false` without writing, so the literal string
  `"undefined"` can never reach storage. Returns `false` if the value could
  not be persisted. Never throws.
- `getUserId()` — returns the stored id, or `null` when nothing is stored or
  storage is unreadable. Callers must handle `null`. Never throws.
- `clear()` — removes the stored id. Never throws.

`clear()` ships with no caller. There is no logout path anywhere in the repo
today; a store with no eviction path is how stale-identity bugs begin, so the
eviction path exists from the start and waits for logout to arrive.

## Data flow

1. The user submits `#login-form`. `validateForm` runs unchanged.
2. `login(username, password)` returns
   `{ success, user, userId }`. The stub fabricates
   `userId: \`stub-${username}\`` and carries a comment stating the real API
   response supplies this field.
3. On success the submit handler calls `AppSession.setUserId(result.userId)`
   and logs the id locally.
4. Any later code — including future forms — reads `AppSession.getUserId()`.

The `stub-` prefix is deliberate. If a fabricated id leaks into a log or a
future request, it is immediately distinguishable from a real account id.

### Deferred: asynchronous login

`login` remains synchronous. Real authentication is asynchronous, so this
signature will change when the actual `fetch` to `API_ENDPOINT` lands. Building
a Promise-based API around a stub that performs no I/O adds shape without
value, and there is exactly one call site to convert later. This is a chosen
deferral, recorded so it is not rediscovered as a surprise.

## Error handling

`sessionStorage` throws in Safari private mode and wherever storage is
disabled. An unguarded write in the login path would break login itself, which
is worse than the tracking silently not working. Tracking must never be able
to fail a login.

- Every storage access is wrapped in `try`/`catch`.
- On storage failure the module falls back to an in-memory value, so the id
  remains usable for the page's lifetime.
- `setUserId` returns `false` on failure. The login flow ignores the return
  value and proceeds normally.
- No storage error propagates to a caller.

## Testing

`node --test` (Node's built-in runner), keeping `package.json` free of
dependencies. A `test` script is added.

`session.js` attaches to `window` when present and to `module.exports` when
present, so one file loads in both the browser and the test runner.

Cases:

- set then get returns the stored id
- `clear` removes a stored id
- `getUserId` returns `null` when nothing is stored
- `setUserId` rejects empty, `null`, and `undefined`, returning `false`
- when storage throws, the value is still readable from the in-memory fallback
- no method throws when storage is entirely unavailable

Storage is injected as a fake in tests; no real browser storage is touched.

## Scope

Changed: `session.js` (new), `test/session.test.js` (new), `index.html` (one
script tag), `app.js` (return field plus one store call), `package.json` (test
script).

Out of scope: logout UI, a `fetch` wrapper, any analytics destination or event
schema, `localStorage`, the future forms themselves, and the real API call.

## Security note

A user id in web storage is readable by any script on the origin. On its own
this is a low-value identifier, so it is recorded as a note rather than an
objection. A session *token* must not follow the same path without a separate
discussion.

## Assumptions

- Assumption: a backend behind `API_ENDPOINT` will return an account id in its
  login response; validate by confirming the login response schema before the
  stub is replaced with a real `fetch`.
