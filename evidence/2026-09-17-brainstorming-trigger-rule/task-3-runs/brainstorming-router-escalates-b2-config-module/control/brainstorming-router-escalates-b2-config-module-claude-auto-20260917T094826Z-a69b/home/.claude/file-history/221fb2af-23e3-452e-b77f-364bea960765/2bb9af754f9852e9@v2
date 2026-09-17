# Settings Module Design

Date: 2026-09-17
Status: approved (design), pending implementation plan

## Problem

The login API endpoint is a hardcoded constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different environment means editing application
logic. There is no place for environment-varying values to live, so every
future configurable value would repeat the same problem.

## Goals

- Move the API endpoint out of `app.js` into a dedicated settings module.
- Make switching environments a property of where the app is served from,
  not a source edit at the call site.
- Give future configuration values an obvious home.

## Non-Goals

- Test infrastructure. The repository has none today; standing up a runner
  and a DOM shim would exceed the size of this change. See Testing.
- Linting and formatting tooling. Adding it now would reformat unrelated
  files and obscure the change.
- Configuration for the Node code under `src/`. Nothing there touches the
  API.
- A build step, bundler, or deploy-time file substitution.

## Constraints

These are properties of the existing repository, not choices made here:

- `app.js` is a plain browser script loaded by `index.html` via
  `<script src="app.js">`. There is no `type="module"`, no bundler, and no
  dependencies in `package.json`.
- `src/index.js` and `src/utils.js` are CommonJS Node code with no import
  relationship to `app.js`.
- There is no build or deploy pipeline to hang a file-swap step on.

Because there is no build step, the environment can only be resolved at
load time in the browser.

## Design

### New file: `config.js`

Lives at the repository root, as a sibling to `app.js`, matching where the
browser-facing code already sits.

It contains three things:

**1. An environment table.**

```js
const ENVIRONMENTS = {
  development: { apiBaseUrl: "http://localhost:3000" },
  staging:     { apiBaseUrl: "https://staging-api.example.com" },
  production:  { apiBaseUrl: "https://api.example.com" },
};
```

The production value preserves the host currently hardcoded in `app.js`.
The development and staging hosts are placeholders; no real values for
those environments exist yet.

**2. A hostname detector.** `detectEnvironment()` reads `location.hostname`
and returns an environment name:

| `location.hostname`                  | Environment   |
|--------------------------------------|---------------|
| `localhost`, `127.0.0.1`, `""`       | `development` |
| begins with `staging.`               | `staging`     |
| anything else                        | `production`  |

The empty-string case covers opening `index.html` directly over `file://`,
which is the likely local workflow given there is no dev server.

**3. The published result.** The module assigns a resolved object to the
global:

```js
window.AppConfig = {
  environment,   // e.g. "development"
  apiBaseUrl,    // e.g. "http://localhost:3000"
};
```

It publishes the resolved configuration rather than the whole table so
callers cannot reach into an environment other than the active one.
`environment` is exposed because it makes the active selection inspectable
from the browser console, which is how this change is verified.

### `index.html`

Gains one tag, immediately before the existing `app.js` tag:

```html
<script src="config.js"></script>
<script src="app.js"></script>
```

Plain scripts execute in document order, so this ordering is what
guarantees `window.AppConfig` exists before `app.js` runs. No other
mechanism is needed.

### `app.js`

- The `API_ENDPOINT` constant is removed.
- `login()` composes its URL from `window.AppConfig.apiBaseUrl + "/login"`
  **at call time**, not at module load time. Today both are equivalent;
  reading at call time avoids baking in a stale value if configuration is
  ever assigned later.
- No other behavior changes. `validateForm()` and the submit handler are
  untouched.

## Data Flow

1. The browser parses `index.html` and executes `config.js`.
2. `config.js` reads `location.hostname`, resolves an environment, and
   assigns `window.AppConfig`.
3. The browser executes `app.js`, which registers the submit handler.
4. On submit, `login()` reads `window.AppConfig.apiBaseUrl` and composes
   the login URL.

## Error Handling

**Unknown hostnames resolve to `production`.** This follows from the
chosen detection rules. The accepted risk, stated explicitly: a new deploy
target that is not added to the detector will silently talk to the
production API rather than failing loudly. The alternative — throwing on
an unrecognized host — was rejected because it breaks any host not
enumerated in advance.

**A missing `AppConfig` fails loudly.** If `config.js` fails to load,
`login()` throws an error naming the problem (`AppConfig not loaded`)
rather than composing `undefined/login` and surfacing a confusing failure
later, at request time.

## Testing

Verification is manual. The browser is the only runtime for this code, and
the repository has no test infrastructure.

Choosing a browser-only module with no UMD wrapper is what makes automated
testing expensive here: `config.js` assigns to `window` as a load-time side
effect, so Node cannot `require` it and call `detectEnvironment()` directly.
Automated coverage would require either jsdom plus a runner, or loading the
file into a `node:vm` sandbox with a fabricated `window` and `location`.
That was judged disproportionate to a change of roughly twenty lines.

Manual verification steps:

1. Open `index.html` directly (`file://`). Confirm in the console that
   `window.AppConfig.environment` is `development` and `apiBaseUrl` is
   `http://localhost:3000`.
2. Submit the login form. Confirm the logged result reflects the composed
   URL built from that base.
3. Serve the page from a non-localhost, non-`staging.` host and confirm the
   environment resolves to `production`.

If a test suite is wanted later, it deserves its own task where the harness
is the goal rather than a side effect of a config move.

## Future Extension

Both alternatives considered and set aside remain strictly additive on top
of this design, so neither is foreclosed:

- A deploy-time swap of `config.js` for a per-environment copy.
- A `window.APP_CONFIG` override hook read in preference to the baked-in
  table.

Adding an environment today means adding a row to `ENVIRONMENTS` and a rule
to `detectEnvironment()`.
