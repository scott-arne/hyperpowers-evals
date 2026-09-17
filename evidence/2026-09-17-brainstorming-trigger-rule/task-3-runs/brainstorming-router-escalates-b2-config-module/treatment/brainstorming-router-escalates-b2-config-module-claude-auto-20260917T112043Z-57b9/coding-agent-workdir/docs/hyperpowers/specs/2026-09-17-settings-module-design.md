# Settings Module Design

Date: 2026-09-17
Status: Approved design, pending implementation plan

## Problem

The API endpoint is hardcoded in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application code, and there is no
mechanism for pointing a locally served page at a non-production API. The
endpoint is also stored as a complete URL, so adding a second endpoint would
duplicate the host in a second hardcoded string.

## Goals

- Move environment-dependent API configuration out of `app.js` into a single
  module.
- Select the active environment at runtime, so one deployed artifact works in
  every environment with no edit-before-deploy step.
- Allow a developer to force a specific environment without editing files.
- Cover the environment-resolution logic with unit tests.

## Non-Goals

- No bundler, transpiler, or build step. The repository currently has zero
  dependencies and the page is opened directly; both properties are preserved.
- No change to `src/index.js` or `src/utils.js`. They are a separate CommonJS
  Node entry point that never references the API endpoint.
- No secrets in configuration. Every environment's values ship to the browser,
  so `settings.js` is only ever appropriate for non-sensitive values such as
  base URLs.
- No linting, formatting, or end-to-end test infrastructure in this change.

## Global Constraints

These apply to every task in the implementation plan.

- **Module style:** browser global via a second `<script>` tag. No ES modules;
  `file://` access to `index.html` must keep working.
- **Dependencies:** none may be added. `package.json` stays dependency-free.
- **Test infrastructure:** Node's built-in `node:test` runner. Test command is
  `npm test`, wired to `node --test test/`. Node 26 is the local runtime.
  `settings.js` uses `var` and function declarations rather than the `const`
  and arrow functions used in `app.js`, so the same file is loadable both as a
  browser script and via CommonJS `require` without a wrapper.
- **No unrelated refactoring.** `src/`, `README.md`, and the existing form
  handling in `app.js` are out of scope.

## Design

### New file: `settings.js` (repository root)

An IIFE that computes configuration at load time and assigns it to
`window.AppSettings`. It lives at the repository root alongside `app.js`,
because `index.html` loads scripts from the root.

Internal structure:

- `ENVIRONMENTS` — the environment table. Each entry holds an `apiBaseUrl`:
  - `dev`: `http://localhost:3000`
  - `staging`: `https://staging-api.example.com`
  - `prod`: `https://api.example.com`
- `HOSTNAME_ENVIRONMENTS` — hostname to environment name:
  - `localhost` → `dev`
  - `127.0.0.1` → `dev`
  - `staging.example.com` → `staging`
- `DEFAULT_ENVIRONMENT` — `prod`.
- `OVERRIDE_KEY` — the `localStorage` key, `appEnv`.

Assumption: the dev and staging base URLs and the staging hostname are
placeholders. Validate by confirming the real values with the repository owner
before the first deployment that relies on them. The `prod` value is not an
assumption — it is the URL currently in `app.js`.

### Resolution order

`resolveEnvironment(hostname, storage)` returns an environment name:

1. Read `storage.getItem("appEnv")`. If it names a key in `ENVIRONMENTS`,
   return it.
2. If it is a non-empty value that does not name a known environment, emit
   `console.warn` identifying the bad value and the known names, then continue
   to step 3. An unrecognized override must never select an environment and
   must never throw.
3. Look the hostname up in `HOSTNAME_ENVIRONMENTS`. If present, return the
   mapped name.
4. Return `DEFAULT_ENVIRONMENT`.

The `storage.getItem` call is wrapped in try/catch. Accessing `localStorage`
throws outright — rather than returning `null` — when storage is disabled or
blocked by a privacy mode, and that must degrade to hostname detection rather
than break the page.

