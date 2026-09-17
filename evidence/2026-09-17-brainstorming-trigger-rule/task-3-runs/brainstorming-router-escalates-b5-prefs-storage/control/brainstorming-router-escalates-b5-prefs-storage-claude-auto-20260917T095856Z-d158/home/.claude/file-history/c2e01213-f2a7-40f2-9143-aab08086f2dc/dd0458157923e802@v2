# User Preferences Storage — Design

Date: 2026-09-17
Status: approved (design), not yet implemented

## Problem

The webapp has no way to remember anything about a user between visits. Every
page load starts from an empty form. We want user settings to persist across
sessions, and we want a storage foundation that later settings can build on
rather than a one-off hack in the submit handler.

## Decisions Already Settled

These were decided during brainstorming and are not open questions:

1. **Surface: the browser webapp** (`index.html` + `app.js`), persisting via
   `localStorage`. "Across sessions" means across page loads and browser
   restarts, scoped per browser and origin. The Node module under `src/` is
   unrelated to this work and is not touched.
2. **Scope: storage layer plus one real consumer** — a "remember my username"
   setting. A storage layer with no caller tends to grow options nobody needs;
   one concrete consumer keeps the API honest.
3. **Tooling: Node's built-in test runner** (`node --test`), zero
   dependencies. No linter or formatter — overhead without a team on a
   codebase this size.

## Global Constraints

- **Zero runtime and zero dev dependencies.** No `node_modules`, no build
  step. The repo has none today and this change does not introduce any.
- **Unit-test infrastructure is part of this work**: a `test/` directory, a
  `"test"` script in `package.json`, and passing tests for the new module.
- **The password is never written to storage.** `localStorage` is readable by
  any script on the origin. A test pins the exact set of keys the stored blob
  may contain (see Testing, case 10); the `app.js` side is enforced by review,
  since it is not unit-testable without browser tooling.
- **Unrelated files are not modified.** `src/index.js`, `src/utils.js`, and
  `README.md` stay as they are. In particular, `package.json` does not gain a
  `"type": "module"` field, because that would break the CommonJS modules
  under `src/`.
- The spec and plan documents are working files. Do not commit them.

## Architecture

One new file, `preferences.js`, at the repo root alongside `app.js`.

It exports a factory rather than a singleton, with storage injected:

```js
createPreferences({
  storage,              // defaults to globalThis.localStorage
  namespace = "prefs",  // the localStorage key the blob lives under
  defaults = {},        // values returned for keys never written
});
// -> { get, set, remove, clear, all }
```

The injected `storage` parameter is what makes the module testable in Node
with no jsdom and no dependencies: tests pass a `Map`-backed fake implementing
the three methods actually used (`getItem`, `setItem`, `removeItem`).

### API

| Method | Behavior |
|---|---|
| `get(key)` | Returns the stored value; falls back to `defaults[key]`; `undefined` if neither exists. |
| `set(key, value)` | Writes the value. Returns `true` on success, `false` if the write failed (e.g. quota). |
| `remove(key)` | Deletes the key, so `get` falls back to its default again. Returns `true`/`false` the same way. |
| `clear()` | Removes the entire namespace blob. |
| `all()` | Returns a plain object of defaults merged with stored values. Callers get a copy, not internal state. |

### Module format

`src/` is CommonJS, `app.js` loads as a plain `<script src>`, and
`package.json` declares no `"type"`. `preferences.js` therefore uses a
dual-export guard: it assigns to `module.exports` when `module` is defined
(Node tests) and to `globalThis.Preferences` otherwise (the browser).

This was chosen over two alternatives:

- **Converting the project to ES modules** would require `"type": "module"` in
  `package.json` and rewriting `src/index.js` and `src/utils.js` — a refactor
  of files unrelated to this task.
- **Naming the file `.mjs`** avoids the config change but depends on the
  serving environment sending a JavaScript MIME type for `.mjs`, which is not
  guaranteed for `file://` or minimal static servers.

The guard is mildly old-fashioned, but it matches the repo's existing
vanilla-script idiom, touches no unrelated file, and needs no configuration.

## Data Model

All preferences live under a **single** `localStorage` key (the namespace),
holding a versioned JSON envelope:

```json
{ "v": 1, "data": { "rememberUsername": true, "username": "ada" } }
```

