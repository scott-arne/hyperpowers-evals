# Login Tracking Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

The application has no way to record who logged in. The request that started
this work was "add a `userId` parameter to the login function so we can track
who logged in," but clarification established that the actual requirement is a
tracking capability that persists to a backend and is reusable by other forms
in the app, not a parameter on one function.

The literal request is also not implementable as stated: `login` has a single
call site (the form submit handler in `app.js`), the form collects only a
username and a password, and no user id exists anywhere in the client at the
moment `login` is called. A user id is produced by authentication rather than
supplied to it.

## Requirements

1. Tracking events persist to a backend endpoint.
2. The capability is reusable — the login form is the first consumer, not the
   only one. Other forms will emit events later.
3. Identity is established once, at login, and attached to subsequent events
   automatically. Individual call sites do not plumb a user id.
4. Event delivery never blocks and never fails the user-facing action.
5. Delivery failures remain visible rather than silently swallowed.
6. The wire contract is defined here; no server implements it yet.
7. Failed logins carry no user id, so identity is optional throughout.

## Global Constraints

- **Unit tests are required.** Node's built-in `node:test` and `node:assert`.
  No test dependencies are added; the project stays zero-dependency. A `test`
  script is added to `package.json`.
- No linter or formatter is configured as part of this work.
- No end-to-end tests. No bundler, no build step.
- Browser code uses native ES modules.

## Current State

The repository is a minimal static webapp: `index.html`, `app.js`,
`package.json`, `README.md`, and an unrelated Node entry point in `src/`.

Facts relevant to this design:

- `login(username, password)` in `app.js` is a synchronous stub. It logs the
  username, performs no network call, and returns
  `{ success: true, user: username }`. It has no failure branch.
- `API_ENDPOINT` (`https://api.example.com/login`) is a placeholder and is
  never referenced.
- `app.js` is loaded by a plain `<script src="app.js">` tag and declares bare
  functions in global scope.
- `src/index.js` and `src/utils.js` are CommonJS and are not loaded by the
  page. They do not interact with `app.js` and are out of scope here.
- There is no session layer, user store, storage, or telemetry of any kind.

## Architecture

A single new ES module, `tracking.js`, holds the entire capability. `app.js`
becomes a module script and imports it.

This was chosen over two alternatives:

- **A global `Tracking` namespace loaded by a second script tag** matches the
  current style and needs no setup, but makes script load order load-bearing,
  couples call sites to an ambient global, and cannot be unit tested without a
  fake DOM. Rejected because the interface every future form will depend on
  should be an explicit import and should be testable.
- **A decoupled event bus**, where forms dispatch domain events and a tracking
  subscriber translates them, gives maximum decoupling but adds indirection
  that is hard to trace and fails silently when nothing is listening. Rejected
  as premature at one producer and one consumer.

The cost of native ES modules is that module scripts do not load over
`file://`. Opening `index.html` directly stops working; the page must be
served over local HTTP.

## Components

### `tracking.js` (new)

The complete public surface:

```js
export function identify(userId)          // record the current user
export function reset()                   // clear identity (logout)
export function track(eventName, props)   // emit an event
```

**Endpoint.** `TRACKING_ENDPOINT` is a module-level constant in `tracking.js`,
alongside the existing `API_ENDPOINT` placeholder convention in `app.js`. Its
value is a placeholder until the server exists.

**Identity state.** One module-scoped variable holds the current user id,
initialized to `null`. `identify` and `reset` are its only writers. `track`
only reads it. Keeping the write surface to two functions is what makes the
module-level mutable state acceptable.

`identify` and `reset` only mutate that variable. Neither sends a request, so
`login_succeeded` is the only thing on the wire at login time.

**`track` is total.** It never throws and never returns a rejected promise, so
no call site needs a `try`. It returns synchronously without awaiting
delivery.

**Transport.** `fetch` with `keepalive: true`, so the request survives the page
navigation that typically follows a login. Without `keepalive`, the event of
greatest interest is the one most likely to be cancelled.

`fetch` is resolved from `globalThis` at call time rather than captured at
import time, so tests substitute a fake without dependency-injection plumbing.
This is a deliberate testability requirement, not incidental.

**No retry and no queue.** Consistent with the fire-and-forget decision below.

### `app.js` (modified)

- Becomes an ES module and imports `identify` and `track` from `tracking.js`.
- `login` emits the tracking calls itself, rather than the submit handler doing
  it. The requirement is that every login is recorded; placing the calls in the
  caller would make that depend on each caller remembering. The accepted cost
  is that `login` is no longer purely authentication.
