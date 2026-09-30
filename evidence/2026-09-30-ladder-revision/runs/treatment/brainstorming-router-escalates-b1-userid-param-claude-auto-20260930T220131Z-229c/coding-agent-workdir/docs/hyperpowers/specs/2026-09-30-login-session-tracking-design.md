# Login Session Tracking — Design

Date: 2026-09-30
Status: Approved design, not yet planned

## Problem

The app has no way to record who logged in. `login()` in `app.js` returns
`{ success, user }` and the submit handler logs it to the console, after which
the information is gone. Nothing outside that one call can tell who the current
user is.

The original request was to "add a `userId` parameter to the login function".
That framing does not work as stated: at the moment `login()` is called, the
only values in hand are the username and password typed into the form. Identity
is the *output* of logging in, not an input to it, so a caller-supplied `userId`
could only ever duplicate the username. The request is therefore satisfied by
having `login()` **return** a `userId` and by persisting it somewhere later code
can read.

## Scope

In scope:

- `login()` returns a `userId` alongside its existing fields.
- A tab-scoped browser session record holding `{ userId, username }`.
- A single module that owns the storage key and the stored shape.
- The repository's first unit-test infrastructure, covering that module.

Out of scope (deliberately):

- Any real authentication. `login()` remains a stub; the API call it describes
  at `app.js:6` is unchanged.
- Server-visible session state (cookies), cross-restart persistence
  (`localStorage`), analytics or telemetry delivery, and any logout UI. Each was
  considered and rejected during design; see Decisions.
- Linting and formatting infrastructure.

## Global Constraints

- **The stored `userId` is non-authoritative.** It lives in `sessionStorage`, so
  it is readable by any script on the origin (an XSS-exposed value) and is
  trivially editable from devtools. It may be displayed and logged. It must
  never be the basis for deciding who a user is or what they are permitted to
  do. Any future authorization decision must come from the server.
- **A storage failure must never fail a login.** Persistence is a side benefit
  of logging in, not a precondition for it.
- **Zero new runtime dependencies.** The test runner is `node:test`, which ships
  with Node. `package.json` gains a `scripts` entry and no `devDependencies`.
- **No change to how the page loads.** `index.html` keeps classic
  `<script src>` tags; the page must still open correctly over `file://`.

## Architecture

Three files change or appear. The browser side of this repo is plain scripts
with globals (`app.js` loaded by a bare tag at `index.html:13`), while `src/` is
Node CommonJS. The new code follows the browser convention, since that is the
world it runs in.

### `session.js` (new, repo root)

Owns the sessionStorage key and the stored shape. This is the only file in the
app that references `sessionStorage`.

Interface — a `Session` global with exactly three functions:

- `Session.save(session)` — persists `{ userId, username }`. Returns `true` on
  success, `false` if the storage backend refused.
- `Session.read()` — returns the stored object, or `null` if absent or corrupt.
- `Session.clear()` — removes the key.

The functions read `sessionStorage` at call time rather than capturing a
reference at load time. This is what makes the module testable under Node, where
no `sessionStorage` global exists.

