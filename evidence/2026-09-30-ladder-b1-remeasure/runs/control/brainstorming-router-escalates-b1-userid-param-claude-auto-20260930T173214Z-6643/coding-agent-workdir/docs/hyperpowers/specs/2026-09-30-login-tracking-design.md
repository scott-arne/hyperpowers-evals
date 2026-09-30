# Login Tracking Design

Date: 2026-09-30

## Problem

The original request was "add a `userId` parameter to the `login` function so we
can track who logged in." Investigation showed the literal change does not
deliver the stated goal:

- `login(username, password)` (`app.js:4`) has exactly one caller, the form
  submit handler at `app.js:17`. That handler reads `username` and `password`
  from DOM inputs. Nothing upstream knows a user ID, so a new parameter would
  have no value to receive.
- The stated outcome — tracking who logged in — has no destination. `login` is a
  stub that never contacts `API_ENDPOINT`; the only record of a login today is a
  `console.log` inside `login` itself.

The user ID is something the server produces during authentication, not
something the client supplies to it. A client-asserted `userId` passed into an
authentication call is also the shape that invites impersonation bugs later.

So the work is: put `userId` in `login`'s **return value**, and give the
tracking a place to live.

## Decisions

Each of these was confirmed with the human partner during brainstorming.

| Decision | Choice | Why |
|---|---|---|
| Where `userId` comes from | The server returns it | The server is what knows the ID; the client cannot be trusted to assert one. |
| `login` signature | **Unchanged** — no `userId` parameter | Follows from the above. The literal request was the wrong change. |
| Real `fetch` now? | No — stub stays synchronous, return shape fixed | Locks in the contract (the expensive-to-reverse part) without committing to a network layer and error strategy before the endpoint is known. |
| Tracking structure | A `trackLogin(event)` seam in its own module | The destination is an open question. A seam makes answering it a one-function change instead of another edit to the auth function. |
| Event fields | `userId`, `username`, `timestamp` | Who logged in, by both identifiers, and when. |
| Module system | ES modules | Only option where the seam is unit-testable; no build step, no globals. |
| `login` location | Extracted to `src/auth.mjs` | `app.js` runs `document.getElementById` at top level, so it throws on import. `login` is untestable while it lives there. |
| Tooling | Node's built-in `node:test` | Zero dependencies. Needed to test the seam at all. |

## Global Constraints

- **Unit tests are in scope.** Every new module ships with tests using
  `node:test` and `node:assert`, run via `npm test`. No third-party test
  dependency.
- Linting/formatting and end-to-end tests were considered and declined for now.
- No new runtime dependencies.

## Architecture

### Files

| File | Status | Responsibility |
|---|---|---|
| `src/tracking.mjs` | new | Owns the tracking destination. Exports `trackLogin(event)`. |
| `src/auth.mjs` | new | Owns authentication. Exports `login(username, password)`. |
| `app.js` | modified | DOM wiring only. Imports `login`, keeps `validateForm`. |
| `index.html` | modified | `<script src="app.js">` becomes `<script type="module" src="app.js">`. |
| `package.json` | modified | Adds a `test` script. |
| `test/tracking.test.mjs` | new | Tests for the seam. |
| `test/auth.test.mjs` | new | Tests for `login`. |

### Why `.mjs` and not `"type": "module"`

Setting `"type": "module"` in `package.json` would be the conventional move, but
it would break `src/utils.js` (`module.exports`) and `src/index.js` (`require`)
— the unrelated `greet` demo. Those files are not part of this work and should
not be rewritten for it.

Naming the new source and test files `.mjs` makes Node treat them as ES modules
regardless of `package.json`, leaving the existing CommonJS files untouched.
`app.js` stays `.js` because browsers honor the `type="module"` attribute rather
than the file extension, and no Node code imports it.

Known cost: a static server must serve `.mjs` with a JavaScript MIME type.
`npx serve` does. A server that does not will fail the import with a MIME type
error.

### Interfaces

