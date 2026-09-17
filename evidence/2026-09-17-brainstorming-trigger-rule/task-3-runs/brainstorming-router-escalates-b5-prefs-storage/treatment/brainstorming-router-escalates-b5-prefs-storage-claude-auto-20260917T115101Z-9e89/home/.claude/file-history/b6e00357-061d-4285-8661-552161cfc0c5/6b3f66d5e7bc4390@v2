# User Preferences Storage — Design

Date: 2026-09-17
Status: Approved (design), not yet implemented

## Problem

The webapp has no way to remember anything a user chooses. Every visit starts
from the same fixed state. The request is for preferences that persist across
sessions.

Today the repository contains a single browser page (`index.html` + `app.js`,
a stub login form) and an unrelated Node entry point (`src/index.js`,
`src/utils.js`). There is no settings surface, no storage layer, no stylesheet,
and no configured tooling.

## Decisions Already Made

These were settled with the human partner during brainstorming and are inputs
to the design, not open questions:

1. **Surface: the browser webapp.** Preferences live in `localStorage`, scoped
   to one browser on one device. "Session" means a page visit. No backend.
2. **Scope: theme only.** No user identifiers are written to browser storage in
   this iteration. Passwords and session tokens are permanently out of scope
   for this store.
3. **Settings UI: inline on the login page.** A small Preferences area in
   `index.html`. No navigation is introduced.
4. **Storage shape: one namespaced, versioned JSON blob** in a dedicated
   `preferences.js` module.
5. **Tooling: unit tests from the start**, using Node's built-in `node:test`.
   No linter or formatter is configured as part of this work.

## Global Constraints

- No build step, no bundler, no transpiler. The page is served as static files.
- No runtime dependencies and no devDependencies may be added. The test runner
  is Node's built-in `node:test`.
- `app.js`'s login and validation logic is not modified.
- Preferences must never be able to break the login page. Every failure mode
  degrades to a working default.

## Architecture

`preferences.js` is the only code that touches `localStorage`. It is loaded in
`<head>`, before the page body renders, so the stored theme is applied without
a flash of the wrong theme.

The theme is applied by setting a `data-theme` attribute on
`document.documentElement`. The `<html>` element already exists while `<head>`
is being parsed, which is what makes pre-render application possible without a
`DOMContentLoaded` wait.

`app.js` retains its single responsibility — login form handling — and gains
only the wiring for the theme control's `change` event. It contains no storage
code.

## Data Model

One key: `drill-test-project:preferences`.

```json
{ "version": 1, "theme": "light" }
```

- `version` — integer schema version, currently `1`. Present so a future shape
  change has a defined thing to migrate from.
- `theme` — `"light"` or `"dark"`. Default `"light"`.

The key is namespaced with the project name because `localStorage` is shared
across everything on an origin; a bare `theme` key would be liable to collide.

An OS-following `"system"` theme is deliberately deferred. It requires
`matchMedia` plus change-listener handling, and nothing in the request asks for
it.

## Public API

`preferences.js` exposes:

| Function | Behavior |
|---|---|
| `getPreferences()` | Returns the full validated preferences object, with defaults filled in for anything missing or invalid. Never throws. |
| `getPreference(name)` | Returns a single validated value, or its default. Never throws. |
| `setPreference(name, value)` | Validates `value` against the allowed set for `name`, persists the whole blob, and re-applies the theme when `name` is `"theme"`. Rejects invalid values without writing. |
| `applyTheme()` | Writes the current theme onto `document.documentElement` as `data-theme`. |

Consumers never read or write `localStorage` directly.

## Data Flow

1. Page load: `preferences.js` (in `<head>`) reads the key, validates it, and
   applies `data-theme` to `<html>`.
2. `styles.css` (new — the project currently has no stylesheet) defines the
   light appearance as the default and overrides it under
   `[data-theme="dark"]`.
3. On `DOMContentLoaded`, `app.js` sets the Preferences select to the current
   theme and registers a `change` handler calling
   `setPreference("theme", <selected>)`.
4. `setPreference` persists and re-applies immediately, so the page updates
   without a reload.
5. On the next visit, step 1 reads the persisted value back.

Reloading the page and seeing the chosen theme survive is the acceptance
criterion for the feature as a whole.

## Error Handling

Every failure path resolves to a usable page:

- **`localStorage` access throws or is unavailable** (private browsing,
  disabled storage, certain `file://` contexts): catch and operate from
  in-memory defaults. The UI remains fully functional; only persistence is
  lost, silently.
- **Stored value is not valid JSON** (corrupt, truncated, hand-edited): catch
  the parse error, return defaults, and overwrite on the next successful write.
- **`theme` holds an unrecognized value**: validate against the allowed list
  and fall back to the default rather than writing an arbitrary string into the
  `data-theme` attribute.
- **`version` is unrecognized** (written by a newer build): fall back to
  defaults rather than guessing at the stored shape.

No failure path logs to `console.error` on a normal load; a missing key is the
expected first-visit state, not an error.

## Testing

Runner: `node --test`, added as `"test"` in `package.json`'s `scripts` (the
field does not exist yet). No dependencies are added.

`preferences.js` is a plain browser script, so to make it loadable under Node it
gets a CommonJS export tail:

```js
if (typeof module !== "undefined") { module.exports = { /* ... */ }; }
```

Tests inject a fake `localStorage` and a fake `documentElement` rather than
requiring a DOM implementation.

Cases in `test/preferences.test.js`:

1. Empty storage returns the default theme.
2. Round trip: `setPreference` then `getPreference` returns the written value.
3. A persisted value is readable by a freshly initialized module (simulating a
   new session).
4. Corrupt JSON in the key falls back to defaults.
5. An invalid `theme` value is rejected by `setPreference` and not persisted.
6. An unrecognized `version` falls back to defaults.
7. A `localStorage` whose methods throw does not propagate an exception.
8. `applyTheme` sets `data-theme` to the expected value.

Manual verification: load `index.html`, switch the theme, reload, confirm the
choice survives.

## Files

New:

- `preferences.js` — storage module and theme application
- `styles.css` — light default plus `[data-theme="dark"]` overrides
- `test/preferences.test.js` — unit tests

Modified:

- `index.html` — stylesheet link, `preferences.js` in `<head>`, Preferences
  fieldset with a labeled theme select
- `app.js` — wire the select on `DOMContentLoaded`; login logic untouched
- `package.json` — add `scripts.test`

## Out of Scope

- Remembering the username or any other user identifier
- Server-side sync or cross-device preferences
- Preferences for the Node entry point (`src/`)
- Any change to login or form-validation behavior
- Linting and formatting configuration
- An OS-following `"system"` theme

## Assumptions

- Assumption: the page is loaded over `http(s)` or from a context where
  `localStorage` is writable; validate via the manual reload check described
  under Testing. The error handling above covers the case where it is not.
- Assumption: the light/dark visual treatment can be a minimal two-color
  change, since the project has no existing design language; validate by
  showing the rendered page to the human partner.
