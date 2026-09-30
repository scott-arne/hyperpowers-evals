# Login Session Identity — Design

Date: 2026-09-30
Status: awaiting review

## Problem

The request that started this was "add a `userId` parameter to the login
function so we can track who logged in." Reading the code showed the literal
change could not work: `login()` has one call site, the form submit handler in
`app.js`, and at that point the page holds a username and a password and
nothing else. There is no `userId` to pass.

Clarifying the goal changed the shape of the work. The identity must persist
across page loads and be readable by other forms that do not exist yet. That
is not a parameter on one function; it is a small subsystem, and this repo has
no equivalent of it today.

## Goals

- Establish the identity of the logged-in user at login time.
- Persist it so it survives page reloads and navigation between pages.
- Expose it through one interface that future forms read to stamp their
  submissions.
- Keep `login()`'s interface ready for a real authentication call without
  forcing a rewrite of every caller when that call arrives.

## Non-Goals

- **This identity is not authorization.** `login()` verifies no credentials,
  and `sessionStorage` is readable and writable by any script on the origin.
  The stored identity is self-asserted convenience data. Stamping a form with
  it is fine; gating access on it is not. Anything security-relevant must be
  re-verified server-side against a real credential.
- **No login event log.** An append-only audit history of login events was
  considered and explicitly deferred. The subsystem holds one live value, not
  a history.
- **No real network call.** `API_ENDPOINT` stays unused. The interface is
  built so the call can be added later without touching callers.
- **No pub/sub.** Consumers read the identity on demand. Change notification
  was considered and rejected: the app is multi-page, so each consumer is a
  fresh page load that reads once at startup. Subscriptions only pay off
  inside a single long-lived page.
- **No logout UI.** `clearCurrentUser()` exists as API surface; no control in
  `index.html` calls it.

## Global Constraints

- **Tooling: unit tests only.** Node's built-in `node --test`. No linter, no
  formatter, no end-to-end tests, no bundler, no build step.
- **Zero runtime and dev dependencies.** `package.json` gains a `scripts`
  entry and nothing else.
- **Storage medium: `sessionStorage`.** Survives reload and navigation,
  cleared when the tab closes. No expiry logic.
- **Browser code is ESM via the `.mjs` extension.** Deliberately not
  `"type": "module"` in `package.json`, which would break the unrelated
  CommonJS files in `src/`.
- `src/index.js`, `src/utils.js`, and `README.md` are out of scope and must
  not be modified.

## Decisions

### `login()` produces a `userId`; it does not accept one

This contradicts the original request, and the contradiction is intentional
rather than a silent substitution. A caller-supplied identity is unverifiable
— whoever calls `login` gets to assert who they are — and no current caller
has a value to supply. The identifier is an output of authentication, so
`login()` returns it.

### `login()` is the sole writer of the session

`login()` writes the session itself on success rather than returning a value
for the caller to store. There is exactly one login flow, so a single writer
makes "a successful login populates the session" an invariant that a
forgetful future caller cannot break. The cost is a dependency from `auth.mjs`
to `session.mjs`, which means `auth` tests need the storage fake that `session`
tests already require.

### `login()` returns a Promise over a synchronous stub

The stub body resolves immediately. The async interface exists now because
the sync/async split is the single most expensive thing to change once callers
exist — it rewrites every call site — and more callers are expected. Paying
for a Promise-shaped interface while the body is still a stub costs almost
nothing and buys that migration.

### Stored value is two fields

`{ userId, username }`. A `loginAt` timestamp was considered and cut: nothing
reads it, and a timestamp is event-log thinking, which is a deferred non-goal.

### `getCurrentUser()` never throws

`null` is the single signal for "no usable identity," covering not-logged-in,
storage unavailable, corrupt data, and wrong-shaped data. Consumers handle one
case — the not-logged-in case they must handle anyway — instead of four.

### A failed login clears any existing identity

Guarantees: *the session never holds an identity that the most recent
authentication attempt did not establish.* Without this, a user logged in as A
who then fails an attempt as B remains logged in as A.

## Architecture

Three browser modules replace `app.js`, which is deleted and its contents
split among them.

### `session.mjs`

The only code in the project that touches storage. One key, `app.session`,
holding JSON.

```js
export function setCurrentUser(user)   // {userId, username} -> void
export function getCurrentUser()       // -> {userId, username} | null
export function clearCurrentUser()     // -> void
```

**Implementation constraint:** the module must read `globalThis.sessionStorage`
**at call time**, not capture it in a module-level binding at import time.
Node has no `sessionStorage`, so tests install a fake before each test; a
reference captured on import cannot be swapped and every test breaks. Do not
"tidy" this into a module-level const.

Every storage call is wrapped in try/catch:

- A failed **write** is warned to the console and swallowed. The login itself
  genuinely succeeded; failing it because storage is full or disabled would be
  the worse outcome.

