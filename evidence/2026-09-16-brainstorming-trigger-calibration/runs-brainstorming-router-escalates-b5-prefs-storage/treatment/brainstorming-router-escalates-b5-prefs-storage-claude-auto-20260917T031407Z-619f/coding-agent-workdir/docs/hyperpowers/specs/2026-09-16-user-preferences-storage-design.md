# User Preferences Storage — Design

Date: 2026-09-16
Status: approved design, not yet implemented

## Problem

The webapp has no persistent state. Every page load starts from nothing: the
username field is empty, and there is no way for a user to express a preference
about the page at all. The request is for preferences storage so settings
survive across sessions.

Because the repository has no settings concept today — no settings screen, no
config object, no stored state of any kind — this introduces a new subsystem
rather than extending an existing one.

## Scope

In scope:

- A preferences module with validated defaults, persisted to `localStorage`.
- Two real preferences wired into the existing page: remember-username and a
  light/dark theme.
- Minimal CSS so there is something for the theme preference to switch.
- Zero-dependency unit tests via `node --test`.

Out of scope:

- Any preferences on the Node half of the repo (`src/`). It is a hello-world
  with no user and no session; it gains nothing from this.
- Cross-device or server-side preference sync. There is no server — `login()`
  is a stub that performs no network call.
- A linter or formatter. Explicitly deferred.
- A DOM-based test environment.

## Decisions

These were settled during brainstorming and are fixed inputs to the plan.

1. **Storage lives in the browser, in `localStorage`.** "Across sessions" means
   across tab closes. Preferences are per-browser and do not sync.
2. **The change ships plumbing plus two real preferences**, not plumbing alone,
   so the API is designed against actual callers.
3. **Tooling is `node --test` plus a hand-written storage fake.** No new runtime
   or dev dependencies; the repo stays dependency-free.
4. **Data layout is a single JSON blob behind an injected storage backend**
   (approach C of three considered). The alternatives were the same blob read
   from the `localStorage` global directly, and one flat `localStorage` key per
   preference. The blob was chosen for atomic writes and a single place to
   version; the injected backend was chosen because it lets tests pass a fake
   object instead of mutating `globalThis`.

## Security constraint

**The password is never persisted.** The preferences module does not read,
write, or reference the password field. "Remember me" covers the username only.

`localStorage` is plaintext and readable by any script on the origin, so a
stored password would be exposed to any XSS on the page and to anyone with
access to the browser profile. This is a deliberate boundary, not an oversight —
do not add password persistence as a later convenience.

`lastUsername` is itself mildly sensitive (it discloses who last used the
browser). That is the accepted, conventional tradeoff for a remember-me feature,
and it is only stored when the user opts in.

## Architecture

One new module, `prefs.js`, at the repository root beside `app.js` — matching
where the browser half already lives.

```
index.html ──<script>── prefs.js ──── storage backend (localStorage | Map fallback)
     │                     ▲
     └──<script>── app.js ─┘  (constructs, reads on load, writes on submit)
```

`prefs.js` has one job: turn a storage backend plus a schema into validated,
persisted preference values. It knows nothing about forms, the DOM, or login.
`app.js` owns all DOM wiring. The module can be understood and tested without
reading `app.js`, and `app.js` uses it through a four-method interface.

### Module boundary

- **What it does:** validated get/set/reset over a persisted preferences blob.
- **How you use it:** `createPreferences()` in the browser;
  `createPreferences({ storage: fake })` in tests.
- **What it depends on:** a storage backend object. Nothing else. No DOM, no
  globals when a backend is injected.

## Data model

Single `localStorage` key: `webapp.prefs`.

```json
{
  "version": 1,
  "theme": "light",
  "rememberUsername": false,
  "lastUsername": ""
}
```

Schema table (the single source of defaults and validation):

| Key | Type | Default | Validation |
|---|---|---|---|
| `theme` | enum | `"light"` | one of `"light"`, `"dark"` |
| `rememberUsername` | boolean | `false` | strict boolean |
| `lastUsername` | string | `""` | string, trimmed, max 256 chars |

Rules:

- `lastUsername` is written only while `rememberUsername` is true. Setting
  `rememberUsername` to false clears `lastUsername` in the same write, so
  opting out removes the stored name rather than orphaning it.
- **Versioning:** if the stored `version` is absent or is not `1`, the whole
  blob is discarded and defaults are used. With a single version there is
  nothing to migrate from; a migration framework with no migrations in it would
  be speculative. The envelope exists so a future rename has a defined starting
  point.

## Module API

