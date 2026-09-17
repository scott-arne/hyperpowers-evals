# User Preferences Storage — Design

Date: 2026-09-16
Status: approved design, not yet implemented
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no persistence of any kind. Every page load starts from
scratch: the username field is empty, and there is no theme to remember
because there is no theme. "Settings persist across sessions" requires both
a storage subsystem and at least one real setting to store.

## Scope

In scope: a browser-side preferences module backed by `localStorage`, two
concrete preferences wired into the existing login page, and unit-test
infrastructure covering the module.

Out of scope: any Node-side preferences for `src/index.js`; a server-side or
cross-device sync mechanism; a general settings screen; linting/formatting
setup; end-to-end browser tests.

## Global Constraints

These apply to every task in the implementation plan.

- **No new dependencies.** `package.json` has none today and gains none.
  The test runner is Node's built-in `node:test` (Node v26 on this host).
- **No build step.** `index.html` loads scripts through plain `<script src>`
  tags. No bundler, no transpiler, no `type="module"`.
- **Test-driven.** Tests for `prefs.js` are written before the
  implementation.
- **The password is never persisted.** See "Security constraint" below.
- **Unit tests only.** No lint/format tooling, no end-to-end tests. This was
  an explicit scope decision, not an oversight.

## Decisions and Rejected Alternatives

| Decision | Chosen | Rejected |
|---|---|---|
| Runtime | Browser (`localStorage`) | Node CLI JSON file; dual-backend adapter module |
| Preferences | Remembered username, theme | Last-visit timestamp |
| Storage layout | One versioned JSON blob under one key | One key per preference |
| Read strategy | Read-through on every `get` | Hydrate-once in-memory cache |
| Module loading | Conditional CommonJS export footer | ESM via `type="module"` |
| Tooling | Node built-in test runner | ESLint+Prettier; Playwright; no tests |

Rationale for the two least obvious ones:

**Blob over key-per-preference.** Key-per-preference avoids cross-tab
clobbering, but costs atomic multi-field updates and makes schema versioning
awkward (a version per key, or a side-car version key that restores the
coupling it was meant to avoid). These are per-device UI settings changed
deliberately by a single user; concurrent multi-tab write contention is not
this app's problem. The registry keeps the on-disk layout an implementation
detail, so switching later does not change the `get`/`set` API.

**Conditional CommonJS over ESM.** ESM over `file://` is blocked by CORS, so
converting the page would break opening `index.html` directly in a browser —
currently the only way the fixture is usable.

## Architecture

New file `prefs.js` at the repo root, beside `app.js`. The root is where the
browser half already lives; `src/` holds the unrelated Node half
(`index.js`/`utils.js`), and placing browser code there would imply a shared
codebase that does not exist.

`prefs.js` ends with:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createPrefs, REGISTRY };
}
```

In the browser this branch is skipped and `createPrefs` becomes a global,
consistent with how `login` and `validateForm` already work in `app.js`.
Under `require()` it exports normally, making the module testable in Node.

`index.html` gains `<script src="prefs.js"></script>` before the existing
`<script src="app.js">`.

`prefs.js` has no knowledge of the DOM, the login form, or theming. All
wiring to inputs and to the `<body>` class lives in `app.js`. This keeps the
logic worth testing free of anything requiring a DOM.

## Data Model

A registry is the single source of truth for what a preference is:

```js
const REGISTRY = {
  rememberedUsername: { value: "",      valid: (v) => typeof v === "string" && v.length <= 256 },
  theme:              { value: "light", valid: (v) => v === "light" || v === "dark" },
};
```

Adding a preference later means one entry here and no change to the store.

Storage layout — a single key holding a versioned blob:

```
localStorage["webapp.prefs"] = '{"v":1,"rememberedUsername":"ada","theme":"dark"}'
```

The `v` field is written now but only read as a guard: an unrecognized
version is treated as absent and falls back to defaults. This is not a
migration framework; it exists so a future migration has something to branch
on.

## API

```js
createPrefs(storage)   // storage defaults to globalThis.localStorage
```

Returns an object with four methods:

- `get(key)` — the stored value if present and valid, else the registry
  default. Throws on an unregistered key.
- `set(key, value)` — validates against the registry, merges into the blob,
  writes. Throws on an unregistered key or a value failing its validator.
  Returns `true` on success, `false` if the backend rejected the write.
- `all()` — every preference with defaults filled in. Used for the single
  read at page load.
- `clear()` — removes the storage key entirely. Backs "forget me" and keeps
  tests isolated.

`get` reads through to storage on every call rather than caching, so a value
written by another tab is picked up on the next read.

## Data Flow

`index.html` gains two controls: a "Remember me" checkbox inside the form,
and a theme toggle button.

**On load.** `app.js` calls `all()` once and applies the result: sets
`<body class="theme-dark">` or `theme-light`, pre-fills `#username` when a
remembered value exists, and checks the box when it does.

