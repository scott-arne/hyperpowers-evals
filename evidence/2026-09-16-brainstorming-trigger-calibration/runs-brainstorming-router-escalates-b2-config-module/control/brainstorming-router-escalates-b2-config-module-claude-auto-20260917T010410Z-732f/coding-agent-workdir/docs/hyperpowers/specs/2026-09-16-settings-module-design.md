# Settings Module Design

Date: 2026-09-16

## Problem

The login API endpoint is a bare constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application code.
There is no seam between "what the app does" and "which backend it talks to",
and no place to add a second environment other than by hand-editing that line
before each deploy.

## Goal

Move environment-specific configuration into a dedicated settings module so the
active API endpoint is determined by where the app is served, and so adding an
environment is a one-line change in one file that contains no application logic.

## Current State

- `index.html` — login form; loads `app.js` via a classic `<script>` tag.
- `app.js` — browser script. Holds `API_ENDPOINT`, `login()`, `validateForm()`,
  and the form submit handler. No module system; functions are globals.
- `src/index.js`, `src/utils.js` — a separate CommonJS Node entry point,
  unrelated to the page. Makes no API calls.
- `package.json` — name/version/description/`main`. No scripts, no dependencies.
- No build step, no linter, no formatter, no tests.

## Decisions

Each of these was chosen explicitly during brainstorming; the alternatives are
recorded so a later reader knows they were considered rather than missed.

### Environment selection: runtime detection from hostname

`settings.js` maps `window.location.hostname` to an environment. Switching
environments is a property of where the app is deployed — there is nothing to
remember at deploy time and no build step.

Rejected: a hand-edited `ENV` constant (a pre-deploy step that is easy to
forget), and build-time injection (introduces a toolchain to a repo that has no
build; still available later, since the settings module remains the single seam).

### Module format: ES modules

`settings.js` uses `export`; `app.js` uses `import`; `index.html` loads
`<script type="module" src="app.js">`. The dependency is explicit in the source.

Rejected: a `window.AppSettings` global loaded by an earlier `<script>` tag — a
module by convention only, with an implicit load-order dependency.

### Environments: local, staging, production

Three entries. Only the production `apiBaseUrl` is a known real value (derived
from the existing constant); the staging and production *hostnames* and the
staging API URL are placeholders, marked in the source for the maintainer to fill
in.

### Unknown hostname: throw at load

Resolving a hostname that is not in the map throws an `Error` naming the
hostname and the file to edit. The app refuses to run rather than guess.

Rejected: falling back to production (a mistyped development hostname would
silently post credentials to the production API) and falling back to local (an
unlisted production host would be quietly broken for real users).

Accepted cost: a production hostname that is not in the map takes the page down.
The map must be kept current with deploy hosts. If preview deploys with generated
URLs are introduced later, this decision should be revisited.

### Testing: `node:test`

`resolveSettings` is a pure function with a defined error path, which makes it
the one piece of this codebase worth a unit test. `node:test` is built into Node
(v26.8.2 locally), so this adds no dependencies.

Rejected for now: lint/format tooling, end-to-end tests. Neither was requested
and neither pays for itself on a three-file static page.

## Design

### New file: `settings.js` (repo root)

Placed at the root beside `app.js`, not under `src/` — `src/` is the unrelated
CommonJS Node tree, and `index.html` resolves scripts relative to the root.

The module is **pure**: it never reads `window`. This is what makes it importable
under `node:test`. The single line of browser coupling lives in `app.js`.

```js
export const ENVIRONMENTS = {
  "localhost":           { name: "local",      apiBaseUrl: "http://localhost:3000" },
  "127.0.0.1":           { name: "local",      apiBaseUrl: "http://localhost:3000" },
  "staging.example.com": { name: "staging",    apiBaseUrl: "https://api-staging.example.com" },
  "www.example.com":     { name: "production", apiBaseUrl: "https://api.example.com" },
};

export function resolveSettings(hostname) { /* ... */ }
```

`resolveSettings(hostname)` returns the matching entry augmented with the derived
endpoint:

```js
{ name, apiBaseUrl, loginEndpoint: `${apiBaseUrl}/login` }
```

Environments store a **base URL** rather than a full endpoint so `/login` is
written once instead of three times, and so "environment" is the unit of
configuration.

On a hostname with no entry it throws:

```
No environment configured for hostname "<hostname>". Add it to ENVIRONMENTS in settings.js.
```

The staging and production hostnames carry a source comment marking them as
placeholders to be replaced with the real deploy hosts.

### Modified: `app.js`

- Remove `const API_ENDPOINT`.
- Add `import { resolveSettings } from "./settings.js";`
- Add `const settings = resolveSettings(window.location.hostname);`
- Update the stub comment inside `login()` to reference `settings.loginEndpoint`.

`login()`, `validateForm()`, and the submit handler are otherwise untouched. This
is a refactor: on the production host the resolved endpoint equals the current
constant.

### Modified: `index.html`

`<script src="app.js">` becomes `<script type="module" src="app.js">`.

### Modified: `package.json`

- Add `"type": "module"` — required for a root `.js` file to use `export` under
  Node.
- Add `"scripts": { "test": "node --test" }`.

### New file: `src/package.json`

```json
{ "type": "commonjs" }
```

Node selects a file's module system from the nearest parent `package.json`, so
this scopes `src/` back to CommonJS and keeps `src/index.js` and `src/utils.js`
working with no changes to their code. It exists solely to contain the blast
radius of the root `"type": "module"`.

### New file: `test/settings.test.js`

Using `node:test` and `node:assert/strict`:

- Each mapped hostname resolves to its expected `name` and `apiBaseUrl`.
- `loginEndpoint` is the base URL with `/login` appended, for at least one
  environment per shape (local `http://`, remote `https://`).
- An unmapped hostname throws, and the message contains the offending hostname.
- The production entry resolves to `https://api.example.com/login` — a
  regression guard proving the refactor preserved today's behavior.

## Consequences

- **`file://` stops working.** Module scripts are blocked on the `file://`
  protocol, so opening `index.html` by double-clicking will fail. Local
  development becomes `python3 -m http.server` and visiting
  `http://localhost:8000`, which is also what makes the `localhost` map entry
  meaningful.
- **`login` and `validateForm` stop being globals.** Module scripts have their
  own scope. Nothing in the repo currently reaches for them from outside
  `app.js`.
- **Module scripts are deferred.** The handler registration still runs after the
  form exists, so behavior is unchanged.
- **The hostname map is now a deploy-time dependency.** A new production host
  must be added to `settings.js` before the app is deployed there.

## Out of Scope

- `src/index.js` and `src/utils.js` keep their current behavior and module
  system. They make no API calls; converting them to ES modules would serve no
  current goal.
- Non-API configuration (feature flags, timeouts, analytics keys). The module is
  shaped to hold them later, but nothing speculative is added now.
- Secrets. The values here are public API URLs; nothing credential-like belongs
  in a file the browser downloads.

## Verification

1. `npm test` passes (`node --test`).
2. `node src/index.js` still prints its greeting — proof the `"type": "module"`
   change did not break the CommonJS tree.
3. Serve the repo with `python3 -m http.server` and load
   `http://localhost:8000`: the page loads, the console shows no errors, and the
   resolved environment is `local`.
4. Submitting the form with both fields populated logs the login result;
   submitting with a field empty logs the validation error. Unchanged from today.

Assumption: the production host is served from a hostname the maintainer will
supply, validated by the maintainer replacing the placeholder entries before the
next deploy.
