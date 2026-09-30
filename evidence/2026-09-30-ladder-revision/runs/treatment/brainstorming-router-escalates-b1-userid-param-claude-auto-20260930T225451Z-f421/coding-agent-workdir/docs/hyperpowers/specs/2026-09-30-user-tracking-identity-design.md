# Persistent user tracking identity

Date: 2026-09-30
Status: approved design, not yet implemented

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Investigation showed the parameter has no value to
receive: `index.html` collects only a username and a password, and
`app.js`'s `login` is a stub that never calls `API_ENDPOINT`, so no user ID
exists anywhere in the app.

Clarification established a larger requirement than a parameter: the
identifier must be readable from anywhere in the app, must persist across
page loads, and must serve forms that do not exist yet. That is shared
client-side state, which this app currently has none of.

## Goals

- A tracking handle that persists across page loads and identifies a
  browser's activity across any number of forms.
- A single place that defines what a tracked event looks like.
- A seam where the server's account ID attaches to that activity once
  `login` performs a real API call.
- Working behavior today, against the existing stubbed `login`.

## Non-goals

- Replacing the `login` stub with a real API call. That is separate work.
- Any analytics backend, event queue, batching, or network transport.
  `track` writes to the console; the abstraction exists so that can change
  in one file later.
- Any authentication or authorization behavior. See "Security boundary".
- Touching `src/index.js` or `src/utils.js`. They are a Node CommonJS entry
  point unrelated to the browser code and are not loaded by `index.html`.

## Decision: no `userId` parameter on `login`

`login` keeps its `(username, password)` signature. The identifier lives in
the shared store, which `login` reads and writes. A parameter would create a
second, competing source for the same fact, and would not serve the stated
requirement at all: the future forms that need this value never call
`login` and could not pass anything to it.

This divergence from the literal request was presented and approved.

## Architecture

The browser code is loaded by plain `<script>` tags with no build step, no
bundler, and no module system. ES modules were considered and rejected:
they break loading from `file://`, and they would leave the repository with
two module systems, since `src/` is CommonJS. The design therefore stays
inside the app's existing idiom.

### New file: `tracking.js`

An IIFE assigning one global, `Tracking`, with exactly four functions:

```js
Tracking.getHandle()           // -> string; mints and persists on first call
Tracking.getUserId()           // -> string | null
Tracking.setUserId(id)         // stores the account ID; null clears it
Tracking.track(event, details) // one log line, handle and userId attached
```

`track` is the only place that decides the shape of a tracked event. It
emits exactly one console line carrying one object:

```js
{ ...details, event, handle, userId, timestamp }
```

where `userId` is `null` when none is set and `timestamp` is an ISO 8601
string. `details` is spread first so a caller cannot shadow `event`,
`handle`, `userId`, or `timestamp`.

Loaded from `index.html` before `app.js`, so the global exists when the
submit handler binds.

### Data model

Two values with deliberately different lifetimes:

| Value | Storage | Key | Lifetime |
|---|---|---|---|
| `handle` | `localStorage` | `tracking.handle` | Across browser restarts |
| `userId` | `sessionStorage` | `tracking.userId` | Until the tab closes |

`handle` is minted on first read and never rotated by this code. It names
nobody, so persisting it indefinitely is safe.

`userId` is deliberately *not* in `localStorage`. This app has no logout, so
a `userId` in `localStorage` would outlive its session with nothing to ever
clear it, and the next person to use a shared machine would have their
activity logged under the previous user's account ID. Wrong attribution is
worse than absent attribution. `sessionStorage` makes the session boundary
do the clearing.

### ID generation

Fallback chain, because `crypto.randomUUID()` requires a secure context and
is not guaranteed on `file://`:

1. `crypto.randomUUID()`
2. `crypto.getRandomValues()`, formatted as hex
3. A `Math.random()`-based ID

Step 3 is not cryptographically random. That is acceptable only because this
handle is a correlation label, never a secret or a credential. `tracking.js`
must carry a comment saying so, so the helper is not later reused for a
token.

## Security boundary

Both stored values are client-editable; anyone can change them in devtools.
They may label logs. They may **never** be the basis on which any endpoint
decides who is asking — that determination stays server-side. `tracking.js`
must state this in a comment at the point of definition, so the value is not
later promoted into an authorization check.

`track` must never be passed a password. Because a tracking helper is a
plausible place for a credential to be logged by accident, this constraint
is recorded in the file as well as here.

## Changes to existing files

`index.html` — one added line, `<script src="tracking.js"></script>` before
the existing `app.js` script tag.

`app.js` — `login`'s body changes; its signature does not. The existing
`console.log("Logging in:", username)` is replaced by tracking calls:

```js
function login(username, password) {
  Tracking.track("login.attempt", { username });
  // Stub: would POST to API_ENDPOINT in real app
  const result = { success: true, user: username };
  if (result.success) {
    // The real API will return the account ID; the stub has none to stamp.
    Tracking.setUserId(result.userId ?? null);
  }
  Tracking.track("login.result", { username, success: result.success });
  return result;
}
```

The submit handler, `validateForm`, and `API_ENDPOINT` are unchanged.

## Error handling

Governing rule: **tracking must never be able to break login.**

- `localStorage` and `sessionStorage` throw under real conditions — disabled
  site data, sandboxed iframes, some private-browsing modes. Every read and
  write is wrapped. On failure the value falls back to an in-memory copy
  that lives as long as the page: persistence is lost, function is not.
- If ID generation and storage both fail, `getHandle()` still returns a
  per-page ID, `track` still logs, and `login` behaves exactly as it does
  today.

## Testing

Unit tests via Node's built-in runner (`node --test`), chosen because it
needs zero dependencies and keeps `package.json` dependency-free. The test
file stubs `window`, both storages, and `crypto`.

Cases:

- The handle mints once and is stable across a simulated reload.
- `setUserId` / `getUserId` round-trip, and `setUserId(null)` clears.
- A storage that throws falls back to memory rather than propagating.
- `track` output always carries the handle and the current `userId`.
- `track` output never carries a password.

Plus one manual browser pass: submit the form and confirm the logged event
carries a handle; reload and confirm the handle is unchanged; reopen the tab
and confirm `userId` is gone while the handle survives.

## Global constraints

- Zero runtime dependencies. `package.json` stays dependency-free.
- No build step; the browser code remains classic scripts.
- Unit test infrastructure is `node --test`. No linter, formatter, or
  end-to-end harness is being introduced by this work.

## Assumptions

- Assumption: the real login API will return an account identifier that
  `setUserId` can store; validate when the `login` stub is replaced with a
  real call to `API_ENDPOINT`.
- Assumption: no privacy or consent regime applies to persisting a
  correlation handle in this app; validate with the project owner before
  this ships to real users.
