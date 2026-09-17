# Settings Module Design

Date: 2026-09-17
Status: Approved (design approved in chat 2026-09-17; spec pending user review)

## Problem

The browser app hardcodes its API endpoint as a top-level constant in
`app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing which backend the app talks to means editing application code. There
is no mechanism for distinguishing local, staging, and production
environments, and no single place where endpoint configuration lives.

## Goal

Move API endpoint configuration into a dedicated settings module so switching
environments does not require editing application logic, and so the app
selects its environment automatically at runtime.

## Non-Goals

- Making `login()` perform a real network request. It remains a stub; wiring
  an actual `fetch` is a separate change.
- Sharing configuration with the Node-side `src/` tree.
- Introducing a bundler, dev server, or any runtime dependency.
- Any configuration beyond the API base URL.
- Linting or formatting infrastructure (explicitly declined; see Global
  Constraints).

## Decisions Settled With the Human Partner

These were chosen explicitly during brainstorming and are fixed inputs, not
open questions:

1. **Environment selection happens at runtime, by hostname.** A single
   settings file holds all environments. Rejected: one file per environment
   swapped at deploy; a single hand-edited file.
2. **ES modules.** `settings.js` uses `export`, `app.js` uses `import`, and
   `index.html` loads `app.js` with `<script type="module">`. Rejected: a
   global `window.AppSettings` script; adding a bundler.
3. **Base URL per environment**, with call sites composing paths. Rejected:
   full endpoint URLs per environment.
4. **Three environments:** `local`, `staging`, `production`.
5. **Unit tests yes, lint/format no.** Node's built-in `node:test`, no
   dependencies added.
6. **Placeholder hostnames and URLs**, to be replaced by the human partner.
7. **`src/` converts to ESM** rather than being renamed to `.cjs`.

## Global Constraints

- **Zero runtime and dev dependencies.** `package.json` must still list no
  `dependencies` and no `devDependencies` when this work is complete. The test
  runner is Node's built-in `node:test`.
- **Unit test infrastructure is part of this change**, not a follow-up. The
  first passing test lands with the module.
- No linter or formatter is introduced.
- Match the existing code style in `app.js`: double-quoted strings,
  two-space indentation, semicolons.

## Architecture

One new file, `settings.js`, at the repository root alongside `app.js`. It
owns exactly three exports:

| Export | Kind | Purpose |
|---|---|---|
| `ENVIRONMENTS` | object | Map of environment name to its config object |
| `STAGING_HOSTNAME` | string | The served-from staging host, a detection input |
| `resolveEnvironment(hostname, search)` | pure function | Returns `{ environment, warning }` for a given location |
| `settings` | frozen object | The resolved config for the current page |

`resolveEnvironment` is pure: it reads no globals, performs no I/O, and has no
side effects — **including no logging**. All of the module's real logic lives
there, which is what makes it testable without a browser or a DOM.

Because it may not log, it reports problems by returning them. Its return
value is an object:

- `environment` — an environment name, always a key of `ENVIRONMENTS`.
- `warning` — a human-readable string when something was wrong with the
  inputs, otherwise `null`.

The caller is responsible for logging `warning`. This keeps the warning
behavior itself unit-testable rather than something that can only be observed
by watching a console.

`settings` is computed once at module load and frozen with `Object.freeze`.

### Non-browser import guard

`window` does not exist under Node, so a settings module that unconditionally
reads `window.location` at import time would throw a `ReferenceError` the
moment the test file imported it. That would make the chosen combination of ES
modules and unit tests unworkable.

The module therefore guards its resolution:

- **In a browser** (`typeof window !== "undefined"`): call
  `resolveEnvironment(window.location.hostname, window.location.search)`, log
  `warning` via `console.warn` if it is non-null, and export the matching
  config.
- **Outside a browser**: skip detection entirely and export
  `ENVIRONMENTS.production`.

Detection is skipped rather than run against empty strings so that importing
the module in a test emits no spurious warnings. Nothing under test depends on
the `settings` export — tests exercise `resolveEnvironment` and `ENVIRONMENTS`
directly — so the non-browser value is a safe inert default, not a code path
the app relies on.

`app.js` imports `{ settings }` only. It does not import `ENVIRONMENTS` or
`resolveEnvironment`; those are exported for tests and debugging, not for
application call sites.

### Environment map

Each environment maps to an object with a single `apiBaseUrl` key.

**Invariant: `apiBaseUrl` values carry no trailing slash.** Call sites compose
paths as `` `${settings.apiBaseUrl}/login` ``. This invariant is stated in a
comment in `settings.js`, next to the values it governs, and is enforced by a
unit test.

Placeholder values (the human partner replaces these with real hosts):

| Environment | `apiBaseUrl` |
|---|---|
| `local` | `http://localhost:3000` |
| `staging` | `https://staging-api.example.com` |
| `production` | `https://api.example.com` |

### App hostnames versus API hostnames

These are two different things and must not be conflated. `apiBaseUrl` is the
host the app *calls*. Environment detection matches on the host the app is
*served from*, which is a separate value.

A module-level constant `STAGING_HOSTNAME` holds the served-from staging host,
placeholder `staging.example.com`. It is a detection input only and never
appears in any request URL. Production needs no such constant because it is
the fallback.

## Data Flow

At page load:

1. `index.html` loads `app.js` as a module.
2. `app.js` imports `settings.js`.
3. `settings.js` reads `window.location.hostname` and
   `window.location.search`, calls `resolveEnvironment`, looks up the matching
   entry in `ENVIRONMENTS`, freezes it, and exports it as `settings`.
