# User Identity Layer — Design

Date: 2026-09-17
Status: Approved for planning
Branch: `feature/webapp-enhancement`

## Origin

The request was "add a `userId` parameter to the login function so we can track
who logged in." Clarification established that the identity must be a real,
persistent user identity shared across the app — not a per-attempt correlation
ID — and that other forms, not yet written, will need to read it.

That makes the deliverable a small identity layer, not a parameter. The
resolution of the original request is that `login()` **gains no parameter**: the
caller cannot supply the identity that logging in is what establishes. The
identity travels out of `login()`, is persisted, and is read from anywhere.

## Requirements

Confirmed with the human partner during brainstorming:

1. The identity is a real user identity, stable for a given user across logins.
2. It persists across browser restarts and is shared across tabs on the origin.
3. Code outside `app.js` — forms that do not exist yet — must be able to read it.
4. Purpose is **attribution only**: analytics, logs, and "signed in as" display.
   Nothing gates behavior on it in this work.
5. There is an explicit clear/logout path.
6. The stored value is never treated as proof of anything.
7. No backend exists yet, but one will. The login response contract is ours to
   define.

## Global Constraints

- **Tooling to set up as part of this work:** unit-test infrastructure only —
  Node's built-in `node --test` runner, zero dependencies, with passing tests for
  the identity module. No linter and no formatter were selected; do not add them.
- **No build step, no bundler, no new runtime dependencies.**
- Do not modify `src/index.js` or `src/utils.js`. They are unrelated CommonJS
  Node code and must keep working untouched.
- The spec and any planning documents stay uncommitted unless the human partner
  explicitly asks for them to be committed.

## Security Posture

This is stated explicitly because the layer stores user identity in a place any
script on the origin can read.

- The stored identity is **self-asserted client state**, not a credential. No
  code may branch on it for access control, and nothing may be shown or hidden
  on the basis of it.
- `localStorage` was chosen over `sessionStorage` because the requirement is
  cross-tab persistence across restarts. The accepted cost: the record survives
  on disk until cleared, is readable by any script on the origin (so any XSS
  reads it), and on a shared machine the next person inherits the previous
  user's attribution until they log in or log out. The logout path (requirement
  5) is the mitigation and is in scope.
- Because the purpose is attribution only, the realistic worst case is
  mislabeled analytics, not account compromise. If gating is ever added, this
  design is insufficient on its own and requires a server-issued token with
  server-side enforcement.
- No password, and no value derived from a password, is ever stored or logged.

## Architecture

Three files, each with one purpose, replacing today's single `app.js`.

### `identity.js` (new)

The identity store. The only module that touches web storage.

```
createIdentityStore(storage) -> { getIdentity, getUserId, setIdentity, clearIdentity }
```

- `createIdentityStore(storage)` is a factory over an injected storage object
  satisfying the `getItem` / `setItem` / `removeItem` contract. This is what
  makes a future swap to `sessionStorage` a one-line change and what lets tests
  run without a browser.
- A default instance bound to `globalThis.localStorage` is also exported for
  application use.
- `getIdentity()` returns the full record or `null`.
- `getUserId()` returns the `userId` string or `null`. This is what other forms
  call.
- `setIdentity(record)` persists the record.
- `clearIdentity()` removes the stored record.

No other module reads or writes `localStorage` directly.

### `auth.js` (new)

Owns `API_ENDPOINT` and `login(username, password)`.

- Signature is unchanged from today: `login(username, password)`. **No `userId`
  parameter.**
- Returns `{ success: true, identity }` on success, `{ success: false, error }`
  on failure.
- Today the body mints a stubbed identity. When the backend exists, the body
  becomes a `fetch` to `API_ENDPOINT` and returns the server's values. This is
  the only file that changes at that cutover; no caller changes.
- `auth.js` does not write to storage. Persisting is the caller's decision, which
  keeps the future network module free of storage concerns.

### `app.js` (rewritten, smaller)

Form wiring only: `validateForm`, the submit handler, and the logout handler. It
imports from `auth.js` and `identity.js`.

### `index.html`

- `<script type="module" src="app.js">`.
- A "Log out" button that invokes the clear path.

### ES modules and `package.json`

`index.html` loads `app.js` as an ES module. Consequence to be aware of: ES
modules do not load over `file://`, so local development requires serving the
directory over HTTP (for example `python3 -m http.server`). Opening
`index.html` by double-clicking will no longer work. This was accepted
explicitly when choosing this structure.

