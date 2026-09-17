# User Preferences Storage — Design

Date: 2026-09-16
Status: approved design, not yet implemented

## Overview

The app has no way to remember anything between visits. This design adds a
single preferences module that any part of the app can read from and write to,
backed by browser `localStorage`, and wires the login form to it as its first
consumer: an opt-in "remember my username" checkbox that pre-fills the username
field on return visits.

The module — not the checkbox — is the deliverable. Additional settings and
forms are expected to consume it, so the interface it exposes is the part that
has to survive.

## Goals

- Preferences persist across browser sessions on the same device.
- One shared mechanism usable from anywhere in the app, not logic bolted to the
  login form.
- Adding a preference later is a one-line change in one place.
- A missing, corrupt, or unavailable store degrades to declared defaults and
  never breaks the page.

## Non-goals

- Cross-device or cross-browser sync. Preferences are per-device.
- Persisting credentials or session state. This is not "remember me"
  authentication: no tokens, no password, no login persistence.
- Server-side or user-keyed storage. `login()` is a stub that returns
  `{success: true}` unconditionally, so there is no real user identity to key
  on. The design leaves a seam for this (see Extension) but does not build it.
- A build step, bundler, ES modules, or a framework.
- Preferences for the `src/index.js` Node demo, which shares no code with the
  web page.

## Global constraints

- **Zero runtime and development dependencies.** `package.json` currently has
  none; the implementation keeps it that way.
- **Unit tests via `node:test`**, the runner built into Node. A `test/`
  directory with at least one passing fixture is part of the work. No lint,
  format, or end-to-end tooling is being introduced (considered and declined).
- **Classic scripts, plain globals.** `app.js` is loaded with a plain
  `<script src>` tag and uses no module system. New browser code matches that.
- Match the existing file style: two-space indent, double-quoted strings,
  semicolons, as in `app.js`.

## Architecture

A new file, `preferences.js`, at the repository root alongside `app.js`. It is
loaded in `index.html` **before** `app.js` and exposes one global, `Preferences`.

Three internal pieces:

1. **The schema registry** — a module-level table declaring every preference
   once: its key, its default, and a validator.
2. **The storage backend** — resolved once at load. Either real `localStorage`
   or an in-memory `Map` fallback. All reads and writes go through it.
3. **The public interface** — four functions over the first two.

Nothing else in the app touches `localStorage` directly.

### Schema registry

```js
const PREFERENCE_SCHEMA = {
  rememberUsername: { default: false, validate: (v) => typeof v === "boolean" },
  lastUsername:     { default: "",    validate: (v) => typeof v === "string" && v.length <= 256 },
};
```

Defaults and validators live here and only here, so they cannot drift across
call sites as more forms consume the module. Adding a preference means adding
one entry.

### Public interface

- **`Preferences.get(key)`** — returns the stored value, or the declared default
  when the entry is missing, unparseable, fails validation, carries an
  unrecognized format version, or storage is unreadable. Never throws for a
  known key.
- **`Preferences.set(key, value)`** — validates `value` against the schema, then
  writes. Returns `true` if the write landed, `false` if it did not persist
  (for example, quota exhausted or the in-memory fallback is active). Returns
  `false` without writing if validation fails.
- **`Preferences.clear(key)`** — removes one preference, reverting it to its
  default.
- **`Preferences.clearAll()`** — removes every preference the module owns, by
  iterating `PREFERENCE_SCHEMA`. It must **not** call `localStorage.clear()`,
  which would destroy storage belonging to other code on the same origin.

`get`, `set`, and `clear` throw a `TypeError` for a key absent from the schema.
An unknown key is a programming error, not a runtime condition, and should fail
loudly rather than silently returning `undefined`.

### Stored format

One `localStorage` entry per preference, keyed `app.pref.<key>` — for example
`app.pref.rememberUsername`. Each entry holds:

```json
{"v": 1, "value": false}
```

`v` is the per-value format version. Nothing reads it beyond rejecting
unrecognized versions today; it exists because code can be added later but data
already sitting in users' browsers cannot be retroactively versioned. An entry
whose `v` is not recognized is treated exactly like a corrupt entry: `get`
returns the default.

One key per preference, rather than a single combined document, so that two
tabs writing different preferences do not clobber each other and a single
corrupt entry costs one preference instead of all of them.

## Failure behavior

Storage is not always available. `localStorage` throws when storage is
disabled, in some private-browsing modes, and when quota is exhausted; on some
browsers merely accessing the `window.localStorage` property throws a
`SecurityError`.

At load, the module probes once inside a `try`/`catch`: write a sentinel key,
read it back, remove it. If the probe succeeds, the backend is `localStorage`.
If it throws or the value does not round-trip, the backend is an in-memory
`Map`, which gives correct within-page behavior that simply does not survive a
reload.

Individual operations remain wrapped in `try`/`catch` regardless, because quota
errors can appear mid-session on a store that probed fine.