- `login` remains synchronous. Converting it to async is an authentication
  change, not a tracking change, and `track` is never awaited. This should be
  revisited when the real auth endpoint is implemented.
- The stub's return value gains a `userId` field, standing in for what a real
  authentication response would carry.

### `index.html` (modified)

The script tag gains `type="module"`.

### `README.md` (modified)

Documents that the page must now be served over local HTTP, e.g.
`python3 -m http.server`.

## Wire Contract

No server implements this yet. This design defines it; the server-side
implementation is separate work outside this repository, and until it exists
the client has nothing to talk to.

```
POST <TRACKING_ENDPOINT>
Content-Type: application/json

{
  "event": "login_succeeded",
  "occurredAt": "2026-09-30T17:56:19.000Z",
  "userId": "u_123",
  "properties": { "username": "alice" }
}
```

Expected response: `202 Accepted`, body ignored.

Field notes:

- `userId` is `null` rather than omitted when identity is unknown, so the
  server schema has exactly one shape.
- `occurredAt` is set by the client, in ISO 8601. `keepalive` requests can
  arrive late, which makes server receipt time an unreliable event time.
- There is no idempotency key. With fire-and-forget delivery and no retry,
  there are no duplicates to guard against.

## Events

| Event | `userId` | `properties` |
|---|---|---|
| `login_succeeded` | the authenticated user id | `{ username }` |
| `login_failed` | `null` | `{ username, reason }` |

`login_failed` is why identity is optional throughout the schema: a failed
authentication produces no user id, so the attempted username is the only
available attribution.

Note that the current `login` stub has no failure branch, so `login_failed`
becomes reachable only once real authentication exists. It is specified now so
the schema does not have to change later.

## Data Flow

1. Submit handler reads username and password, calls `validateForm`.
2. On invalid input, the existing error path runs. No tracking event.
3. On valid input, the handler calls `login(username, password)`.
4. `login` authenticates (currently stubbed) and obtains a user id.
5. On success, `login` calls `identify(userId)` then
   `track('login_succeeded', { username })`.
6. On failure, `login` calls `track('login_failed', { username, reason })`
   and does not call `identify`.
7. `login` returns to the handler. Neither tracking call is awaited, so
   nothing about step 7 depends on delivery.

## Error Handling

Every failure path ends in a `console.error` prefixed `[tracking]`, and no
failure path propagates to the caller:

| Failure | Behavior |
|---|---|
| Network rejection | Caught, logged, event dropped |
| Non-2xx response | Logged with status, event dropped |
| Missing or empty event name | Logged, event dropped, nothing sent |

**Known limitation, accepted.** Fire-and-forget delivery with console-only
reporting means event loss is visible only to someone with devtools open,
which in production is nobody. The data will have gaps that cannot be
measured. This is the accepted cost of never blocking login, and should be
revisited only if the data becomes compliance-relevant — at which point a
local buffer with retry, deliberately rejected here as premature, becomes the
right answer.

## Testing

Unit tests for `tracking.js` using `node:test` and `node:assert`, run via a
`test` script in `package.json`. Tests substitute `globalThis.fetch` with a
fake and restore it afterward.

Cases:

1. `identify` then `track` sends the recorded `userId`.
2. `track` without a prior `identify` sends `userId: null`.
3. `reset` clears identity; a subsequent `track` sends `userId: null`.
4. The request body carries the event name, an ISO 8601 `occurredAt`, and the
   supplied properties.
5. The request is issued with `keepalive: true`.
6. A non-2xx response is logged and does not throw.
7. A rejected `fetch` is logged and does not throw.
8. `track` returns synchronously and does not block on the response.
9. An empty or missing event name sends nothing and does not throw.

The DOM wiring in `app.js` is not unit tested; it requires a browser
environment, and keeping all logic in `tracking.js` is what keeps that
untested surface trivial.

## Out of Scope

- Implementing the tracking endpoint. It does not exist.
- Implementing real authentication, or the login POST to `API_ENDPOINT`.
- Converting `src/` from CommonJS to ES modules. The repository mixes module
  conventions and this design adds a third; unifying is a worthwhile two-file
  change but is unrelated to tracking.
- Session management, logout UI, and any second consumer of `track`. The
  interface is designed for reuse; wiring additional forms is later work.
- Retry, local buffering, and offline delivery.
