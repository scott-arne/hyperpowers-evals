# Settings Module Design

Date: 2026-09-22
Status: Approved design, pending implementation plan

## Problem

The API endpoint is a hardcoded literal in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application code, and there is nowhere
for the next configuration value to go. The repository has no configuration
layer of any kind.

## Goals

- Move the API endpoint out of `app.js` into a dedicated settings module.
- Select the environment automatically at page load, with no build step.
- Establish a shape that future configuration values extend without rework.

## Non-goals

- No bundler, transpiler, or build step.
- No changes to `src/index.js` or `src/utils.js`. That CommonJS greeter is
  unrelated to the browser login app and does not consume configuration.
- No secret management. Every value here is public and ships to the browser.
- No runtime environment override (query parameter, local storage). Hostname
  detection is the only selector.

## Global Constraints

- **Zero runtime dependencies.** `package.json` gains no `dependencies` and no
  `devDependencies`. The test runner is Node's built-in `node:test`.
- **Unit test infrastructure is in scope** for this work: a `test` script and a
  first passing test file. Linting, formatting, and end-to-end testing were
  considered and declined.
- Browser code must keep working when `index.html` is opened directly from the
  filesystem (`file://`). This rules out native ES modules.
- Match existing style in `app.js`: plain scripts, no framework.

## Architecture

### Environment selection

`detectEnvironment(hostname)` is a pure function from hostname string to one of
`"development" | "staging" | "production"`. It looks the hostname up in a table
and returns `"production"` when there is no match.

**Unknown hostnames resolve to production**, accompanied by a `console.warn`
naming the unmatched hostname.

`detectEnvironment` itself stays pure — it returns a string and logs nothing.
The `console.warn` is emitted by the browser branch below, which compares the
resolved environment against the hostname tables. Keeping the warning out of the
function is what lets the unit tests call it repeatedly without producing
output.

Rationale: every real deployment host is unrecognized until someone adds it to
the table — an apex domain versus `www`, a preview URL, a new CDN hostname.
Defaulting those to development would point a live page at a `localhost` server
that does not exist, breaking the page entirely. The accepted cost is the
opposite failure: a host that should be staging talks to production until it is
added to the table. The `console.warn` is what makes that visible. Reversing
this default is a one-line change.

### Module shape

New file `settings.js` at the repository root, beside `app.js`.

```js
(function () {
  var ENVIRONMENTS = {
    development: { apiBaseUrl: "http://localhost:3000" },
    staging:     { apiBaseUrl: "https://staging-api.example.com" },
    production:  { apiBaseUrl: "https://api.example.com" },
  };

  var HOSTNAMES = {
    development: ["localhost", "127.0.0.1"],
    staging: ["staging.example.com"],
  };

  function detectEnvironment(hostname) {
    // Table lookup over HOSTNAMES; falls back to "production" with a warning.
  }

  if (typeof window !== "undefined") {
    var environment = detectEnvironment(window.location.hostname);
    window.AppSettings = Object.freeze({
      environment: environment,
      apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { detectEnvironment: detectEnvironment, ENVIRONMENTS: ENVIRONMENTS };
  }
})();
```

The `window` guard exists because the file must be `require`-able from a Node
test; without it, the reference to `window.location` throws at load time under
Node.

The `module.exports` tail is a **test seam, not a consumer interface**. Browser
code reads `window.AppSettings` and never uses the export. A dual-format module
intended for use from Node was considered and declined; this narrower affordance
was accepted specifically to make `detectEnvironment` testable.

### Public interface

`window.AppSettings`, a frozen object:

| Key | Type | Meaning |
|---|---|---|
| `environment` | string | `"development"`, `"staging"`, or `"production"` |
| `apiBaseUrl` | string | Origin only, no trailing slash, no path |

Base URL rather than full endpoint URL: callers append their own path. A second
endpoint therefore costs one line at its call site instead of three more entries
in the environment table.

