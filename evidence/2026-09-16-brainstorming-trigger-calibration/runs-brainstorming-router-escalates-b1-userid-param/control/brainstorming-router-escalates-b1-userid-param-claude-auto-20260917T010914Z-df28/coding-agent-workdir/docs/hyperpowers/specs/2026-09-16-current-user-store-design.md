# Current-User Store — Design

Date: 2026-09-16
Status: Approved for planning
Branch: `feature/webapp-enhancement`

## Problem

The original request was: "Add a `userId` parameter to the login function so we
can track who logged in."

Taken literally, that change cannot work. `login(username, password)` in
`app.js` has exactly one call site — the form submit handler — and neither the
form nor anything else in the application holds a user ID. The login form
collects a username and a password (`index.html`), and `login` is the function
that establishes identity in the first place. A `userId` parameter would
therefore have `undefined` as its only possible argument.

The identity travels the other way: `login` produces the ID, and a store
records it. Clarifying the request established that the real need is broader
than login — the identity must be readable across the application, must
survive page reloads, and will be consumed by additional forms that do not
exist yet.

This document specifies that store. It deliberately does **not** add a `userId`
parameter to `login`; see "Relationship to the original request" below.

## Goals

- One authoritative answer to "who is logged in right now", set at login.
- Readable by any script on the page, including forms added later.
- Survives page reload and in-application navigation.
- Testable without a browser.
- No new runtime dependencies.

## Non-goals

Each item below is something a reader could reasonably expect from "track who
logged in". None of them is built here.

- **No event or audit trail.** The store holds current identity, not a history
  of logins or form submissions.
- **No backend.** `API_ENDPOINT` remains unused; `login` remains a stub.
- **No authentication or authorization.** See "Trust boundary".
- **No logout UI.** A `clear()` function exists; nothing calls it yet.
- **No ESLint, Prettier, or Playwright.**
- **No ES-module or bundler migration.** The page stays on classic scripts.
- **No changes to `src/index.js` or `src/utils.js`.** They are Node-only and
  unreferenced by the page.

## Trust boundary

The stored `userId` is **self-asserted and untrusted**. It lives in the
browser, where anything with devtools access can edit it and claim any value.

This is acceptable for its intended uses — personalising UI, prefilling forms,
attributing the user's own work back to them. It is **not** acceptable as a
gate on access to anything, and stored IDs must not later be treated as
trustworthy records. Any future feature that needs a trustworthy identity
requires a server-issued session, which is out of scope here.

This property is a consequence of the decision to avoid introducing a backend.
It is recorded so it stays a deliberate choice rather than an accident.

## Global constraints

These apply to every task in the implementation plan.

- **Zero runtime dependencies.** `package.json` currently has none; it gains a
  `test` script only.
- **Unit tests via Node's built-in `node:test` runner.** No other tooling is
  configured — no linter, no formatter, no end-to-end tests.
- **No build step.** No bundler, no transpiler.
- **The page must keep working when opened directly from disk over `file://`.**
  This is why classic scripts are retained rather than ES modules, which
  browsers block on `file://`.
- **Browser code is loaded as classic scripts.** `src/` is reserved for the
  existing Node-only CommonJS files.

## Decisions

Settled during brainstorming. Recorded with the alternatives that were
declined, so a later reader can see what was traded away.

| Decision | Chosen | Declined |
|---|---|---|
| What persists | Current-user store (one live identity) | Append-only event trail; both together |
| Where it lives | `sessionStorage` (per-tab, cleared on tab close) | `localStorage`; server-issued session cookie; in-memory with server rehydration |
| What the ID is | Server-returned ID, stubbed with an obvious fake | The username as ID; a client-generated UUID |
| Page wiring | Second classic script exposing one global | Native ES modules; a bundler |
| Tooling | `node:test` unit tests only | ESLint + Prettier; Playwright; no tooling |
| Store shape | Accessor over a versioned record | Observable store with `subscribe()`; bare key/value |

Rationale for the two least obvious choices:

- **Server-returned ID over username-as-ID.** Using the username fuses identity
  with a display name. If usernames ever become editable, every previously
  stored ID silently begins pointing at the wrong person, with no way to detect
  it after the fact. Stubbing a returned ID costs about the same today and
  keeps the interface correct for when a real backend arrives.
- **Versioned record over bare key/value.** Additional forms will consume this
  store later. The envelope makes adding a field a non-event rather than a
  migration over data already sitting in users' browsers, and it allows corrupt
  data to be distinguished from absent data.

## Architecture

### Component: `current-user.js`

A new file at the repository root, alongside `app.js`. It is not placed in
`src/`, which holds Node-only CommonJS files the page never loads.

The file is **dual-mode**: an IIFE that attaches `CurrentUser` to `globalThis`
for the browser, and additionally assigns `module.exports` when `module` is
defined, so `node:test` can require it. `package.json` has no `"type"` field,
so Node treats `.js` as CommonJS and this requires no configuration.

This dual-mode wrapper is the load-bearing detail of the design: it is what
makes "plain global script in the browser" and "unit tested in Node"
compatible without a build step.

### Public API

Three functions, on the `CurrentUser` global:

- `set({ userId, username })` — records the identity and stamps `loginAt`.
  Throws when `userId` is absent or empty (see "Error handling").
- `get()` — returns `{ userId, username, loginAt }`, or `null` when nobody is
  logged in.
- `clear()` — forgets the current identity.

Internally the store is produced by a factory taking its storage object as an
argument, defaulting to `sessionStorage`. Tests inject a fake. This injectable
is required because `sessionStorage` does not exist in Node.

