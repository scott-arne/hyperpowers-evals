# Login User Session — Design

Date: 2026-09-30
Status: Approved design, not yet implemented
Branch: `feature/webapp-enhancement`

## Problem

The request was "add a `userId` parameter to the `login` function so we can
track who logged in," refined to "it should persist and work across the app;
other forms will need it later."

`app.js` today defines `login(username, password)`, which logs the username
and returns a hardcoded `{ success: true, user: username }`. The repository
has no identity, session, storage, logging, or telemetry code of any kind, and
`index.html` is the only page. There is therefore nothing that can supply a
`userId` and nowhere for other forms to read one from. The deliverable is not a
new parameter; it is the smallest shared place for "who is logged in" to live.

## Decisions

These were settled with the requester before this document was written.

1. **Login derives the userId; it is not passed in.** The authenticating call
   is the only party that can authoritatively say who logged in. The caller
   does not have a user id and would have to invent one.
2. **In-memory for now.** The value must be reachable from anywhere in the
   app but is not required to survive a page reload. Storage may be added
   later without changing how callers read the value.
3. **Namespaced global via a classic script.** A new `session.js` exposes
   `window.AppSession`, loaded by an ordinary `<script>` tag before `app.js`.
   ES modules were rejected for now because `type="module"` is blocked by CORS
   over `file://`, and the repo has no static server, no dependencies, and no
   `scripts` in `package.json`. A bundler was rejected as unjustified at this
   size.
4. **The stub returns a placeholder userId.** `"stub-" + username`, clearly
   marked, so consumer forms can be built and tested before real auth exists.
5. **Tests via Node's built-in runner.** `node --test`, zero dependencies.

## Architecture

### `session.js` (new)

The only code in the app that knows where current-user identity is stored. An
IIFE keeps state private and publishes one namespace:

```
window.AppSession
  setSession({ userId, username })   // record who logged in
  getUserId()   -> string | null
  getUsername() -> string | null
  clear()                            // logout / teardown
```

State is a single module-private variable holding either `null` or a record
`{ userId, username }`.

**Why the boundary matters:** these four functions are the only code that
touches the stored value. Adding `sessionStorage` or `localStorage` later is a
change confined to this file, with no call-site churn. This is what keeps
decision 2 cheap to revisit, and it is the reason the value is reached through
functions rather than read as a bare property.

The IIFE builds the API object locally and then publishes it to whichever
environment it finds. Both attachments are guarded, because the same file is
loaded by the browser and by `node --test`, and each environment lacks the
other's global:

```js
if (typeof window !== "undefined") {
  window.AppSession = AppSession;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = AppSession;
}
```

An unguarded `window.AppSession = ...` would throw `ReferenceError: window is
not defined` under Node and make the module untestable. This dual publish is
the one concession the IIFE approach makes to testability; each half is inert
in the other environment.

### `index.html`

Add `<script src="session.js"></script>` immediately before the existing
`<script src="app.js"></script>`. Load order is significant: `app.js` calls
into `AppSession` at submit time, so the namespace must already exist.

### `app.js`

`login(username, password)` keeps its signature — per decision 1 the id comes
out of the call, not into it. Its stub return grows:

```js
// Stub: the real userId will come from the auth response once this
// POSTs to API_ENDPOINT.
return { success: true, userId: "stub-" + username, user: username };
```

The submit handler, on a successful login, calls
`AppSession.setSession({ userId: result.userId, username })` and includes the
userId in its log line. On failure it does not touch the session.

`validateForm` is unchanged.

## Data flow

```
submit
  -> validateForm({ username, password })
  -> login(username, password)
  -> { success, userId, user }
  -> AppSession.setSession({ userId, username })     [only when success]
  -> later forms: AppSession.getUserId()
```

## Error handling

- A failed login (`success: false`) must not establish a session. No partial
  writes.
- `getUserId()` and `getUsername()` return `null` when nobody is logged in.
  Callers get an explicit "unknown", never `undefined`.
- `setSession` rejects a call whose argument is missing, is not an object, or
  has a missing or empty `userId`, rather than storing a broken record. It
  throws a `TypeError`; a silently-empty session would surface later as a
  confusing null far from the cause.
- `clear()` resets state to `null` and is safe to call when no session exists.

## Security boundary

The stored userId is a client-side correlation value: it makes logs readable
and lets later forms know who they are rendering for. It is **not** proof of
identity and must never gate access to anything. Any real authorization
decision re-derives identity server-side from the session credential. This
constraint holds regardless of whether the value is later moved into browser
storage — anything in `localStorage` or `sessionStorage` is readable and
writable by any script on the page.

## Testing

The repo has no existing test infrastructure, so this change establishes it.

- Add `"scripts": { "test": "node --test" }` to `package.json`.
- Add `test/session.test.js` covering:
  - `getUserId()` / `getUsername()` return `null` before any login.
  - `setSession` then `getUserId()` / `getUsername()` return what was set.
  - `clear()` returns state to `null`.
  - `setSession` throws on a missing argument, a non-object, a missing
    `userId`, and an empty-string `userId`.
  - `setSession` overwrites a prior session rather than merging.

`app.js` is not unit-tested: it is DOM-bound with no DOM harness in the repo,
and adding one is out of scope for this change. Its behavior is verified
manually — open `index.html`, submit the form, confirm the console shows the
placeholder userId and that `AppSession.getUserId()` returns it afterward.
This gap is deliberate and recorded here rather than left implicit.

## Out of scope

- Making `login` actually call `API_ENDPOINT`. It stays a stub; the placeholder
  userId exists precisely because of that, and must be replaced with the real
  auth response when the call becomes real.
- Persisting the session across reloads. Decision 2.
- A logout UI. `clear()` exists so one has somewhere to land, but no control
  is added.
- Any analytics or audit sink. "Track who logged in" is satisfied here by a
  readable console line plus a queryable session; shipping placeholder ids to
  a durable analytics store would record events that never happened.
- The `src/` CommonJS files, which are Node-side and unrelated to the page.

## Files touched

| File | Change |
|---|---|
| `session.js` | New. The session module. |
| `index.html` | One `<script>` tag, before `app.js`. |
| `app.js` | `login` returns `userId`; submit handler records the session. |
| `package.json` | Add the `test` script. |
| `test/session.test.js` | New. Unit tests for the session module. |