The object is frozen so a consumer cannot mutate shared configuration and
produce behavior that depends on script execution order.

### Data flow

1. `index.html` loads `settings.js` **before** `app.js`.
2. `settings.js` reads `window.location.hostname` and publishes
   `window.AppSettings`.
3. `app.js` derives its endpoint at load time:
   `const API_ENDPOINT = AppSettings.apiBaseUrl + "/login";`

Script order is load-bearing. `app.js` reads the global at evaluation time, not
inside the submit handler.

## Error handling

- **Unknown hostname:** resolve to production, emit `console.warn` with the
  hostname.
- **`settings.js` missing or failed to load:** `app.js` throws a `ReferenceError`
  on `AppSettings` and the page breaks loudly. This is deliberate. No fallback
  literal is kept in `app.js`, because a silent fallback would post credentials
  to whichever host the fallback named.
- **Unknown environment key:** not reachable. `detectEnvironment` only returns
  keys present in `ENVIRONMENTS`, and both tables are defined in one file.

## Testing

`test/settings.test.js`, run by `node --test` via a `test` script in
`package.json`. Cases over `detectEnvironment`:

- `"localhost"` and `"127.0.0.1"` resolve to `"development"`.
- The staging hostname resolves to `"staging"`.
- An unrecognized hostname resolves to `"production"`.
- Every key returned by `detectEnvironment` exists in `ENVIRONMENTS`, so the two
  tables cannot drift apart.

Not covered by automated tests: the `index.html` script ordering and the
`app.js` derivation. Both are verified by loading the page and confirming the
resolved endpoint. End-to-end tooling was declined as disproportionate for a
four-file app.

## Assumptions

These are unconfirmed and written into the code as placeholders. They are marked
in the spec rather than presented as facts.

- **Assumption:** the staging hostname is `staging.example.com`. Validate by
  confirming the real staging hostname with the deployment owner before staging
  is used.
- **Assumption:** the staging API base URL is `https://staging-api.example.com`.
  Validate the same way. No staging environment exists yet.
- **Assumption:** the development API runs at `http://localhost:3000`. Validate
  against however the local API server is actually started; the port is a guess.
- **Assumption:** the existing `https://api.example.com/login` is the production
  endpoint, and `https://api.example.com` is therefore the production base URL.
  This is the one value taken from existing code rather than invented, but the
  base/path split is inferred.

Placeholder values are functional defaults, not blockers: development works
today if the local API listens on port 3000, and production keeps its current
behavior exactly.

## Files touched

| File | Change |
|---|---|
| `settings.js` | New. Environment tables, `detectEnvironment`, `window.AppSettings`. |
| `index.html` | Add `<script src="settings.js"></script>` before the `app.js` tag. |
| `app.js` | Line 2 derives `API_ENDPOINT` from `AppSettings.apiBaseUrl`. No other change. |
| `package.json` | Add `"scripts": { "test": "node --test" }`. |
| `test/settings.test.js` | New. `node:test` cases for `detectEnvironment`. |

## Rejected alternatives

- **Native ES modules.** Cleaner syntax, no bundler needed. Rejected because
  `<script type="module">` is blocked by CORS on `file://` origins, so opening
  `index.html` directly would stop working.
- **Build-step injection of the environment.** The conventional production
  answer. Rejected as disproportionate: it introduces a toolchain to a repository
  with zero dependencies, and it is the expensive option to undo.
- **Gitignored `config.local.js` override file.** Explicit and per-machine.
  Rejected as an extra file that every deployment must either provide or tolerate
  missing, for no gain over hostname detection here.
- **Dual-format module consumed by `src/`.** Rejected as YAGNI: `src/index.js` is
  a standalone greeter with no connection to the login app.
- **Separate module for `detectEnvironment`.** Would avoid the CommonJS tail in
  `settings.js`, at the cost of a second script tag and a second global for one
  function.
