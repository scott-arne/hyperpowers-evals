# User Identity Design

Date: 2026-09-30
Status: Approved (design), pending implementation plan

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." Clarifying questions established that the intended `userId`
identifies *the person*, persists across the app, and will be read by forms that
do not exist yet.

That is not a parameter change. A value that identifies the person cannot be an
input to the function that authenticates the person — it does not exist until
authentication succeeds. What the request actually needs is a small identity
subsystem: the server issues a user ID at login, the client stores it, and other
parts of the app read it.

The literal `login(userId, username, password)` shape was presented to the human
partner alongside the server-issued alternative. They chose server-issued,
having been told explicitly that it means `login()` gains no `userId` parameter.

## Decisions

| Question | Decision |
|---|---|
| Where `userId` comes from | Server issues it; `login()` returns it |
| Persistence | `sessionStorage`, cleared when the tab closes |
| Scope of this increment | Availability to other code only; no login-event recording |
| Consumption mechanism | ES module import of a dedicated `identity.js` |
| `login()` synchrony | Becomes `async`, returning a Promise |
| Code organization | `login`/`validateForm` move out of `app.js` into `auth.js` |

### Rejected alternatives

- **`userId` as a parameter to `login()`** — the value does not exist before
  authentication. A client-minted ID would identify a browser, not a person.
- **`localStorage`** — survives browser restarts, leaving identity on shared
  machines with no clear-on-logout path in this app.
- **Event bus over `sessionStorage`** — consumers would still agree on the
  storage key by convention, giving the coupling without a module to enforce it.
  Reconsider only if cross-tab synchronization becomes a requirement.
- **Client-side login event log** — risks being mistaken for an audit trail.
  Recording belongs with a real backend.

## Architecture

Three browser modules, each with one job:

- **`identity.js`** — sole owner of the identity storage key and the only code
  that touches `sessionStorage` for identity. Exports `setUserId`, `getUserId`,
  `clearUserId`.
- **`auth.js`** — authentication logic: `login` and `validateForm`. No DOM
  access, so it is importable by a test runner.
- **`app.js`** — DOM wiring only: reads the form, calls `auth.js`, hands the
  resulting ID to `identity.js`.

`index.html` loads `app.js` as an ES module; the imports pull in the other two.

### Security boundary

`getUserId()` returning a value means "this browser session previously completed
a login." It does **not** mean the current request is authorized. Authorization
remains the server's responsibility, checked per request against a credential
the client cannot forge. This rule is stated as a comment in `identity.js`
because it is the invariant most likely to be violated by later code.

The stored ID is an identifier, not a credential. It is not a session token and
must never be used as one.

## Components

### `identity.js`

```js
const STORAGE_KEY = "app.userId";
```

- `setUserId(userId)` — throws `TypeError` unless `userId` is a non-empty
  string. Writes to `sessionStorage`.
- `getUserId()` — returns the stored string, or `null` when absent.
- `clearUserId()` — removes the stored value.

When `sessionStorage` is unavailable, all three functions operate on an
internal in-memory value instead, for the page lifetime. Callers see the same
interface and the same semantics; only durability is lost.

### `auth.js`

- `async login(username, password)` — resolves to
  `{ success: boolean, user: string, userId: string }`.

  Currently a stub: it does not contact `API_ENDPOINT`. The stub builds its
  `userId` by prefixing the username with `stub-`, so the placeholder is
  recognizable if it ever reaches a log or a backend.

- `validateForm(formData)` — unchanged behavior, moved verbatim.

`API_ENDPOINT` moves to `auth.js` with `login`.

### `app.js`

The submit handler only. Reads the two inputs, calls `validateForm`, awaits
`login`, and routes the result to `identity.js`.

## Data flow

1. User submits `#login-form`; the handler calls `preventDefault()`.
2. `validateForm({ username, password })`. On invalid, report the error and
   stop — no identity calls.
3. `await login(username, password)` inside a `try/catch`.
4. On `success === true` with a non-empty string `userId`: `setUserId(userId)`.
5. On `success === false`: `clearUserId()`.
6. On a successful response with a missing or non-string `userId`: log a
   warning, `clearUserId()`, store nothing. This is a server contract violation.
7. On a rejected promise: log the error, `clearUserId()`.

Future forms read the value with `import { getUserId } from './identity.js'`.

## Error handling

Programmer errors fail loudly; environment errors degrade quietly.

| Condition | Behavior |
|---|---|
| `setUserId` called with a non-string or empty value | Throw `TypeError` |
| `sessionStorage` read or write throws | Catch, fall back to in-memory value for the page lifetime, log once |
| Login returns `success: false` | `clearUserId()`; no ID stored |
| Login succeeds without a usable `userId` | Warn, `clearUserId()`, store nothing |
| `login()` rejects | Catch in the handler, log, `clearUserId()` |

A `sessionStorage` failure must never break the login flow. A stale ID must
never outlive a failed login attempt.

## Testing

`auth.js` and `identity.js` are both free of DOM access and directly importable
by the test runner. `app.js` is DOM wiring and is not unit-tested; it is the
reason the other two were split out.

Planned coverage:

- `identity.js`: round-trip set/get; `getUserId` returns `null` when unset;
  `clearUserId` removes; `TypeError` on empty string, `null`, `undefined`, and
  non-string input; graceful degradation when the storage object throws.
- `auth.js`: `login` resolves with a non-empty `userId`; `validateForm` accepts
  a complete form and rejects each missing field.

Storage is injected or substituted in tests rather than relying on a browser
environment.

## Global constraints

Tooling selected by the human partner, to be set up as part of this work:

- **Unit tests** — node's built-in `node:test` runner. Zero dependencies, native
  ES module support. Add a `test` script to `package.json` and a first passing
  test.
- **Lint and format** — ESLint plus Prettier with standard defaults, wired to
  `package.json` scripts.

Not selected: end-to-end tests (one form against a stubbed backend does not
justify a browser harness yet), fuzz and mutation testing.

`package.json` needs `"type": "module"` so the test runner treats the new files
as ES modules. The existing `src/index.js` and `src/utils.js` are CommonJS and
are **not** loaded by the browser app; the plan must confirm that flipping
`"type"` does not break them, and rename them to `.cjs` if it does.

## Out of scope

- Login-event recording, locally or to a backend.
- Cross-tab identity synchronization.
- A logout flow or UI. `clearUserId()` exists, but nothing calls it outside the
  failure paths above.
- Replacing the `login()` stub with a real network call.
- Changes to `src/index.js` and `src/utils.js` beyond whatever the `"type":
  "module"` switch forces.

## Assumptions

- **Assumption**: the real authentication endpoint returns a stable, per-person
  user identifier as a string field named `userId`. Validate by inspecting the
  actual response from `API_ENDPOINT` before replacing the stub; the field name
  and type in `auth.js` change to match whatever it actually returns.
- **Assumption**: the app is served over HTTP rather than opened from the
  filesystem. ES modules do not load over `file://`. Validate by confirming how
  the page is opened today; if double-click-to-open is required, the design
  falls back to the global-namespace variant (approach B) instead.
- **Assumption**: flipping `package.json` to `"type": "module"` does not break
  the unrelated CommonJS files in `src/`. Validate by running them after the
  change.