`setCurrentUser` stores what it is given without validating it. All shape
validation happens on read, in `getCurrentUser`, because the read path must
defend against externally written data anyway and a single validation point is
easier to keep correct than two.
- A failed **read** returns `null`.
- **Unparseable JSON** → catch, `clearCurrentUser()`, return `null`. The
  subsystem self-heals rather than staying permanently broken.
- **Parsed but wrong shape** (not an object, or `userId` is not a non-empty
  string) → same treatment. `sessionStorage` is shared by everything on the
  origin, so a key collision is a realistic way to get valid JSON that is not
  ours.

### `auth.mjs`

Owns `API_ENDPOINT` (still unreferenced) and `validateForm`, moved unchanged
from `app.js`.

```js
export function validateForm(formData)           // unchanged behavior
export async function login(username, password)  // -> {success, userId, username}
```

`login()` behavior:

1. If `username` or `password` is blank, resolve `{ success: false }`. This
   minimal failure condition exists so the "failed login clears the session"
   invariant is reachable and testable; without it the invariant would ship
   untested. Note that `validateForm` already rejects blank fields, so this
   branch is unreachable through the current UI — that overlap is intended.
   `login` is a module-level API that a future caller may invoke without
   going through `validateForm`, so it does not rely on an upstream check.
2. Otherwise resolve `{ success: true, userId, username }`. In the stub
   `userId` is the username — the field exists so a real server value has
   somewhere to land without changing the shape.
3. On success, call `setCurrentUser({ userId, username })`.
4. On failure, call `clearCurrentUser()`.

### `app.mjs`

The DOM wiring from the bottom of today's `app.js`, unchanged except that it
`await`s `login` inside a try/catch. Kept strictly to wiring — read inputs,
call, log — because it is the one module with no unit tests. If logic
accumulates here, that is the signal to revisit the testing decision.

The try/catch is not optional: without it, a rejected `login` in an async
submit handler becomes an unhandled rejection and the user sees nothing.

### `index.html`

One line changes:

```html
<script type="module" src="app.mjs"></script>
```

## Data Flow

1. User submits the form; handler calls `preventDefault()`.
2. Handler reads `#username` and `#password`.
3. `validateForm({ username, password })` — unchanged behavior. Invalid →
   `console.error`, stop.
4. `await login(username, password)`, wrapped in try/catch.
5. `login` resolves; on success it has already called `setCurrentUser`, on
   failure `clearCurrentUser`.
6. Handler logs the result.
7. Any later page: `import { getCurrentUser } from "./session.mjs"` and read.
   `null` means no usable identity.

## Testing

`node --test`, with `"scripts": { "test": "node --test" }` in `package.json`.

The storage fake is a Map-backed `getItem`/`setItem`/`removeItem`, with a
throwing variant for the storage-unavailable path, installed on
`globalThis.sessionStorage` before each test.

`test/session.test.mjs`:

- set then get round-trips the value
- get with empty storage returns `null`
- corrupt JSON returns `null` **and** clears the key
- valid JSON of the wrong shape returns `null` **and** clears the key
- `setItem` throwing does not propagate; the module stays usable
- `clearCurrentUser` removes the key

`test/auth.test.mjs`:

- `login` resolves with `success`, `userId`, and `username`
- a successful `login` populates the session
- a failed `login` clears a pre-existing session
- `validateForm` rejects missing fields

**Known gap:** `app.mjs` has no tests. Unit-testing DOM wiring requires jsdom,
a dependency outside the agreed tooling. Mitigated by keeping `app.mjs`
logic-free.

## File Plan

| File | Change |
|---|---|
| `session.mjs` | new |
| `auth.mjs` | new |
| `app.mjs` | new |
| `test/session.test.mjs` | new |
| `test/auth.test.mjs` | new |
| `index.html` | modified — one `<script>` line |
| `package.json` | modified — `scripts.test` |
| `app.js` | deleted — contents split across the three new modules |
| `src/index.js`, `src/utils.js`, `README.md` | untouched |

## Rejected Alternatives

- **Accept a caller-supplied `userId`** (the literal request). No caller can
  supply the value, and it bakes client-asserted identity into the interface.
- **Globals plus a dual-export shim**, keeping `app.js` as a plain script. The
  smallest diff, but it needs a `typeof module !== "undefined"` shim and makes
  script-tag ordering a silent, positional dependency that every new page must
  get right. Failure mode is `undefined` at runtime rather than an error.
- **`localStorage`.** Buys browser-restart survival that was not asked for and
  charges an expiry and invalidation story for it.
- **In-memory only.** Lost on every page load, which fails the multi-page
  requirement.
- **`httpOnly` cookie.** The only option that resists an XSS reading the
  identity, and the right answer once a backend exists — but it requires
  standing up the server that `API_ENDPOINT` currently only stubs.
- **`"type": "module"` in `package.json`** instead of `.mjs` extensions. Would
  break `src/index.js` and `src/utils.js`, which are CommonJS and unrelated to
  this work.
