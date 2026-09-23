# User Preferences Storage — Design

Date: 2026-09-22
Status: Approved (design), pending implementation plan

## Problem

The webapp (`index.html` + `app.js`) has no notion of user settings and no
persistence of any kind. Returning users retype everything. We want
preferences that survive a browser session, starting with a "remember my
username" option on the login form.

## Scope

In scope:

- A browser-side preferences module with a narrow read/write interface.
- One concrete consumer: remembering the username on the login form.
- Unit tests for the preferences module.

Out of scope:

- Server-backed or cross-device preferences. The current `login()` is a stub
  that returns `{ success: true }` without contacting anything, so there is no
  user identity to key server-side preferences to. Adding one is a separate
  project.
- Storing the password. `prefs.js` never reads or writes it.
- Preferences for the `src/` CommonJS half of the repo, which is unrelated to
  the webapp and stays untouched.
- Theming or any other preference beyond the username.

## Decisions

### Backing store: browser `localStorage`

Chosen over a server-backed store because it delivers the feature with no
backend, no datastore, and no auth work, and over `sessionStorage` because
that is cleared when the tab closes, which is the opposite of the
requirement.

Consequence the user accepted: preferences are per-browser-per-device. The
same person on another device sees defaults.

### Data model: one namespaced key holding a JSON object

All preferences live in a single `localStorage` entry under `webapp.prefs`,
holding a JSON object, rather than one `localStorage` key per preference.

- Adding a preference later needs no new storage plumbing.
- `clear()` cannot wipe unrelated keys the page may use.
- Cost: every write re-serializes the whole object. Irrelevant at this size.

### Isolation

Every `localStorage` call is confined to `prefs.js`. Swapping in a
server-backed store later is a change to one file rather than to every call
site.

## Interface

```js
Prefs.get(key, fallback)   // parsed value, or fallback when absent/unreadable
Prefs.set(key, value)      // returns true on success, false on failure; never throws
Prefs.remove(key)          // deletes one preference, leaves the rest
Prefs.clear()              // empties the namespace
```

Plus one seam that is not part of the public surface:

```js
Prefs.init(store)          // re-point the backend; called at load with globalThis.localStorage
```

Loaded in `index.html` by a `<script>` tag before `app.js`, matching the
existing no-build, plain-global pattern. A footer exports the module for
CommonJS when `module` is defined, so the same file is `require()`-able by
tests.

## Error handling

`localStorage` fails in ways normal browsing does not show:

- Safari private mode throws `QuotaExceededError` on every write.
- A user can disable site data, so touching `window.localStorage` itself
  throws a `SecurityError`.
- The stored JSON can be corrupt, because anything on the page — or the user
  via devtools — can overwrite the key.

The module therefore never throws and never assumes:

- **Availability probe on load.** Write, read, and delete a throwaway key
  inside `try`. If it fails, fall back to an in-memory object: the page keeps
  working, preferences just do not survive the tab.
- **`get()` wraps the parse.** Malformed JSON, or a stored value that is not
  an object, is treated as "no preferences" and the entry is reset, rather
  than left to throw on every subsequent read.
- **`set()` returns `false`** on a quota or security failure instead of
  throwing, so callers can react. No silent empty `catch`.

## UI wiring

- `index.html` gains
  `<label><input type="checkbox" id="remember-username"> Remember me</label>`
  in the form.
- On submit, **after** validation passes: if checked,
  `Prefs.set('username', username)`; if unchecked, `Prefs.remove('username')`,
  so unticking actively clears a previously stored value rather than leaving
  it behind.
- On page load, read the stored username; if present, pre-fill `#username`
  and tick the checkbox.

Remembering is opt-in via the checkbox rather than automatic: the username
lands in browser storage that anyone using the device can read, so the user
should choose it.

## Deliberate omissions

- **No expiry** on the stored username. `localStorage` has no TTL and
  hand-rolling one for a "remember me" field is complexity without a
  requirement.
- **No cross-tab `storage` event sync.** The value is only read at load.

## Testing

Runner: Node's built-in `node:test` with `node:assert`, wired as
`"test": "node --test"` in `package.json`. Zero dependencies, which preserves
the repo's dependency-free character and matches the CommonJS already in
`src/`.

The storage backend needs a seam: the availability probe runs once at load, so
an internal `init(store)` — called at load with `globalThis.localStorage` and
exported for tests — lets tests re-initialize with a fake. This seam exists
for testability rather than for the feature; it earns its place because the
interesting failures are exactly the ones a real browser will not reproduce on
demand.

`test/prefs.test.js`, against a fake store (a `Map` wrapper that can be told
to throw):

- round-trip: `set` then `get` returns the value; `get` on a missing key
  returns the fallback
- `remove` deletes one preference and leaves the others
- `clear` empties the namespace
- corrupt JSON in the entry: `get` returns the fallback instead of throwing,
  and the entry is reset
- a non-object stored under the key (`"null"`, `"[]"`): same treatment
- backend throws on write (quota): `set` returns `false`, no throw
- backend throws on read (security): module falls back to in-memory, `get`
  and `set` still work
- values survive as types: a boolean stays a boolean, not `"true"`

**Not covered by automated tests:** the DOM wiring in `app.js` and
`index.html` — the checkbox, the pre-fill, the clear-on-untick. Covering it
needs jsdom, a dependency this design declined. It will be verified by hand in
a browser, with the checked behaviors reported explicitly. Adding jsdom is a
separate decision for the user.

## Files touched

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `test/prefs.test.js` | New. Unit tests. |
| `index.html` | Script tag for `prefs.js`; "Remember me" checkbox. |
| `app.js` | Load prefill on page load; save/clear on submit. |
| `package.json` | `"test": "node --test"`. |

`src/index.js`, `src/utils.js`, and `README.md` are untouched.
