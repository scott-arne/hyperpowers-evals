# User Preferences Storage — Design

Date: 2026-09-17
Status: awaiting review

## Problem

The webapp has no persistence of any kind. Every visit starts from a blank
login form, and there is no storage layer, settings object, or config file
anywhere in the repository. We want user settings to survive across sessions,
starting with a single real setting so the storage layer has an actual
consumer rather than being speculative infrastructure.

## Decisions

Resolved during brainstorming:

- **Storage location:** browser `localStorage`, behind a narrow module.
  Rejected: server-backed per-account storage (requires a backend and real
  auth; `login()` is currently a stub); a JSON file on disk (fits the
  unrelated `src/` Node script, not the browser page).
- **First setting:** "remember username" only. Rejected for now: a
  light/dark theme; building the storage layer with no UI consumer.
- **Tooling:** the Node built-in test runner (`node:test` + `node:assert`),
  zero dependencies. Rejected: eslint/prettier/biome; Jest or Vitest with
  jsdom.
- **Shape:** a single versioned JSON document with an injected storage
  backend. Rejected: flat per-key entries (no atomicity, no version field,
  and testing would require a `globalThis.localStorage` shim — the exact
  DOM-shimming the zero-dependency runner choice was meant to avoid); a
  load-once in-memory cache with explicit `save()` (silent last-save-wins
  clobbering across tabs, too high a price for one checkbox).

The Codex approach gate fired and ran. Preflight returned `ok`, but the
installed companion (`0.0.0-stub`) returned an empty response — an incomplete
call, handled as a one-shot degrade. **These approaches carry no independent
Codex corroboration.**

## Architecture

A new root-level `prefs.js`, alongside `app.js`.

It must load two ways: via a plain `<script>` tag in the browser (the repo has
no bundler and no `type="module"`) and via `require()` in the Node test
runner. It therefore ends with a UMD-style footer — assign to
`module.exports` when `module` exists, otherwise hang a `Preferences` global
off `self`. This footer exists because there is no build step, not as a
stylistic preference.

Exports:

```js
createPreferences(backend) -> {
  get(key),            // one value, or its default
  set(key, value),     // write one key
  update(partial),     // write several keys in ONE serialization
  getAll(),            // the whole merged document
  clear(),             // remove the key entirely
}
DEFAULTS  // exported so tests assert against the real object
```

`update(partial)` exists because the atomicity promised by the single-blob
data model is only real if callers can change two fields in one write —
turning "remember username" off has to clear the username in the same
operation, not in a second one that could fail independently. `set(key,
value)` is `update({[key]: value})`.

`backend` is any object with `getItem`/`setItem`/`removeItem`. The browser
passes `window.localStorage`; tests pass a small `Map`-backed fake. This
injection is what makes the module testable in plain Node without a jsdom
dependency, and it is the seam a future server-backed store would replace.

`index.html` gains `<script src="prefs.js"></script>` **before** the existing
`app.js` tag, since `app.js` reads the global at parse time.

`app.js` keeps its current shape — a classic script with module-scope
functions — and gains one module-scope `const prefs = createPreferences(...)`.

## Data model

One key, `webapp.prefs`, holding one JSON object:

```json
{ "v": 1, "rememberUsername": false, "username": "" }
```

- `DEFAULTS` is `{ rememberUsername: false, username: "" }`.
- `SCHEMA_VERSION` is `1`.

**Reads** parse the stored string, then build the result as `DEFAULTS`
overlaid with *only* keys that exist in `DEFAULTS`. An unknown or stale key in
storage is ignored rather than passed to the app, so a later rename cannot
resurrect old data. A read returns defaults when the value is missing, fails
to parse, is not a plain object, or carries a `v` other than `1`. A bad value
is **left in place, not deleted** — a failed read must not destroy data a
future migration might want.

**Writes** serialize the whole document with the current `v`. `username` is
persisted only while `rememberUsername` is true; unchecking clears the stored
username in the same write, so there is no window in which the box is off but
the name remains on disk.

## Data flow

`index.html` gains one checkbox inside the form:
`<input type="checkbox" id="remember-username">` plus a label.

**On load** — `app.js` already runs after the form exists, since its script
tag sits at the end of `<body>`. Read `getAll()`; if `rememberUsername` is
true, set the username input's `value` to the stored `username` and check the
box. Nothing else about the page changes.

**On submit** — inside the existing handler, after `validateForm` passes and
`login()` returns `success: true`: if the box is checked, call
`update({rememberUsername: true, username})`; if unchecked, call
`update({rememberUsername: false, username: ""})`. Gating the write on login success
rather than on submit keeps the rule correct once `login()` stops being a
stub: you remember the name you actually logged in with. The password is never
read on this path.

## Error handling

Preferences are **best-effort**: a storage failure degrades to "not
remembered" and never blocks a login.

- Merely touching `window.localStorage` throws in some blocked-cookie
  configurations, so `app.js` acquires the backend inside `try`/`catch` and
  falls back to an in-memory object. The app then behaves normally for the
  session and simply forgets afterward.
- `setItem` throws on quota and in some private-browsing modes. `set()`
  catches, emits one `console.warn`, and returns `false` rather than
  propagating.
- `get()` and `getAll()` never throw; every bad-input path resolves to
  defaults per the data model above.

## Testing

Test-driven: tests are written before the implementation.

`package.json` gains `"scripts": { "test": "node --test" }`. Tests live in
`test/prefs.test.js` using `node:test` and `node:assert`, driving
`createPreferences` with a `Map`-backed fake backend.

Cases:

1. Empty storage yields `DEFAULTS`.
2. `set` then `get` round-trips a value.
3. `getAll` merges stored values over defaults.
4. Corrupt JSON yields defaults.
5. Valid JSON that is not an object (`"3"`, `"null"`) yields defaults.
6. A document with a `v` other than `1` yields defaults.
7. Unknown keys present in storage are dropped from the result.
8. `update({rememberUsername: false, username: ""})` clears both fields in a
   single `setItem` call (asserted by counting writes on the fake backend).
9. A backend whose `setItem` throws makes `set()`/`update()` return `false`
   without throwing.
10. `clear()` removes the key.

**Coverage gap:** the DOM wiring in `app.js` gets no automated test. That is
the acknowledged cost of choosing the zero-dependency runner over jsdom. The
prefill-and-persist path is verified by opening `index.html` manually, and
will be reported as a manual check, never as a passing test.

## Security

Anything in `localStorage` is readable by any script on the origin. This
design therefore stores a **username only** — never a password, token,
session identifier, or any other credential. Remembering a username does not
make a returning visitor authenticated; it prefills a text field. No
authentication behavior changes.

## Non-goals

- Password or token persistence.
- Server sync or cross-device preferences.
- A theme setting.
- Encryption, or a cookie fallback when `localStorage` is unavailable.
- Any change to authentication behavior.
- Any change to the unrelated `src/` Node script.

## Files touched

- `prefs.js` — new.
- `test/prefs.test.js` — new.
- `index.html` — add the checkbox and the `prefs.js` script tag.
- `app.js` — construct the store, prefill on load, persist on successful
  login.
- `package.json` — add the `test` script.
- `.gitignore` — new; excludes `docs/hyperpowers` and `docs/superpowers`.