Both lookups use `Object.prototype.hasOwnProperty.call` so that inherited
`Object.prototype` names (`toString`, `constructor`) cannot be mistaken for
environment names.

### Unknown-hostname default

An unrecognized hostname resolves to `prod`. The development hostnames are
enumerable and short; unknown hostnames in practice are real deployments —
preview URLs, CDN domains, a new production alias. Defaulting those to `prod`
fails toward a working page, whereas defaulting to `dev` would silently point a
live deployment at a development server.

The accepted cost: an unlisted internal host silently uses production. The
mitigation is that `AppSettings.environment` is exposed, so the active
environment is inspectable from the console.

### Exported shape

```js
window.AppSettings = {
  environment: "prod",
  apiBaseUrl: "https://api.example.com",
  endpoints: { login: "https://api.example.com/login" },
};
```

Endpoints are derived from `apiBaseUrl` rather than stored as complete URLs, so
adding a second endpoint does not re-introduce a duplicated host. For `prod`
this reproduces the current string `https://api.example.com/login` exactly.

### Node export tail

To make resolution testable without a DOM, `settings.js` ends with:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ENVIRONMENTS, resolveEnvironment, buildSettings };
}
```

`resolveEnvironment(hostname, storage)` and `buildSettings(hostname, storage)`
take their inputs as arguments rather than reading `window` directly; the
browser assignment is the only place that touches `window.location.hostname`
and `window.localStorage`. The global assignment itself is guarded so that
requiring the file under Node does not throw.

## Changes to existing files

### `index.html`

Add `<script src="settings.js"></script>` immediately before the existing
`<script src="app.js"></script>`. Load order is now load-bearing: `app.js`
reads `window.AppSettings` at parse time.

### `app.js`

Replace:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

with:

```js
const API_ENDPOINT = window.AppSettings.endpoints.login;
```

The identifier is unchanged, so no other line in the file is affected. No
"settings failed to load" guard is added: if the script tag is missing or fails
to load, this line throws a clear `Cannot read properties of undefined` naming
`AppSettings`, which is more diagnostic than a hand-written fallback that would
let the page run against no endpoint at all.

### `package.json`

Add:

```json
"scripts": { "test": "node --test test/" }
```

## Testing

New file `test/settings.test.js`, using `node:test` and `node:assert/strict`.
It requires `../settings.js` and exercises the pure functions with a fake
storage object.

Cases:

1. Unknown hostname with no override resolves to `prod`.
2. `localhost` resolves to `dev`; `127.0.0.1` resolves to `dev`.
3. `staging.example.com` resolves to `staging`.
4. A valid override wins over the hostname mapping (`appEnv = "staging"` on
   `localhost` yields `staging`).
5. An unrecognized override value falls back to hostname detection and does not
   throw.
6. A storage object whose `getItem` throws falls back to hostname detection.
7. A `null`/absent storage argument falls back to hostname detection.
8. `buildSettings` for a prod hostname produces
   `endpoints.login === "https://api.example.com/login"` — a regression lock on
   the exact URL that exists in `app.js` today.
9. An inherited property name as an override (`"toString"`) does not resolve to
   an environment.

Manual verification, since no DOM test infrastructure is in scope: open
`index.html`, confirm the console-logged flow works and `AppSettings.environment`
reads `prod`; set `localStorage.appEnv = "staging"`, reload, confirm it reads
`staging`; set a garbage value, confirm the warning and the fallback.

## Risks

- **The placeholder dev and staging URLs are wrong until corrected.** They are
  inert until someone browses from a matching hostname or sets the override, so
  the failure mode is a failed request, not a wrong-environment write.
- **Load-order coupling in `index.html`.** Reordering or removing the settings
  script breaks `app.js` immediately and loudly. Accepted as the cost of the
  no-bundler constraint.
- **All environment URLs are visible in the delivered page.** Acceptable for
  base URLs; this module must not be extended to hold credentials.
