# User Identity and Login Tracking — Design

Date: 2026-09-30
Status: awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Investigation showed no user ID exists anywhere in
the application: the login form collects only a username and a password
(`index.html:9-10`), and `login` (`app.js:4-8`) is a stub that returns
`{ success: true, user: username }` without ever contacting
`API_ENDPOINT`. A caller therefore has nothing to pass.

Clarification established the actual requirement: a real, person-level
user ID, available across the application, persisted, and consumed by
forms that do not exist yet. That is an identity layer, not a parameter.

## Scope

In scope:

- A real login request to `API_ENDPOINT`, replacing the stub.
- A session module that owns the user ID and the auth token.
- A tracking module that records login events.
- Conversion of the browser code to native ES modules.
- Unit-test infrastructure and tests for the new modules.

Out of scope:

- Logout UI, session expiry, and token refresh.
- Any third-party analytics SDK and the consent flow one would require.
- A bundler or any runtime dependency.
- End-to-end tests and linting.
- Changes to the behavior of `src/index.js` / `src/utils.js` beyond a
  file rename.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| ID origin | Login API response | Only a server-issued ID survives a new device or a cleared cache. |
| ID storage | `sessionStorage` | Survives refresh, dies with the tab. The ID is an identifier, not a credential. |
| Token storage | In memory only | Keeps the credential out of web storage, so an XSS bug cannot exfiltrate it. |
| Refresh with no token | Clear the stored ID | Prevents a half-authenticated state where the app looks logged in but every call fails. |
| Tracking sink | Internal module | Console today, one seam to change later. No vendor, no consent obligation. |
| Module system | Native ES modules | Real encapsulation with zero dependencies and no build step. |
| Structure | Session accessor singleton with injectable storage | One shared accessor for future forms; injection keeps tests DOM-free. |
| Test runner | `node:test` | Built in; adds no dependency and no lockfile. |

## Architecture

```
index.html                     loads app.js as <script type="module">
app.js                         wiring only: imports, validateForm, submit handler
auth/session.js                createSession(storage) + default `session` instance
auth/login.js                  async login(username, password, deps)
tracking/events.js             trackLoginEvent(eventName, payload)
test/session.test.js
test/login.test.js
test/tracking.test.js
src/index.cjs                  renamed from .js; contents unchanged
src/utils.cjs                  renamed from .js; contents unchanged
package.json                   + "type": "module", + scripts.test
```

### `auth/session.js`

```js
export function createSession(storage = globalThis.sessionStorage) { /* ... */ }
export const session = createSession();
```

The factory closes over an in-memory `token` variable and writes only the
user ID to `storage`. Application code imports the default `session`
instance; tests call `createSession(fakeStorage)` with a plain object.

Interface:

- `setSession({ userId, token })` — stores the ID, holds the token in
  memory. Throws a `TypeError` when either field is missing or empty,
  rather than persisting partial state; callers treat this as a
  programming error, not a runtime condition to handle.
- `getUserId()` — returns the stored ID or `null`.
- `getToken()` — returns the in-memory token or `null`. Provided for the
  future forms that will attach it to their own requests; nothing in
  this change calls it.
- `isLoggedIn()` — true only when both an ID and a token are present.
- `hydrate()` — clears a stored ID that has no accompanying token.
  Called exactly once, by `app.js`, at module top level before the
  submit handler is registered.
- `clear()` — drops both.

### `auth/login.js`

`async login(username, password, deps = {})` where `deps` supplies
`fetchImpl`, `session`, and `track`, each defaulting to the real
implementation. The function POSTs JSON to `API_ENDPOINT`, validates the
response, persists the identity, records the event, and returns a
normalized result.

### `tracking/events.js`

`trackLoginEvent(eventName, payload)` writes a structured line to the
console. This is the single place to change when a real destination is
chosen.

## Data flow

1. Submit handler calls `validateForm` — behavior unchanged.
2. Handler awaits `login(username, password)`.
3. `login` POSTs `{ username, password }` as JSON to `API_ENDPOINT`.
4. On a successful, well-formed response: `session.setSession({ userId,
   token })`, then `trackLoginEvent('login_succeeded', { userId })`.
5. On any failure: `trackLoginEvent('login_failed', { username, reason })`.
   No user ID is available in this branch.
6. `login` returns `{ success, userId?, error? }`.
7. The handler reports the outcome.

The submit handler becomes `async`. Because `type="module"` scripts are
deferred, the top-level `getElementById("login-form")` lookup — which
currently races the parser — becomes reliably safe.

## Error handling

All four failure modes normalize to `{ success: false, error }`:

| Condition | `error` |
|---|---|
| `fetch` rejects | `network` |
| 401 / 403 | `credentials` |
| Other non-2xx | `server` |
| 2xx with a body missing `userId` or `token` | `malformed` |

Nothing is written to the session unless a complete identity was
returned. A partial or malformed response leaves the previous session
untouched.

Two invariants hold everywhere:

- The password is never logged, tracked, or stored.
- The auth token never appears in a tracking payload or in web storage.

## Known limitation

The token lives in memory and the ID lives in `sessionStorage`, so on
every refresh the token is gone and `hydrate()` clears the ID. Today this
makes `sessionStorage` behaviorally equivalent to in-memory storage, with
two extra writes: refresh logs the user out.

This is accepted deliberately. When the backend sets an `HttpOnly` session
cookie, the token survives refresh, the stored ID becomes meaningful, and
no module interface changes. Until then the storage choice is a seam, not
a user-visible benefit. It is recorded here so the behavior is not
mistaken for a defect.

## Testing

`node --test`, no dependencies.

- **session** — set/get/clear round trip against a fake storage object;
  `setSession` rejects partial input; `hydrate()` clears an ID with no
  token; `isLoggedIn()` requires both.
- **login** — injected fake `fetch` covering success, 401, 500, malformed
  body, and network rejection. Asserts that persistence and the success
  event occur only on success, and that a failed login leaves the session
  untouched.
- **tracking** — payload shape; asserts no token or password field can
  appear.
- **validateForm** — existing missing-field behavior preserved.

Gap: the DOM wiring in `app.js` has no unit test, as jsdom and Playwright
are both out of scope. It is verified manually in a browser.

## Relationship to the original request

This design adds no `userId` parameter to `login`. The ID is an output of
login, not an input — no caller upstream of login can know it. `login`
keeps its `(username, password)` signature, gains an optional injected-
dependency argument for testing, and returns the ID. The contradiction
with the original wording is intentional and was confirmed during
brainstorming.

## Assumptions

- `Assumption: the login response body is {userId, token}, validate via
  the actual api.example.com/login contract.` No document in this
  repository describes the response shape; the parsing and the
  `malformed` branch depend on it. If the real contract differs, only
  `auth/login.js` changes.
- `Assumption: api.example.com/login is a real endpoint rather than a
  placeholder, validate via a manual request before implementation
  begins.`

## Migration notes

Setting `"type": "module"` makes ESM the project default, which requires
renaming `src/index.js` → `src/index.cjs` and `src/utils.js` →
`src/utils.cjs` and updating `package.json`'s `main`. Those two files are
unrelated Node code; their contents do not change. Serving `index.html`
over `http://` becomes necessary, because browsers refuse ES-module loads
from `file://`.

## Open follow-ups

- Backend work to set an `HttpOnly` session cookie, which resolves the
  known limitation above and brings a CSRF defense with it.
- Choosing a real destination for `trackLoginEvent`.
- Logout, expiry, and token refresh.
