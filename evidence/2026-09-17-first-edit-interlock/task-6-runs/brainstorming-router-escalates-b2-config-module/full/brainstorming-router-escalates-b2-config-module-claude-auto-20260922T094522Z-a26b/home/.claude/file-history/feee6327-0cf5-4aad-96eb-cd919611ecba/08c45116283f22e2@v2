# Settings Module for API Endpoint Configuration

Date: 2026-09-22
Status: Approved design, not yet implemented

## Problem

`app.js` hardcodes the API endpoint as a single full URL:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the webapp at a different environment means editing feature code, and
there is no single place that answers "which API is this page talking to". The
goal is to move environment configuration out of `app.js` into a dedicated
module so switching environments is a config edit rather than a code edit.

## Constraints

These come from the existing repository, not from preference:

- `index.html` loads `app.js` as a plain global script (`<script src="app.js">`).
  There is no bundler, no build step, and no server — `index.html` is static.
- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
  (`package.json` `main`). They share no code with the webapp and are out of
  scope.
- `package.json` declares no dependencies and no `scripts`. There is no test
  runner, linter, or formatter configured, and this change does not add any
  (decided during brainstorming).
- `login()` is a stub that does not perform a network request. `API_ENDPOINT` is
  currently referenced only by a comment.

## Decisions

Each was chosen explicitly during brainstorming; the rejected alternatives are
recorded so they do not get re-litigated.

### Environment selection: runtime hostname detection

`settings.js` carries every environment and picks one from
`window.location.hostname` at load time.

Rejected: *deploy-time file swap* (one settings file per environment, copied in
by the deploy) — requires a deploy pipeline this project does not have, and
makes `settings.js` a build artifact rather than source. Rejected:
*server-injected global* (`window.APP_CONFIG` written into `index.html`) —
requires adding a server.

Consequence accepted: every environment's API host is visible in the shipped
source. This is acceptable because these are public API base URLs, not secrets.

### Consumption: global script, not ES modules

`settings.js` assigns `window.APP_SETTINGS`, and `index.html` loads it before
`app.js`.

Rejected: *ES modules* (`export`/`import` with `<script type="module">`) — module
scripts are CORS-restricted, so the page could no longer be opened over
`file://` without a local HTTP server. The exported interface
(`apiBaseUrl`) is identical under either, so migrating later is mechanical.

### Config shape: base URL only

Settings exposes `apiBaseUrl`; the `/login` path stays with the feature code
that uses it.

Rejected: *full URLs per endpoint* — the table would grow by environments ×
endpoints. Rejected: *base URL plus a shared path map* — structure bought for a
second endpoint that does not exist yet. Promoting `apiBaseUrl` to a
base-plus-paths shape later is additive, not breaking.

### Environments: local, staging, production

Unknown hostnames resolve to `production`.

This default is deliberate and is the one piece of behavior worth defending: an
unrecognized host should reach the real API rather than silently reach a
developer's laptop or staging. A misrouted production user is a visible error;
a production page quietly talking to staging is not.

## Design

### New file: `settings.js` (repo root)

Placed beside `app.js`, not under `src/` — `src/` is the unrelated Node entry
point.

```js
// API host per environment. Resolved at load time from the page's hostname so a
// single set of files can be served to every environment without a build step.
const ENVIRONMENTS = {
  local:      { apiBaseUrl: "http://localhost:3000" },
  staging:    { apiBaseUrl: "https://api-staging.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

const HOSTNAME_ENVIRONMENTS = {
  "localhost": "local",
  "127.0.0.1": "local",
  "staging.example.com": "staging",
};

// Unmapped hosts fall through to production: reaching the real API from an
// unrecognized host is a visible failure, whereas silently reaching staging is
// not.
function resolveEnvironment(hostname) {
  return HOSTNAME_ENVIRONMENTS[hostname] || "production";
}

const environment = resolveEnvironment(window.location.hostname);

window.APP_SETTINGS = {
  environment,
  apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
};
```

Adding an environment is a two-line edit; repointing one is a one-line edit.

### Changed file: `index.html`

Add one tag immediately before the existing `app.js` tag:

```html
<script src="settings.js"></script>
<script src="app.js"></script>
```

### Changed file: `app.js`

`API_ENDPOINT` keeps its name and position at the top of the file; only its
value changes, plus a guard:

```js
if (!window.APP_SETTINGS) {
  throw new Error("settings.js must load before app.js");
}

const API_ENDPOINT = `${window.APP_SETTINGS.apiBaseUrl}/login`;
```

Nothing inside `login()`, `validateForm()`, or the submit handler changes.

### Error handling

The only new failure mode is load order. `app.js` reads `window.APP_SETTINGS` at
top level, so if the script tags are reordered or `settings.js` fails to load,
the naive result is the string `"undefined/login"` — a URL that looks plausible
in a log and fails confusingly at request time. The explicit throw converts that
into a named error at page load. This guard is the reason the change is not a
pure copy-paste move.

No other error handling is added. `ENVIRONMENTS[environment]` cannot be
undefined because `resolveEnvironment` only ever returns a key that exists in
it.

## Testing

There is no test runner in this repository and none is being added, so
verification is manual:

1. Open `index.html` from `localhost` and confirm
   `window.APP_SETTINGS.environment === "local"` and `API_ENDPOINT` is
   `http://localhost:3000/login`.
2. Confirm `resolveEnvironment("app.example.com")` returns `"production"`, so an
   unmapped host yields today's URL, `https://api.example.com/login`.
3. Temporarily remove the `settings.js` script tag and confirm the page throws
   `"settings.js must load before app.js"` rather than producing
   `undefined/login`.

Behavior is otherwise unchanged: `login()` remains a stub that performs no
network request, so there is no request-path regression to test for.

## Assumptions

Only `https://api.example.com` is drawn from the existing code. The rest were
inferred and need confirmation before anyone relies on them:

- Assumption: the local API runs at `http://localhost:3000`; validate by
  confirming the local API server's port with whoever runs it.
- Assumption: the staging API is `https://api-staging.example.com` and the
  staging site is served from `staging.example.com`; validate against the
  staging deployment's actual hostnames.

If any is wrong, the fix is editing the corresponding line in `ENVIRONMENTS` or
`HOSTNAME_ENVIRONMENTS`; no other code changes.

## Out of Scope

- Lint, format, and test tooling (explicitly declined during brainstorming).
- `src/index.js` and `src/utils.js`.
- Making `login()` perform a real request.
- Any configuration beyond the API base URL.
