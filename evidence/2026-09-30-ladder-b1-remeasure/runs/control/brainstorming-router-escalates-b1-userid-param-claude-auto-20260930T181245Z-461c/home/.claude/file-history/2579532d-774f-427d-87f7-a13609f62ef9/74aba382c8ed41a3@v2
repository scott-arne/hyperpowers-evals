# Login userId Tracking — Design

**Date:** 2026-09-30
**Status:** Awaiting review
**Branch:** `feature/webapp-enhancement`

## Problem

The request was "add a userId parameter to the login function so we can track
who logged in." The repository cannot satisfy that as literally stated:

- Nothing in the codebase produces a user identifier. The login form collects
  a username and a password; `login` already receives the username.
- There is no tracking destination — no logging, analytics, or storage layer
  exists.
- `login` (`app.js:4`) is a synchronous stub that logs to the console and
  returns a hardcoded success. It never contacts `API_ENDPOINT`, which is
  declared and unused.

So `userId` is **not** added as a parameter. It originates on the server and
arrives in the login response, then is forwarded to an analytics endpoint.
This was confirmed with the requester during brainstorming.

## Decisions

| Question | Decision |
|---|---|
| Where does `userId` come from? | The server returns it in the login response. |
| What does "track" mean? | POST the login event to an analytics endpoint. |
| Do the endpoints exist? | No. Both are stubbed behind a seam, with a single swap point for real URLs. |
| Test tooling? | Add a test runner (runner only — no linter or formatter). |
| Architecture? | Extract service modules with injected dependencies. |

## Global Constraints

- **Zero runtime dependencies.** The repository has no `node_modules`, no
  lockfile, and no dependencies. Nothing in this work adds one. Tests use
  Node's built-in runner; fakes are plain functions, not a mocking library.
- **No linter or formatter** is introduced. Match the surrounding style.
- **Do not modify `src/index.js` or `src/utils.js`.** They are an unrelated
  `greet` demo. Leaving them untouched is why new modules use `.mjs` rather
  than setting `"type": "module"` package-wide.
- `login` never throws; it returns a result object, matching the existing
  `validateForm` pattern.

## Architecture

Five source files. `app.js` becomes DOM-only glue; all logic moves to
testable ES modules.

| File | Responsibility | Depends on |
|---|---|---|
| `src/config.mjs` | Both endpoint URLs (values below). The single swap point for real endpoints. | — |
| `src/auth.mjs` | `async login(username, password, deps)` — POST credentials, read `userId`, forward it to the tracker, return the result. | `config`, injected `fetch` + `track` |
| `src/tracking.mjs` | `async trackLogin(userId, deps)` — POST the login event. Swallows its own failures. | `config`, injected `fetch` |
| `src/validate.mjs` | `validateForm(formData)` — moved verbatim from `app.js`, no behavior change. | — |
| `app.js` | DOM only: read the form, validate, `await login(...)`, report. | `src/auth.mjs`, `src/validate.mjs` |

`index.html`: the script tag for `app.js` gains `type="module"`.

**Extension choice.** New modules use `.mjs` so both Node and the browser
read them as ESM without a `package.json` change. The alternative —
`"type": "module"` — would reclassify the whole package and break the CommonJS
`require` calls in the untouched `greet` demo.

**Placeholder URL values.** `config.mjs` exports exactly two constants:

```js
export const LOGIN_URL = "https://api.example.com/login";      // existing value, moved from app.js
export const ANALYTICS_URL = "https://api.example.com/analytics"; // new placeholder
```

`LOGIN_URL` preserves the existing `API_ENDPOINT` value verbatim, and the now-unused
`API_ENDPOINT` constant is removed from `app.js`. `ANALYTICS_URL` is invented — no
analytics endpoint has been specified. Both are placeholders pointing at a host
that does not answer.

**Consequence for manual verification.** Because neither URL resolves, a real
browser submit will take the `fetch` rejects path and surface "Network error"
every time. Manual verification therefore confirms the wiring (the handler runs,
awaits, and reports the failure) — it cannot confirm a successful login or a
successful tracking POST. Those paths are covered only by the tests, against
fakes. Anyone checking this by hand should expect the error path and not read it
as a defect.

**Behavior change from `type="module"`.** Module scripts are deferred until
after HTML parsing. `app.js` currently registers its submit listener at load
time with no DOM-ready guard; under `type="module"` that becomes safe. This is
an improvement, but it is a change in load timing and is recorded here so it
does not read as accidental.

## Data Flow

On a valid form submit:

```
submit -> validateForm -> login(username, password)
                            |- POST config.LOGIN_URL  { username, password }
                            |- response -> { success, userId }
                            |- trackLogin(userId)
                            |    \- POST config.ANALYTICS_URL
                            |         { event, userId, timestamp }
                            \- return { success, userId }
```

## Contracts

