# Current-User Session Store — Design

Date: 2026-09-22
Status: approved in brainstorming, pending spec review

## Problem

The app has no notion of who is currently signed in. `login()` in `app.js`
logs the username to the console and returns it to its single caller, and the
value is discarded from there. Other forms planned for this app need to know
who the user is, and that identity needs to survive a page reload.

The original request was to add a `userId` parameter to `login()`. That was
rejected during brainstorming for two reasons. `login()` already receives the
identifier as `username`, so a second caller-supplied identity field is
redundant; and on an authentication entry point a caller-controlled identity
is an unverified claim, which becomes an impersonation vector once the stub at
`app.js:6` is replaced by a real POST to `API_ENDPOINT`. The identity this
subsystem stores is the one `login()` was given, never one a caller invented.

## Goals

- A single place that answers "who is signed in right now?"
- The answer survives page reloads and browser restarts.
- Any future form can read it without depending on `app.js`.
- The stored identity expires on its own.

## Non-goals

- Event or audit logging. This stores identity state, not history. An event
  log was considered and deferred; if it is built later it reads the current
  user from this store.
- Authentication itself. `login()` remains the stub it is today.
- Anything on the Node side (`src/index.js`, `src/utils.js`). Those share no
  code with the browser half and are untouched.
- A logout control. `clear()` exists for one, but no UI calls it yet.

## Decisions

Each of these was chosen over stated alternatives during brainstorming.

| Decision | Chosen | Rejected |
|---|---|---|
| What is tracked | Identity state (current user) | Event log; both |
| Persistence | `localStorage` with an expiry stamp | `sessionStorage`; `localStorage` with no expiry; in-memory only |
| Consumption | Namespaced global on a second script tag | ES modules; a bundler; inlining in `app.js` |
| Session lifetime | 24 hours | 8 hours; 30 days |
| Tooling | Unit tests | Lint/format; end-to-end tests |

Two of these carry consequences worth restating.

**ES modules were rejected on a concrete cost, not taste.** Module scripts are
blocked under the `file://` protocol, so adopting them would mean `index.html`
only works when served over HTTP. The current page opens from disk. Moving one
small file from a global to an `export` later is a few lines, so this is the
cheap decision to reverse; the storage format is the expensive one.

**24 hours is a security-posture decision.** Because no logout control exists,
expiry is currently the only mechanism that ever clears a stored identity, and
every future form that trusts this store inherits that lifetime.

## Architecture

A new file, `session.js`, at the repository root beside `app.js`, loaded
before it. It owns the stored identity and exposes only the three functions
below. Callers never touch `localStorage` or the record format directly, so
replacing the storage mechanism later changes this file alone.

```
index.html
  └─ <script src="session.js">   defines window.AppSession
  └─ <script src="app.js">       login() calls AppSession.set()
                                 future forms call AppSession.get()
```

## API

`session.js` attaches `AppSession` to `globalThis` (which is `window` in the
browser, and lets the unit tests load the same file under Node):

- **`set(username)`** — stores the identity, stamped with a creation time and
  an expiry 24 hours out. Overwrites any existing record. Returns nothing.
- **`get()`** — returns the stored record, or `null`. Callers only ever handle
  "a user, or nobody"; every failure mode below collapses to `null`.
- **`clear()`** — removes the stored record. Returns nothing.

A module-level `SESSION_TTL_MS` constant holds the 24 hours
(`24 * 60 * 60 * 1000`) so the lifetime is one named value.

Future forms consume it as:

```js
const session = AppSession.get();
if (session) {
  // session.user
}
```

## Data format

One `localStorage` key, `appSession`, holding JSON:

```json
{
  "version": 1,
  "user": "alice",
  "loginAt": 1758531600000,
  "expiresAt": 1758618000000
}
```

- `version` — this record outlives deploys on users' machines. Without it, a
  future format change silently misreads old data. `get()` treats any version
  it does not recognize as no session.
- `user` — the username `login()` was called with.
- `loginAt`, `expiresAt` — epoch milliseconds. `expiresAt` is
  `loginAt + SESSION_TTL_MS`, stored rather than recomputed so a future change
  to the TTL does not retroactively extend or shorten existing sessions.

**The record holds an identifier and timestamps only.** No password, no token.
Any script on the page can read this store, so the password read at
`app.js:20` must never reach it.

## Error handling

Expiry is evaluated lazily, when a record is read. There is no timer. The
consequence is that an expired record sits in storage until something next
calls `get()`, which is acceptable because nothing trusts a record without
reading it through `get()` first.

`get()` returns `null` in all of these cases, and clears the stored record on
the way out so a bad value repairs itself rather than failing permanently:

| Condition | Behavior |
|---|---|
| Nothing stored | `null`, nothing to clear |
| `expiresAt` in the past | Clear, return `null` |
| Value is not parseable JSON | Clear, return `null` |
| `version` is not `1` | Clear, return `null` |
| Record is missing `user` or `expiresAt` | Clear, return `null` |

`localStorage` access throws in private-browsing and storage-disabled
contexts. Rather than let that break login, every access is guarded, and on
failure the module falls back to an in-memory record held in a module-level
variable. The deliberate tradeoff: a user in those contexts gets a working app
with a session that does not survive reload, instead of an error.

## Changes to existing files

**`app.js`** — `login(username, password)` keeps its signature; the caller at
line 23 is untouched. On the successful result, before returning, it calls
`AppSession.set(username)`.

**`index.html`** — one added line, `<script src="session.js"></script>`,
before the existing `app.js` tag at line 13. Load order matters: `app.js`
calls `AppSession` at submit time, but the ordering keeps it defined from
first paint.

**`package.json`** — a `test` script wired to `node --test`. No dependency
fields are added.

## Testing

The project has no test runner today. Unit tests use Node's built-in
`node:test` and `node:assert`, which keeps the project at zero dependencies.
A `test` script is added to `package.json`.

`session.js` sets `globalThis.AppSession` and contains no imports, so a test
installs a fake `localStorage` on `globalThis`, requires the file, and
exercises the real module.

Cases to cover:

- `set()` then `get()` returns the stored user.
- `get()` with nothing stored returns `null`.
- A record whose `expiresAt` is in the past returns `null` and is removed.
  Written directly into the fake storage, so no clock injection is needed in
  production code.
- A record whose `expiresAt` is in the future is returned.
- Malformed JSON returns `null` and is removed.
- A record with an unrecognized `version` returns `null` and is removed.
- `clear()` removes a stored record.
- A `localStorage` stub whose methods throw: `set()` and `get()` still work
  through the in-memory fallback, and nothing propagates an exception.
- The stored record never contains a password field.

## Assumptions

- Assumption: "across the app" means the browser half only; validate via the
  user's confirmation before implementation, stated during brainstorming and
  not contradicted.
- Assumption: `index.html` may be opened directly from disk, which is what
  makes the `file://` constraint on ES modules binding; validate by confirming
  with the user, or by serving the page, before revisiting the module-style
  decision.

## Global constraints

- Zero runtime dependencies. Tests use only the Node standard library.
- No build step. `index.html` continues to load plain scripts.
- Nothing beyond an identifier and timestamps is written to client storage.
- `login()`'s signature and return value stay as they are.
