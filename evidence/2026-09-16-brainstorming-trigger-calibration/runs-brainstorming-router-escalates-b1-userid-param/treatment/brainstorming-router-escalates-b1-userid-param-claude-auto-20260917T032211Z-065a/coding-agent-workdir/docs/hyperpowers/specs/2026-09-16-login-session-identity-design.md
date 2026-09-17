# Login Session Identity — Design

Date: 2026-09-16
Status: Awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in." The repository has no user identifier anywhere:
`index.html` collects only a username and a password, and `login()` in `app.js`
is a stub that fabricates its own response. A caller therefore has no `userId`
to pass.

Clarification established the real requirement: the identity comes from the
**auth response**, it must be readable **across the app**, it must **persist**,
and **other forms will consume it later**. That is a shared identity store, not
a parameter.

## Scope

In scope:

- A new browser module owning the persisted logged-in identity.
- A contract change to `login()` so it returns the authenticated identity.
- A minimal consumer — a signed-in indicator and a logout control — so the
  feature is verifiable and the session can be cleared.
- First-time tooling setup: a unit-test runner and a lint/format tool.

Out of scope:

- Real authentication. `login()` remains a stub; `API_ENDPOINT` stays unused.
- Auth tokens, session expiry, and refresh. Identity only is stored.
- `src/index.js` and `src/utils.js`. They are the Node side, they do not
  interact with `app.js`, and they stay on CommonJS.
- A bundler. Rejected under YAGNI for a six-file project.

## Decisions

Each decision below was confirmed with the requester.

| Decision | Choice | Rationale |
|---|---|---|
| Source of `userId` | Auth response, via `login()`'s return value | A caller cannot supply an identity it has not yet authenticated |
| Stored contents | Identity only (`userId`, `username`) | No credential client-side; a page-script XSS has nothing to steal |
| Persistence | `localStorage` | Survives reload and restart, consistent across tabs |
| Browser module system | ES modules | Explicit dependencies, no global namespace |
| Store API shape | Plain `get`/`set`/`clear` | `subscribe()` deferred; purely additive when a second consumer needs it |
| Write ownership | The call site, not `login()` | Keeps `login()` testable without a browser |
| Tooling | `node:test` + Biome | Zero-dependency runner; one dev dependency for lint and format |

### Rejected alternatives

- **`login()` owns the session write.** Fewer call-site steps, but it welds auth
  transport to browser storage, makes `login()` untestable without a DOM, and
  hides a persistent-state mutation behind a function that promises only
  authentication.
- **Observable store with `subscribe()` and cross-tab `storage` events.** Solves
  staleness across tabs, but maintains a notification system with no subscribers
  today. Revisit when a second long-lived view must react without a reload; it is
  an additive change to the same file.
- **Adding `"type": "module"` to `package.json`.** The tidier long-term layout,
  but it breaks the two existing CommonJS files and renaming them is unrelated
  scope. See "Module resolution" below.

## Architecture

### `src/session.mjs` (new)

Sole owner of the persisted identity. No other file touches `localStorage`.

```js
export function getSession()                       // → { userId, username } | null
export function setSession({ userId, username })   // validates, persists
export function clearSession()                     // removes the key
```

- Storage key: `appSession`, holding a JSON object. Namespaced to avoid
  collisions with anything else on the origin.
- `getSession()` never throws. A missing key, malformed JSON, or a record
  lacking a `userId` all return `null`. Corrupt storage reads as logged out.
- `setSession()` throws a `TypeError` on a missing or non-string `userId`.
  Persisting a broken record is worse than not persisting one, because it
  survives the page. (This is a synchronous throw, not a rejected promise; the
  module exposes no async API.)
- Writes are guarded against `QuotaExceededError` and against Safari private
  mode, where touching `localStorage` can throw. On a failed write the module
  retains the value in a module-level variable for the life of the page and
  `getSession()` returns that mirror when storage is unreadable, so the session
  still works within the page; login still succeeds. The mirror is not a second
  source of truth — when storage is healthy, `getSession()` reads storage.

**Invariant for all consumers: the store is a cache, and the server is the
source of truth.** A value from `getSession()` means "probably this person". It
is never proof of authorization, and nothing in it is a credential.

### `app.js` (modified)

```js
async function login(username, password)   // → { success: true, userId, username }
                                           //   { success: false, error }
```

- **The signature keeps `(username, password)`.** This is the one place the
  design departs from the literal original request: `userId` is in the return
  value rather than the parameter list, because the identity originates in the
  auth response.
