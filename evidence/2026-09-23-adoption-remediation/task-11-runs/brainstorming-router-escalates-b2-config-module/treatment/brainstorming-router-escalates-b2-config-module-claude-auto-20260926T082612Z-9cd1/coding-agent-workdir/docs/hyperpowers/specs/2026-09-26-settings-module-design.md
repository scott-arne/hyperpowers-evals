# Settings Module for Environment-Specific API Configuration

Date: 2026-09-26
Status: approved design, not yet implemented

## Problem

`app.js` hardcodes the API endpoint on line 2:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application source, which makes it easy to
deploy a build pointed at the wrong API and leaves no single place to see what
each environment talks to. The goal is a dedicated settings module so the
endpoint is configuration rather than code.

## Context

The repository is a four-file static webapp with no toolchain:

- `index.html` loads `app.js` with a classic `<script src>` tag.
- `app.js` is browser code with no module syntax; it relies on script-tag
  global scope.
- `package.json` declares no dependencies, no scripts, and no `"type"` field.
  There is no bundler, build step, linter, formatter, test runner, or CI.
- `src/index.js` and `src/utils.js` are CommonJS Node files, unrelated to the
  webapp and not loaded by the page.

The repo therefore already spans two module worlds — CommonJS under `src/`,
implicit globals at the root — with nothing shared between them.

## Decisions

These were settled during brainstorming; the alternatives are recorded so the
reasoning survives.

**Environment selection: hostname detection.** The settings module maps
`window.location.hostname` to an endpoint, so one set of files deploys to every
environment and self-selects. Rejected: a single hand-edited `ENVIRONMENT`
constant (a manual pre-deploy step that is easy to forget); build-time
injection (requires introducing tooling the repo does not have); a
query-param/localStorage dev override (deferred as unneeded for now).

**Environments defined: local, staging, production.** Local and staging hosts
are placeholders for the maintainer to replace. The production endpoint carries
over the existing `https://api.example.com/login` value unchanged, so behavior
on the real production host is identical to today.

**Scope: the API endpoint only.** No timeouts, feature flags, or base-URL
splitting. Additional settings get added when something actually needs them.

**Wiring: classic script tag plus a pure resolver.** A new root-level
`config.js` is loaded by its own `<script>` tag ahead of `app.js` and publishes
a global. Rejected: ES modules, which give a real module boundary but are
fetched under CORS rules, so the page would stop working when opened directly
from disk — a workflow cost that outweighs module hygiene on a page this small.
Also rejected: a dual-target CommonJS/browser module, which would let `src/`
consume the settings, but `src/` is unrelated to the webapp and makes no API
calls (YAGNI).

**Unknown hostname: throw.** Resolution of an unmapped hostname raises an error
naming the hostname. Rejected: falling back to production (a stray deployment
would silently talk to the production API), falling back to local (fails
harmlessly but obscurely), and warning with a null endpoint (defers the failure
to the first request).

## Design

### New file: `config.js`

Placed at the repository root beside `app.js`, not under `src/`, because `src/`
is the unrelated Node tree.

```js
// Per-environment settings, selected by the hostname the page is served from,
// so the same files can be deployed to every environment unchanged.
const ENVIRONMENTS = {
  // Empty hostname is a file:// URL — opening index.html directly from disk.
  "": { apiEndpoint: "http://localhost:3000/login" },
  "localhost": { apiEndpoint: "http://localhost:3000/login" },
  "127.0.0.1": { apiEndpoint: "http://localhost:3000/login" },
  "staging.example.com": { apiEndpoint: "https://api-staging.example.com/login" },
  "www.example.com": { apiEndpoint: "https://api.example.com/login" },
};

function resolveSettings(hostname) {
  const settings = ENVIRONMENTS[hostname];
  if (!settings) {
    throw new Error(
      `No settings configured for hostname "${hostname}". ` +
      `Add it to ENVIRONMENTS in config.js.`
    );
  }
  return settings;
}

const APP_SETTINGS = resolveSettings(window.location.hostname);
```

The empty-string entry exists because the two approved decisions interact: on a
`file://` URL `window.location.hostname` is `""`, which the throw-on-unknown
rule would otherwise treat as an unrecognized host and reject. Mapping `""` to
the local endpoint preserves the open-from-disk workflow that motivated the
script-tag approach, while keeping the throw loud for genuinely unknown hosts.

`resolveSettings` is a separate pure function rather than inline lookup so that
environment resolution can be tested by passing a hostname string, with no DOM
and no page load.

### Changed file: `index.html`

Add one line immediately before the existing `app.js` tag:

```html
<script src="config.js"></script>
<script src="app.js"></script>
```

Order is load-bearing: `config.js` must define `APP_SETTINGS` before `app.js`
is parsed.

### Changed file: `app.js`

Delete the `const API_ENDPOINT` line, and update the stub comment inside
`login()` to name `APP_SETTINGS.apiEndpoint` instead. No other logic changes.
`API_ENDPOINT` is currently referenced only from that comment — `login()` does
not yet make a network call — so no call site needs rewriting.

## Data flow

`config.js` executes first, resolves the hostname exactly once at load time,
and publishes `APP_SETTINGS`. `app.js` reads `APP_SETTINGS.apiEndpoint` at the
point of use. Resolution is eager and happens once per page load; there is no
lazy lookup and nothing to re-resolve.

## Error handling

An unrecognized hostname throws while `config.js` is executing, before `app.js`
is parsed. The practical consequence is that the submit listener is never
attached: the console shows an error naming the hostname, and the form silently
does nothing. "Loud" therefore means a console error plus a dead form, not a
message visible to an end user. User-facing error UI is out of scope.

## Testing

The repository has no test runner, no lint config, and no CI, so there is no
established testing pattern to follow and this change does not introduce one.
`resolveSettings` is pure specifically so that a test becomes a one-liner once
a runner exists.

Verification is manual:

1. Open `index.html` from disk; confirm the console shows no error and
   `APP_SETTINGS.apiEndpoint` is the localhost value.
2. From the browser console, call `resolveSettings("nope.example.com")` and
   confirm the thrown message names that hostname and reads clearly.
3. Confirm the production entry still carries the original
   `https://api.example.com/login`.

Standing up a minimal test runner is a separate decision, deliberately not
folded into this change.

## Out of scope

- `src/index.js` and `src/utils.js` — not loaded by the page.
- Making `login()` perform an actual network request.
- Any build tooling, bundler, or `.env` handling.
- User-facing error UI for the unknown-hostname case.

## Assumptions

- Assumption: the production host is `www.example.com`; validate by confirming
  the hostname the deployed page is actually served from before the map is
  relied on. The staging and local entries are explicit placeholders awaiting
  real values.
