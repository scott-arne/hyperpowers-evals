# User Preferences Storage — Design

Date: 2026-09-17
Status: Approved (design), pending implementation plan

## Problem

The webapp (`index.html` + `app.js`) keeps no state between visits. Every load
starts from the same defaults, and anything the user adjusts is lost when the
tab closes. There is no settings or storage layer anywhere in the repository to
extend, so persistence has to be introduced as a new unit.

## Goals

- Persist a small, declared set of user preferences across browser sessions.
- Give consumers a single, typed-by-convention API instead of scattered
  `localStorage` calls.
- Fail safely: bad or unavailable storage must never break page load.
- Ship with unit tests covering the storage layer.

## Non-Goals

- Server-side or cross-device preference sync.
- Preferences tied to the authenticated account. `login()` is a stub with no
  session, and building auth-backed persistence is a separate project.
- A settings page or preferences UI beyond the two controls described below.
- `prefers-color-scheme` as the default theme source.
- Any change to `src/index.js` or `src/utils.js`.
- Storing passwords or session tokens. Never.

## Global Constraints

- Unit-test infrastructure is part of this work: `node:test` (Node's built-in
  runner), no third-party dependencies, wired to `npm test`. Every behavior in
  "Failure handling" below has a test.
- No linter, formatter, e2e harness, or bundler is introduced. Match the
  existing plain-script style.
- `package.json` stays CommonJS (no `"type": "module"`); `src/` already uses
  `require`/`module.exports` and must keep working.
- `index.html` must keep working when opened directly from disk (`file://`).

## Storage Decision

Preferences live in the browser's `localStorage`, under a single namespaced key.

Rejected alternatives, and why:

- **Server-backed per user** — would be the right answer once real accounts
  exist, since preferences would then follow the user across devices. Today
  there is no session, no token, and no API; this would mean inventing an
  entire auth-backed persistence layer. Deferred deliberately, and the module
  boundary below is what keeps it cheap to adopt later.
- **Node config file on disk** — applies to the `src/` command-line entry
  point, which is not the surface the preferences belong to.

Consequence to accept: preferences are per browser profile, not per user. A
different device, a different browser, or cleared site data means defaults.

## Module: `preferences.js`

New file at the repository root, alongside `app.js`. No dependencies.

### Loading

Loaded as a plain `<script src="preferences.js">` before `app.js`, attaching
`window.Preferences`. A guard at the bottom of the file also exports it for
Node:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = Preferences;
}
```

ES modules were rejected: they do not load over `file://`, so `import` would
silently require running a local web server to open the page, and `"type":
"module"` in `package.json` would break the existing CommonJS `src/` files.
The cost of this choice is a browser global, which is consistent with how
`app.js` already works.

### Public API

| Function | Behavior |
|---|---|
| `Preferences.get(key)` | Stored value for `key`, else its declared default. Throws `Error` on an unknown key (a programming mistake, not user data). |
| `Preferences.set(key, value)` | Validates `key` is known and `value` matches the default's type, persists the whole blob, returns the stored value. Throws `Error` on an unknown key or a type mismatch. |
| `Preferences.getAll()` | Full resolved object: stored values merged over defaults. Returns a fresh object; mutating it does not affect storage. |
| `Preferences.reset()` | Removes the stored blob so subsequent reads return defaults. |

Validation is deliberately asymmetric: unknown keys arriving from *storage* are
dropped silently (data written by an older version of the app), while unknown
keys passed to `get`/`set` throw (a caller bug).

### Data model

One `localStorage` key: `webapp:prefs`. Its value is a JSON object.

Declared defaults, the single source of truth for which keys exist and what
type each holds:

```js
const DEFAULTS = {
  theme: "light",            // "light" | "dark"
  rememberedUsername: "",    // string; "" means not remembered
};
```

Reads parse the blob, discard any key not present in `DEFAULTS`, and merge the
remainder over `DEFAULTS`. `theme` is additionally range-checked: a stored
value outside `"light" | "dark"` is treated as absent and falls back to the
default.

### Failure handling