The governing rule: **a broken storage layer degrades to defaults and never
breaks the page.** No exception from this module propagates into a form
handler. A failed write surfaces as a `false` return value, not a throw.

## Security and privacy

- **The password is never stored, in any form.** Only `lastUsername`, and only
  when the user has opted in.
- **Stored values are untrusted input.** Any script on the origin, the devtools
  console, or an XSS can write arbitrary content to `localStorage`. Values are
  therefore validated on read against the schema, `lastUsername` is capped at
  256 characters, and a restored value is only ever assigned to `input.value`
  — never to `innerHTML` or any sink that could execute it. A tampered
  preference cannot become script.
- **`localStorage` is plaintext and readable by anyone with the device.** A
  remembered username is a mild disclosure on a shared machine. This is what
  makes the opt-in checkbox load-bearing rather than decorative, and why
  unchecking it must actively erase the stored value rather than merely stop
  writing new ones.

## UI and consumer changes

### `index.html`

Add a labeled checkbox inside the existing form, after the password field:

```html
<label><input type="checkbox" id="remember-username" /> Remember my username</label>
```

Add `<script src="preferences.js"></script>` before the existing
`<script src="app.js"></script>`.

### `app.js`

Two behaviors, both using only the `Preferences` interface:

**On load** (inline at the end of the script, where the DOM is already parsed
because the script tag sits at the end of `<body>`): if
`Preferences.get("rememberUsername")` is true, check the box and set the
username input's `value` to `Preferences.get("lastUsername")`.

**On submit**, after `validateForm` passes and before the existing `login()`
call: if the box is checked, `set("rememberUsername", true)` and
`set("lastUsername", username)`; if it is not, `set("rememberUsername", false)`
and `clear("lastUsername")`.

**On checkbox change**, when the box transitions to unchecked: immediately
`set("rememberUsername", false)` and `clear("lastUsername")`. Opting out takes
effect when the user opts out, not at some later submit that may never happen.

The existing `login()` and `validateForm()` functions are not modified.

## Testing

`node:test` with a `test/preferences.test.js` file, run via a `test` script in
`package.json` (`node --test`).

For the tests to reach `preferences.js` from Node, the file ends with a dual
export guard: attach `Preferences` to `window` when `window` exists, and to
`module.exports` when `module` exists. This is the only concession the browser
code makes to testability, and it introduces no dependency.

The storage backend is injectable for tests through a single exported hook,
`Preferences._setBackendForTesting(backend)`, where `backend` implements
`getItem`/`setItem`/`removeItem`. The underscore marks it internal; it is the
only test-only surface. This lets the fallback and corrupt-data paths be driven
without a browser.

Cases to cover:

- `get` returns the declared default when nothing is stored.
- `set` then `get` round-trips each declared preference.
- `set` rejects a value failing validation and leaves the stored value intact.
- `set`/`get`/`clear` throw `TypeError` for an unknown key.
- `get` returns the default for a corrupt entry (invalid JSON).
- `get` returns the default for an entry with an unrecognized `v`.
- `get` returns the default for a well-formed entry whose value fails
  validation (the tampering case).
- `clear` reverts one preference without disturbing others.
- `clearAll` removes only `app.pref.*` keys and leaves unrelated keys untouched.
- With the backend unavailable, `get` returns defaults and `set` returns
  `false` without throwing.

The login-form wiring in `app.js` is DOM-coupled and is not unit tested; no
end-to-end tooling is being introduced. It is verified manually by loading
`index.html`, checking the box, submitting, reloading, and confirming the
username is pre-filled — then unchecking and confirming it is gone after a
reload.

Assumption: the reviewer has a browser available for that manual check;
validate via running it once at implementation time and reporting the result.

## Extension

**Adding a preference:** one entry in `PREFERENCE_SCHEMA`, then call
`Preferences.get`/`set` from the consuming form. No other file changes.

**Changing a stored shape:** bump `v` for that preference and have `get`
translate recognized older versions instead of discarding them.

**Moving to a user-keyed remote store:** the storage backend is the seam. A
backend that reads and writes through an API replaces the `localStorage` one
without the public interface or any consumer changing. This is explicitly not
built now — `login()` is a stub with no real identity behind it.

## Rejected alternatives

- **Single versioned JSON document** (all preferences under one key). Cleanest
  migration story and trivial export/import, but every write rewrites every
  preference, so a stale tab can silently clobber another tab's change, and one
  malformed blob loses every setting at once.
- **Thin key/value wrapper with call-site defaults and no schema.** The least
  code, and the right answer if this stayed one preference forever. Rejected
  because more settings and forms are expected: call-site defaults duplicate and
  drift, nothing validates data coming back out of storage, and without a
  version marker old and new data become indistinguishable.
- **Node-side file store** and **user-keyed backend store**, both declined
  during the clarifying questions — the first solves a problem the login page
  does not have, the second requires a backend and a real user identity that do
  not exist.

## Notes

An independent Codex approach consultation was attempted for this design and
returned an empty response. The approaches above are unreviewed by Codex.