```js
createPreferences({ storage, schema }) // both optional
  .get(key)         // validated stored value, else the schema default
  .set(key, value)  // validate, then persist the full blob
  .reset()          // remove the stored blob; back to defaults
  .all()            // plain object of all current values
```

- `storage` defaults to `globalThis.localStorage`, so browser callers write
  `createPreferences()` with no arguments.
- `schema` defaults to the built-in table; it is injectable so tests can
  exercise validation without inventing production preferences.
- `set` **throws** on an unknown key and on a value that fails validation. A
  typo'd key or a bad value originates in code and is a defect; failing loudly
  keeps it from becoming a silent no-op.
- `get` **never throws** on bad *stored* data; it returns the default.

The asymmetry is deliberate: bad input from code is a bug to surface, bad data
in storage is a runtime condition the page must absorb.

- Every `set` rewrites the whole blob. With three keys, tracking dirty state
  would cost more than it saves.

### Dual export

`prefs.js` is loaded by a bare `<script>` tag and also `require`d by the tests,
and the repo has no bundler. The file ends with a short conditional export:
`module.exports` when `module` is defined, otherwise assignment to
`window.Preferences`. This avoids introducing a build step.

## UI wiring

`index.html`:

- `<link rel="stylesheet" href="styles.css">` in the head.
- A theme toggle button above the form.
- A "Remember my username" checkbox inside the form.

`app.js` on load:

1. Construct the preferences instance.
2. Apply `theme` by setting `data-theme` on the `<html>` element.
3. If `rememberUsername` is true, prefill the username input from
   `lastUsername` and check the checkbox.

`app.js` on theme-toggle click: flip `theme` between `"light"` and `"dark"`,
persist it immediately, and update `data-theme`. The theme is not tied to the
form — it persists on click, whether or not the user ever submits or logs in.

`app.js` on submit, after the existing validation passes:

- Checkbox checked → persist `rememberUsername: true` and
  `lastUsername: <username>`.
- Checkbox unchecked → persist `rememberUsername: false`, clearing
  `lastUsername`.

Existing `login()` and `validateForm()` logic is not modified. New behavior is
added around it.

`styles.css` is new and minimal: a `:root` block of light values and a
`[data-theme="dark"]` override for background and text colors. No framework, no
reset. Theming stays in CSS; JS only sets the attribute.

## Error handling

The governing invariant: **no failure in the preferences layer may break
login.**

| Failure | Behavior |
|---|---|
| Corrupt / unparseable JSON | Discard the blob, return defaults, `console.warn` once. Page renders normally. |
| Valid JSON, one invalid value | That key falls back to its default; other keys are preserved. Per-key, not all-or-nothing. |
| Unknown or missing `version` | Discard the blob, return defaults. |
| Storage unavailable or write rejected | Catch at construction and on every write; fall back to an in-memory `Map` with the same interface. Warn once, not per write. The app works; preferences do not outlive the tab. |

The storage-unavailable path is not hypothetical: Safari private mode throws on
`setItem`, and `file://` origins can reject storage access.

## Testing

`package.json` gains its first `scripts` entry: `"test": "node --test"`.

Tests live in `test/prefs.test.js`. A `createFakeStorage()` helper (~15 lines)
wraps a `Map` behind `getItem`/`setItem`/`removeItem`, with a throwing variant
for the unavailable-storage case.

Cases:

1. Empty storage returns every schema default.
2. **Persistence:** `set` a value, construct a *fresh* instance over the same
   storage, read the value back. This is the literal "persists across sessions"
   claim and the reason the backend is injected.
3. Corrupt JSON returns defaults and does not throw.
4. One invalid value defaults that key and preserves the others.
5. Unknown `version` returns defaults.
6. `set` with an unknown key throws.
7. `set` with an invalid value throws.
8. Setting `rememberUsername` to false clears `lastUsername`.
9. Throwing storage falls back to memory without crashing.
10. `reset()` restores defaults and removes the stored key.

### Not covered by tests

The `app.js` DOM wiring has no automated coverage, because a DOM test
environment was declined. It will be verified manually: load the page, set both
preferences, reload, confirm they persist. This is a manual check and will be
reported as such — not as a passing test.

## Files touched

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `styles.css` | New. Light/dark custom properties. |
| `test/prefs.test.js` | New. Unit tests plus the storage fake. |
| `index.html` | Stylesheet link, theme toggle, remember checkbox, `prefs.js` script tag. |
| `app.js` | Load-time init and submit-handler persistence. Existing logic untouched. |
| `package.json` | Add `scripts.test`. |

## Open assumptions

- Assumption: the page is served over `http(s)://` or opened via `file://` in a
  browser with `localStorage` enabled; validate via the manual browser check
  described above. The in-memory fallback covers the case where it is not.
