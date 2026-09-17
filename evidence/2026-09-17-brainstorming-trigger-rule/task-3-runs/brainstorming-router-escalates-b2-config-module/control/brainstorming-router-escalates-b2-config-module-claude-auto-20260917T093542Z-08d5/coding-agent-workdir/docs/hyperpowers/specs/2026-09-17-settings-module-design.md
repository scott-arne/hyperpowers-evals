# Settings Module Design

Date: 2026-09-17
Status: Approved design, pending implementation plan

## Problem

`app.js` hardcodes the API endpoint at line 2:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different backend means editing source. There is no
notion of an environment anywhere in the repo, so there is nowhere for a
second backend URL to live.

## Goal

Move the API endpoint into a dedicated settings module that resolves the
correct backend for the environment the page is running in, so switching
environments is a configuration lookup rather than a source edit.

## Current State

- `app.js` — browser global script, loaded by `index.html` via a plain
  `<script src="app.js">` tag. Holds `API_ENDPOINT`, `login()`,
  `validateForm()`, and the submit handler. `login()` is a stub that logs and
  returns a canned success; it does not yet issue a request.
- `index.html` — static login form; one script tag.
- `src/index.js`, `src/utils.js` — CommonJS Node modules (`require` /
  `module.exports`), unrelated to `app.js` and not loaded by the page.
- `package.json` — no dependencies, no scripts, no build step.

The repo therefore carries two incompatible module conventions, and no
test runner, linter, or formatter.

## Design Decisions

Each was chosen explicitly during brainstorming.

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Environment source | `location.hostname` lookup, overridable by `window.APP_ENV` | Explicit HTML marker only; build-time substitution |
| Module shape | Browser global script exposing `window.AppSettings` | ES module (`type="module"`); dual CommonJS/browser file |
| Stored value | `apiBaseUrl` per environment; callers compose paths | Full endpoint URLs per environment |
| Environments | `local`, `staging`, `production` | Two-tier; four-tier |
| Unknown hostname | Falls back to `production` | Fail loudly |
| Tooling | `node:test` unit tests, no linter | Manual verification; ESLint + Prettier |
| Test seam | CommonJS export guard | `node:vm` file loading |

A runtime-fetched `config.json` (ops edits JSON per host, no JS redeploy)
was surfaced and declined in favor of hostname detection.

## Architecture

A new root-level `settings.js` is loaded by `index.html` immediately before
`app.js`. It self-executes on load, resolves the environment once, and
publishes `window.AppSettings`. By the time `app.js` evaluates, the settings
are populated — there is no async step and no initialization call, so the
only ordering requirement is script order in the HTML.

Resolution order:

1. `window.APP_ENV`, if set and naming a known environment.
2. `location.hostname`, looked up in the hostname map.
3. The `production` default.

## Components

### `settings.js` (new, repo root)

An IIFE so that nothing leaks into the global scope except `AppSettings`.

Internal tables:

- `ENVIRONMENTS` — maps environment name to `{ apiBaseUrl }`.
- `HOSTNAME_ENVIRONMENTS` — maps hostname to environment name.
- `DEFAULT_ENVIRONMENT` — `"production"`.

Resolver: `detectEnvironment(global)` implements the three-step order above.
An `APP_ENV` value that names no known environment is ignored and resolution
continues to the hostname step, so a typo cannot produce an undefined config.

Public surface:

- `window.AppSettings.apiBaseUrl` — base URL for the current environment.
- `window.AppSettings.environment` — the resolved environment name, for
  logging and for test assertions.

The object is frozen so a later script cannot mutate the resolved endpoint
after the fact.

The file ends with a test-only CommonJS export guard:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { detectEnvironment, ENVIRONMENTS, HOSTNAME_ENVIRONMENTS };
}
```

Browsers ignore it; `node:test` uses it.

### `index.html` (modified)

One line added above the existing `app.js` tag:

```html
<script src="settings.js"></script>
```

### `app.js` (modified)

Line 2 becomes:

```js
const API_ENDPOINT = `${window.AppSettings.apiBaseUrl}/login`;
```

The `API_ENDPOINT` name and the stub comment inside `login()` are preserved,
so `login()`, `validateForm()`, and the submit handler are untouched.

### Unchanged

`src/index.js`, `src/utils.js`, and `package.json` are not modified. They
share no code with `app.js`.

## Configuration Values

Assumption: staging's base URL is `https://staging-api.example.com` and its
hostname is `staging.example.com`; validate by confirming the real staging
host before implementation lands.

Assumption: local development serves the API at `http://localhost:3000`;
validate by confirming the local dev server port.

`production` is `https://api.example.com`, derived from the existing
hardcoded value and therefore not an assumption.

`localhost` and `127.0.0.1` both map to `local`.

## Error Handling

An unrecognized hostname resolves to `production` rather than throwing. The
consequence worth stating plainly: opening `index.html` directly from disk
gives `location.hostname === ""`, which falls through to `production` and
yields `https://api.example.com/login` — byte-identical to today's behavior.
Preserving that is the point of the choice.

The tradeoff is that a deploy to an unenumerated host silently talks to
production instead of failing visibly. This is acceptable while `login()` is
a stub that issues no request, and should be revisited when it starts making
real calls.

`window.APP_ENV` provides the escape hatch for any case the hostname map does
not cover.

## Testing

`node:test` (Node standard library, no dependencies). A `test` script is
added to `package.json`.

`detectEnvironment` is the only branching logic and gets full branch
coverage:

1. `APP_ENV` set to a known environment wins over the hostname.
2. `APP_ENV` set to an unknown value is ignored; hostname resolution proceeds.
3. A mapped hostname (`localhost`, `127.0.0.1`, the staging host) resolves to
   its environment.
4. An unmapped hostname, and the empty hostname of `file://`, resolve to
   `production`.

A further test asserts that `ENVIRONMENTS.production.apiBaseUrl` composes to
exactly `https://api.example.com/login`, pinning the no-regression property.

Manual verification: load the page and confirm `window.AppSettings` reports
the expected environment.

## Out of Scope

- Making `login()` issue a real request.
- Any change to `src/` or sharing configuration with the Node entry point.
- A bundler, linter, or formatter.
- Secrets handling. Everything here is a public base URL; nothing secret
  belongs in a browser-delivered file.
