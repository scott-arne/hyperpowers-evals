# Login Event Tracking — Design

Date: 2026-09-30
Status: Approved (pending final spec review)

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Two things in that request have nowhere to land in this
repository:

1. **There is no tracking of any kind.** The only observability in `app.js` is
   `console.log`. There is no log sink, no analytics, no storage.
2. **There is no `userId` available at the call site.** The submit handler
   reads exactly two values from the DOM, `username` and `password`, both
   typed by the user. `login()` already receives `username`.

Resolving the second point changed the shape of the change: in a real auth
flow the canonical user ID is established by the server *after* credentials
are verified, so it is an **output** of `login()`, not an input. A
caller-supplied `userId` parameter cannot be filled by anyone, and it cannot
describe a *failed* login at all, because a failed login has no verified user.

The work is therefore not "add a parameter." It is: build a small persistent,
app-wide event-tracking module, and record login outcomes through it.

## Goals

- Record successful logins with the authenticated user's ID.
- Record failed login attempts, correlated by a persistent client device ID.
- Persist events across page loads.
- Be reusable by other forms in the app, not login-specific plumbing.
- Keep the storage backend swappable without changing call sites.

## Non-Goals

- No backend service, no API contract for event ingestion. Events stay
  client-side for now.
- No analytics vendor integration.
- No dashboard or query interface over collected events.
- No changes to `src/index.js` or `src/utils.js` (an unrelated greeting demo).
- No trustworthy audit trail. See "Security Note" below.

## Decisions

Settled with the human partner during brainstorming:

| # | Decision | Rejected alternatives |
|---|---|---|
| 1 | A local tracking module in this repo, as a seam that can later point at an API or analytics tool | Console-only logging; posting directly to a backend |
| 2 | Persist to `localStorage`, but expose a promise-returning API so the storage layer can be replaced without touching call sites | IndexedDB now; backend endpoint with local buffer now |
| 3 | Authenticated identity is an **output** of `login()`; a persistent client-generated device ID is the value available at call time, and it makes failed attempts trackable | Caller supplies `userId` from session/SSO; `userId` is just the username |
| 4 | Approach 1 — explicit tracker module with a pluggable storage adapter | Pub/sub event bus with registered sinks; generic instrumentation wrapper |
| 5 | Switch `index.html` to `<script type="module">` and use ES-module imports | Exposing a `window.Tracking` global via a second script tag |
| 6 | `login()` becomes `async` | Keeping it synchronous with fire-and-forget tracking |

Approach 2 (event bus) was rejected as YAGNI: there is exactly one sink today,
and a second one is one function call away if it is ever needed. Approach 3
(wrapper) was rejected because the event payload depends on `login()`'s
result, which a generic wrapper cannot reach without a per-call extractor that
reintroduces the complexity it was meant to remove.

## Global Constraints

These apply to every task in the implementation plan.

- **Unit tests are required** for the tracking module, using the built-in
  `node:test` runner. No new runtime or dev dependencies; `node:test` ships
  with Node. A `test` script is added to `package.json`.
- **No linter, formatter, or end-to-end test infrastructure** is set up. The
  human partner explicitly selected unit tests only.
- **No third-party dependencies.** The repo has none today and this work adds
  none.
- **Passwords must never appear in an event payload**, in any field, ever.
- **Tracking must never break the application.** See "Error Handling".

## Architecture

One new module, `src/tracking.js`, written as an ES module.

```
index.html
  └─ <script type="module" src="app.js">
       app.js
         ├─ login()          async; records login.succeeded / login.failed
         ├─ validateForm()   unchanged
         └─ submit handler   awaits login()
              │
              └─ imports  src/tracking.js
                            ├─ track() / getEvents() / clearEvents()
                            ├─ getDeviceId()
                            └─ storage adapter  ── localStorage (default)
                                                └─ injectable for tests
```

Note the existing module-system split: `src/index.js` and `src/utils.js` use
CommonJS for a Node demo, while `app.js` is browser code. `src/tracking.js`
is an ES module used by the browser side. The CommonJS files are not touched
and do not import it.

### Public API

```js
track(eventName, props)  // -> Promise<void>; never rejects
getDeviceId()            // -> Promise<string>; lazily creates and persists
getEvents()              // -> Promise<Event[]>
clearEvents()            // -> Promise<void>
```

Every function is promise-returning even though the `localStorage` backend is
synchronous. This is deliberate: it is what allows IndexedDB or a network
backend to be substituted later without changing a single call site.

### Storage adapter

```js
{ read()          // -> Promise<Event[]>
  write(events) } // -> Promise<void>
```

The default implementation is backed by `localStorage`. The module accepts an
alternative adapter so unit tests can run under Node, where `localStorage`
does not exist. This injectability is a testability requirement, not
speculative generality.

## Data Model

```js
{
  v: 1,
  name: "login.succeeded",
  ts: "2026-09-30T17:55:43.000Z",
  deviceId: "9f1c…",
  props: { userId: "…" }
}
```

