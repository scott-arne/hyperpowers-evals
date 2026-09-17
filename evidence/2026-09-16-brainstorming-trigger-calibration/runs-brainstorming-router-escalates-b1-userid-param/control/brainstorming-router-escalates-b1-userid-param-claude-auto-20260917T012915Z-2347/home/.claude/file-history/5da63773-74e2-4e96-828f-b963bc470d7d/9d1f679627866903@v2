# User Identity Tracking — Design

Date: 2026-09-16
Status: Awaiting review

## Problem

The webapp has no notion of who is using it. `login()` in `app.js` logs the
submitted username and returns `{ success, user }`; nothing outside that
function can tell which user a subsequent action belongs to. The request is
to attach a user identifier to logged activity so login events can be
attributed.

The original framing — "add a `userId` parameter to the login function" —
does not survive contact with the answers below. The identifier is issued by
the server during authentication, so it cannot be an input to the function
that authenticates. It is a return value, and the parameter belongs on the
tracking calls that consume it. See Decisions.

## Scope

In scope: a shared browser-side holder for the authenticated user's id, a
tracking helper that stamps that id onto console output, and the wiring of
the existing login flow into both.

Out of scope: real authentication against `API_ENDPOINT`, a logout UI, any
network telemetry sink, an in-app audit trail, and any second page or form
(the design must accommodate one, not build one).

## Decisions

Each of these was chosen by the project owner during brainstorming.

| Decision | Choice | Consequence |
|---|---|---|
| Identifier kind | Server-issued, post-authentication | Cannot be a `login()` parameter; it is a `login()` return value |
| Persistence | `sessionStorage` | Survives reload and in-tab navigation; cleared on tab close; no stale-user attribution across people sharing a machine |
| Tracking sink | `console` only | No event schema, no endpoint, no retry policy |
| Module style | Classic `<script>` + one global per module | Matches `index.html`'s existing loading pattern; no bundler; `file://` keeps working |
| Structure | Session store plus a separate tracking facade | A future form gets correct attribution by default rather than by remembering |
| Tooling | `node:test` unit tests only | No linter, no formatter, no end-to-end suite |

**`login()` keeps its signature.** `login(username, password)` is unchanged.
No `userId` parameter is added to it. This is the direct consequence of the
identifier being server-issued: the id does not exist until `login` has run.
This was raised explicitly during design and accepted.

## Architecture

Two new files, two changed files. No dependencies are added and no build
step is introduced.

### `session.js` (new)

The only code in the app that touches storage. Exposes a single global,
`AppSession`:

- `setUserId(id)` — persist the server-issued id. A `null` or `undefined`
  argument is ignored and leaves any existing value intact; the guard lives
  here rather than at each call site.
- `getUserId()` — the id, or `null` when nobody is logged in
- `clear()` — remove it

The storage key is `app.userId` and the mechanism is `sessionStorage`. Both
are named in this file and nowhere else, which is what keeps the persistence
decision reversible.

### `tracker.js` (new)

The only code that emits user-attributable console output. Exposes
`Tracker.log(event, detail)`, which reads the current id from `AppSession`
and stamps it onto the line, using `anonymous` when there is none. `event` is
a required string; `detail` is an optional object that defaults to empty.
Call sites
pass an event name and a detail object; they never pass a userId, so they
cannot omit one, and they never format the line, so the format cannot drift
between pages.

### `index.html` (changed)

Two script tags added before `app.js`, in dependency order: `session.js`,
then `tracker.js`, then `app.js`. All remain classic scripts.

### `app.js` (changed)

`login()` returns the user id alongside its existing fields. The submit
handler passes that id to `AppSession` and then calls `Tracker.log`.
`validateForm` and the validation-failure branch are untouched.

## Data flow

1. The submit handler reads the username and password fields and calls
   `validateForm` — unchanged behavior.
2. On valid input, `login(username, password)` returns
   `{ success: true, user: username, userId: <id> }`.
