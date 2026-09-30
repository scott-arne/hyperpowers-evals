# Login Session Identity — Design

Date: 2026-09-30
Status: approved for planning
Branch: `feature/webapp-enhancement`

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." Investigation showed the literal change is not implementable:
`login()` has one caller, the submit handler in `app.js`, and that handler has
only the two values the form collects (`username`, `password`). No user ID
exists anywhere upstream of `login()`, so there is nothing for a caller to pass.

Clarification established that the real requirement is broader than the original
phrasing: an identifier for the actual person/account, persisting across page
loads, reachable from other forms that do not exist yet. That is an identity
layer, not a parameter.

## Scope

In scope:

- A standalone session module owning current-user state.
- A stubbed account ID produced at the backend boundary.
- Persistence with expiry.
- Unit tests for the session logic.

Explicitly out of scope:

- Any UI change. No logout button, no signed-in indicator. `index.html` changes
  by exactly one attribute.
- Any real authentication. There is no backend; `API_ENDPOINT` remains
  aspirational and `login()` remains a stub.
- Changes to `src/index.js` or `src/utils.js`. They are unrelated to login and
  stay CommonJS, untouched.

## Security boundary

The stored record lives in `localStorage`: plain text, readable and editable by
anyone with devtools. It is suitable for labeling logs, prefilling forms, and
analytics. It is **not** evidence of identity and must never be used for
authorization. When a backend exists, every decision that matters must be made
from a server-verified token, not from this record.

The 7-day expiry exists so a shared or stolen machine is not indefinitely
"logged in" as someone. It is a usability-weighted default, not a security
control.

## Global constraints

- ES modules, no bundler, no build step.
- Zero runtime dependencies and zero dev dependencies. Tests use `node:test`,
  which ships with Node.
- The new module is `session.mjs`. The `.mjs` extension makes Node treat it as
  ESM without setting `"type": "module"` in `package.json`, which would break
  the CommonJS files under `src/`.
- `app.js` keeps its name. It is loaded only by the browser, never imported by
  Node, so it needs no extension change.

## Components

| File | Change | Responsibility |
|---|---|---|
| `session.mjs` | new | Current-user state: read, write, clear, expire. No DOM, no login knowledge. |
| `stub-user-id.mjs` | new | The fake account ID. Exists only until the API lands, then the file is deleted. |
| `app.js` | modified | `login()` returns a stubbed `userId`; submit handler writes the session. |
| `index.html` | modified | `<script type="module" src="app.js">` — one attribute. |
| `test/session.test.mjs` | new | Unit tests for `session.mjs`. |
| `test/stub-user-id.test.mjs` | new | Unit tests for `stubUserIdFor`. |
| `package.json` | modified | Adds `"scripts": { "test": "node --test" }`. |

Dependency direction: `session.mjs` and `stub-user-id.mjs` depend on nothing and
on each other not at all. `app.js` imports both. Nothing imports `app.js`. A
future form imports `session.mjs` directly and never touches `app.js`.

`stubUserIdFor` gets its own file rather than living inside `app.js` for two
reasons: `app.js` queries the DOM at load and so cannot be imported by a Node
test, and isolating the fake in one file makes its eventual deletion a single
`rm` plus one import removal.

## Interface

```js
export function createSession(storage = globalThis.localStorage, now = () => Date.now())
export const session = createSession()
```

`createSession` exists solely so tests can inject a fake storage and a fake
clock; expiry and record-versioning cannot otherwise be exercised outside a
browser. Application code imports the `session` singleton and ignores the
factory.

Methods:

- `get()` → `{ userId, username }`, or `null` when there is no valid session.
- `set({ userId, username })` → persists, stamping a fresh expiry.
- `clear()` → removes the record.

## Stored record

Key: `app.session`. Value:

```json
{ "version": 1, "userId": "u_1a2b3c4d", "username": "alice", "expiresAt": 1790000000000 }
```

`get()` returns `null` **and deletes the key** when the record is:

- absent,
- not parseable as JSON,
- of a `version` other than `1`,
- missing `userId`, `username`, or `expiresAt`,
- at or past `expiresAt`.

One uniform rule, so a stale, truncated, or hand-edited record can never surface
as a partially-populated user. Deleting on read keeps bad records from being
re-examined on every call.

`set()` writes `expiresAt = now() + SESSION_TTL_MS`, where `SESSION_TTL_MS` is 7
days as a named constant.

`version` is `1` and is checked rather than assumed. It is the affordance that
lets a future change to the record shape migrate or discard old records
deliberately, instead of guessing at what is already in users' browsers.

## Error handling

