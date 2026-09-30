# Persistent User Id — Design

Date: 2026-09-30
Status: approved in brainstorming; not yet planned

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Investigating the codebase showed the parameter has no
source: `login(username, password)` in `app.js` is called from exactly one
place — the `#login-form` submit handler — and that handler only has what the
user typed. A user id is something authentication *produces*, not something
its caller can supply.

The follow-up requirement settled the shape: the id must identify the actual
user (not the attempt), must persist, and must be readable by other forms that
do not exist yet. That is an identity store with a lifecycle, not a parameter.

## Decisions

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Id source | Server-issued at login, stubbed until a backend exists | Locally-minted anonymous id upgraded at login; local-only persistent id |
| Storage | `localStorage`, behind a single module | Cookie; `sessionStorage` |
| Retention | 30-day TTL, enforced on read | 7-day TTL; no expiry |
| Structure | Global singleton module (`identity.js`) | ES-module migration; event-driven pub/sub store |
| Tooling | `node:test` only, zero dependencies | `node:test` + Biome; no tooling |

The ES-module migration is a deliberate later step, not a rejected idea: the
single seam this design introduces is what makes that migration mechanical
once a second form exists. The pub/sub store was cut as YAGNI — one producer,
zero current consumers.

## Global Constraints

- Zero runtime dependencies. No bundler, no `node_modules`.
- Test infrastructure: Node's built-in `node --test`, via `npm test`.
- No linter or formatter is configured, by choice; match the existing style of
  `app.js` (two-space indent, double quotes, semicolons).
- Browser code stays classic `<script>`; `index.html` must keep working when
  opened directly from disk.
- `src/index.js` and `src/utils.js` are unrelated to the page and are not
  touched.
- Identity tracking must never break logging in. Every failure in the identity
  layer degrades to "no id", never to a thrown exception on the login path.

## Architecture

One new file, `identity.js`, at the repo root beside `app.js`. It is the only
code in the app that knows the id is stored at all.

```
createIdentity(storage, now) -> { get, set, clear }
```

The factory takes its storage and clock as arguments so it can be tested
without a browser. The browser singleton is a one-line binding at the bottom
of the file.

### Interface

- **`get() -> string | null`** — the stored id, or `null` when there is no
  record, the record is malformed, or it is past its TTL. Expired and
  malformed records are removed as a side effect of the read, so a bad value
  cannot persist and be re-parsed on every call.
- **`set(userId) -> void`** — writes the record stamped with the current time.
  If a record exists with a *different* id, it is cleared before the write, so
  nothing from the previous user survives. Re-setting the *same* id refreshes
  `storedAt`, so an active user does not expire mid-use.
- **`clear() -> void`** — removes the record. This is the hook a future logout
  calls. Nothing calls it in this change.

### Stored format

Single key `webapp:identity`, holding JSON:

```json
{ "v": 1, "userId": "...", "storedAt": 1759190400000 }
```

`v` costs nothing now and prevents a future format change from misreading old
records as valid. `storedAt` is an epoch-milliseconds timestamp; the TTL is
measured against it as `TTL_MS = 30 * 24 * 60 * 60 * 1000` (30 days), a named
constant in `identity.js`. A record is expired when
`now() - storedAt >= TTL_MS`. Expiry is enforced on read because a page that
may not be open cannot run a background timer.

### Changes to existing files

- **`app.js`** — `login` becomes `async` and returns
  `{ success, user, userId }`. The existing `user` field is retained so
  today's return-value consumers keep working. The stub id is
  `"stub-" + username`: the prefix makes its stub nature obvious in a console,
  and varying it by username is what makes the overwrite path manually
  exercisable. The submit handler `await`s `login` and calls
  `Identity.set(result.userId)` on success only. `validateForm` is unchanged.
- **`index.html`** — one added line, `<script src="identity.js"></script>`
  before `app.js`, so the global exists before the handler binds.