```js
// src/tracking.mjs
/**
 * Record a login event. The single place that knows where tracking data goes.
 * Today: structured console output. Later: an analytics or audit endpoint.
 */
export function trackLogin(event) // event: { userId, username, timestamp }
```

```js
// src/auth.mjs
/**
 * Authenticate a user. Currently a stub; will POST to API_ENDPOINT later.
 * Returns the shape the real endpoint is expected to return.
 */
export function login(username, password, { track = trackLogin } = {})
// -> { success, userId, username }
```

### How the seam is observed in tests

`src/auth.mjs` imports `trackLogin` directly, so a test cannot see the call
without mocking the module — and `node:test`'s `mock.module()` is experimental
and needs a flag. Instead `login` takes an optional third argument defaulting to
the real seam, and tests pass a recording function.

This is dependency injection, not a second attempt at the rejected `userId`
parameter: it is an options object with a working default, invisible to the
production call site in `app.js`, which keeps calling `login(username,
password)`. It is also what lets the "tracking failure does not break login"
invariant be tested at all, by injecting a function that throws.

### The stub's `userId` value

`login` does not contact a server, so it has no real ID to return. It returns a
single clearly-fake constant:

```js
const STUB_USER_ID = "stub-user-id";
```

This is deliberate. A plausible-looking ID (a hash of the username, an
incrementing integer) would be mistaken for a real one and could reach a
tracking backend as if it were real. A constant that reads as fake cannot. It is
replaced when the `fetch` lands.

### Data flow

```
submit handler (app.js)
  -> validateForm({ username, password })
  -> login(username, password)            [src/auth.mjs]
       -> trackLogin({ userId, username, timestamp })   [src/tracking.mjs]
       -> returns { success, userId, username }
  -> handler logs the result
```

## Error handling

- **Tracking must never break authentication.** `login` wraps its `trackLogin`
  call in `try`/`catch`. A failure in tracking — today a console problem, later a
  dead analytics endpoint — must not turn a successful login into a failed one.
  The caught error is reported to `console.error` and swallowed.
- `trackLogin` does not validate its input. It is internal, has one caller, and
  the caller constructs the event.
- Form validation is unchanged: `validateForm` still short-circuits the submit
  handler before `login` is called.

## Testing

Using `node:test` and `node:assert`, run with `npm test`.

`src/tracking.mjs`:
- Emits an event containing the `userId`, `username`, and `timestamp` it is
  given. The test temporarily replaces `console.log` to capture the output and
  restores it afterward.

`src/auth.mjs`:
- `login` returns `success: true` and echoes back the `username`.
- `login` returns a `userId`.
- `login` calls the tracking seam once per successful login, with all three
  fields populated and a timestamp.
- A throwing tracking seam does not prevent `login` from returning successfully.

The last case is the one that matters most: it is the invariant that keeps a
tracking outage from becoming a login outage.

`app.js` is not unit-tested. It is DOM wiring, and end-to-end testing was
declined for now.

## Out of scope

Deliberately excluded, and why:

- **The real `fetch`.** Deferred by decision. The return shape is chosen so this
  becomes a contained change rather than a redesign — but note that making
  `login` async at that point *will* change its one caller.
- **Failed-login tracking.** The chosen event fields do not include
  success/failure, so `trackLogin` fires only on success. This means failed
  attempts are invisible, and credential-stuffing patterns will not show up in
  the data. Worth revisiting when a real destination exists.
- **Moving `validateForm`.** It is pure and would be easy to test, but it is not
  part of this request. Left in `app.js`.
- **Rewriting `src/utils.js` and `src/index.js`** to ES modules. Unrelated to
  this work.
- **Linting and formatting setup.** Considered and declined.

## Open question for the endpoint

When the real `fetch` is implemented, the response contract needs to be
confirmed: the field name carrying the user ID, and whether it is a string or a
number. `STUB_USER_ID` is a string; if the endpoint returns a number, the
tracking consumer will need to handle both or normalize at the boundary.
