# User Identity Design

Date: 2026-09-17
Status: Approved for planning

## Problem

The app needs to know who logged in, and that knowledge needs to outlive the
login form. Today `login(username, password)` in `app.js` fabricates
`{ success: true, user: username }`, logs it to the console, and the value is
discarded by the only call site. Nothing in the repository records a user
identifier, and no other code can ask who is logged in.

The originating request was to add a `userId` parameter to `login`. That
framing does not survive the decision that the identifier is server-issued: a
parameter is supplied by the caller, but the caller cannot know an ID that only
the server can issue. `userId` is therefore an output of login, not an input.
`login` does gain a new parameter under this design, but it is an injected
transport for testability, not the identifier.

## Goals

- A single, server-issued user identifier established at login.
- The identifier persists across page reloads and in-tab navigation.
- Any part of the app, including code that does not exist yet, can read the
  current identifier through one documented interface.
- The identifier's storage mechanism can be changed later without touching
  consumers.
- A defined response contract the real backend must honor, so `login` does not
  change again when the endpoint ships.

## Non-Goals

- Authentication or authorization logic. The identifier is a correlation value,
  not a credential.
- A logout control in the UI. `clearUserId()` ships unused, ready for one.
- Change notification or subscription for consumers. Reads are synchronous.
- Automatic attachment of the identifier to outbound requests.
- A bundler or any runtime dependency.
- Any change to the behavior of `src/index.js` or `src/utils.js` beyond the
  module-syntax conversion required by the `"type": "module"` decision.

## Decisions

These were settled during brainstorming and are inputs to the design, not open
questions.

| Decision | Choice | Rationale |
|---|---|---|
| Identifier origin | Server-issued | The only option that is trustworthy and matches server-side records. |
| Persistence | `sessionStorage` | Survives reloads, self-expires on tab close, so a stale identity cannot outlive the visit. |
| Module system | Native ES modules | Explicit imports make reuse by future forms legible; no bundler, no dependencies. |
| Module surface | Minimal: set / get / clear | Everything larger is additive later and wants a consumer that does not exist yet. |
| Storage write owner | `login` itself | One place establishes identity; callers cannot forget to store it. |
| Test tooling | Node built-in `node --test` | Adds test coverage without adding a dependency. |

## Architecture

Three modules, one new concept.

### `identity.js` (new)

The entire identity concept. Nothing else in the app touches `sessionStorage`
directly; that containment is what makes the persistence decision reversible.

```js
setUserId(id)   // stores; throws TypeError on non-string or empty input
getUserId()     // returns string | null
clearUserId()   // removes the stored identifier
```

- Storage key: `app.userId`.
- Reads `globalThis.sessionStorage` lazily at call time rather than capturing it
  at import time, so tests can install a fake storage object.
- Every storage access is wrapped in try/catch. When storage is unavailable
  (Safari private mode, storage disabled by policy), the module falls back to a
  module-level variable so the app degrades to in-memory identity rather than
  throwing at load.
- `setUserId` rejects non-string and empty input. This guards the failure mode
  where `undefined` is coerced to the literal string `"undefined"` on write, after
  which every `getUserId()` returns truthy garbage.

### `auth-transport.js` (new)

One function, `requestLogin(username, password)`, holding the `API_ENDPOINT`
call. Today it returns the stubbed response shape below. When the backend
lands, this is the only file that changes.

### `app.js` (modified)

`login` becomes `async`, calls the transport, and on success calls `setUserId`.
`validateForm` is unchanged. The submit handler awaits `login` inside a
try/catch.

```js
async function login(username, password, { transport = requestLogin } = {})
```

The injected transport exists solely so tests can supply a fake without module
mocking machinery.

## Server Response Contract

The stub returns the shape the real endpoint must honor. Defining it now is the
purpose of keeping the stub.

```js
// success
{ success: true, userId: "usr_...", username: "alice" }

// failure
{ success: false, error: "Invalid credentials" }
```

`userId` is an opaque, non-empty string. Consumers must not parse it or derive
meaning from its format.

## Data Flow

1. Form submit fires; `validateForm` runs unchanged.
2. On valid input, the handler awaits `login(username, password)`.
3. `login` awaits `requestLogin`.
4. On `success: true`, `login` calls `setUserId(response.userId)`.
5. `login` returns the response to the caller.
6. Any later code calls `getUserId()` and receives the identifier or `null`.

A failed login leaves any existing stored identifier untouched. Mistyping a
password on a re-login attempt must not silently clear the current identity.

## Error Handling

| Condition | Behavior |
|---|---|
| Transport throws or rejects | `login` rejects. The submit handler catches and logs via `console.error`, matching the existing style. No identifier is stored. |
| Response has `success: false` | `login` returns the response. No identifier is stored. Existing stored identifier is left untouched. |
| `setUserId` given non-string or empty input | Throws `TypeError`. |
| `sessionStorage` access throws | Caught; the module falls back to an in-memory variable for the page's lifetime. |

## Security Considerations

- `sessionStorage` is readable by any script on the origin. An XSS flaw exposes
  the identifier. It is an identifier, not a credential; session tokens must not
  be stored here under this design.
- The server must never accept a client-supplied `userId` as proof of identity.
  Authorization remains server-side against the authenticated session.
- The identifier is cleared when the tab closes. On a shared machine, no
  explicit action is required to prevent the next visitor from reading it.

## Testing

Runner: Node's built-in test runner via `node --test`. No dependency added.

`identity.js`:
- set/get round trip returns the stored value.
- `getUserId()` with nothing stored returns `null`.
- `clearUserId()` removes the value; a subsequent `getUserId()` returns `null`.
- `setUserId` throws `TypeError` for empty string, `null`, `undefined`, and
  non-string values.
- When the injected fake storage throws on access, the module falls back to
  in-memory behavior and set/get still round-trips.

`login`:
- On a `success: true` transport response, the identifier is stored.
- On a `success: false` transport response, nothing is stored and a
  previously stored identifier is unchanged.
- On a rejecting transport, `login` rejects and nothing is stored.

## Files Touched

| File | Change |
|---|---|
| `identity.js` | New. |
| `auth-transport.js` | New. |
| `app.js` | `login` becomes async, injects transport, stores the ID; imports added; submit handler awaits. |
| `index.html` | `<script src="app.js">` becomes `<script type="module" src="app.js">`. |
| `package.json` | Add `"type": "module"` and a `test` script. |
| `src/utils.js` | CommonJS to ESM. Behavior unchanged. |
| `src/index.js` | CommonJS to ESM. Behavior unchanged. |
| `test/identity.test.js` | New. |
| `test/login.test.js` | New. |

## Consequences Accepted

- **Repo-wide module conversion.** `export` in a `.js` file requires
  `"type": "module"` in `package.json`, which breaks the two CommonJS files
  under `src/`. Converting them is roughly three lines and does not change their
  behavior. This touches files unrelated to login and was explicitly approved.
- **The page must be served over HTTP.** Module scripts do not load from
  `file://`. `python3 -m http.server` in the repo root is sufficient for local
  use.

## Global Constraints

- No runtime dependencies. No bundler.
- Unit-test infrastructure is set up as part of this work (`node --test`); every
  task that adds logic adds tests. No linter or formatter is configured, by
  decision.
- No consumer outside `identity.js` may access `sessionStorage` directly.
- Assumption: the backend will be able to return an opaque non-empty string
  `userId` on successful authentication. Validate via review of the response
  contract with whoever builds the endpoint, before the stub in
  `auth-transport.js` is replaced.