- **`package.json`** — add `"scripts": { "test": "node --test" }`.

### Dual export

```js
if (typeof localStorage !== "undefined") {
  globalThis.Identity = createIdentity(localStorage, Date.now);
}
if (typeof module !== "undefined") module.exports = { createIdentity };
```

The browser gets its global; Node gets the factory and never touches
`localStorage`. `package.json` has no `"type"` field and `src/` is already
CommonJS, so `require` is the consistent choice.

## Data flow

1. Page load: `identity.js` runs and defines `Identity`. Nothing is read at
   load time and no timer is started.
2. Submit: `preventDefault()`, read both inputs, run `validateForm`
   (unchanged).
3. If valid: `await login(username, password)` inside a `try`/`catch`.
4. On `success`: `Identity.set(result.userId)`, then the existing result log.
5. Later: any other form calls `Identity.get()` and receives the id or `null`.

`get()` has exactly two outcomes for any caller — a usable id, or `null`.
Future forms never have to handle a third case.

## Error handling

| Condition | Behavior |
|---|---|
| `login` returns `success: false` | Store nothing; leave any existing record untouched. A failed attempt is not evidence about who is at the keyboard. |
| `login` throws | Handler catches, logs, stores nothing. The stub cannot throw; the handling goes in now because a real network call will. |
| `localStorage` absent or throwing | `set` catches and warns via `console.warn`, at most once per page load (a module-level flag); `get` catches and returns `null` silently. Login still completes. |
| Unparseable JSON, missing `userId`, or unrecognized `v` | Treated as absent and removed on read. |
| `storedAt` in the future | Treated as invalid and removed. A future timestamp would otherwise never expire. |
| `set(null)` or `set("")` | Ignored with a warning rather than throwing. |

## Testing

`test/identity.test.js`, run with `npm test`. Doubles: an in-memory storage
object over a `Map`, a variant that throws on every call, and a mutable
`now()`. No DOM, no dependencies.

Cases:

- `get()` with nothing stored returns `null`; `set` then `get` round-trips.
- TTL boundary both sides: readable at 29 days, `null` at 31. The 31-day case
  also asserts the record was removed, not merely hidden.
- Re-setting the same id refreshes `storedAt`.
- `set("a")` then `set("b")`: `get()` is `"b"` and no trace of `"a"` remains.
- `clear()` removes the record.
- Malformed record, three cases: unparseable JSON, missing `userId`,
  unrecognized `v`. Each returns `null` and removes the record.
- Future `storedAt` returns `null` and removes the record.
- Throwing storage: `set` does not propagate; `get` returns `null`.
- `set(null)` and `set("")` write nothing.

### Not covered by automated tests

The submit handler, the `await`, and `<script>` ordering need a DOM, and a DOM
means a dependency this design declined. These are verified manually and must
be reported as manual, never as passing tests:

1. Open `index.html`, log in, confirm `webapp:identity` appears in devtools
   with the expected shape.
2. Log in as a different username; confirm the value is replaced, not
   duplicated.
3. Confirm the result still logs after the `async` change.

## Privacy and retention

The stored value is a persistent identifier linked to a real user, so it is a
tracking surface. What this design commits to:

- The id never leaves the browser in this change. There is no analytics sink
  and no transmission; storing it and sending it are separate decisions.
- Retention is bounded at 30 days, enforced on read.
- A clearing hook exists (`clear()`) for a future logout.

Assumption: this app is not currently subject to a consent requirement,
validate via the owner's privacy/compliance position before the id is
transmitted anywhere. If it is ever sent off-device it becomes personal data
under GDPR/CCPA, and consent plus a documented retention policy become
prerequisites rather than follow-ups.

## Out of scope

No analytics sink, no consent banner, no logout UI, no ES-module migration, no
changes to `src/`, and no real backend call. `API_ENDPOINT` remains unused, as
it is today.