- **`login()` becomes `async` while it is still a stub.** A real `fetch` to
  `API_ENDPOINT` forces this eventually, and converting sync to async later
  fails silently — callers receive a `Promise`, `result.success` is `undefined`,
  and `undefined` is falsy, so every login reads as a failure with no error. One
  `await` today at the single call site avoids that.
- The stub returns a fabricated `userId` until a backend exists.

### `index.html` (modified)

- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
- Adds a signed-in indicator element and a logout button.

**Consequence:** module scripts are blocked over `file://`, so `index.html` must
be served over HTTP. `python3 -m http.server` is sufficient and was verified to
serve `.mjs` as `text/javascript`.

### Module resolution

`package.json` has no `"type"` field, so Node parses `.js` as CommonJS. A Node
test importing an ESM `src/session.js` would fail with "Cannot use import
statement outside a module". Naming the file `src/session.mjs` makes it
unambiguously ESM to Node without disturbing the existing CommonJS files.
`app.js` stays `.js`: it is browser-only, and browsers determine module-ness
from the `type="module"` attribute, never from `package.json`.

## Data flow

1. Submit → `preventDefault()`.
2. `validateForm({ username, password })` — unchanged.
3. `await login(username, password)`.
4. On `success`: `setSession({ userId, username })`, then render the indicator.
5. On failure: surface the error, and clear any existing session.
6. On page load: read `getSession()` and render the indicator if present.
7. Logout: `clearSession()`, then re-render.

## Error handling

| Failure | Behavior |
|---|---|
| Validation fails | Unchanged; `login()` not called, session untouched |
| `login()` returns `success: false` | Error surfaced; session **cleared**, never left stale |
| `login()` rejects (network, once real) | Caught at the call site, treated as a failed login |
| `localStorage` unavailable or full | `setSession` degrades to in-memory; login still succeeds |
| Stored JSON corrupt or malformed | `getSession()` returns `null` — reads as logged out |

A failed login must never leave a previous identity looking current. This is why
step 5 clears rather than merely skipping the write.

## Session lifecycle

`localStorage` survives browser restart. Without a clear path, the first person
to log in would remain "logged in" on that browser indefinitely — a real defect
on a shared machine, not a missing nicety. The logout control closes this and
gives `clearSession()` a caller rather than shipping it as dead code.

The indicator additionally makes the feature verifiable by hand, which matters
because the DOM wiring is not unit-tested.

## Testing

Runner: `node:test` with `node:assert`, both built in. A `test` script is added
to `package.json`.

`src/session.mjs` is pure logic over an injectable storage object and tests
without a browser, using a small in-memory `localStorage` fake:

- round-trip: `setSession` then `getSession` returns the same identity
- empty storage → `null`
- corrupt JSON → `null`, does not throw
- record missing `userId` → `null`
- `setSession` throws a `TypeError` on a missing or non-string `userId`
- `clearSession` removes the key; a subsequent `getSession` → `null`
- a throwing storage backend → no exception escapes; session degrades to
  in-memory

`login()` is tested for its return contract on both the success and failure
branches.

**Known coverage gap:** the DOM wiring in `app.js` — the submit handler, the
indicator, and the logout button — is not unit-tested. Covering it needs jsdom
or a browser driver, which is disproportionate for a form this size. Manual
verification via the indicator covers it; adding Playwright is the escalation
path if that wiring grows.

## Tooling

- **`node:test`** — zero dependencies, matching the repo's current
  zero-dependency state. Wired as `npm test`.
- **Biome** — one dev dependency providing both linting and formatting, rather
  than the four packages an ESLint + Prettier pair requires. Wired as
  `npm run lint` and `npm run format`.
- End-to-end (Playwright) and fuzz/mutation testing were considered and
  deferred: a browser download and CI story is disproportionate here, and
  mutation testing has too little logic to act on.

## Assumptions

- Assumption: the eventual backend returns a stable `userId` in its login
  response body; validate by confirming the auth API's response shape before
  replacing the stub.
- Assumption: developers can serve the app over local HTTP rather than opening
  `index.html` from disk; validate by confirming the `python3 -m http.server`
  workflow with whoever runs the app.

## Risks

- **Stale identity.** The stored identity can outlive the server session, so the
  UI may name a user whose session has expired. Bounded: nothing stored is a
  credential, so the worst case is a wrong name on screen until a server call
  corrects it. Cross-tab staleness is the trigger for adopting the deferred
  `subscribe()`.
- **`file://` regression.** Anyone who currently opens `index.html` directly
  loses that workflow. Mitigated by documenting the server command in the
  README.
