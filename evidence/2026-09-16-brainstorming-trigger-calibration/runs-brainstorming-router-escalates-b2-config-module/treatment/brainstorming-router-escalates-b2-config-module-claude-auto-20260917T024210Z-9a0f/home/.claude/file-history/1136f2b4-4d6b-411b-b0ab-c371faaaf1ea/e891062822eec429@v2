# Settings Module for Environment-Specific API Configuration

Date: 2026-09-16
Status: Approved design, pending implementation plan

## Problem

The webapp's API endpoint is a hard-coded constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application code. There is no place for
environment-specific configuration to live, and no way to tell from the source
which environments exist or what each one points at.

## Goal

Move the API endpoint configuration out of `app.js` into a dedicated settings
module that resolves the correct endpoint automatically from the browser's
hostname, covering three environments: local, staging, and production.

## Decisions

These were settled during brainstorming. Each records the alternative rejected,
so a later reader can tell a decision from an accident.

| Decision | Chosen | Rejected alternative |
|---|---|---|
| Environment selection | Auto-detect from `location.hostname` | A hand-edited `CURRENT_ENV` constant; a `?env=` runtime override |
| Module format | ES modules (`type="module"`) | Classic script setting a global; UMD-style dual export |
| Endpoint granularity | Module holds a base URL; callers compose paths | Module holds full per-endpoint URLs |
| Unknown hostname | Throw at page load | Silently fall back to production or local |
| Tooling | Add unit-test infrastructure | Add linting/formatting; add nothing |

### Environment selection: hostname auto-detection

The project has no build step, so there is no mechanism to inject a value at
build time. The hostname is the only environment signal available at runtime.
Auto-detection also removes the deploy-time step entirely rather than relocating
it, which is the stated goal.

### Module format: ES modules

`index.html` currently loads `app.js` as a classic script. ES modules give a
real module boundary: the dependency is declared in the file that has it, there
is no global, and the resolver can be imported directly by a test.

The cost is that `type="module"` is fetched under CORS rules, so the page must
be served over http and will no longer work from `file://`. The user confirmed
the page is always served over http, so this cost does not apply here.

### Endpoint granularity: base URL, not full URLs

The host is a property of the environment. The `/login` path is a property of
the login feature. Keeping only the base URL in the settings module means adding
a second endpoint later requires no change to `settings.js` at all.

### Unknown hostname: fail loudly

An unrecognized hostname throws. Because the resolver is called at module scope
in `app.js`, this fails at page load rather than at form submit — a misconfigured
host breaks visibly instead of quietly POSTing credentials to a default backend.

Accepted consequence: a new hostname (for example a preview deploy) hard-fails
the page until it is added to the table. This is the correct trade for an
authentication endpoint.

## Architecture

One new file, `settings.js`, at the repository root alongside `app.js`.

### `settings.js`

Sole responsibility: map a hostname to that environment's API configuration.

Contains no DOM access, no network calls, and no reference to `window` or
`location`. The hostname arrives as a function argument. This is what keeps the
module a pure unit that can be imported and tested without a browser.

Two frozen lookup tables, both module-private:

| Hostname | Environment | API base URL |
|---|---|---|
| `localhost` | `local` | `http://localhost:3000` |
| `127.0.0.1` | `local` | `http://localhost:3000` |
| `staging.example.com` | `staging` | `https://api.staging.example.com` |
| `example.com` | `production` | `https://api.example.com` |
| `www.example.com` | `production` | `https://api.example.com` |

The staging and production rows are placeholders; see Assumptions.

One export:

```js
export function resolveSettings(hostname)
// -> Object.freeze({ environment, apiBaseUrl })
// throws Error if hostname is not recognized
```

The tables stay private so callers cannot grow a dependency on their shape.

### `app.js`

Removes the `API_ENDPOINT` constant. Adds:

```js
import { resolveSettings } from "./settings.js";

const settings = resolveSettings(location.hostname);
```

at module scope, and composes `${settings.apiBaseUrl}/login` where the login
endpoint is needed.

### `index.html`

`<script src="app.js">` becomes `<script type="module" src="app.js">`.

## Data flow

1. Browser loads `index.html`, which requests `app.js` as a module.
2. `app.js` imports `resolveSettings` from `settings.js`.
3. At module scope, `app.js` calls `resolveSettings(location.hostname)`.
4. `resolveSettings` looks the hostname up in the hostname table to get an
   environment name, then looks that name up in the endpoint table to get a base
   URL, and returns a frozen object.
5. An unrecognized hostname throws before any event handler is registered, so
   the page fails to initialize.

## Error handling

`resolveSettings` throws an `Error` when the hostname is not in the table. The
message names the unrecognized hostname and lists the known hostnames, so the
fix is obvious from the console without reading the source.

No other error paths exist in this module: both lookups are total once the
hostname is validated, and the return value is frozen.

## Scope boundary

`API_ENDPOINT` is currently referenced only inside a comment; `login()` is a
stub that performs no network call. This change wires `settings.apiBaseUrl` into
that same commented stub and updates the comment. It does **not** convert the
stub into a real `fetch`. Making the login call real is a separate request.

## Testing

The repository currently has no test runner, no test files, and no test script.
This change adds unit-test infrastructure, chosen because `resolveSettings` is a
pure function and therefore the cheapest possible thing to pin down permanently.

- Runner: `node:test`, chosen because it is built into Node and keeps the
  project's zero-dependency posture intact.
- A `test` script in `package.json`.
- A first test file covering `resolveSettings`:
  - each of the three environments resolves to its expected base URL
  - every hostname alias maps to the right environment
  - an unrecognized hostname throws, and the message names the hostname
  - the returned object is frozen

Linting and formatting were considered and deliberately left out of this change.

## Global constraints

- No new runtime dependencies. `node:test` is part of Node; nothing is added to
  `package.json` dependencies.
- No build step, bundler, or transpiler is introduced.
- `src/index.js` and `src/utils.js` are CommonJS Node files unrelated to the
  webapp. They are out of scope and must not be modified.
- The design document is a working file and is not committed.

## Assumptions

- Assumption: the staging and production hostnames are not yet known, so the
  table ships with `staging.example.com` and `example.com` placeholders marked
  by a comment. Validate by replacing them with the real hostnames before the
  first staging deploy.
- Assumption: local development is served from `localhost` and `127.0.0.1` on
  the default port, and the local API is reachable at `http://localhost:3000`.
  Validate by loading the page locally and confirming the resolved base URL in
  the console.

## Out of scope

- Converting `login()` into a real network call.
- A runtime environment override (`?env=`, `localStorage`). Cheap to layer on
  the chosen design later if it is ever needed.
- Linting and formatting infrastructure.
- Any change to `src/`.