Running the tests under Node requires `"type": "module"` in the root
`package.json`. That would break the existing CommonJS files in `src/`.
Rather than edit those unrelated files, add a new `src/package.json` containing
`{"type": "commonjs"}`. Node resolves module type from the nearest
`package.json`, so `src/index.js` and `src/utils.js` keep working with no edits,
and `"main": "src/index.js"` still resolves correctly.

## Data Model

One `localStorage` key: `app.identity.v1`. Value is JSON:

```json
{
  "userId": "stub:7f3a9c2b",
  "username": "alice",
  "loggedInAt": "2026-09-17T11:40:52.000Z",
  "source": "stub"
}
```

- `userId` — the identity other code consumes.
- `username` — retained for display and log readability.
- `loggedInAt` — ISO 8601 timestamp of the login that produced the record.
- `source` — `"stub"` today, `"server"` once the backend issues IDs. This makes
  invented IDs distinguishable from real ones in stored data and in analytics,
  including for records written before the cutover.
- The `v1` suffix in the key allows a clean break if the record shape changes.

## The Stubbed User ID

With no backend, `login()` must produce the ID itself.

- It is derived deterministically from the lowercased, trimmed username via a
  small non-cryptographic hash, and rendered with a literal `stub:` prefix.
- Deterministic derivation is what satisfies requirement 1: the same user gets
  the same ID on every login, which is what makes the attribution meaningful.
- The `stub:` prefix makes the value greppable and impossible to mistake for a
  server-issued ID in a log, an export, or a database.
- The hash is for producing a short stable token, not for security, and carries
  no secrecy guarantee. The username is recoverable context, not a secret.

*Assumption: the future backend will return a stable per-user string ID and the
login response will carry `userId` and `username`; validate when the endpoint is
specified.*

## Data Flow

**Login.** Submit event → `validateForm` → `auth.login(username, password)` → on
success, `identity.setIdentity(result.identity)` → one attribution log line
carrying `userId` and `username`.

**Reading the identity.** Any other form imports `identity.js` and calls
`getUserId()`. No consumer touches `localStorage` directly.

**Logout.** Button click → `identity.clearIdentity()` → the storage key is
removed.

## Logging

Today's `console.log("Logging in:", username)` fires before the attempt
resolves. It is replaced by a single attribution line emitted after a successful
login, carrying `userId` and `username` — which is the "track who logged in"
outcome the original request asked for. `console` is the sink because no
analytics backend exists. Passwords are never logged.

## Error Handling

- **Storage unavailable or throwing.** `localStorage` access throws in Safari
  private mode, on quota exhaustion, and when site data is disabled. Because
  this feature is attribution-only, a storage failure must never break logging
  in. All reads and writes are wrapped; on failure the store falls back to an
  in-memory object for the lifetime of the page and warns once.
- **Corrupt or unparseable stored JSON.** Treated as "no identity": `getIdentity()`
  returns `null` and the bad key is cleared.
- **Failed login.** Nothing is written, and any existing stored identity is left
  untouched. The error is reported to the user as validation errors are today.
- **Missing DOM elements.** The logout button handler is attached defensively so
  a page that includes `app.js` without the button does not throw.

## Testing

`node --test`, with `"scripts": { "test": "node --test" }` in the root
`package.json`. Tests live in `test/identity.test.js` and drive
`createIdentityStore(fakeStorage)` with a `Map`-backed fake, so no browser is
required. Coverage:

1. `setIdentity` then `getIdentity` round-trips the record.
2. `getUserId` returns the `userId`, and `null` when nothing is stored.
3. `clearIdentity` removes the record; subsequent reads return `null`.
4. Corrupt JSON under the key yields `null` and the key is cleared.
5. A storage object whose methods throw does not propagate: the store falls back
   to memory and remains usable.
6. The stubbed ID derivation is deterministic for the same username and carries
   the `stub:` prefix.

Manual verification: serve the directory over HTTP, log in, confirm the record
in `localStorage`, reload and confirm it persists, open a second tab and confirm
it reads, click "Log out" and confirm the key is gone.

## Out of Scope

- Gating, authorization, or any access-control behavior.
- Auth tokens and server-side enforcement.
- The real network call to `API_ENDPOINT`.
- Multi-user switching beyond logout-then-login.
- An analytics backend or any transport for the attribution log.
- Any change to `src/index.js` or `src/utils.js`.
- Linting and formatting infrastructure.