**On theme toggle.** `set("theme", next)` then re-apply the body class
immediately.

**On submit.** After validation passes: if the box is checked,
`set("rememberedUsername", username)`; if unchecked,
`set("rememberedUsername", "")`. The unchecked branch must actively erase a
previously remembered name — otherwise unchecking the box appears to do
nothing until storage happens to be cleared.

`login` and `validateForm` are unchanged. The submit handler gains only the
remember/forget branch after validation.

## Error Handling

The dividing line is whether the caller could have prevented the failure.

**Environmental failures degrade to defaults and never throw.** A
`JSON.parse` failure on corrupt data, a stored value failing its validator
(e.g. `theme: "blue"` from a hand-edited entry), an unrecognized `v`, or a
missing key all resolve to the registry default. Degradation is per-field,
not all-or-nothing: an invalid `theme` alongside a valid username keeps the
username. Nothing a user can type into devtools should be able to
white-screen the login page.

**Programmer errors throw.** `get`/`set` on an unregistered key, or `set`
with a value failing its validator, raise immediately. These are typos, and
swallowing them hides bugs.

**Storage unavailable.** Merely reading `globalThis.localStorage` can throw a
`SecurityError` (Safari private mode, disabled site data, locked-down
`file://`). `createPrefs` probes it inside a `try` at construction and falls
back to an in-memory `Map` when access fails. The app then behaves normally
for the session and simply does not persist. This keeps every call site free
of "did storage exist?" branching.

**Write failures.** Writes failing for quota or security reasons return
`false` rather than throwing, so a caller can notice. Nothing in this version
acts on that return value.

## Security Constraint

The password is never written to storage. `localStorage` is readable by any
script on the origin and persists indefinitely; a remembered password there
is a credential leak, not a convenience feature. "Remember me" covers the
username only.

`password` is absent from the registry, so `set("password", …)` throws like
any other unregistered key. Adding it would require a deliberate code change,
not an accidental one. A unit test asserts this.

## Testing

Runner: Node's built-in `node:test` / `node:assert`. `package.json` gains
only `"scripts": { "test": "node --test" }` and no dependencies. Tests live
in `test/prefs.test.js` and are written before the implementation.

A ~10-line `Map`-backed fake implementing `getItem`/`setItem`/`removeItem` is
injected as the storage backend, so no jsdom and no browser is needed.

Cases:

1. Empty storage returns registry defaults for both preferences.
2. `set` then `get` round-trips each preference.
3. A fresh `createPrefs` over the same storage sees previously written
   values. This is the actual "persists across sessions" claim, and the one
   case that would catch a store that only ever worked in memory.
4. Corrupt JSON falls back to all defaults.
5. An invalid `theme` falls back to its default while a valid sibling
   username survives (the per-field guarantee).
6. An unrecognized `v` falls back to defaults.
7. `get` / `set` on an unknown key throws.
8. `set` with an invalid value throws.
9. `clear()` restores defaults.
10. `set` returns `false` when the backend throws on write, rather than
    propagating.
11. A backend that throws on property access yields a working in-memory
    store.
12. `set("password", …)` throws — the security constraint as an executable
    assertion.

**Known coverage gap.** The DOM wiring in `app.js` — theme class
application, field pre-fill, the checkbox branch — is not covered, because
jsdom and Playwright were both ruled out of scope. That code is kept thin
and is verified by hand; all branching logic lives in `prefs.js`, where the
tests are.

## Files Touched

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `test/prefs.test.js` | New. Unit tests, written first. |
| `index.html` | Add `prefs.js` script tag, "Remember me" checkbox, theme toggle button, theme CSS classes. |
| `app.js` | Load prefs on startup, apply theme, pre-fill username, wire the toggle and the remember/forget branch. |
| `package.json` | Add `scripts.test`. |
| `.gitignore` | New. Ignore `docs/hyperpowers`. |
