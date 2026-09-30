# User Session Store — Design

Date: 2026-09-30
Status: awaiting review

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Clarification changed the shape of the work: the id is
produced by the server, not supplied by the caller, and it has to persist,
be reachable across the app, and be available to forms that do not exist yet.

The current code cannot support that. `login(username, password)` in `app.js`
is a stub that returns `{ success: true, user: username }` and never contacts
`API_ENDPOINT`. The login form collects only a username and a password, so no
caller has a user id to pass. There is no browser-side module system, no
build step, and nothing that survives a page load.

A `userId` **parameter** is therefore the one shape that cannot work: the
single call site at `app.js:23` has no value to give it, so the parameter
would be dead on arrival. The id must come out of `login` and be stored.

## Decisions

These were settled with the requester during brainstorming.

| Question | Decision |
|---|---|
| Where the id comes from | The server returns it |
| What it is used for | Display and tracking only; non-secret |
| App structure | Undecided; design for the multi-page superset |
| Storage lifetime | `sessionStorage` — cleared when the tab closes |
| Storage location | Behind a module interface, not accessed directly |
| Tooling to add | None; no linter, formatter, or test runner |

The id is explicitly **not** a credential. The server re-derives real identity
from its own session and must never trust a client-supplied `userId`. Browser
storage is user-editable, so any design in which later forms submit this value
as proof of identity is out of scope and would be a server-side change.

## Global Constraints

- No linter, formatter, or test runner is added. The repository has none
  today and the requester chose to keep it bare. Consequence: verification
  is manual, and the storage-fallback branch ships reasoned-about but
  unexercised.
- No build step and no ES module syntax on the browser side. `app.js` is
  loaded by a plain `<script>` tag and everything in it is a global; the new
  code matches that pattern.
- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node entry
  point and are not touched.
- The design is scoped to making the id available. It adds no UI that
  displays the id and no logout control.

## Architecture

One new file, `session.js`, loaded before `app.js` on every page that needs
the id. It defines exactly one global, `Session`.

Storage is reached only through that module. Nothing else in the codebase
calls `sessionStorage` directly, so changing the backing store later — to
`localStorage`, or to a server round trip — is a change inside one file and
does not touch consumers.

`login` keeps its signature, `login(username, password)`. Its return value
gains the id: `{ success: true, user: username, userId }`.

### Interface

```javascript
Session.set(userId)  // stores the id; ignores null/undefined
Session.get()        // returns the id, or null if nothing is stored
Session.clear()      // removes it
```

`clear()` ships unused — there is no logout UI — but is part of the interface
from the start, because adding it later means revisiting every consumer.

### Data flow

1. The user submits the login form.
2. `validateForm` runs unchanged.
3. `login` returns `{ success, user, userId }`.
4. On `success === true`, the submit handler calls `Session.set(result.userId)`.
5. Any later page loads `session.js` and reads the id with `Session.get()`.

## Error handling

`sessionStorage` is not always available. Access to the property itself can
throw in sandboxed iframes, and writes can throw on quota or when storage is
disabled by the user.

The module wraps feature detection and every read and write in `try`/`catch`
and falls back to a module-level in-memory variable. In fallback mode
`Session.get()` returns that in-memory value, or `null` if nothing was set;
it never throws. The practical difference is that a fallback-mode id does not
survive a page load. Consumers do not need to know which mode is active.

Two narrower cases:

- `Session.set` ignores `null` and `undefined` rather than writing the string
  `"undefined"`, which is the standard `sessionStorage` failure mode.
- The submit handler stores the id only when `result.success` is true. The
  existing unconditional `console.log` of the result is left as it is.

## Files changed

| File | Change |
|---|---|
| `session.js` | New, roughly 30 lines: the `Session` global, three functions, storage fallback |
| `app.js` | `login` returns `userId`; submit handler stores it on success. Signature unchanged; `validateForm` untouched |
| `index.html` | One `<script src="session.js">` tag before the existing `app.js` tag |

Load order is a correctness requirement, not a preference: `Session` must be
defined before `app.js` executes.

## Verification

Manual, in a browser, since the repository has no test runner:

1. Open `index.html`, submit the form. The console shows the login result
   including the id.
2. `Session.get()` in the console returns that id.
3. Reload the page. `Session.get()` still returns it — this demonstrates the
   persistence requirement.
4. `Session.clear()`, then `Session.get()` returns `null`.

Not covered: the storage-fallback branch, which is impractical to trigger by
hand. This gap is a direct consequence of the decision to add no test
infrastructure.

## Known limitation

Until `login` performs a real request to `API_ENDPOINT`, it returns a clearly
marked placeholder id. Every session therefore stores the same fake value, so
the feature does not yet distinguish users. The plumbing is correct and the
swap is a one-line change inside `login`, but "track who logged in" is not
truly delivered until the real API call exists. Wiring up that `fetch`,
including its failure handling, is deliberately out of scope here and was
offered to the requester as a separate, larger change.

## Assumptions

- Assumption: the app will grow into multiple HTML documents rather than a
  single page; validate via the requester confirming the structure once it is
  decided. The multi-page design is the superset and works either way, so
  being wrong costs nothing.
- Assumption: the eventual server response exposes the id under a `userId`
  field; validate via the real API response shape when `login` stops being a
  stub. Only the one line inside `login` depends on this.

## Out of scope

- Any change that makes the server trust a client-supplied identity.
- Storing a session token or any credential in the browser.
- A logout control, or UI that displays the id.
- Converting the browser code to ES modules or adding a bundler.
- Changes to `src/index.js` or `src/utils.js`.
