# Settings Module Design

Date: 2026-09-16
Status: Approved for planning

## Problem

The API endpoint is a single constant hard-coded in the application source:

```js
// app.js:2
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application code. There is no place for a
second endpoint to live, and nothing records which environments exist or which
hostnames belong to them.

## Goals

- Move environment-dependent configuration out of `app.js` into a dedicated module.
- Make switching environments a data change in one file, not a code edit.
- Give future endpoints an obvious place to be declared.

## Non-Goals

- Implementing real network calls. `login()` stays a stub; wiring `fetch` is a
  separate request.
- Sharing configuration with `src/index.js` / `src/utils.js`. Those are a
  separate Node/CommonJS entry point that never touches the API.
- Introducing a bundler, a build step, or secret management.

## Decisions

Each of these was chosen explicitly during brainstorming; the rejected
alternatives are recorded so they are not silently re-litigated.

### D1: Environment selection by hostname detection

The module ships all environments and selects one at load time from
`window.location.hostname`.

Rejected: a single active config edited per deploy (switching becomes a manual
file edit, easy to get wrong); build-time injection from env vars (adds a
bundler to a repo with no toolchain, and is the only option that is expensive
to reverse).

Consequence: every environment's base URL is visible in shipped source. This is
acceptable because these are public API hostnames, not secrets. If a secret
ever needs to reach the client, this decision must be revisited — that is the
point at which build-time injection earns its cost.

### D2: Delivery by script tag and a namespaced global

`index.html` loads `settings.js` immediately before `app.js`. The module
assigns `window.AppSettings`.

Rejected: ES modules (`<script type="module">`). Browsers block module imports
over `file://`, so adopting them would mean `index.html` could no longer be
opened directly — a property this repo currently has.

Consequence: script order in `index.html` is load-bearing. D5 makes a violation
fail loudly rather than silently.

### D3: Unknown hostnames fall back to development, with a warning

An unrecognized hostname resolves to the `development` environment and emits a
`console.warn` naming the host.

Rejected: falling back to production (a typo'd or local hostname would reach
real production data); throwing (breaks ad-hoc preview hosts until registered).

Consequence: deploying to a new production hostname will appear to work while
quietly using the development endpoint until the host is added to the map. The
warning is the mitigation. This is the cheaper direction to be wrong in.

### D4: Base URL plus endpoint paths, not full URLs

Environments declare an `apiBaseUrl`. Endpoint paths are declared once in a
separate map and composed against the active base URL.

Rejected: a full URL per endpoint per environment (adding one endpoint would
mean editing every environment).

## Design

### New file: `settings.js` (repo root, beside `app.js`)

An IIFE containing three data tables and two pure functions.

Data:

- `ENVIRONMENTS` — environment name to `{ name, apiBaseUrl }`.
- `HOSTNAME_MAP` — hostname to environment name.
- `ENDPOINT_PATHS` — endpoint name to path suffix. Initially `{ login: "/login" }`.
- `DEFAULT_ENVIRONMENT` — the string `"development"` (see D3).

Functions:

- `resolveEnvironment(hostname)` — returns the environment name for a hostname.
  Returns `DEFAULT_ENVIRONMENT` and emits a `console.warn` for any hostname not
  present in `HOSTNAME_MAP`, including empty or undefined input.
- `buildSettings(hostname)` — returns the settings object for a hostname:

  ```js
  {
    environment: "production",
    apiBaseUrl: "https://api.example.com",
    endpoints: { login: "https://api.example.com/login" }
  }
  ```

  `endpoints` is composed by joining `apiBaseUrl` with each entry in
  `ENDPOINT_PATHS`. The returned object is frozen.

Exports:

- In a browser (`typeof window !== "undefined"`), assigns
  `window.AppSettings = buildSettings(window.location.hostname)` at load.
- Under Node (`typeof module !== "undefined" && module.exports`), exports
  `{ resolveEnvironment, buildSettings, ENVIRONMENTS }`. This matches the
  CommonJS convention already used in `src/utils.js` and is what makes the pure
  functions testable. The `window` guard ensures importing the file under Node
  never reads `location`.

Environment values:

| Environment | Base URL | Hostnames |
|---|---|---|
| development | `https://api.dev.example.com` | `localhost`, `127.0.0.1` |
| staging | `https://api.staging.example.com` | `staging.example.com` |
| production | `https://api.example.com` | `example.com`, `www.example.com` |

Assumption: these hostnames and the dev/staging base URLs are placeholders
derived from the one real value in `app.js`. Validate by confirming the actual
deployment hostnames with the project owner before the values are relied on.
The production base URL preserves the existing constant exactly.

### Changed: `app.js`

- Delete the `API_ENDPOINT` constant (line 2).
- `login()` reads `window.AppSettings.endpoints.login` and logs the endpoint it
  would POST to. The function keeps its current signature and return shape.
  Reading the value in the stub is deliberate: it keeps the reference live, so
  a misconfigured load surfaces immediately instead of at some later date when
  real network code is added.

### Changed: `index.html`

Add `<script src="settings.js"></script>` immediately before the existing
`<script src="app.js"></script>`.

### Changed: `package.json`

Add `"scripts": { "test": "node --test" }`. No dependencies.

### New file: `test/settings.test.js`

Uses the built-in `node:test` runner and `node:assert`. Cases:

1. Each hostname in `HOSTNAME_MAP` resolves to its expected environment.
2. An unmapped hostname resolves to `development`.
3. An unmapped hostname emits a warning (assert via a stubbed `console.warn`).
4. Empty and `undefined` hostnames resolve to `development` without throwing.
5. `buildSettings` composes `endpoints.login` as base URL plus path.
6. `buildSettings("example.com").endpoints.login` equals the original
   `https://api.example.com/login`, proving the migration preserved behavior.

## Error Handling

- Unknown hostname: warn and fall back (D3). Never throws.
- `window.AppSettings` missing when `login()` runs: throw an error naming the
  likely cause (settings.js not loaded before app.js). Without this, a script
  ordering mistake yields `undefined` embedded in a URL string and fails far
  from its cause.
- `buildSettings` is total over its input: any hostname produces a valid
  settings object.

## Testing Strategy

`node --test`, zero dependencies, per the tooling decision. The browser
integration — script order and the global assignment — is not unit tested;
it is verified by opening `index.html` and confirming the console shows the
resolved endpoint. Unit tests cover the pure resolution and composition logic,
which is where the behavior worth protecting lives.

## Scope

| File | Change |
|---|---|
| `settings.js` | New |
| `test/settings.test.js` | New |
| `app.js` | Remove constant, read from settings |
| `index.html` | One script tag |
| `package.json` | Add test script |

## Open Risks

- The hostname and dev/staging URL values are placeholders (see Assumption
  above). The module is correct regardless; the data needs confirming.
- Hostname detection does not distinguish ports, so a dev server on an
  unexpected host still needs a map entry. Acceptable under D3's fallback.
