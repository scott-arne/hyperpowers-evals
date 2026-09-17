# Settings Module Design

Date: 2026-09-17
Status: approved (pending user review of this document)

## Problem

The API endpoint is a hardcoded constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application
logic. There is no place to put per-environment configuration, and no
mechanism for selecting an environment.

## Goals

- Move endpoint configuration out of `app.js` into a dedicated module.
- Select the environment automatically, with no deploy-time step.
- Cover three environments: local, staging, production.
- Make environment resolution testable.

## Non-goals

- A build step or bundler. The project has no build tooling and this
  change does not add any.
- Configuring the `src/` Node entry point. `src/index.js` and
  `src/utils.js` are a separate CommonJS program that shares no code
  with the webapp and needs no endpoint configuration.
- Secret management. The values here are public API base URLs.

## Design

### New file: `settings.js`

Lives at the repository root, alongside `app.js`. Not under `src/`,
which is the unrelated Node program.

```js
const ENVIRONMENTS = {
  local:      { name: "local",      apiBaseUrl: "http://localhost:3000" },
  staging:    { name: "staging",    apiBaseUrl: "https://staging-api.example.com" },
  production: { name: "production", apiBaseUrl: "https://api.example.com" },
};

export function resolveEnvironment(hostname) { /* hostname -> env key */ }

export const settings = ENVIRONMENTS[
  resolveEnvironment(globalThis.location?.hostname ?? "")
];
```

### Environment selection: hostname detection

`resolveEnvironment` is a pure function from hostname string to
environment key:

| Hostname            | Environment  |
|---------------------|--------------|
| `localhost`         | `local`      |
| `127.0.0.1`         | `local`      |
| the staging host    | `staging`    |
| anything else       | `production` |

Chosen over a manually-edited `ENV` constant (a human step that gets
forgotten) and over build-time injection (which would require adding a
bundler to a project that has none). One artifact works in every
environment with no deploy action.

### Base URL, not full endpoint URL

Each environment stores `apiBaseUrl`, and the login URL is derived from
it. What varies across environments is the host, never the path, so
storing full URLs would duplicate the host three times and require three
edits to add a second endpoint.

### Unknown hostname falls back to production

A configuration module that throws at import time takes down the entire
page. An unrecognized host therefore resolves to `production`, so the app
still works.

The accepted tradeoff: a mistyped staging hostname silently talks to
production rather than failing loudly. This was considered and chosen
deliberately for a login form, where a broken page is worse than a
correct-but-unexpected target.

### Module loading: ES modules

`index.html` changes to `<script type="module" src="app.js">`, and
`app.js` imports from `./settings.js`.

Chosen over a classic script exposing a global, because the `import`
statement makes the dependency visible in the file that uses it rather
than implicit in script-tag ordering — which is the main reason to
extract a settings module at all.

Consequence: `index.html` can no longer be opened directly from `file://`,
because ES module loading is CORS-restricted. Local development requires
a static server, e.g. `python3 -m http.server`.

### The `globalThis.location?.` guard

Reading `window.location.hostname` unguarded at module scope throws when
the module is imported under Node, which would make `resolveEnvironment`
untestable without a DOM shim. The optional chain lets the module import
cleanly in Node (where it resolves to `production`, unused by tests)
while `resolveEnvironment` is tested directly with explicit hostname
arguments.

Chosen over splitting into a pure `environments.js` plus a browser-facing
`settings.js`, which separates concerns more strictly but adds a file to
a project of six for two dozen lines of code.

## Changes to existing files

- **`app.js`** — remove the `API_ENDPOINT` constant; add
  `import { settings } from "./settings.js";`; reference
  `settings.apiBaseUrl` in `login()`. The function remains a stub, as it
  is today — this change does not add real network calls.
- **`index.html`** — add `type="module"` to the `app.js` script tag.

## Testing

Test runner: Node's built-in `node:test`, run via `node --test`. Chosen
because it requires no dependency, keeping `package.json` dependency-free.
`resolveEnvironment` is a pure string function and needs no DOM.

`package.json` gains a `scripts.test` entry. No dependencies are added.

Test cases for `resolveEnvironment`:

- `localhost` resolves to `local`
- `127.0.0.1` resolves to `local`
- the staging hostname resolves to `staging`
- the production hostname resolves to `production`
- an unrecognized hostname resolves to `production`
- each environment entry exposes the expected `apiBaseUrl`

## Placeholder values

The local and staging values below are placeholders supplied at the
user's direction and **must be replaced before deploying**:

- local `apiBaseUrl`: `http://localhost:3000`
- staging `apiBaseUrl`: `https://staging-api.example.com`
- staging hostname (the host the browser runs on, not the API host):
  `staging.example.com`

Assumption: the production `apiBaseUrl` is `https://api.example.com`,
derived from the existing `API_ENDPOINT` constant in `app.js`. Validate
by confirming with the user that the current hardcoded value is the
production endpoint.

Assumption: the production site's own hostname does not need an explicit
mapping entry, because production is the fallback. Validate by confirming
no fourth environment is served from an unlisted host.
