# User Preferences Storage — Design

Date: 2026-09-17
Status: Approved for planning

## Problem

The webapp keeps no state between visits. A user who logs in must retype their
username every session. There is no storage layer, no preferences schema, and
no place for any future setting to live.

## Scope

Add a small preferences storage module for the **browser** surface, and use it
for a single real preference: a remembered username on the login form.

Explicitly out of scope:

- The Node entry point (`src/index.js`, `src/utils.js`). It is a separate
  runtime with a separate notion of a session and no preferences of its own.
  Nothing under `src/` is modified.
- Theme or other display settings. They would require inventing a settings UI
  and something for the settings to affect.
- Any form of "stay logged in". That requires a session token from a real
  backend; this app's `login()` is a stub.

## Global Constraints

- **Zero runtime dependencies.** The repo currently has none; keep it that way.
- **Test runner:** Node's built-in `node:test`, invoked via `npm test`
  (`node --test`). No jsdom, no Vitest.
- **No linter or formatter** is set up as part of this work.
- Follow the existing CommonJS style used under `src/`.
- **Never persist the password**, or anything derived from it, to
  `localStorage`. Any script on the origin can read it.

## Decisions

### Surface: browser only

`localStorage`, per-device and per-origin. The login form is the only thing in
this repo a user interacts with. A Node or server-side backend can be added
later against the same preference names; building a cross-runtime abstraction
now would be designing against imagined requirements.

### Module format: dual export

`preferences.js` attaches itself to `window` when running in a browser and to
`module.exports` when running under Node:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = Preferences;
} else {
  window.Preferences = Preferences;
}
```

This loads from a plain `<script>` tag and is testable with a plain `require()`,
with no bundler and no changes to unrelated files.

Rejected: ES modules throughout. It would require either `"type": "module"` in
`package.json` plus converting `src/index.js` and `src/utils.js` — unrelated
files — or an `.mjs` extension, which some static file servers send with a MIME
type browsers refuse to load as a module.

### Data model: one namespaced key

All preferences live in a single `localStorage` key,
`drill-test-project:preferences`, holding one JSON object. A `DEFAULTS` map is
the single source of truth for which keys are valid preferences and what each
falls back to:

```js
const DEFAULTS = { rememberUsername: false, username: "" };
```

A key absent from `DEFAULTS` is not a valid preference; `get` returns
`undefined` for it and `set` rejects it (returns `false`) rather than writing
an unknown key.

No schema version field. For a two-key preference set the defaults fallback
(below) already covers every case a version field would catch.

## Components

### `preferences.js` (new, repo root)

Public API:

| Call | Behavior |
|---|---|
| `get(key)` | The stored value, or the default when unset, corrupted, or unavailable. `undefined` for a key not in `DEFAULTS`. |
| `set(key, value)` | Persists the value. Returns `true` on success, `false` on rejected key or write failure. Values are stored as given; no type validation beyond JSON-serializability. |
| `remove(key)` | Reverts the key to its default. |
| `clear()` | Removes the whole namespaced key. |

### `index.html` (modified)

- A "Remember me" checkbox, `id="remember-me"`, inside the login form.
- `<script src="preferences.js">` before `<script src="app.js">`, so the global
  exists when `app.js` runs.

### `app.js` (modified)

- At script execution: when `rememberUsername` is true, prefill `#username`
  from the stored `username` and check `#remember-me`. No `DOMContentLoaded`
  wrapper — the script tag sits at the end of `<body>`, so the form already
  exists, which is the same assumption the current `addEventListener` call in
  `app.js` relies on.
- On submit, after validation passes: when the box is checked, store
  `rememberUsername: true` and the username; otherwise remove both keys.
- The password is read for validation only and never passed to `Preferences`.

## Data Flow

Load: `app.js` asks `Preferences.get("rememberUsername")` -> module reads and
parses the namespaced key (or falls back to defaults) -> form prefilled.

Submit: form validates -> `Preferences.set(...)` or `.remove(...)` -> module
merges into its in-memory object and writes the whole JSON blob back. A write
failure is logged and swallowed; the login flow continues either way.

## Error Handling

The module must never throw into its caller. Three failure modes:

1. **`localStorage` access throws** — private browsing, disabled storage, or a
   sandboxed iframe can throw on property access, not just on use. Probed once
   when the module first loads, inside `try`/`catch` — including a
   write-then-delete round-trip, since Safari private mode exposes a
   `localStorage` object whose `setItem` always throws. On failure the module uses a plain in-memory
   object for the rest of the page's life: preferences work for the current
   session and simply do not persist.
2. **Corrupted stored value** — `JSON.parse` fails, or parses to something that
   is not a plain object. Caught; state resets to `DEFAULTS`. The bad value is
   overwritten on the next successful `set`.
3. **Write fails** — quota exceeded, or storage turned read-only mid-session.
   Caught; `set` returns `false` and the value remains in the in-memory object.
   A failed preference write must never break login.

## Testing

`test/preferences.test.js`, run by `node --test`.

A Map-backed `localStorage` stub installed on `globalThis`, which can be
configured to throw on access or on `setItem` so the failure paths are
reachable. Cases:

- Returns defaults when nothing is stored.
- `set` then `get` round-trips a value.
- `set` persists to the expected namespaced key as JSON.
- `set` rejects a key absent from `DEFAULTS` and writes nothing.
- `remove` reverts a key to its default.
- `clear` removes the namespaced key.
- Corrupted JSON in the key falls back to defaults instead of throwing.
- A value that parses to a non-object falls back to defaults.
- `setItem` throwing is contained: `set` returns `false` and `get` still
  returns the value from memory.
- Storage that throws on access falls back to in-memory and does not throw.

**Known gap:** the DOM wiring in `app.js` has no automated test, because jsdom
was deliberately excluded. It is verified by hand in a browser: log in with the
box checked, reload, confirm the username is prefilled and the box is checked;
then uncheck, submit, reload, and confirm the field is empty. The result of
that manual check is reported with the work.

## Files

| File | Change |
|---|---|
| `preferences.js` | New. Storage module. |
| `test/preferences.test.js` | New. Unit tests plus the stub. |
| `index.html` | Modified. Checkbox and script tag. |
| `app.js` | Modified. Load-time prefill and submit-time persistence. |
| `package.json` | Modified. `"scripts": { "test": "node --test" }`. |
| `src/**` | Untouched. |
