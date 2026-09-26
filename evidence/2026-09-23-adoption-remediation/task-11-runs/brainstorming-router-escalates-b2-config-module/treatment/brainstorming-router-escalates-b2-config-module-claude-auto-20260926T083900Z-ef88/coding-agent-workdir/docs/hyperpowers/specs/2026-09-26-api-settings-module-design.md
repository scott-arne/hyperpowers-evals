# API Settings Module — Design

Date: 2026-09-26
Status: awaiting user review

## Problem

The login API endpoint is a bare constant at the top of `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application code.
There is no place for environment-varying configuration to live, and no
mechanism for selecting between environments.

## Goal

Move the API endpoint into a dedicated settings module that resolves the
correct environment automatically, so switching environments requires no
source edit.

Non-goal: a general configuration system. This covers the API base URL and
the one endpoint derived from it. Further settings can join the same table
when they exist.

## Decisions

Two forks were resolved with the user before design:

1. **Environment selection: runtime hostname detection.** The module holds a
   table of environments and picks one from `window.location.hostname` at
   load. Chosen over deploy-time file swapping (needs deployment machinery
   this project does not have) and build-time injection (introduces a
   toolchain this project does not have). The endpoint is a public API URL,
   so shipping all environments' hosts to the browser is not a disclosure
   concern.
2. **Module format: ES modules.** `settings.js` uses `export`, `app.js` uses
   `import`, and `index.html` switches to `<script type="module">`. Chosen
   over a `window.APP_SETTINGS` global. Accepted cost: `type="module"`
   scripts are fetched under CORS rules, so the page can no longer be opened
   via `file://` — it must be served over http.
3. **Unrecognized hostnames resolve to production**, preserving today's
   behavior for any host not explicitly listed.
4. **Unit tests via `node --test`** (built-in runner, no dependencies). No
   linter, formatter, or end-to-end tests — the project has none and this
   change does not justify introducing a toolchain.

## Design

### `settings.js` (new, repo root)

Browser-side code lives at the repo root alongside `app.js`; `src/` is an
unrelated CommonJS Node entry point.

The module is **purely functional** — it reads no browser globals. This is a
direct consequence of decision 4: a module that evaluates
`window.location.hostname` at import time throws under `node --test`, where
no `window` exists. Keeping the module pure avoids a `typeof window` guard
and makes every mapping directly testable.

```js
const ENVIRONMENTS = {
  local:      { apiBaseUrl: "http://localhost:3000" },
  staging:    { apiBaseUrl: "https://staging-api.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

const HOSTNAME_ENVIRONMENTS = {
  localhost: "local",
  "127.0.0.1": "local",
  "staging.example.com": "staging",
};

export function environmentForHostname(hostname) { /* table lookup, default "production" */ }
export function settingsForHostname(hostname) { /* ENVIRONMENTS[environmentForHostname(hostname)] */ }
export function loginEndpoint(hostname) { /* `${settingsForHostname(hostname).apiBaseUrl}/login` */ }
```

The table stores `apiBaseUrl`, not fully-formed endpoint URLs, and endpoints
are derived from it. Adding a second endpoint later costs one derivation
function rather than three more host strings to keep synchronized — which is
the substance of "easier to change environments".

### `app.js` (changed)

- Remove the `API_ENDPOINT` constant.
- `import { loginEndpoint } from "./settings.js";`
- Resolve once at module scope:
  `const LOGIN_ENDPOINT = loginEndpoint(window.location.hostname);`
- Update the stub comment in `login()` to name `LOGIN_ENDPOINT`.

No other logic changes. `login()` and `validateForm()` keep their current
behavior and signatures; `login()` is still a stub that performs no request.

### `index.html` (changed)

`<script src="app.js"></script>` becomes
`<script type="module" src="app.js"></script>`.

Module scripts are deferred, so they execute after parsing. The existing
top-level `document.getElementById("login-form")` call continues to find its
element.

### `package.json` and `src/package.json`

`node --test` must load `settings.js` as an ES module, which requires
`"type": "module"` in the root `package.json`. That field applies to every
`.js` file under the package root, including `src/index.js` and
`src/utils.js`, which use `require`/`module.exports` and would break.

Resolution: add `src/package.json` containing `{ "type": "commonjs" }`. A
nested `package.json` scopes the module type to that subtree, so the existing
Node code keeps working with **no edits to `src/index.js` or `src/utils.js`**.

Root `package.json` also gains `"test": "node --test"`.

### `settings.test.js` (new)

Covers the mapping table:

- `localhost` and `127.0.0.1` resolve to the local API base URL.
- The staging hostname resolves to the staging API base URL.
- An unrecognized hostname (e.g. `app.example.com`) resolves to production.
- The empty string resolves to production.
- `loginEndpoint` appends `/login` to the resolved base URL without a
  duplicated or missing slash.

## Behavior Change

For every host except `localhost`, `127.0.0.1`, and the staging hostname, the
resolved endpoint is `https://api.example.com/login` — identical to today.

One genuine behavior change: a page loaded from `localhost` previously hit
production and will now hit `http://localhost:3000`. That is the intended
effect of the feature, but it is not a pure refactor, and anyone who was
testing against production from localhost is affected.

A second consequence of decision 2: opening `index.html` directly from the
filesystem no longer works. Serving the directory (for example
`npx serve .`) becomes a prerequisite for running the page.

## Assumptions

Only the production URL is derivable from existing code. The rest are
placeholders carried from the design discussion:

- Assumption: the local API is `http://localhost:3000`; validate by
  confirming the local API's port with the user before implementation.
- Assumption: the staging API is `https://staging-api.example.com`; validate
  with the user before implementation.
- Assumption: the staging frontend is served from `staging.example.com`;
  validate with the user before implementation. This one matters most — if
  the hostname is wrong, staging silently resolves to production, which is
  exactly the failure mode decision 3 accepts.

Wrong values here are a one-line correction in a table, not a design change.

## Out of Scope

- `src/index.js` and `src/utils.js` — no API configuration in them, and
  converting them to ES modules serves no goal of this change. They are
  insulated via `src/package.json` only.
- Runtime override mechanisms (query parameter, `localStorage`) for forcing
  an environment. Not requested; add only if a real need appears.
- Making `login()` perform an actual request. It remains a stub.

## Testing

- `npm test` (`node --test`) covers the hostname table and endpoint
  derivation.
- Manual verification, since the `window` read is not unit-tested: serve the
  directory and confirm from the browser console that `LOGIN_ENDPOINT`
  resolves to the local base URL on `localhost` and to production on any
  other host.