3. The handler calls `AppSession.setUserId(result.userId)`, then
   `Tracker.log("login", { username })`.
4. The console shows a line carrying both the event and the id, e.g.
   `[login] { userId: "stub-alice", username: "alice" }`.
5. A future page includes the two scripts and calls `Tracker.log(...)`, or
   `AppSession.getUserId()` when it needs the raw value. It does not touch
   `sessionStorage` directly.

The invalid-input branch keeps its existing `console.error`. A failed field
validation is not a login and has no user to attribute; routing it through
the tracker would widen scope without serving the goal.

## Assumptions

Assumption: no server issues a user id today — `login()` is a stub that never
calls `API_ENDPOINT` and the response contract is therefore unknown. The stub
will synthesize a deterministic placeholder of the form `stub-<username>` so
the flow is observable end to end. Validate via the real login API's response
body once that call is implemented; at that point `login()` reads the id from
the response instead of synthesizing it, and neither `session.js` nor
`tracker.js` changes.

Assumption: the identifier is an opaque string. Nothing in this design parses,
validates, or derives meaning from its contents. Validate via the real API
response shape when it lands.

## Error handling

The governing rule: tracking must never break login.

- **Storage unavailable.** `sessionStorage` access throws in Safari private
  browsing and when site data is disabled. `session.js` catches and falls
  back to a module-level in-memory value. Tracking degrades to the current
  page load; the login flow is unaffected. This same fallback lets the
  modules run under `node:test` without a DOM.
- **Login failed, or no id returned.** The store is left untouched rather
  than being overwritten with `undefined`. `getUserId()` returns `null` and
  the tracker logs `anonymous`.
- **`AppSession` absent.** If a future page loads `tracker.js` without
  `session.js`, `Tracker.log` logs `anonymous` instead of throwing a
  `ReferenceError` into that page's handler. A miswired page should produce a
  degraded log line, not a broken form.

No new exceptions are introduced by this design.

## Testing

Unit tests run under `node:test`. `package.json` gains one script:
`"test": "node --test"`. No dependencies are added.

Because `session.js` and `tracker.js` are classic browser scripts with no
`module.exports`, tests load each file into a `node:vm` sandbox supplying a
fake `window` and a fake `sessionStorage`, then assert against the globals the
file defines. This exercises the files exactly as the browser loads them and
keeps test-only boilerplate out of production code. The shared loader is a
few lines in a test helper.

`test/session.test.js`:

- set then get round-trips the id
- `getUserId()` is `null` before any login
- `clear()` removes the id
- the value is stored under the key `app.userId`
- when `sessionStorage` throws on access, set and get still work via the
  in-memory fallback

`test/tracker.test.js`, with `console.log` captured:

- the current userId is stamped onto the logged line
- `anonymous` is logged when no one is logged in
- `anonymous` is logged, without throwing, when `AppSession` is absent
- the event name and the `detail` object both reach the output

**Known coverage gap.** `app.js` has no unit test. It calls
`getElementById` at top level and registers a submit listener on load, so
testing it requires a DOM shim — the end-to-end option, which was considered
and declined. Verification of the wiring is manual: open `index.html`, submit
the login form, and confirm the console line carries the id. The wiring is
where this change is most likely to break, so this gap is stated rather than
papered over.

## Global constraints

These apply to every task in the implementation plan derived from this spec.

- Unit-test infrastructure (`node:test`, a `test` script, and passing tests)
  is part of the work, not a follow-up.
- No third-party dependencies, no bundler, and no build step.
- The app must remain openable directly from the filesystem (`file://`).
- Browser code stays classic scripts; no `type="module"`, no CommonJS in
  browser-loaded files.
- `sessionStorage` is accessed only from `session.js`.
- `console` output for user-attributable events goes only through
  `tracker.js`.
- Existing `validateForm` behavior and the validation-failure branch are
  preserved.
