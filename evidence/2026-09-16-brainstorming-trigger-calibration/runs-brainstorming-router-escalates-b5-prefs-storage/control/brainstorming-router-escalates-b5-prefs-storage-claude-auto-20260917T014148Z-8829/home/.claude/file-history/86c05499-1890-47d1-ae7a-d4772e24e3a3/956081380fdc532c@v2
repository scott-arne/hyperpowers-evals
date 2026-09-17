# User Preferences Storage — Design

Date: 2026-09-16
Status: approved in chat, pending spec review
Branch: `feature/webapp-enhancement`

## Problem

The browser app (`index.html` + `app.js`) keeps nothing between page loads. A
returning user retypes their username every visit, and there is no place to
put any other user-facing setting. The repository has no settings concept, no
persistence layer, and no module to extend, so this adds a new subsystem
rather than changing an existing flow.

## Scope

In scope: a preferences module for the browser app, persisted in
`localStorage`, with a fixed schema and declared defaults; the wiring in
`app.js` and `index.html` that uses it; unit-test infrastructure for it.

Out of scope: the Node program in `src/` (it has no settings and is not a
consumer); any server-side or cross-device sync; a theme switcher UI; any
change to `login` or `validateForm` behavior.

## Decisions

Each of these was chosen over stated alternatives during brainstorming.

1. **Target: the browser app.** A "session" is a page load and persistence
   means `localStorage`. The Node program in `src/` has no settings, and a
   shared core serving both was rejected as speculative abstraction for a
   consumer that does not exist.
2. **Fixed schema with declared defaults**, not a generic open key/value
   store. Unknown keys are rejected, which buys typo protection, real
   defaults, and a migration story.
3. **Single JSON blob under one `localStorage` key**, not a key per entry.
   Writes are atomic, there is one key to inspect or clear, and prefs are
   written from only one place in this app. Key-per-entry was a defensible
   alternative and would win if multiple independent writers existed.
4. **Explicit call sites, not DOM auto-binding.** A declarative
   element-to-preference binding table would save three lines in `app.js` at
   the cost of coupling storage to the DOM, needing a DOM shim to test, and
   turning the password exclusion into an emergent property of configuration
   rather than an explicit fact about the schema.
5. **Tooling: `node:test` only.** Node ships the runner, so the repository
   stays dependency-free. No linter or formatter: overhead without much
   payoff on five files.

## Global Constraints

- **The password is never persisted.** `localStorage` is plaintext, readable
  by any script on the origin, and survives logout. `password` is not a
  schema key, so no code path can write it; a test asserts the serialized
  blob never contains one.
- **The module must load in a Node process with no `localStorage` and no
  `document`.** This follows from the `node:test` choice and is what forces
  the storage backend behind an injectable seam.
- **No build step, no bundler, no new dependencies.** `index.html` loads
  plain scripts; `package.json` gains a `scripts.test` entry and nothing
  else.
- **Do not add `"type": "module"` to `package.json`.** It would break the
  CommonJS `require` in `src/index.js`.
- **Unit tests accompany the module**, covering defaults, round-trips,
  cross-session persistence, and every defined failure mode.

## Architecture

### New file: `preferences.js` (repository root)

Sits alongside `app.js` and is loaded before it. Contains the schema, the
backends, and the factory.

**Schema** — the single source of truth for what a preference is:

```js
const SCHEMA = {
  username:   { default: "",      validate: (v) => typeof v === "string" },
  rememberMe: { default: false,   validate: (v) => typeof v === "boolean" },
  theme:      { default: "light", validate: (v) => v === "light" || v === "dark" },
};
```

`theme` is stored, read, and applied, but nothing in this change sets it;
there is no theme switcher. It exists so the mechanism is exercised by a
preference that is neither a string nor login-related. It is the first thing
to drop if the schema should carry only what is actively written.

**Backends.** A backend is any object exposing `getItem(key)`,
`setItem(key, value)`, and `removeItem(key)`.

- `localStorageBackend()` — returns `window.localStorage`.
- `memoryBackend()` — a `Map`-backed stand-in with the same three methods.
- `detectBackend()` — attempts a probe write/read/delete on a throwaway key
  inside `try/catch` and returns the real backend on success, the in-memory
  one on any failure. A probe is the only reliable detection: Safari private
  mode and some blocked-storage configurations expose a `localStorage` object
  whose `setItem` throws.

**Factory.** `createPreferences(backend)` reads and parses the stored blob
once into an in-memory object, then returns:

| Method | Behavior |
|---|---|
| `get(key)` | Effective value: the stored value if present and valid, else the declared default. Throws on an unknown key. |
| `set(key, value)` | Validates, updates memory, writes the whole blob. Throws on an unknown key or a failed validator. |
| `reset(key)` | Restores one key to its default and persists. |
| `reset()` | Restores every key to its default and persists. |
| `all()` | A plain object of every schema key's effective value. |

**Persistence format.** One `localStorage` key, `"preferences"`, holding a
JSON object containing only known schema keys. Unknown keys found in the
stored JSON are ignored on read and dropped on the next write.

