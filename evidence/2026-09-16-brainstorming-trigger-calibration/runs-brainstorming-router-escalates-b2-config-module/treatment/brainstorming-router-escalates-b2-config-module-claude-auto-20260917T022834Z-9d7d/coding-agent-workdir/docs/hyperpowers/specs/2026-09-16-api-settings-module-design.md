# API Settings Module — Design

Date: 2026-09-16
Status: Approved (design), pending implementation plan

## Problem

The API endpoint is a bare constant in application code:

```js
// app.js:2
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments therefore means editing application logic, and the value
is embedded in the same file as DOM wiring and form validation. There is no
place for a second endpoint to go, and no way to point the app at a development
API without a code edit that must be reverted before shipping.

## Goal

Move endpoint configuration into a dedicated settings module so that switching
environments requires no edit to application code, and so that adding a second
endpoint touches one place.

## Current State

- `app.js` — browser script holding `API_ENDPOINT`, `login()`, `validateForm()`,
  and the submit handler. `API_ENDPOINT` is currently unreferenced; `login()` is
  a stub that logs and returns a canned success object.
- `index.html:13` — loads `app.js` as a classic `<script>`. No `type="module"`.
- `src/index.js`, `src/utils.js` — CommonJS, Node-side. Never executed in the
  browser and unrelated to the API endpoint.
- `package.json` — no dependencies, no scripts. No bundler, linter, or test
  runner exists in the repository.

The browser side has no module system at all. That is the reason this is a new
module rather than a moved constant.

## Decisions

Each was settled during brainstorming; the rejected alternatives are recorded
because the reasoning matters more than the outcome.

### Environment selection: hostname detection

`settings.js` reads `window.location.hostname` at load and resolves the
environment itself.

- Rejected — injected config script: requires deploy-time placement of a
  per-environment file and a second script tag.
- Rejected — build-time substitution: introduces a bundler and a build step to a
  repository with zero dependencies.

Consequence: every environment's base URL ships to the browser. Acceptable here
because API base URLs are not secrets. Moving to an injected config script later
is a small, localized edit if that changes.

### Module style: native ES modules

`index.html` uses `<script type="module">`; `app.js` imports from `settings.js`.

- Rejected — global namespace object (`window.AppSettings`): a global with
  silent load-order coupling, and not meaningfully a module.

Consequence: ES modules are blocked by CORS over `file://`, so the page must be
opened through a local HTTP server (for example `python3 -m http.server`) rather
than by opening the file directly. This is a workflow change, not a code
constraint.

### Configuration shape: base URL plus derived paths

Settings expose `apiBaseUrl` and an `endpoints` map built from it.

- Rejected — full URLs per endpoint: repeats the host across every endpoint in
  every environment, making a host change an N x M edit.

## Design

### New file: `settings.js` (repository root)

Placed beside `app.js`, not in `src/`. `src/` is CommonJS and Node-side; putting
browser ES modules there would mix two module systems in one directory.

Structure:

- `ENVIRONMENTS` — map of environment name to `{ apiBaseUrl }`. Two entries:
  `development` and `production`.
- `DEV_HOSTNAMES` — the set of hostnames treated as development:
  `localhost`, `127.0.0.1`, `[::1]`.
- `resolveEnvironmentName(hostname)` — exported pure function returning
  `"development"` when the hostname is in `DEV_HOSTNAMES`, otherwise
  `"production"`. Exported separately so it can be exercised without a browser.
- `settings` — the exported frozen object:
  `{ environment, apiBaseUrl, endpoints: { login } }`, where
  `endpoints.login` is `` `${apiBaseUrl}/login` ``. Frozen with `Object.freeze`
  so callers cannot mutate shared configuration at runtime.

### Changes to `app.js`

- Remove `const API_ENDPOINT`.
- Add `import { settings } from "./settings.js";` at the top.
- Update the stub comment in `login()` to reference `settings.endpoints.login`.

No behavior changes. `login()` remains a stub; this design does not introduce a
network call.

### Changes to `index.html`

Line 13 becomes `<script type="module" src="app.js"></script>`.

Note that module scripts are deferred, so the submit-handler registration in
`app.js` runs after the document is parsed. The current code registers the
handler at top level and relies on the script tag sitting after the form; under
`type="module"` that ordering remains satisfied, so no restructuring is needed.

### Not in scope

`src/index.js` and `src/utils.js` are untouched. They do not reference the API
endpoint, and converting them would be unrelated refactoring.

## Error Handling

An unrecognized hostname falls back to `production`.

This is a deliberate asymmetry. An unknown host is far more likely to be a real
deployment than an unconfigured dev machine, and pointing a real user's login at
a development API is the worse of the two failures. The accepted cost is that a
mistyped development hostname degrades silently to production rather than
raising an error.

`ENVIRONMENTS` lookups cannot miss, because `resolveEnvironmentName` returns only
keys that exist in the map.

## Testing

The repository has no test runner and no established testing pattern, and the
decision during brainstorming was not to add one as part of this change.

Verification is therefore by inspection plus a manual check:

1. Serve the directory over HTTP and load `index.html`.
2. Confirm the form still submits and logs a validation error when fields are
   empty and a login result when they are filled.
3. Confirm `settings.environment` resolves to `development` when served from
   `localhost`.

Any report on this work must state plainly that no automated tests were run,
because none exist.

If a test runner is added later, `resolveEnvironmentName` is the natural first
target: it is pure, takes a string, and returns a string.

## Assumptions

- Assumption: `https://api.dev.example.com` is a placeholder for the real
  development API host; validate by confirming the actual host with the
  repository owner and substituting it before this ships.
- Assumption: `https://api.example.com` remains the correct production base URL;
  validate by confirming that the existing `API_ENDPOINT` value is current.
- Assumption: no deployment currently opens `index.html` over `file://`;
  validate by confirming the page is always served over HTTP.

## Global Constraints

- No new dependencies. The repository stays zero-dependency.
- No linter, formatter, or test infrastructure is added by this work.
- `src/` is not modified.
- Match existing style: two-space indentation, double-quoted strings, semicolons.