Both endpoints are fakes, so these contracts are assumptions. They are the
most likely thing to be wrong when real servers appear, which is why they are
confined to `config.mjs`, `auth.mjs`, and `tracking.mjs`.

**Login request** — `POST` JSON:

```json
{ "username": "string", "password": "string" }
```

**Login response** — JSON. `userId` is required when `success` is true, and
its absence is treated as an error rather than assumed:

```json
{ "success": true, "userId": "string" }
```

**Analytics request** — `POST` JSON, fire-and-forget (the response is not
inspected). `timestamp` is an ISO 8601 string:

```json
{ "event": "login", "userId": "string", "timestamp": "2026-09-30T00:00:00.000Z" }
```

**`login` return value** — `{ success, userId }` on success, or
`{ success: false, error }` on any failure.

This **drops the existing `user: username` field**. Its only consumer is a
`console.log` in the submit handler, and a field that echoes an argument back
invites treating it as server-confirmed identity when it is not.

**`login` is now async.** The submit handler must `await` it. A caller that
forgets receives a Promise where it expects a result object.

## Dependency Injection

The seam that makes this testable without a mocking library:

```js
async function login(username, password, deps = {}) {
  const { fetch = globalThis.fetch, track = trackLogin } = deps;
  ...
}
```

`trackLogin` takes `fetch` the same way. Production call sites pass nothing
and get real behavior; tests pass fakes.

## Error Handling

`login` never throws. It returns `{ success: false, error }`, matching the
existing `validateForm` convention.

| Failure | Behavior |
|---|---|
| `fetch` rejects (offline, DNS, CORS) | `{ success: false, error: "Network error" }`. Tracking does not fire. |
| Login returns 401 | `{ success: false, error: "Invalid credentials" }`. Tracking does not fire. |
| Login returns other non-2xx | `{ success: false, error: "Login service unavailable" }`. Tracking does not fire. |
| 2xx, body not JSON or `userId` missing | `{ success: false, error: "Malformed login response" }`. Tracking does not fire. |
| Analytics POST fails | **Login still succeeds.** `trackLogin` catches, logs, and returns. |

401 is kept distinct from 5xx because "your password is wrong" and "our
service is down" are different problems and collapsing them makes the failure
unreportable.

The malformed-response case matters more than it looks: this contract was
invented against a fake server, so it is the failure most likely to occur in
practice. It must not pass silently — forwarding `{ userId: undefined }` to
analytics would produce tracking data that looks valid and means nothing.

**Tracking is awaited.** `login` awaits `trackLogin`, whose catch is internal.
This adds analytics latency to the login round trip, accepted in exchange for
deterministic test ordering — a floating promise cannot be asserted on
reliably. Inverting this later is a one-line change.

**No retry, no queue — tracking is best-effort.** A failed analytics POST
loses that login event permanently, so the data will have holes whenever the
endpoint is down. Making it reliable means buffering, retry, or server-side
logging instead; that is a separate feature and a separate spec, not an
extension of this one.

## Testing

**Runner:** Node's built-in `node --test`, invoked via a new `scripts.test`
entry in `package.json`. No other `package.json` change.

**Files:** `test/auth.test.mjs`, `test/tracking.test.mjs`,
`test/validate.test.mjs`.

**Cases:**

`auth.mjs`
- Success: returns `{ success, userId }`, and `track` was called with that
  exact `userId`.
- `fetch` rejects: returns the network error, and `track` was **not** called.
- 401: returns invalid-credentials.
- 5xx: returns service-unavailable, distinct from the 401 message.
- 2xx with `userId` missing: returns malformed-response, and `track` was
  **not** called.
- `track` throws: **login still returns success.** This assertion is what
  keeps a dead analytics endpoint from breaking login.

`tracking.mjs`
- Posts the `{ event, userId, timestamp }` shape to the analytics URL.
- Swallows a rejecting `fetch` without propagating.

`validate.mjs`
- Missing username, missing password, and the valid case — preserving the
  current behavior through the move.

**Out of scope: the DOM wiring in `app.js`** — the form listener, element
lookups, and the `await`. Covering it requires a DOM environment (jsdom or a
browser runner), which means dependencies and a real jump in setup cost, for
roughly a dozen lines of glue. It will be verified by hand in the browser —
but only as far as the placeholder URLs allow (see "Consequence for manual
verification" above): the observable result is the error path, not a
successful login. Consequently a green test run means the auth, tracking, and
validation logic is correct; it does not mean the page works end to end, and
no verification available today can show that it does.

## Out of Scope

- Real endpoint URLs and the real server contract.
- Retry, buffering, or guaranteed delivery of analytics events.
- Any DOM or browser-level test infrastructure.
- Linting and formatting.
- Any change to `src/index.js` or `src/utils.js`.
- Authentication beyond the single login call: no sessions, tokens, refresh,
  or logout tracking.