**Export.** The file ends with a dual export so one file serves both
consumers with no build step:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCHEMA, createPreferences, detectBackend, memoryBackend };
} else {
  window.Preferences = { SCHEMA, createPreferences, detectBackend, memoryBackend };
}
```

### Changes to `index.html`

- Add `<script src="preferences.js"></script>` immediately before the
  existing `<script src="app.js"></script>`, so `window.Preferences` exists
  when `app.js` runs.
- Add a remember-me control to the form:
  `<input type="checkbox" id="remember-me">` with an associated `<label>`.
  The form has no such control today, so without it `rememberMe` could never
  be turned on. This is the only UI this change adds.

### Changes to `app.js`

Three additions inside the existing structure. `login` and `validateForm` are
untouched.

1. Construct once, near the top:
   `const prefs = Preferences.createPreferences(Preferences.detectBackend());`
2. Restore on load, at the same point the existing `addEventListener` call
   runs — the script tag is at the end of `<body>`, so the DOM is parsed and
   no `DOMContentLoaded` wrapper is needed:
   - set `#remember-me.checked` from `prefs.get("rememberMe")`
   - when that is true, set `#username.value` from `prefs.get("username")`
   - set `document.documentElement.dataset.theme` from `prefs.get("theme")`
3. Persist in the submit handler, after validation succeeds:
   - `prefs.set("rememberMe", rememberMeCheckbox.checked)`
   - when checked, `prefs.set("username", username)`; when not,
     `prefs.reset("username")` so a previously remembered name is cleared.

## Data Flow

**First visit.** `detectBackend()` probes successfully; no `"preferences"`
key exists; every `get` returns its declared default; the form renders empty
with remember-me unchecked.

**Submit with remember-me checked.** The handler validates, calls `login`,
then writes `{username, rememberMe: true}` through `set`, which validates
each value and serializes the whole blob to `localStorage`.

**Return visit.** `createPreferences` parses the stored blob once;
`get("rememberMe")` is true, so `#username` is populated and remember-me is
checked. This is the behavior the feature exists to deliver.

**Submit with remember-me unchecked.** `rememberMe` is written as `false` and
`username` is reset to its default, so the next visit starts clean.

## Error Handling

No failure below throws into application code.

| Failure | Behavior |
|---|---|
| `localStorage` absent or blocked (private mode, disabled) | Probe fails at construction; the in-memory backend is used. The app works; preferences do not outlive the page. |
| Stored JSON unparseable | Treated as empty. Every key reads its default; the next `set` overwrites with clean JSON. |
| A stored value fails its validator | That key alone reads its default. Other keys are unaffected. |
| `setItem` throws mid-session (quota exceeded) | Caught; the write is dropped and reported with `console.warn`. The in-memory value still reflects the change, so the UI stays consistent for the rest of the page's life. |

Unknown-key `get`/`set` is the deliberate exception and throws: that is a
programming error, not a runtime condition, and failing loudly is what makes
the fixed schema worth having.

## Testing

`package.json` gains `"scripts": { "test": "node --test" }` and no
dependencies. Tests live in `test/preferences.test.js` and run against an
injected fake backend, so no DOM or browser is involved.

Cases:

1. Defaults are returned when the backend is empty.
2. `set` then `get` round-trips each type: string, boolean, enum.
3. Values survive a fresh `createPreferences` over the same backend — the
   actual "persists across sessions" assertion.
4. Corrupt JSON in the backend yields defaults, and a subsequent `set`
   repairs the blob.
5. An out-of-range value (`theme: "purple"`) yields the default for that key
   only; other keys are intact.
6. An unknown key throws on both `get` and `set`.
7. A backend whose `setItem` throws: no exception escapes, and the in-memory
   value is still updated.
8. `reset(key)` and `reset()` restore defaults.
9. The serialized blob never contains a `password` key.
10. Unknown keys present in stored JSON are ignored on read and dropped on
    the next write.

**Not covered by automated tests:** the DOM wiring in `app.js` and the real
`localStorage` probe. Covering them requires a DOM shim or a browser runner,
which is outside the zero-dependency tooling chosen for this work. They will
be verified by loading the page manually, and the result reported honestly —
including any failure.

## Risks and Assumptions

- Assumption: the remember-me checkbox is wanted rather than persisting the
  username unconditionally. Validate via the spec review below; reversing it
  means deleting the checkbox and one branch in the handler.
- Assumption: carrying a `theme` key that nothing yet writes is acceptable as
  schema exercise. Validate via the spec review; dropping it is a two-line
  change.
- Storing a username in `localStorage` is a mild privacy exposure on a shared
  device — it is visible to any script on the origin and to anyone who opens
  the browser. This is the normal cost of a remember-me feature and is why
  the checkbox is opt-in and defaults to off.
- The dual export is a deliberate small hack to avoid a build step. If the
  project later adopts ES modules or a bundler, it should be replaced with a
  real `export`.

## Files Touched

| File | Change |
|---|---|
| `preferences.js` | New. Schema, backends, factory, dual export. |
| `index.html` | Script tag for `preferences.js`; remember-me checkbox and label. |
| `app.js` | Construct prefs; restore on load; persist on submit. |
| `package.json` | Add `scripts.test`. |
| `test/preferences.test.js` | New. The cases above. |
| `.gitignore` | Already created alongside this spec, not part of the implementation. Ignores `docs/hyperpowers` so specs stay uncommitted. |