The file ends with a dual-export guard:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = Session;
}
```

It is inert in the browser and is what allows the test to `require` the module.

### `app.js` (modified)

Two changes:

1. `login()` returns `{ success, user, userId }`. Because it is still a stub
   with no backend, it derives the `userId` as the literal string
   `` `user-${username}` ``, under a comment next to the existing "would POST to
   API_ENDPOINT" note marking the derived value as placeholder data that the
   real API response replaces. Keeping the shape honest now means swapping in
   the real request later touches only this function's body.
2. The submit handler persists the result on success and includes the id in the
   log it already emits, and calls `Session.clear()` on both non-success paths
   (see Error Handling). It ignores `Session.save`'s return value: a refused
   write is reported by `session.js` and must not change the handler's
   behaviour.

Note that the stub's `success` is currently hard-coded `true`, so the
failed-login branch is unreachable today. The handler is still written to handle
it, because that branch becomes live the moment the real API call lands and the
stale-session bug it prevents would otherwise arrive with it.

`app.js` never touches `sessionStorage` directly.

### `index.html` (modified)

One new tag, `<script src="session.js"></script>`, placed **before** the
existing `app.js` tag. Both are classic scripts, so execution order is
synchronous and deterministic; `Session` is defined before `app.js` runs.

## Data Flow

```
submit
  -> validateForm({ username, password })
       |
       +-- invalid --> Session.clear() --> console.error(validation error)
       |
       +-- valid --> login(username, password) -> { success, user, userId }
                        |
                        +-- success --> Session.save({ userId, username })
                        |                 --> console.log(result incl. userId)
                        |
                        +-- failure --> Session.clear()
```

## Error Handling

Three failure modes, in order of importance.

**Storage is unavailable or refuses the write.** `sessionStorage` throws in
Safari private mode, when storage is disabled by policy, and on quota
exhaustion. `Session.save` wraps the write in try/catch, emits a
`console.warn`, and returns `false`. The login itself still succeeds and the
existing success log still fires. This follows directly from the Global
Constraint above.

**The stored value is corrupt.** `Session.read` catches `JSON.parse` failures,
calls `Session.clear()` to remove the bad value, and returns `null`. A corrupt
record self-heals rather than throwing on every subsequent read.

**A login fails or does not validate.** Both branches call `Session.clear()`.
Without this, a `userId` stored by an earlier successful login in the same tab
survives a later failed attempt and reads as the current user. This is the one
genuine bug the feature can introduce, and clearing on every non-success path is
the fix.

## Testing

Runner: `node:test` with `node:assert`, invoked by a new
`"test": "node --test"` script — the first entry in `package.json`'s currently
absent `scripts` block.

Tests target `session.js` only. `app.js` is DOM-wired and would need a DOM
harness to test; the logic worth covering lives in the session module. The test
injects a fake `globalThis.sessionStorage` it fully controls.

1. `save` followed by `read` round-trips `{ userId, username }`.
2. `read` returns `null` when nothing is stored.
3. `read` on a corrupted stored value returns `null` **and** clears the key.
4. `clear` removes the key.
5. `save` returns `false` and does not throw when the storage backend throws.

Tests 3 and 5 cover the error-handling paths that would otherwise regress
silently; the remainder are cheap regression cover for the interface.

## Decisions

**`userId` is returned, not passed in.** See Problem. The alternatives were a
caller-supplied per-attempt tracking id (identifies the attempt, not the person,
and was not what was wanted) and a literal `userId` parameter (the caller has no
value to pass other than the username, which `login()` already receives).

**`sessionStorage`, not `localStorage` or a cookie.** The value is wanted for
display and logging within the tab. `localStorage` would persist identity across
browser restarts on shared machines and would require a logout path to clear it.
A cookie would make the value server-visible and therefore part of the auth
surface, requiring `Secure`/`HttpOnly`/`SameSite` decisions well beyond this
feature.

**A separate `session.js` rather than inline helpers or ES modules.** Inlining
in `app.js` saves roughly ten lines but puts storage ownership in the same file
as form wiring and the API stub, with no boundary to test. Converting the
browser side to ES modules gives a real import/export boundary and is the likely
end state, but module scripts are deferred and CORS-blocked over `file://`, so
adopting them now would break opening `index.html` directly — a page-loading
regression this feature does not justify paying for.

**The stored shape omits a login timestamp.** The requirement is who logged in,
not when, and nothing reads a timestamp today. Because one file owns the shape,
adding the field later is a single-file change.

**Unit tests now, lint and format deferred.** Tooling is cheapest to adopt
before more code exists, but `session.js` has real error-handling branches worth
locking down while a linter would only add `devDependencies` to a repo that
currently has none.
