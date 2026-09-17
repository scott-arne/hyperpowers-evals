# Settings Module Design

Date: 2026-09-16
Status: Approved for planning

## Problem

The browser app hardcodes its API endpoint at `app.js:2`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application
source. There is no place for environment-specific configuration to
live, so every future configurable value would repeat the same problem.

## Goal

Move the API endpoint into a dedicated settings module that selects
values by environment, so switching environments requires no source
edit.

Non-goals: build tooling, a deploy pipeline, configuration for the
`src/` Node code, or any change to login/validation behavior.

## Context

The repository contains two unrelated bodies of code:

- **Browser app** (root): `index.html` loads `app.js` as a classic
  script. No bundler, no `type="module"`, no dependencies.
- **Node code** (`src/`): `index.js` and `src/utils.js`, CommonJS,
  with no API endpoint and no relationship to the browser app.

This design touches only the browser app. `src/` is out of scope.

`package.json` declares no `"type"` field, so Node treats `.js` files
as CommonJS. This is what makes the dual-mode export below work with
no tooling.

## Decisions

Three forks were considered and resolved before design:

1. **Environment selection: hostname detection.** `settings.js` maps
   `window.location.hostname` to an environment at load time.
   Rejected: an explicit `window.APP_ENV` flag set in `index.html`
   (requires a per-environment edit, which is the problem being
   solved); build-time substitution (correct for a real pipeline, but
   introduces tooling this repo does not have).

2. **Module interface: a frozen global.** `settings.js` loads before
   `app.js` via a second `<script>` tag and publishes
   `window.AppSettings`. Rejected: ES modules, which would impose a
   proper module boundary but break `file://` loading, turning "open
   `index.html`" into "run a local HTTP server".

3. **Environment scope: local, staging, production.** Smaller tables
   were available; three covers the normal development loop and each
   additional environment is a two-line change.

## Architecture

### New file: `settings.js` (repository root)

Sits alongside `app.js`. Structure:

```js
(function () {
  "use strict";

  var ENVIRONMENTS = {
    local:      { apiBaseUrl: "http://localhost:3000" },
    staging:    { apiBaseUrl: "https://api-staging.example.com" },
    production: { apiBaseUrl: "https://api.example.com" },
  };

  var LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", ""];
  var STAGING_HOSTNAMES = ["staging.example.com"];

  function detectEnvironment(hostname) { /* ... */ }
  function buildSettings(hostname) { /* ... */ }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ENVIRONMENTS, detectEnvironment, buildSettings };
  }
  if (typeof window !== "undefined") {
    window.AppSettings = buildSettings(window.location.hostname);
  }
})();
```

**Public surface (browser):** `window.AppSettings`, frozen via
`Object.freeze`, with three properties:

| Property | Type | Description |
|---|---|---|
| `environment` | string | `"local"`, `"staging"`, or `"production"` |
| `apiBaseUrl` | string | Origin for the selected environment |
| `loginEndpoint` | string | `apiBaseUrl + "/login"` |

**Public surface (Node, for tests only):** `ENVIRONMENTS`,
`detectEnvironment(hostname)`, `buildSettings(hostname)`.

The object is frozen so configuration cannot be mutated at runtime by
downstream code.

### Data model: base URLs, not full endpoints

The environment table stores an origin per environment; endpoint paths
are derived. The path `/login` is identical across environments — only
the host varies. Storing full URLs per environment would require
editing three entries whenever a path changes, and such tables drift
out of sync.

### Dual-mode export

The `module`/`window` sniff exists solely so `detectEnvironment()` is
reachable from `node:test`. A browser IIFE that assigns to `window`
cannot be `require`d. The considered alternative was extracting
`detectEnvironment` into its own file to keep the browser file pure;
that was rejected as a two-file settings layer in a four-file
repository. The boilerplate is the cheaper cost.

### Changes to existing files

**`app.js`** — line 2 becomes:

```js
const API_ENDPOINT = window.AppSettings.loginEndpoint;
```

plus the load-order guard described under Error Handling. The local
name `API_ENDPOINT` is retained, so `login()`, `validateForm()`, and
the submit handler are unchanged.

**`index.html`** — one added line, before the existing `app.js` tag:

```html
<script src="settings.js"></script>
<script src="app.js"></script>
```

Load order is a hard contract of the global approach. The guard below
makes a violation fail loudly rather than silently.

**`package.json`** — add:

```json
"scripts": { "test": "node --test" }
```

## Data flow

1. Browser parses `index.html` and executes `settings.js`.
2. `settings.js` reads `window.location.hostname`.
3. `detectEnvironment()` maps the hostname to an environment name.
4. `buildSettings()` looks up the origin and derives `loginEndpoint`.
5. `window.AppSettings` is frozen and published.
6. `app.js` executes, asserts `window.AppSettings` exists, and reads
   `loginEndpoint` into `API_ENDPOINT`.

## Error handling

**Unknown hostname falls back to production.** A hostname matching
neither the local nor the staging list resolves to `production`
instead of throwing. Preview deploys and unfamiliar hosts should get a
working page rather than a blank one.

The accepted risk: a mistyped staging hostname silently talks to
production. This is mitigated by exposing `AppSettings.environment`, so
the resolved environment is inspectable rather than hidden, and is
covered by an explicit test.

**Missing settings fails loudly.** If `settings.js` did not load,
`app.js` throws at load time:

```js
if (!window.AppSettings) {
  throw new Error("settings.js must be loaded before app.js");
}
```

Letting `undefined` propagate would defer the failure to the first
login attempt and surface it as a confusing URL error. A configuration
fault should break at load.

## Testing

Runner: `node:test` (ships with Node; adds no dependencies).
Location: `test/settings.test.js`. Command: `npm test`.

`detectEnvironment(hostname)` is a pure function and carries all the
branching logic, so it takes the bulk of coverage:

| Case | Input | Expected |
|---|---|---|
| Local by name | `"localhost"` | `"local"` |
| Local by loopback IP | `"127.0.0.1"` | `"local"` |
| Local via `file://` | `""` | `"local"` |
| Staging | `"staging.example.com"` | `"staging"` |
| Production | `"app.example.com"` | `"production"` |
| Unknown host fallback | `"preview-7.vercel.app"` | `"production"` |

`buildSettings(hostname)` adds two cases: `loginEndpoint` is the
environment's `apiBaseUrl` plus `/login`, and the returned object is
frozen.

The browser wiring (script order, the `app.js` guard) is not
unit-tested — it requires a DOM harness this repo has no tooling for.
It is verified manually: load `index.html` and confirm
`AppSettings.environment` reads `local`.

## Assumptions

- Assumption: the staging site is served from `staging.example.com`
  and its API is `https://api-staging.example.com`; validate by
  confirming the real staging hostnames with the repository owner
  before implementation.
- Assumption: the local API listens on `http://localhost:3000`;
  validate by confirming the local development port with the
  repository owner before implementation.

Both values are isolated to the `ENVIRONMENTS` and `STAGING_HOSTNAMES`
tables, so correcting them is a one-line edit in each case.

Confirmed, not assumed: the production endpoint
`https://api.example.com/login`, taken from the existing `app.js:2`.

## Global constraints

- No new runtime dependencies. `package.json` stays dependency-free;
  `node:test` is built in.
- No linter or formatter is configured; match the existing file style
  (two-space indent, double-quoted strings, semicolons).
- `src/index.js` and `src/utils.js` are not modified.
- Login and validation behavior is unchanged; this is a
  configuration-location change, not a behavior change.