- `v` — schema version. Present from day one so a later format change can
  migrate or discard old records instead of crashing while reading them.
- `name` — dotted event name. Login uses `login.succeeded` and `login.failed`.
- `ts` — ISO 8601 timestamp, UTC.
- `deviceId` — stable per browser profile; see below.
- `props` — event-specific payload.

`localStorage` keys:

- `tracking.events` — JSON array of events.
- `tracking.deviceId` — the device ID string.

### Device ID

Generated on first use, persisted, then stable for that browser profile.
`crypto.randomUUID()` is the generator, with one caveat: it is only available
in a secure context, so it is absent on plain `http://` outside `localhost`.
The module falls back to a random string built from `crypto.getRandomValues`
when `randomUUID` is unavailable.

The device ID is **not** an identity. It is a correlation key that lets a
sequence of failed attempts followed by a success be recognised as one actor.

### Retention and quota

`localStorage` holds roughly 5MB and *will* throw `QuotaExceededError` in
practice. The event list is a capped ring buffer:

- Maximum 500 events; appending past the cap drops the oldest.
- On `QuotaExceededError` during a write: drop the oldest half of the buffer
  and retry the write once.
- If the retry also fails: emit a `console.warn` and continue. The event is
  lost. Losing an analytics event is strictly better than breaking login.

Malformed or unparseable stored data is treated as an empty event list rather
than an error.

## Login Integration

```js
async function login(username, password) {
  // Stub: would POST to API_ENDPOINT in a real app.
  const result = { success: true, user: username, userId: `stub-${username}` };
  if (result.success) {
    await track("login.succeeded", { userId: result.userId });
  } else {
    await track("login.failed", { username });
  }
  return result;
}
```

The stub result stays inline in `login()` exactly as it is today. No
`authenticate()` helper is extracted — that split belongs to the change that
introduces real authentication, not to this one.

Tracking lives **inside** `login()` rather than in the submit handler, so
every caller records events consistently without having to remember to.

The submit handler gains a single `await` on the `login()` call and becomes an
`async` callback.

### Known gaps in the current stub

These are limitations of the existing fixture, not of the design, and they are
recorded here so nobody mistakes them for finished work:

1. `login()` currently returns a hardcoded `{ success: true, user: username }`
   with **no `userId` field**. It will also return `userId: \`stub-${username}\``
   — deliberately prefixed so a stub value is never mistaken for a real
   identity in collected data — so that `login.succeeded` does not record
   `undefined`. The real value arrives when `API_ENDPOINT` is actually called.
2. The stub **always succeeds**, so the `login.failed` path is unreachable
   end-to-end until real authentication exists. It is implemented and unit
   tested, but it will not be exercised by using the form.

## Files Changed

| File | Change |
|---|---|
| `src/tracking.js` | New. The tracking module and its `localStorage` adapter. |
| `test/tracking.test.js` | New. `node:test` unit tests. |
| `app.js` | `login()` becomes async and records events; submit handler awaits it; imports the tracking module. |
| `index.html` | `<script src="app.js">` becomes `<script type="module" src="app.js">`. |
| `package.json` | Adds a `test` script. |

`src/index.js` and `src/utils.js` are not touched.

## Error Handling

The load-bearing rule: **tracking failures never break the application.**

- `track()` catches everything internally and always resolves. It never
  rejects and never throws.
- Failures surface as `console.warn`, nothing more.
- Callers `await track()` for ordering — so the write completes before
  subsequent work or navigation — not for error handling.
- A `localStorage` that is entirely unavailable (private browsing modes,
  disabled storage) degrades to no-op writes with a single warning, not a
  crash.

## Testing

Unit tests with `node:test`, run via a new `npm test` script. The tracking
module is tested against an injected in-memory storage adapter, so no browser
and no `localStorage` shim are required.

Coverage:

- `track()` appends a well-formed event with `v`, `name`, `ts`, `deviceId`.
- Device ID is generated once and reused across calls.
- Device ID falls back correctly when `crypto.randomUUID` is unavailable.
- Ring buffer caps at 500 events and drops the oldest.
- `QuotaExceededError` triggers the drop-half-and-retry path.
- A write that fails even after retry warns and does not throw.
- Corrupt stored JSON reads back as an empty list.
- `track()` never rejects, even when the adapter throws on every call.
- `login()` records `login.succeeded` with the result's `userId`.
- `login()` records `login.failed` on an unsuccessful result.
- No event payload ever contains the password.

The browser-side wiring in `app.js` and `index.html` is verified manually;
there is no end-to-end harness, by decision.

## Security Note

Client-side storage is **not** an audit trail. Events live in `localStorage`,
which the user controls completely: they can read, edit, forge, or clear it
at will. This design is suitable for debugging and product analytics.

It is **not** suitable for security or compliance purposes. If the reason for
tracking logins is ever "we need to know who accessed an account," that
requires server-side recording, and this module is the wrong tool. The
swappable storage adapter is the intended migration path.