- **Storage unavailable.** `localStorage` access throws in Safari private
  browsing and when storage is disabled by policy. Every access is wrapped:
  `get()` returns `null`, `set()` and `clear()` warn once and do nothing.
  Unguarded, such a throw would propagate out of the submit handler and break
  login entirely; guarded, login still succeeds and only persistence is lost.
- **Failed login.** The session is written only when `result.success` is true.
  A failed attempt leaves any existing session untouched.
- **Corrupt or expired record.** Treated as logged out, per the `get()` rule
  above. Never an exception.

## The stubbed identifier

```js
import { stubUserIdFor } from "./stub-user-id.mjs";

function login(username, password) {
  // Stub: the real API will return the account id in its response.
  // Delete stub-user-id.mjs along with this stub.
  return { success: true, userId: stubUserIdFor(username), username };
}
```

`stubUserIdFor(username)`, exported from `stub-user-id.mjs`, is a small
deterministic hash rendered as `u_<hex>`.

Two properties matter and both are tested:

- **Stable** — the same username always yields the same ID. An identifier that
  changes per login is not an account identity, and any later form keyed on it
  would silently fragment one person into many.
- **Distinct** — different usernames yield different IDs.

The stub lives inside `login()`, at the backend boundary, and not inside
`session.mjs`. When the real `fetch` lands, one function changes and the session
module is untouched. Placing the fake in the session would create a second
source of truth to reconcile later.

### Return-shape change

`login()` currently returns `{ success: true, user: username }` and will return
`{ success: true, userId, username }`. The `user` key is renamed to `username`
for consistency with the session record. The sole caller is `app.js:23`, which
only logs the result. This is an in-repo interface change with no external
consumers.

The function signature `login(username, password)` is unchanged. No `userId`
parameter is added; see Problem above.

## Data flow

```
submit event
  -> validateForm({ username, password })
       invalid -> log validation error, stop
  -> login(username, password)
       -> { success, userId, username }
  -> success ? session.set({ userId, username }) : no-op
  -> (future forms) session.get() -> { userId, username } | null
```

## Testing

`node --test`, wired as `npm test`. A `Map`-backed fake storage and an injected
clock make every case deterministic.

Cases 1-7, 9 and 10 live in `test/session.test.mjs`; case 8 in
`test/stub-user-id.test.mjs`.

Cases:

1. `set()` then `get()` round-trips `userId` and `username`.
2. `get()` returns `null` once the clock passes `expiresAt`.
3. `get()` returns a session at exactly one millisecond before expiry
   (boundary).
4. `get()` returns `null` and removes the key on unparseable JSON.
5. `get()` returns `null` on a `version` other than `1`.
6. `get()` returns `null` on a record missing a required field.
7. `clear()` removes the record; a subsequent `get()` returns `null`.
8. `stubUserIdFor` is stable across calls for one username and distinct across
   usernames.
9. `set()` does not throw when the storage object throws on write.
10. `get()` returns `null` when the storage object throws on read.

Manual verification: serve the directory over HTTP, submit the form, confirm the
record appears in `localStorage` and that a reload followed by `session.get()`
in the console returns the user.

## Assumptions

- Assumption: the local static server used to open `index.html` serves `.mjs`
  with a JavaScript MIME type. Validate by serving the directory and loading the
  page; a MIME-type error in the console means the server needs an explicit
  mapping, or the module should be renamed to `.js` with `"type": "module"`
  handled per the alternative below.
- Assumption: `file://` access to `index.html` is not required. ES modules are
  fetched over HTTP and will not load from the filesystem. Validate by
  confirming no workflow depends on double-clicking the file.

## Rejected alternatives

- **A `userId` parameter on `login()`.** No caller has a value to supply. See
  Problem.
- **Client-generated correlation ID per attempt.** Identifies an attempt, not a
  person; fails the "identify the actual account" requirement.
- **Username as the identity, no new layer.** Satisfies the original wording but
  not persistence or reuse by later forms.
- **`sessionStorage`.** Cleared per tab, so a second tab is a different session.
  Contradicts the persistence requirement.
- **No expiry.** Adding expiry afterwards means every already-stored record
  lacks a timestamp, forcing either a mass logout or a permanent legacy branch.
- **Browser global via a second `<script>` tag.** Matches the existing
  convention but is not importable by tests, and future pages depend on script
  ordering rather than a written import.
- **Dual `window`/`module.exports` export.** Preserves `file://` and
  testability, at the cost of conditional-export boilerplate. Held as the
  fallback if the `.mjs` MIME assumption fails.
- **Setting `"type": "module"` in `package.json`.** Would break the CommonJS
  files under `src/`, requiring renames or a conversion of code unrelated to
  login.
- **Logout UI.** Deferred; the `clear()` API exists for it.