4. `login()` composes its URL as `` `${settings.apiBaseUrl}/login` ``.

### Resolution order

`resolveEnvironment(hostname, search)` applies these rules; first match wins.
`search` is a query string in `window.location.search` form (a leading `?`,
or empty) and is parsed with `new URLSearchParams(search)` rather than by
substring matching, so `?envelope=x` does not read as an `env` override.

1. If `URLSearchParams(search).get("env")` is a non-empty string and is a key
   in `ENVIRONMENTS`, return that name with `warning: null`.
2. If `hostname` is `localhost` or `127.0.0.1`, return `"local"`.
3. If `hostname` equals `STAGING_HOSTNAME`, return `"staging"`.
4. Otherwise return `"production"`.

Hostname comparisons are exact and case-insensitive (lowercase the input
before matching); no suffix or wildcard matching.

A rejected `?env=` value and an unmatched hostname each set `warning`; if both
occur, the rejected-override warning wins, because a bad override is the more
actionable of the two.

The `?env=` override exists so an environment can be selected on a machine
where the hostname cannot be changed. It is scoped to the query parameter
only — no `localStorage`, no cookie, no persistent hidden state.

## Error Handling

No code path throws. A settings module that throws at import time takes the
entire page down with it, and every failure mode here has a safe answer.

| Condition | `environment` | `warning` |
|---|---|---|
| Hostname matches no rule | `production` | names the unmatched hostname |
| `?env=` names an unknown environment | from hostname detection | names the rejected value |
| `?env=` absent or empty | from hostname detection | `null` — not an error |

The browser branch logs a non-null `warning` with `console.warn` exactly once,
at module load.

The warning on an unmatched hostname exists because a silent fallback to
production is how a mistyped staging host quietly talks to the real API. The
warning on a rejected `?env=` value exists because an unrecognized override
must never be misread as "no environment requested."

## Testing

New file `test/settings.test.mjs`, using `node:test` and `node:assert`. It
imports `resolveEnvironment`, `ENVIRONMENTS`, and `STAGING_HOSTNAME` directly.

Each resolution case asserts the whole `{ environment, warning }` object, so a
warning that goes missing or fires spuriously fails a test rather than passing
unnoticed.

Cases:

1. `localhost` resolves to `local`.
2. `127.0.0.1` resolves to `local`.
3. `STAGING_HOSTNAME` resolves to `staging`.
4. An unrecognized hostname resolves to `production`.
5. `?env=staging` overrides a hostname that would otherwise resolve
   differently.
6. `?env=bogus` is ignored; the hostname rule decides instead.
7. `?envelope=staging` is not treated as an `env` override (guards the
   `URLSearchParams` parsing rule against a substring-matching regression).
8. An uppercase hostname (`LOCALHOST`) resolves the same as its lowercase
   form.
9. Every entry in `ENVIRONMENTS` has a non-empty `apiBaseUrl` that does not
   end in `/` (enforces the trailing-slash invariant).

`package.json` gains `"scripts": { "test": "node --test" }` so `npm test` runs
the suite.

### Explicitly not covered by automated tests

The browser wiring — that `index.html` loads `app.js` as a module and that the
`settings.js` import resolves in a browser — has no automated coverage. No DOM
test infrastructure exists in this repository, and adding it for a single
import is disproportionate.

Verification for that path is manual, and must actually be performed:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/`, confirm the console shows no errors, and
confirm the resolved environment is `local`. Also confirm
`http://localhost:8000/?env=staging` resolves to `staging`.

## Module System Ripple

Node determines whether a `.js` file is ESM or CommonJS from the nearest
`package.json`. The current `package.json` has no `"type"` field, so Node
treats every `.js` file as CommonJS — which means a `node:test` file cannot
`import` a `settings.js` that uses `export`. This is a direct consequence of
choosing ES modules and unit tests together; browsers are unaffected because
they go by `<script type="module">`.

Resolution (approved): add `"type": "module"` to `package.json` and convert
the `src/` tree to ESM.

- `src/utils.js`: `module.exports = { greet }` becomes `export function greet`.
- `src/index.js`: `const { greet } = require('./utils')` becomes
  `import { greet } from './utils.js'`.

The `src/` tree is an 8-line `greet` demo that is entirely disconnected from
the browser app. Converting it is smaller and clearer than institutionalizing
two module systems in one repository. The rejected alternative was renaming
both files to `.cjs` and updating `"main"`.

After conversion, `node src/index.js` must still print `Hello, world!` — this
is the regression check for the ripple.

## Files Touched

**New**

- `settings.js`
- `test/settings.test.mjs`

**Modified**

- `app.js` — remove the `API_ENDPOINT` constant, add
  `import { settings } from "./settings.js"`, compose the URL inside `login()`
- `index.html` — `<script type="module" src="app.js"></script>`
- `package.json` — add `"type": "module"` and the `test` script
- `src/utils.js` — CommonJS export to ESM export
- `src/index.js` — CommonJS require to ESM import

## Open Items

- Assumption: the placeholder values are acceptable stand-ins. Two distinct
  sets need replacing before any deploy — the `apiBaseUrl` values in
  `ENVIRONMENTS` (hosts the app calls) and `STAGING_HOSTNAME` (the host the
  app is served from). Validate by having the human partner supply both.
  Until then rule 3 matches a placeholder host and will never fire in a real
  deployment, so a real staging site would silently resolve to `production` —
  the `console.warn` on the unmatched hostname is what makes that visible.
