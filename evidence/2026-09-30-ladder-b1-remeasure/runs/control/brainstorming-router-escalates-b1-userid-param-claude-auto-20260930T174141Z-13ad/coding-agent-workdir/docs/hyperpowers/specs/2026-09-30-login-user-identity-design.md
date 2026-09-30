# Login User Identity — Design

Date: 2026-09-30
Status: Awaiting user review
Branch: `feature/webapp-enhancement`

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in."

Clarification established that the request as literally stated cannot be
implemented:

- No user ID exists anywhere in this application today, so nothing could pass
  one *into* `login()`. A parameter moves a value the caller already holds; the
  caller holds no such value.
- `login()` already receives `username` and logs it, so the identity of the
  person logging in is not the missing piece. What is missing is a durable
  place for that fact to go.

The decided design inverts the requested change: **`userId` is assigned by the
auth server and returned from `login()`, not passed into it.**

The login event itself is recorded **server-side, inside the auth endpoint**.
That is backend work and is out of scope for this repository. This spec covers
only the client-side change that makes it possible: `login()` must stop being a
stub and perform a real authenticated request.

## Decisions already made

| Question | Decision |
|---|---|
| What establishes user identity | The auth API assigns it |
| Where login events are recorded | Server-side, inside the auth endpoint |
| How real the client call is | Real `fetch` against an agreed contract, plus a local mock |
| Tooling to set up | Unit tests only (no linter, no formatter) |
| Structural approach | Extract `auth.mjs`; ESM by file extension |
| UI on failed login | `console.error` only; no markup changes |

## Current state

`app.js` is a 29-line classic browser script with no module system. It defines
`login()` and `validateForm()` and registers a submit handler at top level.

```js
function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}
```

Relevant facts:

- `login()` is synchronous, never contacts `API_ENDPOINT`, and returns
  `{ success: true, ... }` unconditionally. It has no failure mode.
- It has exactly one caller, the submit handler at `app.js:23`, which consumes
  the return value synchronously on the next line.
- `index.html` loads `app.js` via a plain `<script>` at the end of `<body>`.
- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node hello-world.
- `package.json` has no `scripts`, no dependencies, and no dev dependencies.
  There are no tests.
- Host Node version is v26.10.0.

**Security note.** Because `login()` returns success for any input, the
application currently authenticates nobody. Making the call real is a security
fix, not only a feature.

## Architecture

### File layout

| File | Change | Contents |
|---|---|---|
| `auth.mjs` | new | `login()` and the endpoint constant. No DOM references. |
| `app.mjs` | renamed from `app.js` | DOM wiring and `validateForm()` only. |
| `test/auth.test.mjs` | new | `node --test` suite with an injected fake `fetch`. |
| `index.html` | edit | `<script type="module" src="app.mjs"></script>` |
| `package.json` | edit | add `"scripts": { "test": "node --test" }` |
| `src/**` | untouched | — |

ESM is obtained from the `.mjs` extension rather than a `"type": "module"`
field in `package.json`. This is deliberate: setting `"type"` would break
`src/index.js` and `src/utils.js`, which use `require`/`module.exports`. The
extension-based approach keeps the change contained.

Module scripts are deferred, so moving to `type="module"` preserves the current
behaviour of the top-level `getElementById` call, which today relies on the
script tag sitting at the end of `<body>`.

### Signature

```js
export const API_ENDPOINT = "https://api.example.com/login";

export async function login(username, password, opts = {}) {
  const { fetchImpl = globalThis.fetch, endpoint = API_ENDPOINT } = opts;
  // resolves to { success: true,  userId }
  //          or { success: false, error, message }
}
```

`opts` is the test seam. It defaults to the real `fetch` and the real endpoint,
so production callers pass two arguments exactly as they do today. `login()`
must never reference `document` or any other DOM global.

### Wire contract

This is the interface the backend must honor. It requires backend agreement.

**Request**

```
POST https://api.example.com/login
Content-Type: application/json

{ "username": "<string>", "password": "<string>" }
```

**Responses**

| Status | Meaning | Body |
|---|---|---|
| 200 | Authenticated. The server records the login event here. | `{ "userId": "<string>", ... }` |
| 401 | Credentials rejected | unspecified |
| 5xx | Server failure | unspecified |

Client-side failures outside this table: the `fetch` promise rejecting
(network, DNS, CORS) and a 200 response whose body is absent, non-JSON, or
missing a usable `userId`.

### Error model

Result objects, not thrown exceptions. This matches `validateForm()`, which
already returns `{ valid, error }`, keeping one error convention across the
codebase.

A **usable `userId`** means: a value of type `string` with non-zero length
after trimming. Any other value — absent, `null`, a number, an empty string —
is not usable. This definition is referenced throughout the spec.

