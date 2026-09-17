# Settings Module Design

Date: 2026-09-16
Status: Approved (design), pending implementation

## Problem

The login API endpoint is a bare constant at the top of `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing a production URL in the middle of
application logic. There is no record of what the other environments are, no
way to tell which one is active, and nothing stops a development URL from
being committed and shipped.

## Goal

Move API endpoint configuration into a dedicated settings module so that
switching environments is a deliberate, visible, single-place operation —
and so that the common cases require no edit at all.

## Non-goals

- Implementing a real `fetch` call. `login()` remains a stub.
- Sharing configuration with the `src/` CommonJS tree.
- Secrets handling. Only public base URLs live here.
- Test, lint, or format tooling. The repository has none today and this
  change does not add any.

## Constraints

- No build step, no bundler, no dependencies. `package.json` lists none and
  this change adds none.
- `index.html` must keep working when opened directly from disk over
  `file://`.
- `app.js` is a classic script, not a module. The `src/` tree is CommonJS.
  These two conventions stay separate.

## Decisions

Each of these was chosen over the named alternative during design.

| Decision | Chosen | Over |
|---|---|---|
| Load mechanism | Second `<script>` tag exposing a global | ES modules (breaks `file://`), CommonJS (unreachable from the page), build-step injection (first dependency) |
| Environment selection | Environment map, hostname-resolved, with an explicit override constant | Manual-only constant, flat single config, hostname detection with no override |
| Per-environment value | `apiBaseUrl`, paths composed at the call site | Full endpoint URL per environment, base URL plus a named-endpoints map |
| Tooling | None | `node --test` for the resolver, full eslint/prettier setup |

Rationale for the two that carry the most weight:

**Script-tag global.** It matches how `app.js` already loads, keeps `file://`
working, and adds no tooling. ES modules would be the better choice only if
the page and `src/` were going to share code; they are not, and retrofitting
modules later is cheap.

**Base URL rather than full endpoint URL.** Adding a second endpoint then
costs one line at a call site instead of a new key in every environment
entry, which is where per-environment config normally drifts.

## Architecture

New file `settings.js` at the repository root, sibling to `app.js`. It is
deliberately not under `src/`: that tree is CommonJS and unrelated to the
page, and placing a browser global there would blur two conventions that are
currently cleanly separated.

`index.html` loads it before `app.js`. That ordering is the dependency
contract and carries a comment saying so.

```html
<!-- settings.js must load before app.js: it defines window.APP_CONFIG. -->
<script src="settings.js"></script>
<script src="app.js"></script>
```

### Data flow

1. The browser loads `settings.js`.
2. `settings.js` resolves the active environment name, either from
   `FORCED_ENVIRONMENT` or from `location.hostname`.
3. It publishes a frozen `window.APP_CONFIG` of the shape
   `{ environment: string, apiBaseUrl: string }`.
4. The browser loads `app.js`, which reads `window.APP_CONFIG` when `login()`
   runs.

## Module contents

```js
const ENVIRONMENTS = {
  development: { apiBaseUrl: "http://localhost:3000" },
  staging:     { apiBaseUrl: "https://staging-api.example.com" },
  production:  { apiBaseUrl: "https://api.example.com" },
};

// Set to an environment name to force it; null resolves from the hostname.
const FORCED_ENVIRONMENT = null;
```

Assumption: the `development` and `staging` base URLs above are placeholders.
Only the production URL existed in the original code. Validate by confirming
the real development and staging hosts with the project owner before these
values are relied on.

### Environment resolution

`resolveEnvironment(hostname)` applies these rules in order:

1. Empty string (the `file://` case), `localhost`, `127.0.0.1`, or `[::1]`
   resolve to `development`.
2. A hostname beginning with `staging.` resolves to `staging`.
3. Anything else resolves to `production`.

Production is the fallback rather than a special case, so a host nobody
anticipated gets the safe, real endpoint instead of pointing at a machine
that does not exist.

`FORCED_ENVIRONMENT`, when non-null, takes precedence over all of the above.

`window.APP_CONFIG` is frozen with `Object.freeze` so that configuration
cannot be mutated at runtime from elsewhere in the page.

## Error handling

Both failure modes are loud rather than silent.

- **Unknown forced environment.** If `FORCED_ENVIRONMENT` is set to a name
  absent from `ENVIRONMENTS`, `settings.js` throws at load time, before
  `app.js` runs. A misspelled environment name silently falling through to
  production is exactly the failure this module exists to prevent.
- **Missing configuration.** `app.js` throws a clearly worded error if
  `window.APP_CONFIG` is absent, so a wrong script order in `index.html`
  reports the real cause instead of producing a request to
  `undefined/login`.

## Changes to `app.js`

- Remove the `API_ENDPOINT` constant.
- Add `const LOGIN_PATH = "/login";` at the top of the file.
- `login()` composes `` `${window.APP_CONFIG.apiBaseUrl}${LOGIN_PATH}` `` and
  logs it, then returns the existing stub result.

The stub stays a stub. It references the resolved URL rather than mentioning
it in a comment, so the configuration is genuinely wired in and observable
rather than decorative, but no network call is introduced.

## Verification

No automated tests; the repository has no test infrastructure and this change
does not add any. Manual verification:

1. Open `index.html` from disk. `window.APP_CONFIG.environment` is
   `development` and `apiBaseUrl` is `http://localhost:3000`.
2. Submit the form with a username and password. The console logs the
   composed URL `http://localhost:3000/login`.
3. Temporarily set `FORCED_ENVIRONMENT = "production"` and reload. The
   composed URL becomes `https://api.example.com/login`. Restore to `null`.
4. Temporarily set `FORCED_ENVIRONMENT = "typo"` and reload. The page throws
   at load with a message naming the unknown environment. Restore to `null`.
5. Remove the `settings.js` script tag and submit. The page throws the named
   missing-configuration error rather than composing `undefined/login`.
   Restore the tag.

## Files touched

| File | Change |
|---|---|
| `settings.js` | New. Environment map, override constant, resolver, frozen `window.APP_CONFIG`. |
| `index.html` | One script tag plus the ordering comment. |
| `app.js` | Drop `API_ENDPOINT`, add `LOGIN_PATH`, read `window.APP_CONFIG` in `login()`. |

## Risks

The environment map is the only substantive artifact here, and two of its
three entries are placeholder values. If those are wrong, the result is
tidier than the original but no more useful. Confirming the real development
and staging hosts is the highest-value check before or immediately after
implementation.
