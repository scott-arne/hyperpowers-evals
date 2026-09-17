# User Preferences Storage — Design

Date: 2026-09-17
Status: Approved for planning

## Problem

The webapp has no persistence of any kind. `index.html` renders a login form,
`app.js` handles submit against a stubbed `login()`, and nothing the user does
survives a reload. There is no settings flow to extend and no storage layer to
build on, so preference storage arrives as a new subsystem rather than a change
to an existing one.

The goal is a preferences layer that persists across sessions, plus one real
preference wired end to end so the layer is exercised by the running page
instead of sitting unused.

## Scope

In scope:

- A `PreferencesStore` module owning all preference reads and writes.
- One preference, `rememberUsername`, wired through the login form.
- Unit tests for the store.

Out of scope:

- A settings panel or any additional preferences.
- Server-side persistence, authentication, and session tokens.
- Changes to `src/index.js` and `src/utils.js`, which are unrelated CommonJS
  fixture code the page never loads.

## Global Constraints

These decisions were made during brainstorming and bind every task in the
implementation plan:

- **Storage backend:** browser `localStorage`, accessed only through the
  `PreferencesStore` seam. No call site touches `localStorage` directly.
- **Module format:** ES modules. `index.html` loads `app.js` with
  `<script type="module">`.
- **File extension:** new modules use `.mjs`. Adding `"type": "module"` to
  `package.json` would break the `require()` calls in `src/utils.js` and
  `src/index.js`; those files stay untouched.
- **Test runner:** Node's built-in `node --test`. Zero new dependencies —
  the project has none today and gains none here.
- **Development approach:** test-driven. Store tests are written before the
  store implementation.
- **No linter or formatter** is being introduced as part of this work.

## Architecture

One new module, `preferences.mjs`, exporting a factory:

```js
createPreferencesStore(backend = globalThis.localStorage) -> PreferencesStore
```

The injected `backend` is the single seam. It serves two purposes at once: in
tests it is an in-memory fake or a deliberately throwing stub, and in a future
where preferences move server-side it is the swap point. Nothing else in the
codebase knows where preferences live.

Note that resolving the default argument *itself* reads `globalThis.localStorage`,
and that read is one of the accesses that can throw (see Error Handling). The
factory must therefore resolve and probe its backend inside a `try`, not rely on
the default-parameter expression alone.

### Interface

```
load()        -> Promise<Preferences>
save(partial) -> Promise<Preferences>
clear()       -> Promise<void>
```

The interface is asynchronous even though `localStorage` is synchronous. A
server-backed implementation is inherently async, and a synchronous interface
would force a signature change at every call site on that migration — the
migration the seam exists to absorb. The cost today is two `await`s in
`app.js`.

`save()` takes a partial object and merges it into the stored preferences
rather than replacing them, so a caller updating one preference cannot
accidentally erase another. It resolves to the resulting full preferences
object.

## Data Model

A single `localStorage` key holds the entire preference set as JSON:

- Key: `webapp.preferences.v1`
- Value: `{"rememberUsername": true, "lastUsername": "alice"}`

One key rather than a key per preference: reads and writes stay atomic, and
there is one place to version. The `v1` suffix reserves a migration path — if
the shape ever changes incompatibly, a `v2` key plus a one-time migration is
the mechanism. No migration code is written now.

Defaults live in a frozen module-level object:

```js
const DEFAULTS = Object.freeze({
  rememberUsername: false,
  lastUsername: "",
});
```

`load()` returns `DEFAULTS` merged with whatever was stored. Keys present in
storage but absent from `DEFAULTS` are ignored, so a build reading a blob
written by a newer build degrades quietly instead of leaking unknown fields
into application code.

## Feature Wiring

`index.html` gains a "Remember me" checkbox (`#remember-me`) inside the login
form. Without it the preference has no way to be set, and the storage layer
would have no genuine consumer.

On page load, `app.js` calls `load()`. If `rememberUsername` is true and
`lastUsername` is non-empty, it prefills `#username` and checks `#remember-me`.

On form submit, `app.js` saves only when `validateForm()` passes and `login()`
returns `success: true` — a failed validation leaves stored preferences
untouched. (`login()` is a stub that always succeeds today; the check is written
against its contract, not its current body.) The save call carries the checkbox
state:

- Checked: `{rememberUsername: true, lastUsername: <username>}`
- Unchecked: `{rememberUsername: false, lastUsername: ""}`

Unchecking therefore clears the stored username rather than leaving a stale
value behind.

**The password is never written to storage.** A test asserts the serialized
blob contains no password field.

## Error Handling

Preference storage is best-effort. A storage failure must never break login.

- **Storage unavailable.** Accessing `localStorage` can throw outright — not
  merely return `null` — under private browsing, disabled cookies, or a
  sandboxed iframe. The store catches this and falls back to an in-memory
  backend for the remainder of the session. The app continues with defaults;
  preferences simply do not persist.
- **Corrupt stored JSON.** `load()` catches the parse error and returns
  defaults. The unparseable value is left in place rather than eagerly
  deleted; the next `save()` overwrites it.
- **Quota exceeded on write.** `save()` catches, logs a warning via
  `console.warn`, and resolves normally. It does not reject, because a
  rejected preference save inside the submit handler would surface as a broken
  login.
- **Nothing throws out of the public interface.** `load`, `save`, and `clear`
  always resolve.

## Testing

Tests live in `test/preferences.test.mjs` and run via a new `package.json`
script, `"test": "node --test"`.

Cases:

1. Empty storage yields the defaults.
2. `save()` then `load()` round-trips a value.
3. A partial `save()` merges and does not drop other stored preferences.
4. Corrupt JSON in storage yields the defaults.
5. A backend that throws on read yields defaults without crashing.
6. A backend that throws on write does not propagate the error.
7. `clear()` removes stored values and returns to defaults.
8. Unknown keys in the stored blob are ignored.
9. The serialized blob never contains a password field.

### Known testing gap

The `app.js` wiring — prefill on load, save on submit — is not unit tested.
`app.js` touches the DOM at import time, so covering it requires a browser or
a DOM library, and adding jsdom is out of proportion to one checkbox. That
wiring is verified by loading the page manually, and the verification result
is reported explicitly rather than implied by the store's passing tests.

Because the page uses ES modules, it must be served over HTTP; `file://`
blocks module loading. Manual verification uses a static server such as
`npx serve`.

## Files

New:

- `preferences.mjs` — defaults, `createPreferencesStore`, error handling
- `test/preferences.test.mjs` — store unit tests

Modified:

- `app.js` — import the store, prefill on load, save on submit
- `index.html` — `<script type="module">`, "Remember me" checkbox
- `package.json` — `"scripts": {"test": "node --test"}`

Untouched:

- `src/index.js`, `src/utils.js` — unrelated CommonJS fixture code

## Risks and Assumptions

- **Assumption:** the page is served over HTTP during development and in any
  real deployment. Validate via the manual verification step, which uses a
  static server. If the page must remain openable from `file://`, the module
  format decision has to be revisited before implementation.
- Node availability for `node --test` is confirmed, not assumed: the host runs
  Node v26.8.2.
- Storing a username in `localStorage` is a deliberate, user-opted choice on a
  shared-device threat model no worse than any "remember me" checkbox. No
  credential is stored.
