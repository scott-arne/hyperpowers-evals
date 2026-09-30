# Login User Tracking — Design

Date: 2026-09-30
Status: Approved (design), pending implementation plan

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Taken literally that is a signature edit, but the
codebase does not support it:

- `login(username, password)` in `app.js` is a stub. It logs to the console
  and returns a hardcoded `{ success: true, user: username }`.
- Nothing in the current flow knows a user ID at the point `login()` is
  called. The form collects a username and a password and nothing else. A
  caller-supplied `userId` would have no source and would be `undefined` in
  practice.
- There is no tracking, analytics, or logging layer. `console.log` is the
  only destination that exists, and it does not survive a page close.

So the stated outcome — knowing who logged in — needs a source of identity
and a place to record it. Neither exists yet.

## Decisions

Resolved with the requester during brainstorming:

1. **The user ID comes from the server, not the caller.** `login()` keeps its
   `(username, password)` signature; `userId` appears in the *return value*.
   Identity is what authentication establishes; it is not known beforehand. A
   caller-supplied ID would record who *claimed* to log in, which `username`
   already covers.
2. **Events go through a thin tracking seam**, a new `trackEvent` function,
   rather than a bare `console.log` or a real backend POST. Console today,
   swappable later without touching call sites.
3. **`login()` stays a stub.** No network call in this change.
   `https://api.example.com/login` is a placeholder domain that does not
   resolve, so a real `fetch` would trade working code with fake data for
   code that cannot run at all. The real request is a separate change.
4. **Unit tests via `node:test`.** Zero new dependencies. No linting and no
   end-to-end tests in this change.

## Constraint: two module systems

`index.html:13` loads `app.js` with a classic `<script src="app.js">` tag —
no `type="module"`. Meanwhile `src/index.js` and `src/utils.js` are CommonJS
Node modules. `app.js` cannot `require()` anything under `src/`, so the
tracking module cannot live there beside `utils.js`.

ES modules were considered and rejected: they are blocked by CORS over
`file://`, which would stop `index.html` opening directly from disk. This app
has no server and no build step. The decision is cheap to reverse if a
bundler is added later.

Decision: `tracking.js` lives at the repo root next to `app.js` and is loaded
by its own `<script>` tag ahead of `app.js`.

## Components

### `tracking.js` (new, repo root)

Single responsibility: accept a named event with a payload and emit it.

Public interface, and the entire public surface:

```
trackEvent(eventName, payload) -> void
```

Callers never learn the destination. The current implementation writes to
`console.log` with a `[track]` prefix. Repointing it at a real backend is a
change confined to this one function.

The module must be loadable from both the browser and Node (tests run under
Node). It assigns to `module.exports` when a CommonJS `module` is present and
to a `Tracking` global otherwise. This dual export exists solely so the same
file is testable and browser-loadable without a build step.

### `app.js` (modified)

`login(username, password)` — signature unchanged.

- The stub response gains a `userId`, deliberately prefixed `stub-` so fake
  IDs are visibly fake in logs and cannot be mistaken for real ones once the
  network call lands.
- On a successful login, `login()` calls `trackEvent("login", { userId,
  username })`.

The tracking call lives inside `login()` rather than in the submit handler:
`login()` is the only place that knows the auth outcome, and a caller that
forgets to track is a silent gap. The cost is that `login` does two things
now, which is acceptable because it is coupled only to a one-function
interface.

`login()` resolves the tracker through a small `getTracker()` helper that
prefers a `Tracking` global and falls back to `require("./tracking")` under
Node. Tests substitute a spy by setting the global, so they never touch
`require`.

The DOM wiring at the bottom of `app.js` must be guarded with a
`typeof document !== "undefined"` check. Without it, importing `app.js` under
Node crashes on `document.getElementById`, and the unit tests cannot run.

`app.js` exports `{ login, validateForm }` when a CommonJS `module` is
present, mirroring `tracking.js`.

### `index.html` (modified)

One added line: `<script src="tracking.js">` before the existing `app.js`
tag. Load order matters — `app.js` resolves the tracker lazily inside
`login()`, but the script tag order keeps the dependency obvious.

### `package.json` (modified)

Add a `scripts.test` entry invoking `node --test`. No dependencies added.

## Data flow

```
submit
  -> validateForm({username, password})
  -> login(username, password)
       -> stub auth, mints stub-<username>
       -> trackEvent("login", {userId, username})
       -> returns {success, user, userId}
  -> submit handler logs the result (now carrying userId)
```

The existing submit handler needs no change. It already logs the whole
result object.

## Error handling

`trackEvent` must never break login. The call inside `login()` is wrapped in
`try`/`catch` that swallows the error and emits a `console.warn`. Tracking is
diagnostic; a broken analytics call must not fail an authentication that
otherwise succeeded. This matters more once a real network POST sits behind
the seam.

Existing validation behavior is unchanged: a form missing a username or a
password is rejected before `login()` is reached, so no tracking event fires
for it.

## Testing

Runner: `node:test` with `node:assert`, invoked by `npm test`. No
dependencies.

Cases:

1. `login()` returns a `userId` on success.
2. The returned `userId` carries the `stub-` prefix.
3. A successful login emits exactly one `login` event whose payload contains
   both the `userId` and the `username`.
4. The emitted `userId` matches the one in the return value.
5. A `trackEvent` that throws does not prevent `login()` from returning its
   normal successful result.
6. `validateForm` still rejects a missing username and a missing password.

Tests install a spy by assigning to the `Tracking` global before requiring
`app.js`, and restore it afterward.

Manual check: open `index.html` in a browser, submit the form, and confirm
the console shows the `[track] login` line with a `userId`.

## Out of scope

- The real `fetch` to `API_ENDPOINT`, and the async and failure semantics it
  brings.
- Any real analytics or logging backend, and the privacy questions that come
  with storing user identifiers.
- Linting, formatting, and end-to-end tests.
- Client-generated correlation IDs spanning the pre-authentication window.
- Any change to `src/index.js` or `src/utils.js`.
