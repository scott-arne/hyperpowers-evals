# Settings Module Design

Date: 2026-09-17
Status: Approved (design), pending implementation plan

## Problem

The login API endpoint is hard-coded as a module-level constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the page at a different environment means editing application code.
There is no configuration seam, and nothing in the repository establishes where
configuration should live.

## Goal

Move the API endpoint into a dedicated settings module so that switching
environments requires no change to application logic, and so that later
configuration values have an obvious home.

Non-goals: authentication changes, an actual network call (the `login` function
remains a stub), configuration for the `src/` Node entry point, and any
secrets handling.

## Decisions

Each of the following was chosen explicitly during brainstorming.

### Environment selection: hostname detection

`settings.js` maps `window.location.hostname` to a named environment. No file
edit or build step is needed to switch environments.

Rejected: hand-editing a single value (dev and production values then conflict
in version control); build-time injection (introduces a build toolchain and a
package manager to a repository that has neither, and is not cheap to undo).

Accepted consequence: every environment's API URL is present in the file served
to the browser. These are public endpoint URLs, not secrets, so this is
acceptable.

### Module wiring: ES modules

`settings.js` uses `export`; `app.js` uses `import`; `index.html` loads the app
with `<script type="module">`.

Rejected: a second `<script>` tag assigning `window.SETTINGS`, which keeps
`file://` loading working but relies on a global and on script ordering in the
HTML.

Accepted consequence: ES modules are blocked over `file://`, so opening
`index.html` by double-clicking it no longer works. The page must be served,
for example with `python3 -m http.server`. This is the one user-visible
behavior change in the whole change set.

### Module system: the repository becomes ESM

`package.json` gains `"type": "module"`. `src/utils.js` and `src/index.js`
convert from CommonJS to ESM (roughly four lines across the two files).

This is required, not cosmetic: without `"type": "module"`, Node parses every
`.js` file as CommonJS, so `node --test` would hit the `export` keyword in
`settings.js` and throw a `SyntaxError`. The pure environment-resolution
function would be untestable.

Rejected: naming the file `settings.mjs` (Node would accept it, but browsers
depend on the server's `Content-Type` header, and some static servers do not
map `.mjs` to a JavaScript MIME type, which would break page loading);
shipping without unit tests (leaves the hostname map and the fallback path
unverified).

Accepted consequence: `src/utils.js` and `src/index.js` are edited even though
they are outside the literal scope of the request. They have no other
consumers. This cost was raised explicitly and accepted.

### Configuration shape: base URL, not full endpoint URL

Each environment stores `apiBaseUrl`. The `/login` path is appended by the
caller, because the host varies per environment and the path does not.

### Unknown hostname falls back to production

`settingsFor()` returns the production settings for any hostname not in the
map, silently.

Rejected: throwing on an unrecognized hostname. That surfaces a misconfigured
deployment loudly but takes the entire login page down over a configuration
miss.

### Tooling: no linter or formatter

The repository has no `node_modules` and no install step. `node --test` is
built into Node and adds no dependency. ESLint and Prettier were considered and
declined for now.

## Design

### New file: `settings.js` (repository root)

Placed beside `app.js` rather than in `src/`. `src/` is the Node entry point
tree; keeping an ES module for the browser in the same directory as CommonJS
Node files invites confusion about which module system a `.js` file uses.

Structure:

- `ENVIRONMENTS` — a map from environment name (`local`, `staging`,
  `production`) to a settings object containing `apiBaseUrl`.
- `HOSTNAME_ENVIRONMENTS` — a map from hostname to environment name, covering
  `localhost`, `127.0.0.1` (both `local`), and `staging.example.com`.
- `settingsFor(hostname)` — exported pure function returning the settings
  object for a hostname, defaulting to production. Takes the hostname as a
  parameter and reads no globals, so it is testable under Node without a DOM.
- `currentSettings()` — exported convenience wrapper returning
  `settingsFor(window.location.hostname)`.

`currentSettings()` is a function, not a `const settings = settingsFor(...)`
binding. A top-level binding would evaluate `window.location` at import time,
so merely importing `settings.js` under Node — which the unit tests do — would
throw `ReferenceError: window is not defined` before any test ran. Keeping the
browser-global read inside a function body makes the module import-safe
everywhere and costs one pair of parentheses at the call site.

Environment values:

| Environment | Hostnames | `apiBaseUrl` |
|---|---|---|
| `local` | `localhost`, `127.0.0.1` | `http://localhost:3000` |
| `staging` | `staging.example.com` | `https://staging-api.example.com` |
| `production` | any other hostname | `https://api.example.com` |

Assumption: the local and staging URLs are placeholders. The production value
preserves the host from the current hard-coded `API_ENDPOINT`. Validate by
confirming the real hostnames and URLs with the repository owner before or
shortly after implementation; they are single-line edits in one file.

### Changed file: `app.js`

- Remove the `API_ENDPOINT` constant.
- Add `import { settings } from "./settings.js";`.
- Build the login URL from `settings.apiBaseUrl` where the endpoint is
  referenced.
- Update the stub comment inside `login()` that names `API_ENDPOINT`.

`validateForm` and the submit handler are unchanged.

### Changed file: `index.html`

`<script src="app.js"></script>` becomes
`<script type="module" src="app.js"></script>`.

Module scripts are deferred, so the DOM is parsed before `app.js` runs and the
`getElementById("login-form")` lookup at module top level continues to resolve.

### Changed files: `package.json`, `src/utils.js`, `src/index.js`

- `package.json`: add `"type": "module"`, and a `test` script running `node --test`.
- `src/utils.js`: `module.exports = { greet }` becomes `export { greet }`.
- `src/index.js`: `require('./utils')` becomes `import { greet } from './utils.js'`
  (the explicit `.js` extension is required under ESM resolution).

## Data flow

1. The browser loads `index.html` and fetches `app.js` as a module.
2. `app.js` imports `currentSettings` from `settings.js` and calls it once at module top level, resolving `window.location.hostname` to a settings object.
3. The submit handler validates input, then calls `login()`, which targets `` `${settings.apiBaseUrl}/login` ``.

## Error handling

- Unknown hostname: falls back to production settings; no throw.
- A hostname mapped to an environment name absent from `ENVIRONMENTS` is a
  programming error in this file. `settingsFor()` falls back to production
  rather than returning `undefined`, so a typo in the map degrades to the
  production endpoint instead of producing `undefined/login`.
- No network error handling is in scope; `login()` remains a stub.

## Testing

Unit tests with the built-in Node test runner (`node --test`), no dependencies,
in `test/settings.test.js`:

- `localhost` and `127.0.0.1` resolve to the local `apiBaseUrl`.
- `staging.example.com` resolves to the staging `apiBaseUrl`.
- An unrecognized hostname resolves to the production `apiBaseUrl`.
- The production `apiBaseUrl` plus `/login` reproduces the endpoint string that
  `app.js` used before this change, which pins the refactor as behavior-preserving
  in production.

Tests import `settingsFor` only. They never call `currentSettings()`, which
reads `window.location` and is therefore browser-only.

Manual verification: serve the directory (`python3 -m http.server`), load the
page over `http://localhost:<port>`, submit the form, and confirm the console
output and that the module loads without error.

## Risks

- Serving is now required for local development; double-clicking `index.html`
  fails silently apart from a console error. This is the change most likely to
  surprise someone.
- `src/` files are converted as a prerequisite for testing, widening the diff
  beyond the endpoint move.
- Placeholder staging and local URLs ship until real values are supplied.