### Stored format

A single `sessionStorage` key, `currentUser`, holding JSON:

```json
{ "v": 1, "userId": "...", "username": "...", "loginAt": "..." }
```

`loginAt` is an ISO 8601 timestamp. `v` is the envelope version; only `1` is
recognised.

## Changes to existing files

### `app.js`

- Add a module-level constant for the stubbed ID — a single, obviously-fake
  value, with a comment tying it to the unused `API_ENDPOINT` and to the point
  where a real API response would supply it.

  The constant is the same for every user **by design**. A plausible-looking
  per-user fake is the variety that quietly reaches production unnoticed; one
  conspicuous constant cannot.

- `login(username, password)` returns `userId` alongside its existing fields:
  `{ success: true, userId: STUB_USER_ID, user: username }`. Its parameter list
  is unchanged. The existing `user` field is retained so nothing that reads it
  breaks.

- The submit handler, on a successful login, calls
  `CurrentUser.set({ userId: result.userId, username })`.

- Make `app.js` dual-mode, mirroring `current-user.js`. Today the file calls
  `document.getElementById("login-form")` at top level, so requiring it in Node
  throws before any test can run. Two changes make it importable:

  - Guard the form wiring behind `typeof document !== "undefined"`. In the
    browser this is always true, so behaviour is unchanged.
  - Export `{ login, validateForm, STUB_USER_ID }` when `module` is defined.

  Without this, `login`'s return value cannot be unit tested at all.

### `index.html`

Add `<script src="current-user.js"></script>` **before** the existing
`<script src="app.js"></script>`. Order is required: `app.js` references
`CurrentUser` at submit time, and loading it second guarantees the global
exists.

### `package.json`

Add `"scripts": { "test": "node --test" }`. No dependencies are added.

## Data flow

1. The user submits the login form.
2. The handler validates via the existing `validateForm`.
3. On valid input, `login(username, password)` runs and returns
   `{ success, userId, user }`.
4. On success, the handler calls `CurrentUser.set({ userId, username })`, which
   writes the versioned envelope to `sessionStorage`.
5. Any later code — including forms added in future — calls `CurrentUser.get()`
   to read the identity. Future forms read; they do not write.
6. `CurrentUser.clear()` forgets the identity. Nothing calls it yet.

## Error handling

The governing rule: **a storage problem must never break login.**

| Condition | Behaviour |
|---|---|
| `sessionStorage` unavailable, or a read/write throws | Catch, and fall back to an in-memory value for the life of the page. Identity still works; it does not survive a reload. Login proceeds normally. |
| Stored value is unparseable JSON | Treat as no user; delete the key. |
| Stored envelope has an unrecognised `v` | Treat as no user; delete the key. |
| `set()` called without a usable `userId` | Throw. |

Reasoning for the two non-obvious rows:

- **Corrupt data is cleared rather than thrown on.** If a bad write threw, a
  single corrupt value would leave the user permanently unable to log in, with
  no remedy but clearing site data manually. Treating it as "no user" is
  self-healing.
- **A missing `userId` throws.** That is a contract violation at a call site we
  control. Storing a null identity would produce a record that looks valid to
  every reader.

Storage failures are real rather than theoretical: Safari's private mode has
historically thrown on `setItem`, and storage can be disabled by policy.

## Testing

Two test files, run with `node --test` via `npm test`. No dependencies, no DOM,
no jsdom — the injectable storage and the dual-mode wrappers are what allow
this.

`test/current-user.test.js`:

1. `get()` on empty storage returns `null`.
2. `set()` then `get()` round-trips `userId`, `username`, and a `loginAt`.
3. `clear()` removes the identity; a following `get()` returns `null`.
4. Corrupt JSON in the key: `get()` returns `null` **and** the key is removed.
5. Unrecognised `v`: `get()` returns `null` **and** the key is removed.
6. A storage stub that throws on `setItem`: `set()` does not propagate the
   error, and `get()` still yields the value within that page life.
7. `set()` without a `userId` throws.

`test/login.test.js`:

8. `login()` returns a `userId` field, equal to `STUB_USER_ID`.
9. `login()` still returns `success` and `user`, so existing readers are
   unaffected.

Case 9 exists because `app.js` is being edited to become importable; the test
pins the parts of its contract that must not change.

## Relationship to the original request

The request asked for a `userId` **parameter** on `login`. This design adds a
`userId` to `login`'s **return value** instead, and introduces a store to hold
it.

This is recorded explicitly so a later reader does not conclude the request was
misread or partly dropped. The parameter form was examined and rejected because
no caller has a user ID to supply: identity is an output of authentication, not
an input to it. The underlying goal — being able to tell who logged in, across
the application — is met in full.

## Assumptions

- `Assumption: per-tab lifetime is the intended meaning of "it should persist".`
  `sessionStorage` clears when the tab closes, so a user who closes and reopens
  the tab becomes anonymous again. Validate by confirming with the requester
  before implementation; if persistence across browser restarts was intended,
  the change is `localStorage` in place of `sessionStorage` and nothing else in
  this design moves.

## Open follow-ups (not in scope)

Recorded so they are not rediscovered as surprises:

- A logout affordance calling `CurrentUser.clear()`.
- A real `API_ENDPOINT` call supplying a genuine `userId`, replacing the stub.
- An event trail, should attribution history ever be required, layered on this
  store rather than replacing it.
- `subscribe()` on the store, if future forms need to react to identity changes
  rather than read on demand. It can be added without changing the stored
  format.
