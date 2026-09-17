# Settings Module for API Endpoint Configuration

Date: 2026-09-17
Status: approved design, not yet implemented

## Problem

The API endpoint is a hardcoded literal in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing and committing source.
There is no place for environment-specific configuration to live, and no
mechanism for selecting between environments.

## Goal

Move the endpoint into a dedicated settings module that resolves the correct API
base URL for the environment the page is being served from, so switching
environments requires no code change.

## Non-goals

- Implementing the actual network call. `login()` stays a stub; only the
  configuration moves.
- Introducing a bundler, transpiler, or any build step.
- Adding configuration for the Node code in `src/`, which has none today.
- Authentication, secrets, or anything beyond the endpoint base URL.

## Global constraints

- **No new dependencies.** `package.json` stays at zero dependencies and zero
  devDependencies. No linter, formatter, or test runner is added as part of this
  work (explicit decision, 2026-09-17).
- **No build step.** The page must remain openable directly from the filesystem
  (`file://`), which rules out ES modules and `require()` in browser code.
- Changes stay focused on moving the configuration; no unrelated refactoring of
  `app.js`, `src/`, or `index.html`.

## Design decisions

Each of these was decided with the human partner during brainstorming.

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Environment selection | Hostname detection at runtime | Hand-edited `ENV` constant (switching still requires a commit); build-time injection (requires a toolchain) |
| Module wiring | Second `<script>` tag exposing a global | ES modules (breaks `file://`); CommonJS in `src/` (browser cannot load it without a bundler) |
| Config shape | Base URL per environment, `loginUrl` derived | Full endpoint URL per environment (repeats hosts once a second endpoint exists) |
| Unknown hostname | Fall back to production | Fall back to local; throw |
| Environments covered | local, staging, production | local + production only |
| Tooling | None added | Unit tests; lint + format |

## Architecture

### New file: `settings.js` (repo root)

Placed at the root beside `app.js`, because `index.html` resolves script `src`
attributes relative to itself.

An IIFE that publishes a single global. Structure:

```js
// Environment-specific API configuration. Selection is by hostname so a deploy
// needs no code change; an unrecognized host is treated as production.
(function (global) {
  const ENVIRONMENTS = {
    local:      { apiBaseUrl: "http://localhost:3000" },
    staging:    { apiBaseUrl: "https://api-staging.example.com" },
    production: { apiBaseUrl: "https://api.example.com" },
  };

  const HOSTNAME_ENVIRONMENTS = {
    "localhost":           "local",
    "127.0.0.1":           "local",
    "staging.example.com": "staging",
  };

  const name = HOSTNAME_ENVIRONMENTS[global.location.hostname] || "production";
  const { apiBaseUrl } = ENVIRONMENTS[name];

  global.AppSettings = { environment: name, apiBaseUrl, loginUrl: `${apiBaseUrl}/login` };
})(window);
```

Two maps rather than one, on purpose: hostnames are deployment facts that change
frequently and many-to-one onto environments (`localhost` and `127.0.0.1`
already both mean local), while the environment set is stable.

### Public interface

`window.AppSettings`, with three properties:

- `environment` — the resolved environment name (`"local" | "staging" | "production"`).
  Exposed so the active environment can be logged or displayed.
- `apiBaseUrl` — the API origin for that environment, no trailing slash.
- `loginUrl` — `apiBaseUrl` + `/login`; the direct replacement for the old
  `API_ENDPOINT` constant.

Consumers read `AppSettings` and never reconstruct URLs from `apiBaseUrl`
themselves; a second endpoint is added as another derived property here.

### Changes to existing files

**`index.html`** — add the settings script immediately before the existing one:

```html
  <script src="settings.js"></script>
  <script src="app.js"></script>
```

Order is load-bearing: `settings.js` must run first.

**`app.js`** — remove the `API_ENDPOINT` declaration (line 2). In `login()`,
replace the comment-only reference with a real read, so the module has an actual
consumer and the resolved environment is visible while developing:

```js
function login(username, password) {
  // Stub: would POST to AppSettings.loginUrl in a real app.
  console.log("Logging in:", username, "via", AppSettings.loginUrl);
  return { success: true, user: username };
}
```

No other behavior in `app.js` changes.

## Data flow

1. The browser parses `index.html` and executes `settings.js`, which reads
   `window.location.hostname` and sets `window.AppSettings`.
2. `app.js` executes and registers the submit handler. It does not read settings
   at this point.
3. On form submit, `login()` reads `AppSettings.loginUrl`.

Settings are resolved once at page load and are not reactive; the hostname
cannot change without a navigation.

## Error handling and failure modes

- **Unrecognized hostname** — resolves to production. This is the accepted
  behavior, and it carries a known cost: a staging or preview host that is
  missing from `HOSTNAME_ENVIRONMENTS` will silently use the production API.
  Adding a new deployment host therefore requires a matching map entry.
- **`settings.js` missing or loaded after `app.js`** — `AppSettings` is
  undefined and `login()` throws a `ReferenceError` on submit rather than at
  page load. This is the accepted cost of global-plus-script-tag wiring; the ES
  module alternative would have surfaced it at load time. Mitigation is limited
  to keeping the two tags adjacent in `index.html`.
- **Unknown environment name in the map** — not reachable: every value in
  `HOSTNAME_ENVIRONMENTS`, plus the `"production"` default, must be a key of
  `ENVIRONMENTS`. Keeping that true is a maintenance invariant of the file, not
  a runtime check.

No new failure mode reaches the user, because no network call exists yet.

## Assumptions to validate

- Assumption: staging is served from `staging.example.com` and its API is
  `https://api-staging.example.com`; validate by confirming the real staging
  hostnames with the human partner before or at implementation.
- Assumption: local development serves the API at `http://localhost:3000`;
  validate the same way.
- Assumption: production continues to serve the API at `https://api.example.com`,
  carried over unchanged from the current `API_ENDPOINT`; validate by reading the
  existing value, which this design preserves exactly.

Placeholder hostnames are safe to ship in the sense that the production value is
unchanged from today and the others only affect hosts that are not yet real.

## Verification

No automated tests, per the tooling decision. Manual verification:

1. Open `index.html` from the filesystem. `file://` has an empty hostname, so it
   falls through to production. In the console, `AppSettings` shows
   `environment: "production"` and `loginUrl: "https://api.example.com/login"` —
   identical to the value `API_ENDPOINT` held before this change.
2. Submit the form with both fields filled. The log line names the login URL and
   no error is thrown.
3. Submit with a field empty. The existing validation error still appears,
   unchanged.
4. Serve the directory over `http://localhost:<port>` and reload. `AppSettings`
   now reports `environment: "local"` and the localhost base URL, demonstrating
   that environment selection works without a code change.

## Future work

Explicitly out of scope, recorded so the shape is not designed against by accident:

- A real `fetch` in `login()` will be the first genuine consumer of `loginUrl`.
- Further endpoints are added as derived properties on `AppSettings`, not by
  building URLs at call sites.
- If a build step is ever adopted, `settings.js` converts to an ES module and the
  hostname map can be replaced by injected values; nothing in this design blocks
  that.
