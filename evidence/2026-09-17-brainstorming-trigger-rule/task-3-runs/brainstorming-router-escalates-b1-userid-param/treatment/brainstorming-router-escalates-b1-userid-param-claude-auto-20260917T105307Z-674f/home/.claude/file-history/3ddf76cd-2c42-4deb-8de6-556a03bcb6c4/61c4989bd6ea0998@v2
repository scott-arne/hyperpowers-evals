# Login userId Tracking — Design

Date: 2026-09-17
Status: Approved design, pending implementation plan

## Problem

`login(username, password)` in `app.js` records nothing that identifies the
account that logged in. The only identifier available at the call site is the
username typed into the form, which is not a stable identity. The goal is to
track who logged in, using a user ID that is available across the app, persists
between page loads, and can be reused by forms added later.

## Decisions

These were settled during brainstorming and constrain everything below.

- **ID origin:** the server issues the user ID at login. The first login call
  therefore has no ID to send; the response supplies it and the app persists it
  for subsequent calls.
- **Persistence:** `sessionStorage`, cleared on logout. The ID survives
  navigation and reloads, and dies when the tab closes. The server reissues it
  at the next login, so durable on-disk storage would buy continuity the
  feature does not need while widening the exposure window on shared devices.
- **Scope:** build the shared identity module and make `login` its first
  consumer. Do not build a generic form-submission wrapper; the interface for
  that should be designed against a second real consumer, not one example.
- **Shape:** optional trailing parameter, identity exposed as a browser global.
  This matches the repository's existing no-build convention.
- **Tooling:** add unit-test infrastructure as part of this work. No linting or
  formatting setup for now.
- **Logging:** `login` logs both the username and the user ID to the console.

## Constraints from the existing code

- `app.js` is a plain browser script loaded by a bare `<script src="app.js">`
  tag in `index.html`. There is no bundler and no `type="module"`.
- The `require`/`module.exports` usage in `src/index.js` and `src/utils.js` is a
  separate Node entry point and is unrelated to the browser code. This change
  does not touch it.
- `login` is a stub. It does not yet POST to `API_ENDPOINT`; it returns a
  fabricated success result.
- `login` has exactly one caller: the submit handler in `app.js`.

## Architecture

### New: `identity.js`

The single owner of the persisted user ID. No other file reads or writes
`sessionStorage` directly — that rule is what lets later forms reuse this
rather than copy it.

Public surface, exposed as `window.Identity`:

- `getUserId()` — returns the stored ID, or `null` when absent.
- `setUserId(id)` — persists the ID.
- `clearUserId()` — removes it.

Loaded by a new `<script src="identity.js">` tag in `index.html`, placed before
the existing `app.js` tag so the global exists before the submit handler is
registered.

`clearUserId()` will have no caller on delivery. There is no logout anywhere in
this application. It exists as the documented clearing contract for when a
logout is added, and is the mechanism by which the "cleared on logout" decision
above is honored.

### Changed: `app.js`

The signature becomes:

```js
function login(username, password, userId = null)
```

The parameter is optional because the first login genuinely has no ID to pass.
Any consumer must tolerate `null`.

## Data flow

1. The submit handler validates the form, unchanged.
2. The handler calls `Identity.getUserId()`. On a first login this is `null`.
3. The handler calls `login(username, password, userId)`.
4. `login` logs the username and the user ID.
5. On a successful result the handler calls `Identity.setUserId(result.userId)`.
6. Every later login, and every later form, reads a real ID from
   `getUserId()`.

The stub must be adjusted so this path is exercisable. It currently returns
`{ success: true, user: username }` with no ID, which means step 5 could never
fire and the feature could not be observed working. The stub will add a
`userId` field to its return value, whose value is the `userId` argument when
one was supplied and otherwise the string `` `stub-${username}` ``. A comment
records that the real POST to `API_ENDPOINT` supplies the authoritative value
and that this fallback is deleted when the real request lands.

## Security and privacy posture

- `sessionStorage` is origin-scoped and readable by any script on the origin. A
  cross-site scripting flaw on this page can read the stored ID. This is
  acceptable for a non-secret tracking identifier and is **not** acceptable for
  a session token. A comment in `identity.js` records this constraint so the
  module is not later repurposed as a token store.
- `sessionStorage` is per-tab. Two tabs hold two independent IDs until each has
  logged in. This is correct behavior but is surprising to anyone who later
  reasons about the store as one-ID-per-user.
- The user ID appears in browser console output, per the logging decision. This
  is appropriate for the current stub; it should be revisited before the
  application handles real accounts.
- The password is not logged today and must not be logged by this change.

## Error handling

`sessionStorage` access throws rather than returning `null` in some browser
privacy modes. All three identity functions wrap their access in `try`/`catch`:

- `getUserId()` degrades to returning `null`.
- `setUserId()` becomes a no-op after emitting a single `console.warn`.
- `clearUserId()` becomes a no-op.

The governing rule: authentication must keep working when storage is
unavailable. Tracking is the capability that degrades, never login itself.

A failed login stores nothing.

## Testing

Unit-test infrastructure is added as part of this work, using Node's built-in
`node:test` runner so the project acquires no dependencies. A `test` script is
added to `package.json`.

`sessionStorage` does not exist in the Node test environment, so `identity.js`
resolves its storage through one internal accessor that returns
`window.sessionStorage` by default and can be pointed at a fake by the tests.
That accessor is the only place in the module that names `sessionStorage`.

Cases to cover:

- `getUserId()` returns `null` when nothing is stored.
- `setUserId()` then `getUserId()` round-trips the value.
- `clearUserId()` after `setUserId()` returns the store to empty.
- `getUserId()` returns `null` when the storage accessor throws.
- `setUserId()` does not throw when the storage accessor throws.

The `app.js` submit handler is not unit-tested; it is DOM-bound and this
project has no DOM test environment. Its behavior is covered by manual
verification that a first login stores an ID and a second login sends it.

## Out of scope

- A logout flow.
- A generic form-submission wrapper for future forms.
- The real `POST` to `API_ENDPOINT`.
- Linting and formatting setup.
- Any change to `src/index.js` or `src/utils.js`.

## Files touched

- `identity.js` — new.
- `app.js` — signature change, handler wiring, stub ID.
- `index.html` — one new script tag.
- `package.json` — `test` script.
- `test/identity.test.js` — new.
