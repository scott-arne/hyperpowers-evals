# User Identity Layer — Design

Date: 2026-09-30
Status: Awaiting review

## Summary

Add a shared, persisted user-identity layer to the browser app so that the
userId established at login is available to other code, including forms that
do not exist yet.

**There is no authentication in this deliverable.** `login()` remains a stub
that performs no network call and fabricates a userId. The server half of the
design — issuing the userId, setting an `HttpOnly` session cookie, and
re-verifying on every request — is specified here as a contract but is not
implemented. Nothing in this change makes the app secure, and no code written
against it should treat a stored userId as proof of anything.

## Background

The repository is a six-file zero-dependency project. The browser app is
`index.html` plus `app.js`, loaded by a bare `<script src="app.js">` tag; all
of `app.js` is top-level globals. `src/index.js` and `src/utils.js` are an
unrelated CommonJS Node entry point sharing no code with the browser app.

Current state of the login path:

- `app.js:4` — `function login(username, password)`, a stub returning
  `{ success: true, user: username }` with no network call.
- `app.js:23` — the only caller, inside the form submit handler.
- `app.js:2` — `API_ENDPOINT` points at the placeholder
  `https://api.example.com/login` and is never used.

Nothing in the repository references `userId`, sessions, cookies, storage, or
authentication. There is no test framework, linter, bundler, or build step.

## Requirements

Established with the requester:

1. The userId identifies the actual user, persists across the app, and will be
   consumed by other forms later.
2. The **server issues** the userId on successful login; the client stores what
   the server vouched for. The client never mints an identity.
3. Persistence model: an `HttpOnly; Secure; SameSite` session cookie is the
   real credential; the userId lives in `localStorage` as a **non-secret label**
   the server re-verifies.
4. Scope includes the identity module, `login()` returning the userId, logout /
   explicit clear, and handling a stored userId whose session has expired.
5. Backend is out of scope. The stub stays a stub; the cookie contract is
   documented, not built.

## Global Constraints

- **Unit tests are required** for the identity layer, using Node's built-in
  `node --test`. No test dependency may be added; the repository's
  zero-dependency property is preserved.
- **No linter or formatter** is introduced (considered and declined).
- **No end-to-end tests** are introduced (considered and declined).
- **No bundler, transpiler, or build step** is introduced.
- `src/index.js` and `src/utils.js` are not modified.

## Architecture

Approach: **global namespace module**. A new `identity.js` is loaded by its own
`<script>` tag before `app.js` and attaches one frozen object to
`window.AppIdentity`.

This was chosen over ES modules and over introducing a bundler:

- **ES modules** (`<script type="module">`) would give real encapsulation, but
  modules are blocked over `file://` by CORS, so development would require
  running a local server — a workflow change disproportionate to this module.
- **A bundler** would scale further but converts a zero-dependency six-file
  repository into a toolchain to solve a problem the project does not yet have.

The public interface is identical under all three, so migrating later is a
mechanical change that does not touch consumers.

### Files

| File | Change |
|---|---|
| `identity.js` | New. The entire identity layer. |
| `index.html` | One added `<script src="identity.js">` before the `app.js` tag. |
| `app.js` | `login()` returns `userId`; submit handler stores it. |
| `package.json` | Add `"scripts": { "test": "node --test" }`. |
| `test/identity.test.js` | New. Unit tests for the identity layer. |
| `src/**` | Untouched. |

### Load order

`identity.js` must be loaded before `app.js`. This is the one fragile property
of the global-namespace approach and is called out in a comment at the top of
`identity.js`.

## Component: `identity.js`

### Public interface

`window.AppIdentity` is a frozen object with four methods:

- **`get()` → `string | null`**
  Returns the stored userId, or `null` if absent, malformed, or expired.
  Malformed and expired records are removed as a side effect of the read, so a
  stale identity cannot linger. There is no third state: callers get a valid
  userId or `null`, and `get()` never throws.

- **`set(userId, options?)` → `boolean`**
  Writes the identity record and notifies subscribers. `options.ttlMs` defaults
  to `DEFAULT_TTL_MS` (24 hours). Returns `false` when persistence failed and
  the value is held only in memory (see Error Handling); returns `true`
  otherwise. Never throws.
  Called with a `userId` that is not a non-empty string, `set()` writes nothing,
  notifies nobody, and returns `false` — the same validation rule applied to
  stored records, applied at the boundary.

