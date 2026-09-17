# Settings Module Design

Date: 2026-09-16
Status: approved, not yet implemented

## Problem

The browser app hardcodes its API endpoint. `app.js:2` holds:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing that line, which is
manual and easy to ship by mistake. The endpoint should live in a dedicated
settings module that resolves the right environment automatically.

## Current State

- `index.html` loads `app.js` through a plain `<script src="app.js">` tag. No
  bundler, no module system, no build step.
- `app.js` is a global-scope browser script. `API_ENDPOINT` is referenced only
  by the `login()` stub at `app.js:4-8`; nothing performs a real request yet.
- `src/index.js` and `src/utils.js` are a separate CommonJS Node demo
  (`greet()`). They do not touch the endpoint and are out of scope.
- `package.json` declares no dependencies and no scripts. No test runner, no
  linter.

## Decisions

These were settled during brainstorming and are the premises of the design.

1. **Environment selection is hostname detection, not a manual edit.** The
   module maps the current hostname to an environment at load time. A `?env=`
   query parameter overrides detection for local testing against another
   environment. Build-time injection was rejected: it would require adding a
   bundler or substitution script to a repo that has neither.
2. **Packaging is a browser-only global.** `settings.js` is loaded by a
   `<script>` tag before `app.js` and publishes `window.SETTINGS`. Sharing
   config with the CommonJS code under `src/` was rejected as speculative —
   that tree has no network concerns and no consumer for settings.
3. **Three environments: `local`, `staging`, `production`.**
4. **Unit tests via `node:test`.** Zero dependencies. No linter is being added.

## Architecture

One new module, `settings.js`, at the repo root beside `app.js`. It owns three
responsibilities:

- the per-environment table,
- a pure resolver from location inputs to an environment name,
- the assembled config object published to the browser.

`app.js` becomes a consumer. It reads a resolved endpoint and knows nothing
about hostnames, environments, or overrides.

### Environment table

Each environment carries a base URL rather than a full endpoint URL. The host
is the part that varies per environment; the `/login` path does not. This
avoids repeating the path across rows and makes a second endpoint a one-line
addition.

```js
const ENVIRONMENTS = {
  local:      { apiBaseUrl: "http://localhost:3000" },
  staging:    { apiBaseUrl: "https://api.staging.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};
```

Assumption: the `local` and `staging` base URLs above are placeholders; the
real values were not available at design time. Validate by confirming them
with the project owner before or during implementation. The `production` base
URL is not an assumption — it preserves the host currently in `app.js:2`
exactly.

### Resolution order

`resolveEnvironmentName(hostname, search)` is a pure function of two strings,
with no access to globals, so it is directly unit-testable. Order:

1. If `search` contains an `env` parameter naming a key of `ENVIRONMENTS`,
   return that key.
2. If `search` contains an `env` parameter that is not a known key, emit
   `console.warn` and continue to step 3.
3. If `hostname` is `localhost`, `127.0.0.1`, `[::1]`, or the empty string
   (a `file://` load), return `local`.
4. If `hostname` begins with `staging.` or contains `.staging.`, return
   `staging`.
5. Otherwise return `production`.

### Published config

```js
window.SETTINGS = {
  environment,   // resolved name, e.g. "production"
  apiBaseUrl,    // from the table
  loginEndpoint, // apiBaseUrl + "/login"
};
```

`environment` is exposed because knowing which environment resolved is useful
when debugging an unexpected endpoint, and it costs one property.

### Node-import guards

Two guards keep `settings.js` importable by the test suite without side
effects, while leaving it a browser-first global script:

- the `window.SETTINGS` assignment is wrapped in
  `typeof window !== "undefined"`,
- a `module.exports` block at the bottom, guarded by
  `typeof module !== "undefined" && module.exports`, exports `ENVIRONMENTS`,
  `resolveEnvironmentName`, and the config builder.

This is the only concession to dual-format loading. It exists for testability,
not for consumers; `src/` is still not expected to import settings.

## Data Flow

1. The browser parses `index.html` and loads `settings.js` first.
2. `settings.js` reads `window.location.hostname` and
   `window.location.search`, resolves the environment, and assigns
   `window.SETTINGS`.
3. The browser loads `app.js`, whose line 2 becomes
   `const API_ENDPOINT = window.SETTINGS.loginEndpoint;`.
4. `login()` is unchanged. Its stub comment referring to `API_ENDPOINT` stays
   accurate.

Script ordering in `index.html` is load-bearing and gets a brief comment
saying so.

## Error Handling

- **Unrecognized hostname** falls back to `production` rather than throwing. A
  page pointing at production is a better failure than a page that cannot log
  in at all.
- **Unrecognized `?env=` value** is ignored with a `console.warn`, and
  hostname detection proceeds. A typo should not silently pin the app to a
  fallback with no signal.
- **`settings.js` missing or failing to load** throws when `app.js` is parsed,
  because `window.SETTINGS` is undefined. This is intentional and not guarded:
  a missing endpoint should fail loudly, and correct script ordering makes it
  a setup error rather than a runtime condition.

## Testing

`test/settings.test.js` using `node:test`, with `"test": "node --test"` added
to `package.json` scripts.

Cases:

- `localhost`, `127.0.0.1`, `[::1]`, and `""` each resolve to `local`.
- `api.staging.example.com` and `staging.example.com` resolve to `staging`.
- An unlisted hostname resolves to `production`.
- `?env=staging` on a `localhost` load resolves to `staging`.
- `?env=nonsense` falls back to hostname detection rather than throwing.
- The production base URL matches the host previously hardcoded in `app.js`,
  guarding against a silent endpoint change during the move.
- Importing `settings.js` under Node does not throw and does not require a
  `window` global.

Manual verification in addition to the suite: load `index.html` in a browser,
confirm `window.SETTINGS.environment` and `window.SETTINGS.loginEndpoint`
report production values, then confirm `?env=local` flips both.

## Files Touched

| File | Change |
|---|---|
| `settings.js` | New. Table, resolver, published config, Node guards. |
| `test/settings.test.js` | New. Resolver unit tests. |
| `app.js` | Line 2 reads from `window.SETTINGS` instead of a literal. |
| `index.html` | Adds the `settings.js` script tag before `app.js`. |
| `package.json` | Adds the `test` script. |
| `.gitignore` | New. Ignores `docs/hyperpowers`. |

## Out of Scope

- `src/index.js` and `src/utils.js`. They have no endpoint concerns.
- Making `login()` perform a real request. It stays a stub.
- Linting or formatting tooling.
- Build-time configuration injection.