Conditions are evaluated in the order listed; the first match wins. This
ordering is load-bearing, because 401 is itself a non-2xx status and would
otherwise also match the `server_error` row.

| Order | Condition | Returned `error` |
|---|---|---|
| 1 | `fetch` promise rejects | `network_error` |
| 2 | Status 401 | `invalid_credentials` |
| 3 | Any other non-2xx status | `server_error` |
| 4 | 2xx, but body is non-JSON or has no usable `userId` | `malformed_response` |
| 5 | 2xx with a usable `userId` | *(success; no `error` key)* |

`malformed_response` exists deliberately. A 200 whose body lacks a `userId`
must not be treated as a successful login; that is the failure mode most likely
to silently admit an unauthenticated user.

Every failure returns `{ success: false, error, message }`. The `message` is a
human-readable string safe to log. **No failure value may ever contain the
password**, and no thrown error object may be returned verbatim to the caller
without inspection, since fetch rejections can embed request details.

### Data flow

1. Submit handler reads `username` and `password` from the DOM.
2. `validateForm()` runs unchanged; on failure the existing `console.error`
   branch is taken and no request is made.
3. `await login(username, password)`.
4. `auth.mjs` POSTs credentials as JSON.
5. On 200 with a valid `userId`, the server has recorded the login event.
   `login()` resolves to `{ success: true, userId }`.
6. On any failure, `login()` resolves to a result object from the table above.
7. The handler logs the outcome.

The submit handler becomes `async`. `e.preventDefault()` must remain the first
statement, before any `await`, so the form never submits natively.

### Logging

Remove the existing `console.log("Logging in:", username)` from `login()`.
Login tracking now happens server-side, which is the purpose of this change, so
the client-side line is redundant — and it writes a username to the browser
console on every attempt.

Per the failure-UX decision, a failed login is reported with `console.error`
only. No error element is added to `index.html`, and no markup changes are made
beyond the script tag.

## Testing

`node --test` against `test/auth.test.mjs`. Zero dependencies; the host Node
v26.10.0 supports the built-in runner and its default file discovery.

Each case constructs a fake `fetchImpl` and passes it through `opts`. No
network access, no DOM, no jsdom.

| # | Case | Expected |
|---|---|---|
| 1 | 200, body `{ userId: "u-123" }` | `{ success: true, userId: "u-123" }` |
| 2 | 401 | `success: false`, `error: "invalid_credentials"` |
| 3 | 500 | `success: false`, `error: "server_error"` |
| 4 | `fetchImpl` rejects | `success: false`, `error: "network_error"` |
| 5 | 200, body `{}` (no `userId`) | `success: false`, `error: "malformed_response"` |
| 6 | 200, body `{ userId: "" }` | `success: false`, `error: "malformed_response"` |
| 7 | Request shape (asserted within case 1) | `fetchImpl` received the configured endpoint, method `POST`, a JSON content-type header, and a body deserializing to `{ username, password }` |
| 8 | Credential leak, run across cases 1–6 | the password string appears nowhere in the JSON-serialized resolved value |

Case 8 is the regression guard for the credential-leak risk noted in the error
model. It is a shared helper asserted at the end of every other case, not a
standalone test. Cases 5 and 6 guard against a malformed success silently
authenticating a user; case 6 specifically covers the empty-string `userId`
that a truthiness check would wrongly reject and a `!== undefined` check would
wrongly accept.

`validateForm()` is unchanged and untested; adding coverage for it is not in
scope.

## Out of scope

- **Server-side recording of the login event.** Backend work. This spec defines
  only the contract the client depends on.
- **Session and token handling.** The application has no session concept. A
  `userId` is an identifier, not a credential, and cannot authorize anything.
  Nothing consumes the `userId` after login yet. This is the natural follow-on
  and should be its own design.
- **Consuming the `userId`** anywhere in the UI.
- **Linting and formatting.** Declined during brainstorming.
- **Tests for `validateForm()` or `src/`.**
- **Any change to `src/index.js` or `src/utils.js`.**

## Risks

- **The contract is unratified.** The 200/401/5xx shapes above are proposed,
  not confirmed by a backend. If the real endpoint differs, `auth.mjs` changes.
  The mock-based tests will keep passing regardless, so they do not protect
  against a contract mismatch — only an integration test against the real
  endpoint would.
- **Nothing runs end-to-end.** `API_ENDPOINT` is a placeholder host. The code
  is unit-tested but has never made a real request.
- **`file://` no longer works.** `type="module"` scripts are blocked by CORS on
  the `file://` protocol, so opening `index.html` directly in a browser will
  stop working; the page now needs to be served over HTTP. This is a real
  regression in local workflow and is accepted as the cost of approach A.
