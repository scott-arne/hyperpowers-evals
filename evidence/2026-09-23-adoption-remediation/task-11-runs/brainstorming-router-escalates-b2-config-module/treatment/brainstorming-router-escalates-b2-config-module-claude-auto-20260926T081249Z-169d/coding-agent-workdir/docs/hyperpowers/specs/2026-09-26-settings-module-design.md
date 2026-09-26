# Settings Module Design

Date: 2026-09-26
Status: Approved design, pending implementation plan

## Problem

The login API endpoint is a hardcoded constant at the top of `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application code.
There is nowhere to put a second environment's URL, and nowhere to put a
second piece of configuration.

## Goal

Move the endpoint configuration out of `app.js` into a dedicated settings
module, so switching environments does not require editing application logic,
and so later configuration has an established home.

## Non-goals

- No change to login behavior. `login()` is a stub that logs and returns a
  canned result; this work does not make it issue a real request.
- No build tooling, bundler, package manager dependency, or test
  infrastructure. The repository has none today and gains none here.
- No changes to `src/index.js` or `src/utils.js`. That is a separate
  CommonJS Node area unrelated to the browser page.

## Constraints

- `index.html` loads `app.js` as a classic script (`<script src="app.js">`).
  There is no module system in the browser and no build step.
- `index.html` must remain openable directly from disk over `file://`. This
  is what rules out ES modules, which are fetched under CORS rules and fail
  on `file://`.
- The repository is zero-dependency. It stays that way.

## Global Constraints

- **Tooling:** none added. No linter, no formatter, no unit-test runner, no
  end-to-end tests. Verification is manual (see Testing).
- **Style:** match the existing browser-side code — `const` plus plain
  function declarations, no framework, no transpilation, no classes.

## Design

### New file: `settings.js`

A new file at the repository root, alongside `app.js`. The root is the
browser-side area of this repo; `src/` is the unrelated Node area.

`settings.js` has one responsibility: resolve the current environment from
the page's hostname and publish the resulting configuration as a frozen
global.

Structure:

```js
const ENVIRONMENTS = {
  dev:     { apiBaseUrl: "<DEV_BASE_URL>" },
  staging: { apiBaseUrl: "<STAGING_BASE_URL>" },
  prod:    { apiBaseUrl: "https://api.example.com" },
};

const HOSTNAME_ENVIRONMENTS = {
  "localhost": "dev",
  "127.0.0.1": "dev",
  "<STAGING_HOSTNAME>": "staging",
};

function resolveEnvironment(hostname) {
  return HOSTNAME_ENVIRONMENTS[hostname] || "prod";
}

const environment = resolveEnvironment(window.location.hostname);
window.SETTINGS = Object.freeze({
  environment: environment,
  apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
});
```

`resolveEnvironment` takes the hostname as a parameter rather than reading
`window.location` internally. The mapping is the only logic in the file, and
taking the hostname as an argument keeps it inspectable and independently
callable; it costs nothing over reading the global inline.

`Object.freeze` prevents a later script from mutating configuration out from
under the application.

### Unresolved values

Three values are not yet known and are written above as placeholders. They
must be supplied before implementation:

- `Assumption: the staging hostname is unknown; validate by asking the
  repository owner before implementation.`
- `Assumption: the dev API base URL is unknown; validate by asking the
  repository owner before implementation.`
- `Assumption: the staging API base URL is unknown; validate by asking the
  repository owner before implementation.`

Only the production URL is carried over from existing code and is therefore
known: `https://api.example.com`.

### Configuration shape

Each environment holds a base URL (`apiBaseUrl`), not a complete endpoint
URL. Callers append their own path. Adding a second endpoint is then a
one-line change at the call site rather than one new entry per environment.

The existing constant bakes the path in (`.../login`). Splitting it means the
`/login` path moves into `app.js`, where the login call lives.

### Loading

`index.html` gains exactly one line, immediately above the existing `app.js`
tag:

```html
<script src="settings.js"></script>
<script src="app.js"></script>
```

Both are classic scripts, so the browser executes them in document order.
`window.SETTINGS` is therefore assigned before `app.js` runs.

This global-script approach was chosen over ES modules specifically to
preserve `file://` loading, and because it matches the style already in
`app.js`.

### Changes to `app.js`

- Delete the `API_ENDPOINT` constant.
- In `login()`, build the URL where it is used:
  `window.SETTINGS.apiBaseUrl + "/login"`.
- Add a guard at the top of `login()` that throws `new Error("settings.js
  must be loaded before app.js")` when `window.SETTINGS` is undefined. The
  check lives in `login()` rather than at file scope so that loading `app.js`
  alone does not throw during page parse.

Because `login()` is a stub, this is a structural change with no observable
runtime difference today.

## Data flow

1. Browser parses `index.html`.
2. `settings.js` executes: reads `window.location.hostname`, resolves the
   environment, assigns frozen `window.SETTINGS`.
3. `app.js` executes: registers the submit handler.
4. On submit, `login()` reads `window.SETTINGS.apiBaseUrl` and composes the
   endpoint URL.

Configuration is read at call time rather than captured at load time, so
nothing depends on module-level evaluation order beyond the script tags.

## Error handling

| Case | Behavior | Rationale |
|---|---|---|
| Hostname not in the map | Resolves to `prod` | Any host not named here is a real deployment. Prod is also the endpoint the app used before this change, so a forgotten map entry degrades to "works, points at prod" rather than "broken". |
| `window.SETTINGS` absent | `login()` throws `Error("settings.js must be loaded before app.js")` | Someone reordering or dropping the script tag should get a clear failure, not a request to `undefined/login`. |
| Config mutated at runtime | Prevented by `Object.freeze` | Configuration should not be rewritable by unrelated code. |

## Testing

No test infrastructure is added; this was an explicit decision, not an
oversight. Verification is manual:

1. Open `index.html` from disk (`file://`) and confirm in the console that
   `window.SETTINGS` is defined and `environment` is `"prod"` (a `file://`
   page has an empty hostname, which is not in the map and so falls back).
2. Serve the directory on `localhost` and confirm `environment` is `"dev"`
   and `apiBaseUrl` is the dev URL.
3. Submit the login form in both cases and confirm the existing console
   output is unchanged.

## Files touched

| File | Change |
|---|---|
| `settings.js` | New |
| `index.html` | One added `<script>` line |
| `app.js` | Constant removed; URL composed in `login()`; missing-settings guard |
| `src/*`, `package.json`, `README.md` | Untouched |

## Rejected alternatives

- **Build-time injection of the endpoint.** The conventional answer, but it
  requires adding a bundler and build step to a repository that has neither,
  and it ends the ability to open `index.html` directly.
- **A single hand-edited `ACTIVE_ENV` constant.** Simpler, but the switch
  stays manual and a wrong value can be committed. Hostname detection makes
  the switch automatic at no extra cost.
- **ES modules.** The better long-term boundary, but `type="module"` breaks
  `file://` loading. Worth doing deliberately as its own change, not as a
  side effect of relocating a constant.
- **Full endpoint URLs per environment.** Readable, but each new endpoint
  would have to be added once per environment.
