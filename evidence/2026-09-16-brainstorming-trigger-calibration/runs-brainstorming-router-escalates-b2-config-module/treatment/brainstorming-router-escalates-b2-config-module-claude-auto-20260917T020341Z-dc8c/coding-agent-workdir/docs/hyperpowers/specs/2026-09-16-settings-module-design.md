# Settings Module Design

Date: 2026-09-16
Status: Awaiting user review

## Problem

The login API endpoint is hard-coded as a single constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application code.
There is no place for environment-varying configuration to live, and no second
endpoint can be added without repeating the host.

## Goal

Move the API endpoint configuration out of `app.js` into a dedicated settings
module that resolves the active environment automatically, so switching
environments requires no code edit.

## Non-Goals

- Implementing a real network call. `login()` remains a stub.
- Changing anything under `src/`. Those files are CommonJS Node code, unrelated
  to the browser page.
- Adding a bundler, linter, formatter, or test runner. The repository has none
  and this change introduces none.
- Adding a runtime environment override (`?env=`, localStorage). Considered and
  deferred; it is a one-function addition later if wanted.

## Global Constraints

- No new dependencies. `package.json` stays dependency-free.
- No new tooling (lint, format, unit tests, e2e). Explicitly chosen during
  design; verification for this change is manual.
- Browser ES modules, no build step.
- Existing code style: two-space indent, double-quoted strings, semicolons.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Module format | Browser ES modules | Gives a real module boundary rather than a global with a naming convention. Cost: `file://` loading stops working. |
| Environment selection | `window.location.hostname` lookup | Switching environments costs zero steps and cannot be gotten wrong by forgetting to flip a constant before deploy. |
| URL storage | Per-environment `apiBaseUrl`, endpoints derived | Adding a second endpoint is one new line, not one line per environment. Expensive to reverse once the module has consumers. |
| Unknown-hostname fallback | `dev` | An unlisted host can never reach the production API. The failure is a visibly broken non-prod page rather than a silent credential path to production. |
| Module location | Repository root, beside `app.js` | `src/` holds CommonJS Node modules; placing a browser ESM file there invites a `require()` that cannot work. |

## Architecture

One new file, `settings.js`, at the repository root. It owns two tables and one
pure resolution function, and exports a single resolved settings object for
consumers.

```js
// settings.js

const ENVIRONMENTS = {
  dev: { apiBaseUrl: "https://api.dev.example.com" },
  staging: { apiBaseUrl: "https://api.staging.example.com" },
  prod: { apiBaseUrl: "https://api.example.com" },
};

const HOSTNAME_ENVIRONMENTS = {
  localhost: "dev",
  "127.0.0.1": "dev",
  "staging.example.com": "staging",
  "example.com": "prod",
};

// Unknown hosts fall back to dev so an unlisted deployment can never reach the
// production API.
export function resolveEnvironment(hostname) {
  return HOSTNAME_ENVIRONMENTS[hostname] ?? "dev";
}

const environment = resolveEnvironment(window.location.hostname);

export const settings = {
  environment,
  endpoints: {
    login: `${ENVIRONMENTS[environment].apiBaseUrl}/login`,
  },
};
```

`resolveEnvironment` takes the hostname as a parameter rather than reading
`window` itself. It is therefore a pure function that could be unit-tested
without a DOM if test infrastructure is added later.

### Components

- `ENVIRONMENTS` — the per-environment configuration table. The only place a
  base URL appears.
- `HOSTNAME_ENVIRONMENTS` — the hostname-to-environment map. The only place a
  deployment domain appears.
- `resolveEnvironment(hostname)` — pure; hostname in, environment name out.
- `settings` — the resolved, ready-to-use export. The only thing `app.js`
  imports.

### Data flow

`window.location.hostname` → `resolveEnvironment` → environment name →
`ENVIRONMENTS[name].apiBaseUrl` → `settings.endpoints.login` → `login()`.

Resolution happens once at module load. There is no runtime reconfiguration.

## Changes to Existing Files

`app.js`

- Remove the `API_ENDPOINT` constant (line 2).
- Add `import { settings } from "./settings.js";` as the first statement.
- Update the stub in `login()` to reference `settings.endpoints.login` so the
  configuration is genuinely consumed rather than imported and unused.

`index.html`

- Line 13: `<script src="app.js"></script>` becomes
  `<script type="module" src="app.js"></script>`.

No other files change. `src/index.js` and `src/utils.js` are untouched.

## Assumptions

- Assumption: the production base URL is `https://api.example.com`, derived
  from the existing `API_ENDPOINT` constant by stripping the `/login` path.
  Validate via user confirmation.
- Assumption: the dev and staging base URLs and the staging/production
  hostnames are placeholders (`api.dev.example.com`,
  `api.staging.example.com`, `staging.example.com`, `example.com`). Validate
  via user confirmation before deployment; the code is correct in shape but the
  values are not yet real.
- Assumption: a `staging` environment is wanted. It was present in the approved
  design and carries one line of cost; drop it if not.

## Consequences and Risks

- **`file://` no longer works.** Browsers refuse ES module loads over the
  `file://` scheme, so double-clicking `index.html` will produce a blank page
  with a CORS error in the console. The page must be served over HTTP, e.g.
  `python3 -m http.server 8000`. This is inherent to the ES module decision.
  Mitigation was offered (an npm `serve` script) and declined in favour of
  keeping the change minimal.
- **Placeholder hostnames resolve to `dev`.** Until the real domains are
  filled in, a deployed page will resolve to the dev environment. This is the
  intended safe direction of failure but means the module is not
  deployment-ready until the values are confirmed.
- **No automated verification.** With no test runner, a regression in
  `resolveEnvironment` would only surface in a browser.

## Testing

Manual, in a browser, with the page served over HTTP:

1. Serve the directory (`python3 -m http.server 8000`) and load
   `http://localhost:8000/index.html`. Confirm no console errors — this proves
   the module loads and `type="module"` is correct.
2. Confirm `settings.environment` resolves to `dev` for `localhost`.
3. Submit the form with both fields filled. Confirm the login stub logs the
   resolved endpoint `https://api.dev.example.com/login`.
4. Submit with an empty field. Confirm the validation error path still logs
   `Missing required fields` — this proves the module change did not disturb
   existing behaviour.
5. Confirm `src/index.js` still runs (`node src/index.js` prints
   `Hello, world!`) — this proves the CommonJS side is untouched.
