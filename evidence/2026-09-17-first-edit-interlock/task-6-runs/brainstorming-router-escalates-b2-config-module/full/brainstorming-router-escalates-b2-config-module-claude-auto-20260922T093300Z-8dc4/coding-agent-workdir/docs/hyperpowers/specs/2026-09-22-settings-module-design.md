# Settings Module Design

Date: 2026-09-22
Status: Approved design, pending implementation plan

## Problem

`API_ENDPOINT` is a hardcoded constant on line 2 of `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application logic,
which puts the endpoint value in the same file as the login flow and the DOM
wiring. There is no way to run the same files against development, staging,
and production.

## Goal

Extract the API endpoint into a dedicated settings module that resolves the
correct environment automatically, so switching environments requires no code
edit and no rebuild.

## Non-Goals

- No build step, bundler, or package dependencies. The repo is currently
  dependency-free and stays that way.
- No changes to `src/index.js` or `src/utils.js`. Nothing in the Node half of
  the repo reads the API endpoint; wiring it in would be speculative.
- No secrets handling. The endpoint URLs are public, as they already are today
  in shipped source.

## Context

The repository contains two unconnected halves:

- `index.html` + `app.js` — a browser app loaded as a classic script
  (`<script src="app.js">`). No module system, no bundler. `API_ENDPOINT`
  lives here.
- `src/index.js` + `src/utils.js` — a Node CommonJS pair (`require` /
  `module.exports`), and `package.json`'s `main`.

CommonJS in `src/` cannot be loaded by the browser without a bundler, so the
settings module belongs on the browser side.

## Decisions

Each decision below was confirmed with the user during brainstorming.

| Decision | Choice | Rationale |
|---|---|---|
| Environment selection | Hostname detection | No build toolchain; the same files deploy everywhere unchanged. |
| Module form | Classic script, namespaced global | Matches the existing plain-script style; preserves `file://` loading. ES modules would break opening `index.html` from disk. |
| Unmapped hostname | Throw | On an auth endpoint, a wrong-environment default is worse than a broken page. |
| `file://` (empty hostname) | Mapped explicitly to `development` | Preserves double-click loading; an empty hostname can only mean a local file, so fail-loudly still holds for real unknown hosts. |
| Test infrastructure | Node built-in `node:test` | Zero dependencies, keeps the repo dependency-free. |

## Architecture

### New file: `settings.js` (repo root, beside `app.js`)

An IIFE taking `globalThis`, exposing one global, `window.AppSettings`:

- `AppSettings.resolveEnvironment(hostname)` — a pure function. Takes a
  hostname string, returns `{ name, apiEndpoint }`, throws on no match. Reads
  no globals and touches no DOM. This purity is what makes the environment
  logic testable without a browser.
- `AppSettings.current` — the result of `resolveEnvironment(location.hostname)`,
  resolved eagerly at load time. Set only when `location` exists, so requiring
  the file under Node does not throw.

Two tables drive resolution, and they are the only things edited to change
environments:

```js
const ENVIRONMENTS = {
  development: { apiEndpoint: "<development URL>" },
  staging:     { apiEndpoint: "<staging URL>" },
  production:  { apiEndpoint: "https://api.example.com/login" },
};

const HOSTNAME_TO_ENVIRONMENT = {
  "":          "development",  // file:// — opened from disk
  "localhost": "development",
  "127.0.0.1": "development",
  // staging and production hostnames
};
```

Separating hostname-to-name from name-to-settings means adding a preview host
is a one-line change, and a second hostname for an existing environment does
not duplicate its URL.

Assumption: the environment set is development / staging / production, with
today's `https://api.example.com/login` as production. Validate by confirming
the real staging and production hostnames with the user before implementation;
the development and staging URLs and the non-local hostnames are unknown and
must be supplied.

### Changes to `app.js`

- Remove the `API_ENDPOINT` constant (line 2).
- `login()` reads `AppSettings.current.apiEndpoint` at call time rather than
  capturing it at load, so no stale value is held and the existing comment on
  line 6 stays accurate.
- The submit handler gains one guard: if `window.AppSettings` is missing, log
  that settings failed to load and point at the earlier error, then return
  without submitting.

### Changes to `index.html`

- Add `<script src="settings.js"></script>` immediately before the existing
  `app.js` tag.
- Add a one-line comment noting that load order is a dependency. This is the
  single non-obvious thing a future reader can break silently.

## Error Handling

`resolveEnvironment` throws on an unmapped hostname. The message names the
offending hostname and lists the known ones, so an unlisted host is
diagnosable from the console in one read.

Classic `<script>` tags execute independently, so a throw in `settings.js`
does not prevent `app.js` from running. Without a guard this produces the real
error at load followed by a confusing `Cannot read properties of undefined` on
submit. The `app.js` guard converts that second error into a message pointing
back at the first, and the form refuses to submit to an unknown endpoint.
Two errors, both naming the real cause.

## Testing

`node:test` with `node:assert`, no dependencies. Add a `test` script to
`package.json` running `node --test`.

`test/settings.test.js` consumes the same interface the browser does:

```js
require("../settings.js");
const { resolveEnvironment } = globalThis.AppSettings;
```

The global is the module's interface, so the test needs no export boilerplate
and no environment sniffing in `settings.js`.

Cases:

- A known development hostname (`localhost`, `127.0.0.1`) resolves to the
  development environment and its endpoint.
- The empty hostname resolves to development.
- A known production hostname resolves to the production endpoint.
- An unmapped hostname throws, and the error message contains the offending
  hostname.
- Requiring `settings.js` under Node does not throw despite the absence of
  `location`.

## Risks

- The hostname table is the single point of correctness. A missing entry takes
  the login form down on that host. This is the accepted cost of the
  fail-loudly decision, and the fix is one line.
- Endpoint URLs for every environment are visible in shipped source. This is
  already true today and is not made worse.
