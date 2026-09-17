# Settings Module Design

Date: 2026-09-17

## Problem

`app.js` hard-codes the API endpoint as a top-level constant:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Switching the webapp between environments therefore means editing application
code. The goal is to move endpoint configuration into a dedicated settings
module so the environment in use is resolved rather than hand-edited.

## Context

The repository contains two unrelated trees:

- `index.html` + `app.js` — a browser webapp. `app.js` is loaded by a plain
  `<script src="app.js">` tag. There is no bundler, no `type="module"`, and no
  build step; the page can be opened directly from the filesystem.
- `src/index.js` + `src/utils.js` — a CommonJS Node entry point unrelated to the
  webapp. It contains no endpoint configuration.

`package.json` declares no dependencies, no build script, and no test runner.

## Decisions

Each of the following was chosen explicitly during brainstorming.

| Decision | Choice | Rationale |
|---|---|---|
| Environment selection | Runtime detection from `location.hostname` | Delivers "easier to change environments" without introducing a build pipeline to a static site. |
| Module delivery | Plain script exposing a global | Matches the repo's existing no-tooling pattern and preserves the `file://` workflow, which ES modules would break. |
| Endpoint representation | Base URL plus endpoint paths | Changing environments edits one host rather than one full URL per endpoint. |
| Environments | `development`, `production` | Two are needed today. The table accepts more without structural change. |
| Tooling | None added | The project has no test, lint, or build tooling; the change is verified in the browser. |

## Design

### New file: `settings.js` (repository root)

Root placement, alongside `app.js`, because the file is loaded by `index.html`.
`src/` is the disconnected CommonJS tree and is not involved.

The module is an IIFE that builds an environment table, resolves the active
environment from the hostname, and publishes a single global `APP_SETTINGS`:

```js
(function (global) {
  const ENVIRONMENTS = {
    development: { apiBaseUrl: "http://localhost:3000" },
    production:  { apiBaseUrl: "https://api.example.com" },
  };

  // An empty hostname means the page was opened over file://, which is local
  // development.
  const DEVELOPMENT_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]", ""];

  function detectEnvironment(hostname) {
    return DEVELOPMENT_HOSTNAMES.includes(hostname) ? "development" : "production";
  }

  const environment = detectEnvironment(global.location.hostname);
  const { apiBaseUrl } = ENVIRONMENTS[environment];

  global.APP_SETTINGS = {
    environment,
    apiBaseUrl,
    endpoints: { login: `${apiBaseUrl}/login` },
  };
})(window);
```

`APP_SETTINGS.environment` is exposed alongside the URLs so callers can branch
on the environment (for example, to gate debug logging) without re-deriving it
from the hostname.

### Modified: `app.js`

- Remove the `API_ENDPOINT` constant.
- `login()` reads `APP_SETTINGS.endpoints.login` into a local. The function
  remains a stub that performs no network call; reading the value makes the
  dependency real code rather than a comment, so the module is genuinely
  exercised at runtime.
- `login()` guards against a missing `APP_SETTINGS` and throws a message naming
  the cause, so a misordered or omitted script tag surfaces as a readable error
  instead of a property read on `undefined`.

### Modified: `index.html`

Add `<script src="settings.js"></script>` immediately before the existing
`app.js` script tag. Load order matters: `settings.js` must define the global
before `app.js` executes.

## Error handling

- **Unknown hostname.** Any hostname not in `DEVELOPMENT_HOSTNAMES` resolves to
  `production`. Failing closed to the real API is safer than a deployed page
  silently addressing `localhost`.
- **Missing settings global.** `login()` throws an explicit error naming
  `settings.js` and the required script order.

## Non-goals

- No bundler, `.env` file, or build-time injection.
- No ES module conversion of `app.js` or `index.html`.
- No changes to `src/index.js` or `src/utils.js`.
- No real network call in `login()`; it stays a stub.
- No test, lint, or formatting tooling.

## Verification

No automated tests: the repository has no test runner and none is being added.
Verification is manual, in the browser.

1. Open `index.html` from the filesystem. `APP_SETTINGS.environment` is
   `development` and `APP_SETTINGS.endpoints.login` is
   `http://localhost:3000/login`.
2. Serve the directory over `http://localhost:8000` (for example with
   `python3 -m http.server`). The resolved environment is still `development`.
3. Serve the directory over a non-loopback hostname (for example the machine's
   LAN name or `127.0.0.1.nip.io`) and confirm `APP_SETTINGS.environment` is
   `production` and the endpoint is `https://api.example.com/login`. This
   exercises the fail-closed default without needing a deployment.
4. Submit the login form with both fields filled and confirm the logged endpoint
   matches the resolved environment.

Assumption: the development API runs at `http://localhost:3000`, validate via
confirming the port against the API service before the change is relied upon.
Only the table entry changes if it differs.