| Condition | Behavior |
|---|---|
| Key absent from storage | Return defaults. |
| Stored value is not parseable JSON | Return defaults. The corrupt value is overwritten on the next `set()` rather than being left to fail every load. |
| Stored value parses to a non-object (e.g. `"7"`, `null`, an array) | Treated the same as corrupt: return defaults. |
| Stored object carries unknown keys | Keys dropped on read; not re-persisted on the next write. |
| Stored value has the wrong type for a known key | That key falls back to its default; other keys are unaffected. |
| `localStorage` unavailable or throwing (private mode, disabled storage, quota exceeded) | The module degrades to an in-memory object for the lifetime of the page. Reads and writes keep working; nothing propagates to `app.js`. A single `console.warn` is emitted, not one per call. |

The invariant: no call into `Preferences` throws because of the *state of
storage*. Only caller mistakes (unknown key, wrong type) throw.

## UI Integration

### `index.html`

- Add `<script src="preferences.js"></script>` before the existing `app.js`
  tag.
- Add a theme toggle button (`#theme-toggle`).
- Add a "Remember me" checkbox (`#remember-me`) to the login form.
- Add a small `<style>` block defining the dark palette under
  `[data-theme="dark"]`.

### `app.js`

On load:

1. Apply `Preferences.get("theme")` to `document.documentElement` as
   `data-theme`.
2. If `rememberedUsername` is non-empty, pre-fill `#username` with it and tick
   `#remember-me`.

On theme toggle: flip the value, `Preferences.set("theme", next)`, re-apply the
attribute.

On successful login: if `#remember-me` is ticked, store the submitted username;
if it is not, store `""`. The checkbox state is what makes storing the username
consensual rather than silent.

### Accepted trade-offs

- **Flash of default theme.** The theme is applied after the document parses,
  so a dark-theme user sees a brief light flash on load. Eliminating it
  requires a render-blocking inline script; not worth it at this size.
- **Plaintext username.** `rememberedUsername` is readable by any script on
  this origin. Acceptable for a convenience pre-fill of a non-secret field,
  and the reason the password is never persisted in any form.

## Testing

`test/preferences.test.js`, run by `node --test` via `npm test`. A fake
`localStorage` (a plain object with `getItem`/`setItem`/`removeItem`) is
installed as a global before each test and removed after, so tests are
independent and no real browser is needed.

Cases:

1. `get` returns the declared default when nothing is stored.
2. `set` then `get` round-trips a value.
3. `set` persists across a fresh module read (values survive in storage, not
   just in memory).
4. Corrupt JSON in storage yields defaults.
5. A non-object JSON value in storage yields defaults.
6. Unknown keys in stored data are dropped and not re-persisted.
7. A wrong-typed stored value falls back to that key's default without
   affecting other keys.
8. An out-of-range `theme` value falls back to `"light"`.
9. `get`/`set` with an unknown key throws.
10. `set` with a wrong-typed value throws.
11. `getAll` returns defaults merged with stored values, and mutating the
    result does not affect storage.
12. `reset` restores defaults.
13. A `localStorage` whose methods throw does not propagate: reads and writes
    still work in memory.

Not unit-tested: the DOM wiring in `app.js`. End-to-end browser testing was
considered and declined for this change, so the theme-persists-across-reload
and username-prefill behaviors are verified manually in a browser and that
verification is reported as manual.

## Files Touched

| File | Change |
|---|---|
| `preferences.js` | New. The module. |
| `test/preferences.test.js` | New. Unit tests. |
| `index.html` | Script tag, theme toggle, remember-me checkbox, dark-theme styles. |
| `app.js` | Apply theme on load, pre-fill username, wire toggle and checkbox. |
| `package.json` | Add `"scripts": { "test": "node --test" }`. |

## Risks

- `localStorage` is origin-scoped and synchronous. At this data size the
  synchronous write is immaterial; the origin scoping is the per-device
  limitation already accepted above.
- Adding a preference later means adding it to `DEFAULTS` and, if it is
  constrained like `theme`, to the range check. If the stored shape ever needs
  to change incompatibly, the single-blob layout is what makes a versioned
  migration possible; no version field is included now because there is
  nothing to migrate from.
