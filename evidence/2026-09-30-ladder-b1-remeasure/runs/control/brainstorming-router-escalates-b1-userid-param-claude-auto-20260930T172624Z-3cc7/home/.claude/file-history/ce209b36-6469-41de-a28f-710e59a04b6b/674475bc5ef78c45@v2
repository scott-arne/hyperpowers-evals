# Login Event Tracking — Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

The request that started this was "add a `userId` parameter to the login
function so we can track who logged in." Two facts make the parameter the
wrong deliverable on its own:

1. No `userId` value exists anywhere in the repository. The only call site
   (`app.js:23`) reads `username` and `password` from the form, so a new
   parameter would be dead at the only place `login` is called.
2. `login()` is what *establishes* identity. An id supplied by the caller
   arrives from the same untrusted form and cannot attest that anyone logged
   in.

The actual goal, confirmed with the human partner, is a tracking facility that
works across the app, persists, and is reusable by forms that do not exist
yet. That is a new subsystem, not a signature change.

## Scope

In scope: a shared, persistent event-tracking module; reshaping `login()` to
produce and record a user id; module wiring for the browser app; unit tests.

Out of scope: a backend endpoint (`API_ENDPOINT` stays an unused stub); real
authentication; tracking from the Node-side `src/` files (`localStorage` is
browser-only, and nothing in the browser loads `src/`); any form other than
the existing login form.

## Decisions

Each of these was chosen by the human partner during brainstorming.

| Decision | Choice |
|---|---|
| Persistence | `localStorage`, behind a swappable adapter |
| Identity source | The id returned by the login result |
| API shape | Generic `track()` core plus named helpers |
| Module wiring | ES modules |
| Data model | Bounded append-only event log |
| Tooling | Unit tests (no linter, no e2e) |

## Architecture

A single new ES module, `tracker.js`, at the repository root beside `app.js`.

### Public API

```js
export function track(eventName, data)  // record one event; returns nothing
export function trackLogin(userId)      // wrapper: track("login", { userId })
export function getEvents()             // returns the stored array (possibly empty)
export function clearEvents()           // removes all stored events
```

`track` is the engine. Future forms call it directly with their own event name
and payload; no edit to `tracker.js` is required to add a form. `trackLogin`
exists so the common call site reads clearly.

### Storage adapter

A module-private adapter is the only code that touches `localStorage`:

```js
const storage = {
  read() { /* parse JSON from the key, return [] on any problem */ },
  write(events) { /* serialize and persist */ },
};
```

This is the swap point. Replacing `localStorage` with a network backend later
changes this object and nothing else — no call site and no public signature
changes.

The adapter reads `globalThis.localStorage` at call time rather than capturing
it at module load. This is what makes the module testable under Node, where
tests assign a fake `globalThis.localStorage` before exercising `track`. No
test-only export is added to the public API.

### Storage format

- Key: `app.events`
- Value: a JSON array of event records
- Cap: 500 events. On overflow the oldest is dropped (FIFO).

Event record:

```js
{
  event: "login",
  timestamp: "2026-09-30T17:26:24.000Z",  // ISO 8601, from new Date().toISOString()
  data: { userId: "alice" }
}
```

Only these three fields are stored. `data` contains exactly what the caller
passed.

**The password is never recorded** — not in `data`, not in any other field, on
any code path.

## Data flow

1. The submit handler reads `username` and `password` from the form.
2. `validateForm` checks both are present.
3. On valid input, the handler calls `login(username, password)`.
4. `login` returns `{ success: true, userId }`.
5. On success, `login` itself calls `trackLogin(result.userId)`.
6. `trackLogin` calls `track("login", { userId })`.
7. `track` builds the record, appends it, applies the 500-event cap, and hands
   the array to the storage adapter.

Tracking lives **inside `login()`**, not in the submit handler, so every
successful login is recorded regardless of which caller initiated it. The
accepted cost is that `login` now depends on `tracker.js` rather than being a
self-contained stub.

## The `userId` placeholder

`login()` performs no network call. The only identity available is the typed
username, so `login` returns `{ success: true, userId: username }` with a
comment marking `userId` as the placeholder a real API response will replace.

The consequence, stated plainly: **until a real API returns an opaque id, the
value persisted to `localStorage` is a username** — an identity string
readable by any script running on the page. This was raised with the human
partner and accepted as a property of the stub. It resolves when `login`
becomes a real request against `API_ENDPOINT` and the server returns an opaque
id. No mitigation is built now; recording a username is the deliberate
consequence of tracking a stubbed login.

## Error handling

Tracking must never break login. `localStorage` throws under real conditions:
it is unavailable in some private-browsing modes (`SecurityError`) and throws
`QuotaExceededError` when full.

- Every storage read and write is wrapped. On failure, warn to the console and
  return normally.
- A failed `track()` is not a failed login. `track` never rethrows and never
  returns a value callers are expected to check.
- If the stored value is absent, unparseable, or not an array, `read()` treats
  it as an empty list rather than throwing. A corrupt key self-heals on the
  next write.
- `getEvents()` returns `[]` under all of the above conditions.

## Module wiring

`index.html` changes to `<script type="module" src="app.js"></script>`, and
`app.js` gains `import { trackLogin } from "./tracker.js";`.

**Consequence:** module scripts require an origin, so opening `index.html`
directly from disk over `file://` will stop working. The page must be served
(`python3 -m http.server`, `npx serve`, or equivalent). This is a real
regression in how the fixture is opened today and is accepted as the cost of a
genuine import seam.

The CommonJS files under `src/` are untouched. They are not loaded by the
browser and `localStorage` does not exist in Node, so they are outside this
subsystem.

## Testing

Unit tests only, using Node's built-in `node:test` runner — it ships with
Node, keeps the project at zero dependencies, and supports ES modules
natively. A `test` script is added to `package.json`.

Tests install a fake `globalThis.localStorage` (a small in-memory object with
`getItem`/`setItem`/`removeItem`) before each case.

Cases to cover:

- `trackLogin(id)` stores one record with `event: "login"` and the given
  `userId`.
- The stored record carries a parseable ISO-8601 `timestamp`.
- `track` appends rather than overwriting: two calls yield two records in call
  order.
- The 500-event cap holds: after 501 appends the array has 500 entries and the
  oldest is gone.
- `getEvents()` returns `[]` when nothing is stored.
- `getEvents()` returns `[]` when the key holds corrupt JSON, and does not
  throw.
- `getEvents()` returns `[]` when the key holds valid JSON that is not an
  array.
- A `setItem` that throws `QuotaExceededError` does not propagate out of
  `track`.
- A `getItem` that throws `SecurityError` does not propagate out of
  `getEvents`.
- `clearEvents()` empties the store.
- No stored record contains a password field on any path.

`login()` and the submit handler are not unit-tested: they depend on `document`
and the form, which is e2e territory the human partner declined.

## Files touched

| File | Change |
|---|---|
| `tracker.js` | New. The module described above. |
| `app.js` | Import `trackLogin`; reshape `login` to return `userId` and call `trackLogin` on success. |
| `index.html` | `<script>` becomes `type="module"`. |
| `package.json` | Add a `test` script. |
| `test/tracker.test.js` | New. The unit tests above. |

## Global Constraints

- Zero runtime dependencies. `node:test` is built in; nothing is added to
  `package.json` dependencies.
- No bundler, no transpiler, no build step.
- Passwords never enter stored events.
- `localStorage` is touched only through the storage adapter.
- Tracking failures never propagate to callers.
