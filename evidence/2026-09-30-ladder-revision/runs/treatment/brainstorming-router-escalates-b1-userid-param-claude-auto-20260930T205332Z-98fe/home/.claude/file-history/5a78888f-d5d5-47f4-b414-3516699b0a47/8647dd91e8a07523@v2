# Login Session userId — Design

Date: 2026-09-30
Status: Approved design, pending implementation plan
Branch: `feature/webapp-enhancement`

## Problem

The app needs to know which user logged in, and that identity must remain
available across the app for forms that do not exist yet.

The request as originally phrased was "add a `userId` parameter to the login
function." That phrasing does not survive contact with the code: `login()` has
one caller, the form submit handler, and nothing at that call site has a
`userId` to pass. The only identity available before login is the username.

Clarification established that the userId is issued by the server on
successful login. It is therefore an **output** of logging in, not an input to
it. A `userId` parameter would require the caller to already know the answer
that login exists to produce.

The real requirement is a small piece of shared state: login establishes a
userId, and later forms read it.

## Scope

In scope:

- A shared, `sessionStorage`-backed store for the logged-in userId.
- `login()` writing that store on success and clearing it on failure.
- Unit test infrastructure and lint/format tooling (see Global Constraints).

Out of scope, deliberately:

- Analytics or telemetry emission. "Track who logged in" resolved to storing
  and exposing the userId; no events are sent anywhere.
- A real call to `API_ENDPOINT`. `login()` stays a stub; the userId in its
  response is a clearly-marked placeholder for the server-issued value.
- Authentication, logout UI, session expiry, token handling.
- The unrelated Node code in `src/`.

## Decisions

Each of these was settled with the requester during brainstorming.

| Decision | Choice | Why |
|---|---|---|
| Where userId originates | Server issues it on successful login | It is login's output, not its input |
| Persistence | `sessionStorage` | Survives reloads and in-tab navigation; leaves no identifier on disk after the tab closes |
| Sharing mechanism | Classic script attaching `window.Session` | No build step exists; `index.html` must keep working when opened from `file://` |
| Who writes the store | `login()` itself | One writer, many readers; the write cannot be forgotten by a caller |
| Scope of "track" | Store and expose only | No analytics in this change |

`localStorage` was rejected: persisting an identifier on disk past the browser
session is a product decision about staying logged in, and would oblige a
clear-on-logout path this app has no logout to hang off.

A `Session.login()` facade was considered and rejected as premature — it
builds an auth surface for a second consumer that does not exist yet.

## Architecture

Three files. One is new.

### `session.js` (new)

A classic script loaded before `app.js`. An IIFE keeps the storage key and
fallback state private, matching the file-scope style already in `app.js`.

Public interface on `window.Session`:

```
getUserId()    -> string | null
setUserId(id)  -> void
clearUserId()  -> void
```

Storage key: `app.userId`, in `sessionStorage`.

The interface is three functions rather than a general key-value session bag.
There is one value today; a wider interface would guess at what later forms
need. Widening later is cheap, narrowing is not.

### `index.html`

One added line: `<script src="session.js"></script>` immediately before the
existing `app.js` tag. A classic script guarantees the ordering.

### `app.js`

`login()` keeps its exact existing signature, `login(username, password)`. It
gains no `userId` parameter. What changes is internal: its stubbed response
carries a `userId`, and it persists that value.

## Data flow

1. Submit handler reads username and password, runs `validateForm`
   (unchanged).
2. `login(username, password)` runs. Its stub response gains a `userId`
   field, marked in a comment as standing in for a server-issued value. The
   stub value is `` `u_${username}` `` — deterministic, so tests are not
   random, and visibly synthetic, so it is never mistaken for a real ID.
3. On success, `login()` calls `Session.setUserId(response.userId)`.
4. On failure, `login()` calls `Session.clearUserId()`, so a failed login
   cannot leave a previous user's ID readable by the next form.
5. Later forms call `Session.getUserId()` once `session.js` has loaded. They
   do not know storage exists.

The return value keeps `{ success, user }` and adds `userId`, so existing
readers do not break.

### Forward compatibility

When `login()` becomes asynchronous and actually calls `API_ENDPOINT`, it
returns a promise of the same response shape and step 3 moves inside the
resolution handler. Callers change once, at that point. This design does not
pre-build for it.

## Error handling

`sessionStorage` is not reliably available. Reading `window.sessionStorage`
can throw `SecurityError` when cookies are blocked or the page is sandboxed,
and `setItem` can throw `QuotaExceededError` in some private-browsing modes.
Because `index.html` must keep working when opened from disk, this is a live
path.

- **Probe once, wrap every access.** The store probes `sessionStorage` on load
  inside a try/catch. If unusable, it falls back to a module-private
  in-memory variable and emits a single `console.warn` at fallback time — not
  on every call.
- **Degraded mode is stated, not hidden.** In fallback, `Session` works for
  the life of the page but does not survive navigation. Login still works.
- **`getUserId()` never throws.** It returns `null` for absent, unreadable,
  and storage-unavailable alike, so callers have one condition to check and
  `null` always means nobody is logged in.
- **`setUserId()` refuses junk.** A non-string or empty id is rejected with a
  `console.warn` and not stored; it does not throw, and it leaves any
  previously stored value untouched. This prevents the string `"undefined"`
  being persisted and later read as a truthy ID for a user who never logged
  in.
- **Failed login clears**, per data flow step 4.

Existing `console.log` / `console.error` calls in the submit handler are left
as they are.

## Testing

`session.js` is the unit worth testing; its behavior is fully specified by the
error-handling rules above.

Cases:

- stores and returns an id
- returns `null` when nothing is stored
- refuses a non-string id
- refuses an empty-string id
- `clearUserId()` removes a stored id
- falls back cleanly when `sessionStorage` access throws, and `getUserId()`
  still returns `null` rather than propagating

The storage-unavailable case matters most: it is the one that manual clicking
never reaches.

Login integration is then two assertions: after a successful `login()`,
`Session.getUserId()` returns the response's userId; after a failed one, it
returns `null`.

## Global Constraints

These apply to every task in the implementation plan.

- **Unit tests:** vitest with jsdom. Adds two devDependencies and a `test`
  script to a project that currently declares none.
- **Lint and format:** biome. One devDependency, with a check script.
- **No end-to-end tests** and no mutation testing. Judged disproportionate for
  a two-field form.
- `index.html` must continue to work when opened directly from `file://`. No
  bundler, no `type="module"`, no build step.
- No new runtime dependencies. The added tooling is dev-only.
- `login()`'s signature does not change.
- Nothing in `src/` is touched.

## Assumptions

- Assumption: the server will return a userId field on successful
  authentication; validate via the API contract when `API_ENDPOINT` is
  actually wired up. Until then the stub's userId is a placeholder and is
  labeled as one in the code.
- Assumption: the "other forms" that will read the userId are pages in this
  same app, served from the same origin, so they share the `sessionStorage`
  partition; validate when the first such form is specified. A form on a
  different origin would not see the value.