Chosen over one `localStorage` key per preference because it gives atomic
read/write, a single place to validate shape, trivial clearing, and a
migration hook (`v`) at no cost.

**Accepted tradeoff:** with one blob, two browser tabs writing different
preferences will clobber each other — last write wins. With two settings on a
login page this is negligible. If the number of settings grows materially,
splitting into per-key storage is a contained change behind this same API.

Defaults for this iteration:

```js
{ rememberUsername: false, username: "" }
```

## Error Handling

No method throws at the caller. The app must never break because storage
misbehaved; it degrades to not remembering things.

| Condition | Behavior |
|---|---|
| `localStorage` unavailable or throws on access (private mode, cookies disabled) | Detected at construction via a probe write/remove in `try`/`catch`; falls back to an in-memory `Map`. The API works for the lifetime of the page; nothing persists. |
| Stored value is malformed JSON | Caught; treated as an empty preference set; overwritten on the next successful write. |
| Stored value parses but is not an object, or has an unexpected `v` | Treated as empty, same as malformed. |
| `setItem` throws (quota exceeded) | Caught; `set` returns `false` and the value is **not** retained. A later `get` returns the previous value or the default. |
| `get` on a key never written | Returns `defaults[key]`, else `undefined`. |

## Feature Wiring

### `index.html`

- Add a checkbox inside the login form:
  `<label><input type="checkbox" id="remember-me" /> Remember my username</label>`
- Add `<script src="preferences.js"></script>` **before** `<script src="app.js"></script>`,
  so `globalThis.Preferences` exists when `app.js` runs.

### `app.js`

- Construct a module-level preferences instance with the defaults above.
- On load (the script already runs at end of `<body>`, so the form exists):
  if `rememberUsername` is true, prefill `#username` with the stored
  `username` and check `#remember-me`.
- In the submit handler, after validation passes:
  - checkbox checked -> `set("rememberUsername", true)` and
    `set("username", username)`
  - checkbox unchecked -> `set("rememberUsername", false)` and
    `remove("username")`
- The password is read from the DOM and passed to `login()` only. It is never
  passed to any preferences method.

The existing `login` and `validateForm` functions are unchanged.

## Testing

`test/preferences.test.js`, run via `node --test` (a new `"test"` script in
`package.json`). Tests use a `Map`-backed fake storage; no browser, no jsdom.

Cases:

1. `get` returns the configured default for a key never written.
2. `get` returns `undefined` for an unknown key with no default.
3. `set` then `get` round-trips a value.
4. **A fresh instance constructed over the same storage sees previously
   written values** — this is the "persists across sessions" property itself,
   and is the single most important test in the suite.
5. `remove` restores the default; `clear` empties the whole namespace.
6. `all()` returns defaults merged with stored values.
7. Malformed JSON already in storage: `get` returns defaults and does not
   throw; a subsequent `set` repairs the blob.
8. A storage whose `setItem` throws: `set` returns `false` and does not throw.
9. A storage that throws on every access: construction succeeds and the
   in-memory fallback round-trips values.
10. Nothing resembling a password is ever written: after writing exactly the
    keys `app.js` writes (`rememberUsername`, `username`), the serialized blob
    contains exactly those two keys and nothing else.

`app.js` itself is not unit-tested — it depends on the DOM, and browser test
tooling is explicitly out of scope. Test 10 pins the storage module's
serialized shape; the guarantee that `app.js` never passes a password to it is
enforced by code review of a five-line handler, not by a test.

Manual verification (not automated, no browser tooling in scope): open
`index.html`, log in with the box checked, reload, confirm the username is
prefilled; uncheck, submit, reload, confirm it is not.

## Out of Scope

Deliberately excluded to keep this focused:

- A settings panel or any multi-setting UI.
- Theme, locale, or any preference beyond remember-username.
- Server-side sync or any backend (none exists).
- Encryption of stored values.
- Cross-tab synchronization via the `storage` event.
- A migration framework beyond the `v` field being present.

## Files

| File | Change |
|---|---|
| `preferences.js` | New. The storage module. |
| `test/preferences.test.js` | New. The test suite. |
| `index.html` | Modified. Checkbox plus the new script tag. |
| `app.js` | Modified. Prefill on load, persist on submit. |
| `package.json` | Modified. Adds the `"test"` script. |
