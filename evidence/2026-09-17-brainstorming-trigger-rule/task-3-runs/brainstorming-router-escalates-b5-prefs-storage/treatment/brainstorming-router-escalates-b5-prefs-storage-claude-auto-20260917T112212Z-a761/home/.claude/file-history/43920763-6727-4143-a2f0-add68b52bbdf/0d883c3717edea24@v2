# User Preferences Storage — Design

Date: 2026-09-17
Status: approved for planning
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no way to persist anything between visits. Every page load starts
from a blank state, and there is no storage layer any future setting could use.
The request is for user preferences that survive across sessions.

Today the app is `index.html` plus `app.js`: a login form whose `login()` is a stub
returning fixed success, with `API_ENDPOINT` never called. There is no backend, no
authentication, no user identity beyond the username typed into the form, and no
settings UI. The `src/` directory holds an unrelated CommonJS demo module
(`greet`); this feature does not touch its contents.

## Goals

- A preferences module with a narrow, storage-agnostic interface that persists
  values across browser sessions.
- One real preference — a remembered username — wired end-to-end through the
  existing login form, proving persistence across a page reload.
- Unit tests that run with no browser and no third-party dependencies.

## Non-goals

- Server-backed or cross-device preferences. There is no backend; `API_ENDPOINT`
  is a stub. Preferences are per-browser, per-device.
- A settings panel or any general settings UI.
- Preferences for the `src/` Node demo module.
- Linting, formatting, or end-to-end browser test infrastructure.
- Any form of authentication or real login.

## Global constraints

These were selected during brainstorming and bind every task in the plan:

- **Storage backend:** browser `localStorage`.
- **Module format:** ES modules, loaded natively in the browser with no build step
  and imported directly by Node's test runner.
- **Tooling:** unit tests via `node --test` only. No ESLint, no Prettier, no e2e
  infrastructure.
- **Dependencies:** none. The repo stays free of third-party packages, including
  devDependencies.
- **Security:** the password is never read into preferences, never persisted, and
  never logged. Only the username is storable, and only when the user opts in.

## Architecture

### Data model

A single `localStorage` key holds all preferences as one JSON object:

```
key:   webapp.prefs.v1
value: {"rememberedUsername":"ada"}
```

The `v1` suffix is the migration seam. A future change to the stored shape writes
`webapp.prefs.v2` and reads `v1` once to convert, rather than guessing at the
meaning of an untagged blob.

Rejected alternatives, recorded so they are not re-litigated:

- **One key per preference.** Avoids cross-tab write conflicts, but leaves no
  single place to version, no atomic read or clear of the set, and orphaned keys
  from removed features. The preference set here is too small for its benefits to
  apply.
- **Blob plus a declared schema registry** (per-preference validators). Strongest
  guarantees against malformed values, but real ceremony for a module starting
  with one string preference. Validation can be added inside the chosen design
  later, when a preference has a type that can break a caller.

The known weakness of the chosen model is that every write reserializes the whole
object, so two tabs writing different preferences in the same instant can clobber
each other. Accepted: at this preference count the window is negligible, and
versionability matters more.

### Module: `preferences.js`

Lives at the repo root, alongside `app.js`.

```js
createPreferences({ storage })   // factory; storage defaults to localStorage
  .get(key)                      // stored value, else the default, else undefined
  .getAll()                      // defaults merged over with stored values
  .set(key, value)               // persist, then notify subscribers
  .clear()                       // remove the key entirely, reverting to defaults
  .subscribe(listener)           // returns an unsubscribe function
```

The module also exports a default instance bound to the real `localStorage`, which
is what `app.js` imports. The factory is the testability seam: tests construct an
instance over a fake storage object, so the suite needs no browser, no jsdom, and
no dependency.

`DEFAULTS` is a frozen object owned by the module, initially:

```js
{ rememberedUsername: "" }
```

`get` falls back to it, so callers never branch on `undefined` and never restate a
default at the call site.

### Error handling

The governing rule: **a storage problem degrades to defaults, never to an
exception.** A preferences layer that can throw turns a minor browser condition
into a broken page.

