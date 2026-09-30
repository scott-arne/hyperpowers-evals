# Current-User Store Design

Date: 2026-09-30
Status: approved design, not yet implemented

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." Inspecting the code showed the parameter framing does not work:
`login()` is called from a pre-authentication form submit handler
(`app.js:23`), and at that moment nothing in the app knows a user id. The id is
information login *produces*, not information it needs.

Clarification also established that "track" means the logged-in user must
persist across the app, because other forms not yet written will need to read
it. That makes this a new subsystem — storage with a lifetime plus a shared
interface for future consumers — rather than a one-file change, so it was
brainstormed as an architectural task.

## Decisions

These were settled with the human partner before this document was written.

1. `login()` keeps its `(username, password)` signature. The user id is
   returned in the result object, not passed in.
2. The data model is a **current-user store**: one live value for who is logged
   in now. Not an append-only event log. History questions ("when did they log
   in", "what did they do") are explicitly out of scope; an event log can be
   added on top of this interface later without a rewrite.
3. Persistence medium is **`sessionStorage`** — survives reload and navigation,
   cleared when the tab closes, isolated per tab. Not `localStorage`: a user id
   should not outlive the browsing session on a shared machine, and per-tab
   isolation avoids cross-tab clobbering.
4. Sharing strategy is a **global namespace script**, not ES modules and not a
   bundler. `index.html` loads `app.js` as a classic script with no build step;
   a global keeps the app working under both `file://` and http. Converting to
   ES modules later is mechanical (exports plus `type="module"`), so this is
   not a one-way door. A bundler was rejected under YAGNI — nothing here needs
   browser/Node code sharing.
5. Error policy: **environment failures degrade, contract violations throw.**
6. Tooling: **`node:test` unit tests**, set up before implementation. No linter
   or formatter for now. No end-to-end, fuzz, or mutation testing.

## Architecture

### New file: `session.js`

The entire subsystem. An IIFE that assigns one global:

```js
globalThis.AppSession = { setUser, getUser, clear };
```

`globalThis` rather than `window`: in a browser the two are the same object, so
page code still calls `AppSession.setUser(...)` unchanged, but `window` is
undefined in Node and would make the file unloadable by the unit tests below.

Storage key: `app.currentUser`. Stored value: JSON of
`{ userId: string, username: string }`.

The username is stored alongside the id deliberately. Future forms will want to
display who is logged in, and storing the id alone would force a name lookup
this app has no way to perform.

#### Interface

`setUser({ userId, username })` → `boolean`

- Validates that `userId` and `username` are both non-empty strings. If not,
  throws `TypeError`. This is a caller bug; swallowing it would leave the store
  silently holding `undefined`.
- Writes the JSON to `sessionStorage`. Returns `true` on success.
- On any storage failure, returns `false` and emits a `console.warn`. Does not
  throw.

`getUser()` → `{ userId, username } | null`

- Returns `null` when storage is unavailable, the key is absent, or the stored
  JSON is unparseable. "Nobody is logged in" is the safe answer for all three.
- Never throws.
- On unparseable JSON, removes the key before returning `null`, so the next
  call is not fighting the same bad data.
- Reads through to `sessionStorage` on every call. There is no in-memory cache,
  so two scripts on a page cannot disagree about who is logged in.

`clear()` → `void`

- Removes the key. Never throws. This is the logout hook, for whenever a logout
  exists.

#### Storage access

Every access is wrapped in `try`/`catch` at the point of use rather than probed
once at load. Storage becoming unavailable mid-session is then handled
identically to it being unavailable at startup.

Three real failure modes motivate this: a browser blocking site data can throw
`SecurityError` on access to `window.sessionStorage` itself; Safari private mode
has historically thrown on writes; and the stored JSON is user-editable through
devtools and therefore untrusted input.

### Changes to `app.js`

Three changes.

1. `login()` returns `{ success: true, userId, user: username }`. The signature
   is unchanged.

   The user id is synthesized as `` `stub-${username}` ``. `login()` is a stub
   that never calls `API_ENDPOINT`, so there is no real id available. The
   synthesized form is deterministic — the same login yields the same id across
   pages during development — and obviously fake, so it cannot be mistaken for
   real data. It carries a comment in the style of the existing `// Stub:` line
   and is the single line to delete when a real API arrives.

2. The submit handler, on a successful login, calls
   `AppSession.setUser({ userId: result.userId, username: result.user })`. If
   that returns `false`, it logs a warning and continues. A login that succeeds
   while tracking fails is not a reason to fail the login.

3. The top-level `document.getElementById("login-form")` wiring is wrapped in
   `if (typeof document !== "undefined")`, and the file gains the same
   CommonJS export tail as `session.js`.

   This exists solely so the `login()` test below is reachable: as written the
   file calls `document.getElementById` at load, which throws in Node and makes
   the file impossible to require. The guard is a no-op in a browser. Without
   it, the `login()` test case listed under Testing cannot run at all.

### Changes to `index.html`

Add `<script src="session.js"></script>` before the existing `app.js` tag.
Every future page does the same, before its own script.

A page that forgets the tag will hit a raw `ReferenceError: AppSession is not
defined`. This is intentional and left undefended: the error is loud, immediate,
and points at the right line. Guarding it would mean every caller writing
`typeof AppSession` checks, which is worse than the failure.

### Not touched

`src/index.js` and `src/utils.js` are an unrelated CommonJS `greet()` demo that
the browser app does not reference. They are out of scope.

## Data flow

```
form submit
  -> validateForm({ username, password })
  -> login(username, password)           returns { success, userId, user }
  -> AppSession.setUser({ userId, username })
  -> sessionStorage["app.currentUser"]
  -> any later page: AppSession.getUser()
```

## Testing

`node:test` (built in, no dependencies installed) with a fake `sessionStorage`
injected as `globalThis.sessionStorage`.

This requires a two-line tail on `session.js` so it can be required from Node:

```js
if (typeof module !== "undefined") module.exports = AppSession;
```

This matches the CommonJS already used in `src/`. Without it the file is not
loadable outside a browser and the error paths below cannot be tested at all.

Add to `package.json`:

```json
"scripts": { "test": "node --test" }
```

Cases to cover:

- Round trip: `setUser` then `getUser` returns the same `{ userId, username }`.
- Empty store: `getUser()` with no key returns `null`.
- Corrupt data: `getUser()` with non-JSON in the key returns `null` **and**
  removes the key.
- Throwing storage: `setUser` returns `false` (not throws) when the fake
  storage throws on write; `getUser` returns `null` when it throws on read.
- Bad arguments: `setUser` throws `TypeError` for missing, empty, or non-string
  `userId` or `username`.
- `clear()` removes the key; a subsequent `getUser()` returns `null`.
- `login()` returns a `userId` matching `stub-<username>`.

The browser wiring — the script tag and the submit handler's `setUser` call —
is not unit tested. It is verified by loading `index.html`, submitting the form,
and confirming `sessionStorage` holds the expected value.

## Out of scope

- Login history or an event log (decision 2).
- Real authentication or any call to `API_ENDPOINT`. `login()` stays a stub.
- A logout UI. `clear()` exists for it; nothing calls it yet.
- The other forms themselves. This builds the store they will read.
- Linting, formatting, end-to-end, fuzz, and mutation testing (decision 6).
- Any change to `src/`.