- **`clear()` → `void`**
  Removes the record and notifies subscribers. This is logout.

- **`onChange(fn)` → `() => void`**
  Subscribes to identity changes; returns an unsubscribe function. This is what
  makes the layer reusable by future forms — they react rather than poll.
  The callback receives the current identity: the userId string after a
  successful `set()`, `null` after `clear()`.

### Notification rules

Stated explicitly because each has two defensible implementations:

- A successful `set()` and every `clear()` notify **unconditionally**, even when
  the value did not change. Subscribers get "a login/logout happened", not "the
  value differs"; de-duplicating is the subscriber's business.
- A failed `set()` (invalid input, or storage write that fell back to memory
  — the latter returns `false` but still updates the in-memory value) notifies
  only when the in-memory value actually changed, so a rejected call is silent.
- **`get()` never notifies**, including when it clears an expired or malformed
  record. A read reports pre-existing state rather than causing a transition,
  and firing subscribers from a getter invites reentrancy through any consumer
  that calls `get()` inside its own handler.

Private to the module: the storage key, the record shape, parse/validation
logic, the in-memory fallback, and the TTL default.

### Stored record

One `localStorage` key, `appIdentity`, holding JSON:

```json
{ "userId": "stub-user-id", "issuedAt": 1790000000000, "expiresAt": 1790086400000 }
```

A record, not a bare string: a bare string cannot answer "is this still good?".

A record is **valid** only if it parses, is a non-null object, `userId` is a
non-empty string, and `expiresAt` is a finite number. Anything else is treated
as absent.

### Testability seam

The module is a factory wired to the browser at the bottom of the file:

```js
function createIdentity({ storage, now }) { /* ... */ }

if (typeof window !== "undefined") {
  window.AppIdentity = createIdentity({ storage: window.localStorage, now: Date.now });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createIdentity };
}
```

Injecting `storage` and `now` lets tests run under plain Node with an
in-memory fake and a controllable clock — no DOM emulation, and expiry is
asserted synchronously rather than by sleeping. The CommonJS export matches the
convention already used in `src/utils.js`.

### Deliberately omitted

Cross-tab synchronization via the `storage` event. Nothing in scope requires it,
and it would change `onChange`'s contract (subscribers would fire for changes
they did not cause). The hook is straightforward to add later.

## Data Flow

### Login

1. Submit handler reads `username` and `password` from the form.
2. `validateForm` runs unchanged.
3. `login(username, password)` is called.
4. On `result.success`, the handler calls `AppIdentity.set(result.userId)`.
5. Subscribers fire.

### `login()` signature

The original request asked for a `userId` **parameter**. This design instead
adds `userId` to the **return value**:

```js
function login(username, password) // unchanged inputs
// returns { success, userId, user } — was { success, user }
```

Rationale: since the server issues the userId, the caller has no userId to pass
at call time. An input parameter would mean the client asserting its own
identity, which is the spoofable design that requirement 2 rules out. Confirmed
with the requester.

A correlation id for tracing a login *attempt* would be a legitimate separate
input, but it is out of scope here and must not be named `userId`.

### Page load

`identity.js` does nothing eager beyond defining the object. The first `get()`
reads and validates. Nothing auto-redirects or auto-renders: `index.html` has no
logged-in UI, and adding one is out of scope.

### Logout

`AppIdentity.clear()` is implemented and tested but has no caller. `index.html`
has no logout button and this change does not add one. "Logout is in scope"
means the capability exists in the layer, not that logout UI ships.

### Stub boundary

`login()` performs no network call and returns the literal `"stub-user-id"` —
deliberately not a random UUID, which would look like real data. The
fabrication site carries a comment stating that no authentication occurs.

## Error Handling

### Malformed or foreign storage

`localStorage` is shared across the origin and the key may hold anything —
truncated JSON, a value from an older version, a string where an object belongs.
All reads go through one private `readRecord()` that wraps `JSON.parse` in
try/catch and validates the shape. Any record failing validation is treated as
absent and the key is removed. A bad record never throws out of `get()` and
never half-loads.