| Condition | Behavior |
|---|---|
| `localStorage` absent or throwing on access (private mode, cookies disabled, sandboxed iframe) | Caught at construction; falls back to an in-memory store. The app works for the session; nothing persists. |
| Stored value is not valid JSON | Discarded; defaults used. No throw. |
| Stored value parses to a non-object (array, string, `null`) | Discarded; defaults used. No throw. |
| `setItem` throws (quota exceeded) | Caught. The in-memory value still updates and subscribers still fire, so the UI stays consistent for the session. A `console.warn` records it. |

### Cross-tab synchronization

When `window` exists, the module listens for the browser's `storage` event,
re-reads the blob, and notifies subscribers, so two open tabs do not diverge. The
listener registration is guarded on `window` being defined so the module imports
cleanly under Node.

## Module system

Node selects ESM or CommonJS by file extension and the nearest `package.json`
`type` field. Two facts collide here: `preferences.js` and its test must be ESM,
while `src/index.js` and `src/utils.js` use `require()` and must stay CommonJS.

Resolution:

- Add `"type": "module"` to the root `package.json`.
- Add a new `src/package.json` containing `{"type": "commonjs"}`, pinning the demo
  module to its current semantics.

This is one new file and zero edits to existing `src/` code. The alternative —
renaming `src/*.js` to `.cjs` — edits unrelated files for no benefit. Naming the
new files `.mjs` was also rejected: some static servers do not map `.mjs` to a
JavaScript MIME type, and the browser then refuses to execute the module.

## App integration

### `index.html`

- The script tag becomes `<script src="app.js" type="module"></script>`.
- A "Remember me" checkbox and label are added to the login form.

Module scripts are deferred, so `app.js` now runs after the DOM is parsed. Its
existing top-level `getElementById("login-form")` becomes strictly more reliable.

### `app.js`

- Imports the default preferences instance.
- On load, prefills `#username` from `rememberedUsername`, and checks the
  "Remember me" box when a stored username is present.
- On successful submit: if the box is checked, store the username; if unchecked,
  call `clear()` so nothing lingers.

Remembering is user-controlled rather than automatic, so the preference is visible
and reversible. A preference the user cannot see or turn off is not really a
preference, and the clear-on-uncheck path exercises `clear()` in the real app.

`API_ENDPOINT`, `login()`, and `validateForm()` become module-scoped rather than
global. Nothing outside `app.js` references them, so this is not a behavior change.

## Testing

`test/preferences.test.js`, run by `node --test` via a new
`"scripts": { "test": "node --test" }` entry in `package.json`.

The suite drives the factory with a fake storage object — a `Map` behind a
`localStorage`-shaped API, plus variants that throw — and covers:

- returns the default when storage is empty
- `set` then `get` round-trips; `getAll` merges defaults with stored values
- a second instance constructed over the same storage sees the earlier write (the
  "persists across sessions" assertion)
- corrupt JSON falls back to defaults without throwing
- a non-object payload falls back to defaults without throwing
- storage throwing on `getItem` does not crash construction
- storage throwing on `setItem` does not crash `set`; the value stays readable
- `subscribe` fires on `set`; the returned unsubscribe stops further calls
- `clear` removes the key and reverts to defaults

### Manual verification

Unit tests were chosen as the only automated tier, so the browser-side behavior —
prefill, checkbox state, clear-on-uncheck, and persistence across a real reload —
is verified by loading the page over a static server and reloading it. Results are
reported as observed; no browser behavior is asserted without having been run.

## Extension path

The `get`/`set`/`subscribe` interface is deliberately independent of
`localStorage`. Adding preferences means extending `DEFAULTS`. Changing the stored
shape means a `v2` key and a one-time read of `v1`. Moving to server-backed,
per-account preferences means a new storage implementation behind the same
factory, plus a migration — the call sites in `app.js` would not change. Per-value
validation, if a future preference needs it, is added inside this module rather
than at call sites.

## Risks and open items

- **Per-device only.** A user on a second browser or device sees defaults. This is
  inherent to the chosen backend and was accepted explicitly.
- **Readable by anything on the page.** A remembered username in `localStorage` is
  readable by any script running on the origin and by anyone with access to the
  device. Normal for "remember me", and the reason the checkbox and the
  clear-on-uncheck path exist. Passwords are excluded outright.
- **Concurrent cross-tab writes** to different preferences can clobber one
  another. Accepted; see Data model.
- Assumption: the page is served over a static HTTP server rather than opened via
  `file://`, since ES modules do not load over `file://`. Validate by serving the
  directory during manual verification and noting the command used.
