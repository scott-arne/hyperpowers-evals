# Login User Identity — Design

Date: 2026-09-22
Status: Approved design, pending implementation plan

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in." Investigation showed the parameter points the wrong
direction: the userId is assigned by the server and returned by
authentication, so the caller cannot supply it. The only call site — the form
submit handler in `app.js` — holds nothing but the two strings the user typed.

What the requester actually wants is a user identity that:

1. Comes back from the server after a successful login.
2. Is reachable from anywhere in the app.
3. Persists across page loads and browser restarts.
4. Is usable by additional forms added later.

`login` therefore keeps its `(username, password)` signature, gains a return
value carrying the identity, and becomes asynchronous.

## Current state

`app.js` is loaded as a bare `<script src="app.js">`. There is no module
system, no build step, no dependencies, and no test runner. `login` is a
synchronous stub that never contacts the network and returns
`{ success: true, user: username }` unconditionally — it cannot fail. It has
exactly one caller, in the same file, and is not exported.

`src/index.js` and `src/utils.js` are unrelated CommonJS Node code that
`index.html` never loads. `package.json` has no `"type"` field.

`API_ENDPOINT` is `https://api.example.com/login`, a placeholder domain that
does not resolve.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| `login` signature | unchanged; becomes `async` | userId is a return value, not an input |
| Identity source | server login response | stated requirement |
| Backend | none yet; contract defined here | no server exists to code against |
| Persistence | `localStorage` | stated requirement that it survive restarts |
| Module system | native ES modules | shared code across future forms, no build step |
| New-module extension | `.mjs` | `src/` is CommonJS; `"type": "module"` would break it |
| Audit trail | out of scope | deferred to the backend (see Non-goals) |
| Logout UI | out of scope | `clearSession()` exists but is uncalled |
| Failure UI | out of scope | failures stay `console.error` |
| Tooling | `node:test` only | keeps the repo dependency-free |

## Architecture

| File | Role |
|---|---|
| `index.html` | one edit: `<script type="module" src="app.js">` |
| `app.js` | form wiring only; `await`s `login`; keeps `validateForm` unchanged |
| `auth/login.mjs` | orchestration: call the API, store identity on success |
| `auth/api.mjs` | owns `fetch` and `API_ENDPOINT`; normalizes the wire shape |
| `auth/api-fake.mjs` | clearly-labeled canned response for local runs |
| `auth/session.mjs` | `localStorage` access behind an injectable storage |
| `auth/session.test.mjs` | session store unit tests |
| `auth/api.test.mjs` | response-normalizer unit tests |

`auth/` sits at the repository root alongside `app.js`, matching where the
browser code already lives. Nothing is added under `src/`.

### Data flow

```
submit handler (app.js)
  -> validateForm(...)                      unchanged
  -> await login(username, password)        auth/login.mjs
       -> await postLogin({username, password})   auth/api.mjs
            -> fetch(API_ENDPOINT)  |  api-fake.mjs
            -> normalizeLoginResponse(raw)
       -> on ok: session.setSession({userId, displayName})   auth/session.mjs
                   -> localStorage["app.session.v1"]
  -> console.log / console.error
```

### The response contract

Defined here because no server exists. Success and declared failure:

```json
{ "ok": true,  "userId": "u_12345", "displayName": "Ada" }
{ "ok": false, "error": "invalid_credentials" }
```

`normalizeLoginResponse(raw)` is the sole function that knows this shape. It
maps the wire format to `{ ok, userId, displayName, error }` and treats an
`ok` response whose `userId` is missing or not a non-empty string as a
failure, so `undefined` is never written to storage. When a real backend
lands, this function is the only thing that changes.

Assumption: the eventual backend returns a JSON body containing a stable
string user identifier. Validate via the backend's API contract once it
exists; if it disagrees, the change is confined to
`normalizeLoginResponse`.

`auth/api-fake.mjs` is selected by an explicit, commented constant in
`auth/api.mjs` so that the fake is never ambiguous with real behaviour. That
constant **defaults to using the fake**, because `API_ENDPOINT` does not
resolve and the real path cannot succeed today. Flipping it to the real
endpoint is the single edit that switches the app over once a backend exists.

### Session store

```js
createSessionStore(storage = localStorage)
  -> { getUserId, getSession, setSession, clearSession }
```

- Storage key `app.session.v1`, versioned so a later shape change cannot read
  a stale record.
- `JSON.parse` is guarded. A corrupt or non-conforming value is treated as no
  session and cleared rather than thrown.
- The default instance (backed by real `localStorage`) is exported for app
  use; tests construct a store over a plain object, which is what makes the
  module testable under Node without a DOM.

## Security boundary

The stored `userId` is a **display and correlation value only**. It is never
an authorization fact. Any code that gates behaviour on it is defeated by
editing one string in devtools; real enforcement belongs server-side against a
credential the client cannot forge. This constraint is the reason the audit
trail is deferred rather than built client-side: a login log held in the
browser is readable, editable, and clearable by the person it purports to
audit, so it would carry the appearance of assurance without the substance.

The password is never persisted and never logged. The existing
`console.log("Logging in:", username)` continues to log only the username.

## Known gaps accepted in this change

These were raised and consciously deferred; they are gaps, not oversights.

1. **The identity is permanent.** `localStorage` outlives the tab, the window,
   and the reboot. `clearSession()` exists but nothing calls it, so short of
   devtools or clearing site data there is no way to log out.
2. **Login failure is invisible to the user.** A real network call can fail
   where the stub could not. Failures reach `console.error` only.
3. **No audit trail ships.** "Track who logged in" is not satisfied by this
   change in any durable sense; it is a backend responsibility.
4. **`localStorage` is XSS-readable.** Any script injection anywhere on the
   origin can read the stored identity.

## Non-goals

- Implementing the backend or a real authentication check.
- Any audit or event-logging subsystem.
- Logout UI, error UI, or any other visual change.
- Touching `src/index.js`, `src/utils.js`, or their CommonJS style.
- A bundler, transpiler, linter, or formatter.

## Testing

`node:test` and `node:assert`, both built in. `package.json` gains
`"scripts": { "test": "node --test" }` and no dependencies.

Cases:

- **Session store:** round-trip set/get; `getUserId` with no session; corrupt
  JSON recovers to no-session and clears the key; `clearSession` removes it;
  reads and writes use the versioned key.
- **Normalizer:** success populates `userId`; declared failure surfaces
  `error`; malformed body is a failure; `ok: true` without a usable `userId`
  is a failure.

`app.js` and the DOM wiring are not unit-tested — they are thin glue over a
browser API, and the logic worth testing has been moved out of them.

## Operational note

ES modules do not load over `file://`. Opening `index.html` by double-clicking
it will fail with a CORS error after this change; it must be served, e.g.
`python3 -m http.server`. This is the accepted cost of Approach A.