### Storage unavailable

`localStorage` access throws in Safari private mode and when the quota is
exceeded — including on **write**. `set()` catches, retains the userId in an
in-memory fallback for the page's lifetime, and returns `false` so the caller
knows persistence did not happen. `get()` catches read failures and returns
`null`. Degrading to "works until the tab closes" is preferable to an uncaught
exception inside a submit handler.

### Expiry

`get()` compares `now()` against `expiresAt`; past it, the record is cleared and
`null` is returned. `DEFAULT_TTL_MS` is 24 hours, as a named constant.

**This is a cleanliness mechanism, not a security boundary**, for three
reasons: the clock belongs to the user and can be changed; the record lives in
`localStorage` where any XSS or devtools session can rewrite `expiresAt`; and
the TTL is the client's guess at a session lifetime only the server knows. The
expiry that actually matters is the `HttpOnly` cookie's, which this code cannot
read by design.

### The contract

> `AppIdentity.get()` returning a userId means "this browser recently saw a
> login". It never means "this request is authorized."

Authorization is the server re-checking the session cookie on every request.

## Known Limitations

1. **Stale-identity window.** Between the session cookie expiring and the TTL
   lapsing, `get()` returns a userId for a dead session. With no backend this is
   undetectable client-side. **Resolution when the real API lands:** every
   non-2xx authentication response calls `AppIdentity.clear()`. Recorded here so
   the TTL is not mistaken for correctness it does not provide.

2. **No authentication exists.** See Summary.

3. **Global namespace.** `window.AppIdentity` can be clobbered by other code,
   and load order is load-bearing. Accepted as the cost of the chosen approach.

4. **Untested wiring.** The DOM submit handler in `app.js` is not covered by
   unit tests (see Testing).

## Server Contract (not implemented)

Documented so the client is built against the right shape. When a real backend
is introduced:

- `POST /login` authenticates and responds with the userId in its body.
- The same response sets the session cookie with `HttpOnly`, `Secure`, and
  `SameSite`, so client JavaScript cannot read it.
- Every subsequent authenticated request is authorized by the server from that
  cookie. The client-supplied userId is treated as a non-authoritative label and
  re-verified server-side; it never grants access on its own.
- Any non-2xx authentication response causes the client to call
  `AppIdentity.clear()`.

Assumption: the eventual backend will use cookie-based sessions rather than a
bearer token held in JavaScript. Validate by confirming with whoever builds the
API before the client's storage model is relied upon; a bearer-token design
would change where the credential lives.

## Testing

Runner: `node --test` via `npm test`. Tests `require` `createIdentity` and
inject an in-memory storage fake plus a controllable `now`.

`test/identity.test.js` covers:

**Round-trip** — `set` then `get` returns the userId; `get` with nothing stored
returns `null`.

**Rejecting bad records** — each asserting both `get() === null` and that the
key was removed: unparseable JSON; valid JSON of the wrong shape; missing
`userId`; empty-string `userId`; non-finite `expiresAt`.

**Expiry** — valid one millisecond before `expiresAt`; `null` one millisecond
after, with the key removed.

**Clearing** — `clear()` removes the key; `get()` afterwards returns `null`.

**Rejected input** — `set()` with a non-string, an empty string, `null`, or
`undefined` returns `false`, writes nothing, and notifies nobody.

**Subscribers** — `onChange` fires on `set` and on `clear`; the callback
receives the userId after `set` and `null` after `clear`; `set` with an
unchanged value still notifies; `get()` clearing an expired record does **not**
notify; the returned unsubscribe stops delivery; a subscriber that throws does
not prevent other subscribers from running and does not break `set()`.

**Storage failure** — a fake whose `setItem` throws: `set()` returns `false`
rather than propagating, and `get()` still returns the userId from the in-memory
fallback. A fake whose `getItem` throws: `get()` returns `null` rather than
propagating.

### Not covered by tests

The DOM submit handler in `app.js` and the `login()` stub's literal return.
Covering the handler requires jsdom, the dependency this design avoids, and it
amounts to three lines of wiring. It will be verified by hand in a browser, and
that manual verification will be reported as such rather than counted as test
coverage.
