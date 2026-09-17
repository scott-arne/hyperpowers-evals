# User Preferences Storage — Design

Date: 2026-09-16
Status: Approved (design), not yet implemented

## Problem

The webapp has no way to remember anything about a user between visits. Every
page load starts from an empty login form, and there is no place to put a
setting even if we had one. This spec adds a small preferences layer that
persists across browser sessions, and wires it to one real consumer so the
layer is exercised end to end rather than shipped unused.

## Scope

In scope:

- A reusable preferences store (`src/preferences.js`).
- One consumer: an opt-in "Remember me" checkbox on the login form that
  prefills the username on return visits.
- Unit tests for the store, using Node's built-in test runner.

Out of scope:

- A settings UI or settings page.
- Any preference beyond `rememberUsername` and `lastUsername`.
- Server-side or cross-device preference sync.
- Changes to `src/index.js` and `src/utils.js`, which are unrelated to this
  work and keep their current module style.

## Decisions

These were settled during brainstorming and the design depends on them.

1. **Device-local storage with a synchronous API.** Preferences live in
   `localStorage`. A server-backed store would follow the user across devices
   but requires an authenticated backend that does not exist — `login()` in
   `app.js` is a stub that never calls `API_ENDPOINT`. A synchronous API also
   lets the login form prefill during page load with no loading state.
2. **No pre-emptive async shaping.** The API is synchronous, not
   Promise-returning. The injectable storage backend (below) is the seam a
   future server-backed store would replace; shaping every caller around a
   migration that may never happen is not worth the complexity today.
3. **Opt-in consent.** The username is persisted only when the user checks
   "Remember me". This is a login form that may run on a shared machine, so
   storing an identifier without consent is the wrong default.
4. **Dual export, no build step.** `src/preferences.js` assigns
   `module.exports` when it exists and otherwise attaches to the browser
   global. This lets the browser load it with a plain `<script>` tag and lets
   Node tests `require()` it, without converting the repo to ES modules or
   introducing a bundler.
5. **Single JSON blob.** All preferences live under one `localStorage` key as
   one JSON object, rather than one entry per preference. This keeps `clear()`
   to a single call and gives a future schema migration one place to hook.

## Architecture

### Storage module

New file: `src/preferences.js`.

```
createPreferences(storage)   // storage defaults to globalThis.localStorage
  .get(key)                  // stored value, else the default, else undefined
  .set(key, value)           // persists the value
  .remove(key)               // drops the key, reverting to its default
  .clear()                   // drops the whole blob
```

- Storage key: `"prefs"`.
- Defaults table: `{ rememberUsername: false, lastUsername: "" }`. Defaults are
  merged on read, so an absent or partial blob still yields sensible values.
- The `storage` parameter is the isolation seam. It must satisfy the
  `getItem`/`setItem`/`removeItem` shape, which both `localStorage` and a
  test fake can provide. Nothing in the module reaches for `window` directly
  except the default argument.
- Exported surface: `createPreferences` (the factory) plus `preferences`, a
  ready-made instance over the real `localStorage` so `app.js` does not have to
  construct one. In the browser both hang off a single `window.Preferences`
  object; under Node both are named exports of `module.exports`.

### Data flow

Read path: `get(key)` reads the raw string from `storage`, parses it, merges it
over `DEFAULTS`, and returns the requested field.

Write path: `set(key, value)` reads and parses the current blob, assigns the
field, and writes the serialized object back.

Both paths go through a single internal read helper and a single internal write
helper, so the error handling below exists in exactly one place each.

### Error handling

`localStorage` is not reliably available, and this is the part of the design
most likely to be got wrong:

- Access can throw outright when storage is disabled by browser settings.
- `setItem` throws in Safari private mode and on quota exhaustion.
- The stored blob can be corrupt, truncated, or not an object — a user or
  another script can write anything to that key.

Required behavior:

- Any throw from the backing store is caught. On first failure the module
  falls back to an in-memory object and keeps using it for the lifetime of the
  page, so preferences degrade to non-persistent rather than breaking the app.
- A failure to persist is never surfaced to the caller as an exception. Login
  must keep working when storage does not.
- Corrupt or non-object JSON is treated as an empty preferences object, not
  thrown. The next successful write replaces it.

### Consumer: remember-me on the login form

`index.html`:

- Add `<script src="src/preferences.js"></script>` before the existing
  `app.js` tag, so the global is defined when `app.js` runs.
- Add a `Remember me` checkbox (`id="remember-me"`) to the login form.

`app.js`:

- On load, if `rememberUsername` is true, prefill `#username` with
  `lastUsername` and check the box.
- On successful login, if the box is checked, store `lastUsername` and set
  `rememberUsername` to true; if unchecked, remove both so a previously
  remembered username does not linger.
- The password is never read from or written to storage under any branch.
  Only the username is persisted, and only with the box checked.

## Testing

Tooling: Node's built-in `node:test` runner, with a `test` script added to
`package.json`. No dependencies and no install step. No linter or formatter is
being introduced.

New file: `test/preferences.test.js`. The storage seam is what makes these
tests possible without a browser.

Cases:

- Round trip: `set` then `get` returns the value.
- Defaults: `get` on an untouched store returns the declared default.
- Unknown key: `get` on a key with no default returns `undefined`.
- Removal: `remove` reverts a key to its default; `clear` empties the store.
- Persistence: a second `createPreferences` over the same backing storage sees
  values written by the first.
- Corrupt data: a backing store holding non-JSON, or JSON that is not an
  object, reads as empty instead of throwing.
- Storage unavailable: a fake whose `getItem`/`setItem` throw must not
  propagate; the store keeps working in memory for the rest of its life.

The login-form wiring is verified manually in the browser — the repo has no DOM
test infrastructure, and introducing one is out of scope.

## Risks and assumptions

- Assumption: preferences are acceptable per-browser rather than per-account.
  Validate by confirming with the user if a real backend later lands; the
  storage seam is the migration point.
- A user on a shared machine who checks "Remember me" leaves their username in
  that browser. This is the standard tradeoff for the feature and is why the
  behavior is opt-in and reversible by unchecking the box.
- `localStorage` is cleared by privacy tooling and by the browser under storage
  pressure. Losing preferences is a silent, acceptable outcome; the defaults
  table means a missing blob is indistinguishable from a fresh visit.
