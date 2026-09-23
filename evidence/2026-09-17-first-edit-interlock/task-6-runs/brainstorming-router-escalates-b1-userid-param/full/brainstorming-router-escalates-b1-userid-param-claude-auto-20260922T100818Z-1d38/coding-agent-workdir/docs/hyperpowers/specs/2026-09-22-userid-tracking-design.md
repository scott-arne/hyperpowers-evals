# userId Tracking — Design

Date: 2026-09-22

## Problem

The login flow cannot identify who logged in. `login(username, password)`
in `app.js` logs a username and returns `{ success: true, user: username }`.
A username is what someone typed, not a stable identity: it can change, and
nothing else in the app can correlate activity to a person.

The requirement is a `userId` that the caller passes in, that works across
the app, that persists, and that forms not yet written can use.

## Scope

In scope: a server-assigned user identifier, persisted client-side, readable
by any part of the app, and passed into `login` as continuity information.

Out of scope: a logout UI, a real authentication backend, authorization,
and any change to `src/index.js` or `src/utils.js` (Node CommonJS files the
browser app never loads).

## Global Constraints

- **The userId is an identifier for tracking, never an authorization
  credential.** The server may log it and attribute actions to it. The
  server must never grant access based on a client-supplied copy, because
  anyone can edit client-side storage. Any future server work inherits this
  constraint.
- Match the existing code style: plain browser scripts, globals, no
  bundler, no framework, no runtime dependencies.
- `index.html` must keep opening directly from the filesystem. This rules
  out ES modules, which CORS blocks over `file://`.
- Unit tests for `session.js` using Node's built-in test runner. No new
  dependencies in `package.json`.

## Decisions

Each of these was chosen over stated alternatives during brainstorming.

| Decision | Chosen | Rejected because |
|---|---|---|
| ID origin | Server assigns on successful login | A client-generated ID identifies a browser, not a person. An upstream/SSO source would need a system that does not exist here. |
| Storage | `localStorage`, key `app.userId` | `sessionStorage` leaves returning users unidentified and isolates tabs. An `HttpOnly` cookie cannot be read by JavaScript, so callers could not pass it. |
| `login` signature | `login(username, password, previousUserId)` | A required third parameter breaks the first-ever login, which has no ID. Returning the ID without any parameter loses the returning-user link. |
| Sharing mechanism | New `session.js` plain script | ES modules force a local web server. Inlining in `app.js` makes future forms load the login handler. |

## Architecture

```
index.html   <script src="session.js">   loaded first
             <script src="app.js">

session.js   Session.getUserId() / setUserId(id) / clear()     [new]
             sole owner of identity storage

app.js       login(username, password, previousUserId)
             submit handler: read previous -> login -> store new
```

All storage logic lives in `session.js`. `app.js` is a consumer and contains
no `localStorage` access. Future forms depend only on the three `Session`
functions, not on how or where the ID is stored — so a later move to
`sessionStorage`, cookies, or modules changes one file.

## Components

### `session.js` (new)

Exposes one global, `Session`, with three functions:

- `getUserId()` — returns the stored ID, or `null` if none is stored or
  storage is unavailable. Callers treat both cases identically.
- `setUserId(id)` — persists the ID.
- `clear()` — removes it. This is the logout path.

`clear()` has no caller in this change. The app has no logout. It is
included because "cleared on explicit logout" was part of the persistence
decision, and omitting it would mean reopening this file when logout is
added. No logout button is added here.

The file also attaches `Session` to `module.exports` when `module` is
defined, so the Node test runner can require it. This mirrors the existing
CommonJS style in `src/utils.js` and is inert in the browser.

### `app.js` (modified)

`login(username, password, previousUserId)`. The third parameter is
optional and defaults to `null`. It carries **who this browser was**, never
who it is now — the current user's ID cannot be known before authenticating.
The name `previousUserId` is deliberate: two IDs are in play during one
call, and a bare `userId` would invite confusing them.

Return value gains the server-assigned ID:
`{ success: true, user: username, userId }`.

`login` remains a stub with no server behind it, so it fabricates the ID.
That line is commented as the seam where a real API response takes over.
The ID's origin is server-side by design even while the server is imaginary.

### `index.html` (modified)

One added `<script src="session.js">` before the existing `app.js` tag.
`app.js` only reaches for `Session` inside the submit handler, so either
order would work at runtime; listing it first states the dependency
where a reader will see it.

## Data Flow

1. User submits the form. Existing validation runs unchanged.
2. Handler calls `Session.getUserId()` — `null` on a first-ever visit.
3. Handler calls `login(username, password, previousUserId)`.
4. On success, handler calls `Session.setUserId(result.userId)`.
5. Any other form, now or later, calls `Session.getUserId()` and gets a
   value without knowing anything about login.

## Error Handling

`localStorage` **throws** rather than returning `null` when it is
unavailable — Safari private mode, disabled storage, some enterprise
policies. Unhandled, that would break the login form entirely.

All three `Session` functions wrap storage access in `try`/`catch` and fall
back to an in-memory value held in the module closure. The app degrades to
"identity works for this page load" instead of failing the form. This is a
deliberate trade: a silently non-persistent ID is better than a broken
login, given the ID is for tracking rather than access.

## Testing

Node's built-in runner (`node --test`), added as `"test": "node --test"` in
`package.json`. No dependencies.

`session.js` is required directly; tests install a fake `localStorage` on
`globalThis` before each case.

Cases:

1. `getUserId()` returns `null` when nothing is stored.
2. `setUserId(id)` then `getUserId()` returns that id.
3. `clear()` then `getUserId()` returns `null`.
4. `setUserId` overwrites a previously stored id.
5. Storage that throws on read: `getUserId()` returns `null`, does not throw.
6. Storage that throws on write: `setUserId()` does not throw, and
   `getUserId()` returns the value from the in-memory fallback.

`app.js` is not unit tested: it touches `document` at load time and has no
DOM harness. Its verification is manual — open `index.html`, submit the
form, confirm the console shows a `userId` and that reloading and submitting
again passes the prior ID as `previousUserId`. This gap is stated rather
than papered over; closing it would mean the end-to-end tooling that was
explicitly not chosen.

## Risks

- **Script-readable identifier.** Any JavaScript on the page, including
  injected script, can read `app.userId`. Accepted because the ID is not a
  credential. It would be unacceptable for a session token.
- **Shared machines.** A persisted ID outlives the browser session, so the
  next person on the same browser inherits the previous user's ID until a
  new login. Explicit logout calling `Session.clear()` is the mitigation,
  and no logout exists yet.
- **Stub ID.** The fabricated ID is not stable across page loads until a
  real backend assigns one. Tracking is only as meaningful as the server
  that eventually mints the value.
