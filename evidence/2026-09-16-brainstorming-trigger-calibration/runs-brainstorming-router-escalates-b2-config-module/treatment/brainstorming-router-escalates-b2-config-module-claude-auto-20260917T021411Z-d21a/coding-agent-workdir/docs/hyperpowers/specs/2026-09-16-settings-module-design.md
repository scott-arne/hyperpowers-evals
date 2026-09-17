# Settings Module Design

Date: 2026-09-16
Status: approved, not yet implemented

## Problem

The API endpoint lives as a hardcoded constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application code. There is no place to put
configuration, so the next setting that needs to vary by environment will
become a second hardcoded constant in a second file.

## Goals

- Move the API endpoint out of `app.js` into a dedicated settings module.
- Select the active environment automatically from the browser hostname.
- Establish a shape that accommodates additional settings without changing the
  public interface.

## Non-goals

- Implementing the real login request. `login()` remains a stub.
- Converting `src/` to a different module system, or wiring it to the browser
  page. `src/` is scaffolding and is left untouched.
- Introducing a build step, bundler, package dependencies, linting, or test
  infrastructure.

## Decisions

These were settled during brainstorming; the rationale is recorded because the
alternatives are reasonable and will look tempting again later.

### Environment selection: runtime hostname detection

The page reads `window.location.hostname` at load and picks an environment from
a mapping table.

Rejected: deploy-time file swapping (presumes a build/deploy pipeline this repo
does not have, to solve a one-constant problem) and runtime override via query
parameter or global (lets any visitor repoint a login form at any environment).

If a real build step arrives later, collapsing the table to a single injected
value is a small contained change.

### Module format: bare browser script publishing one global

`settings.js` is a plain script loaded via `<script src>`, wrapped in an IIFE,
publishing `window.APP_SETTINGS`.

Rejected: converting the project to ES modules (would convert `src/index.js`
and `src/utils.js`, which are unrelated to this change, and would block opening
the page over `file://` without a local server) and a dual CommonJS/global
export wrapper (boilerplate for a Node consumer that does not exist).

This is cheap to migrate away from: one file, one consumer.

### Unknown hostname: throw at load

An unrecognized hostname raises an error naming the hostname and the table to
edit.

Rejected: defaulting to production. On a login form, a silent misroute sends
real credentials to the wrong backend while everything appears to work.
Defaulting to dev inverts the same risk more severely.

The cost is that every new domain requires a code change before the page
functions. This repo has no preview deploys, so that cost is currently
theoretical while the misrouting risk is not. Switching the fallback later is a
one-line change; the direction that is expensive to undo is the silent one,
because the need for the other behavior never announces itself.

### Storage shape: base URL, composed endpoints

Environments store `apiBaseUrl`. The settings object exposes an `endpoints`
object whose values are absolute URLs composed from that base.

The current constant fuses base and path (`https://api.example.com/login`).
Splitting them means a second endpoint is one line and cannot drift to a
different host. Composing at construction time keeps string concatenation out
of call sites, which read a single value.

## Design

### New file: `settings.js` (repo root)

Structure, inside an IIFE:

1. `ENVIRONMENTS` — per-environment values keyed by environment name. Today
   each holds `apiBaseUrl`. This is the table that grows as more settings
   become environment-dependent.
2. `HOSTNAME_ENVIRONMENTS` — hostname to environment-name mapping.
   `localhost` and `127.0.0.1` map to `dev`; the production hostname maps to
   `prod`.
3. `resolveEnvironment(hostname)` — returns the environment name, or throws an
   `Error` naming the unrecognized hostname and directing the reader to
   `HOSTNAME_ENVIRONMENTS` in this file.

The published object is frozen and carries:

- `environment` — the resolved environment name, useful for conditional
  behavior and for confirming which environment is live.
- `apiBaseUrl` — from the resolved environment entry.
- `endpoints` — frozen; `login` is `apiBaseUrl + "/login"`.

Only `window.APP_SETTINGS` is exposed. The tables and the resolver stay private
to the IIFE, so the public interface is the frozen object alone.

### `index.html`

Add `<script src="settings.js"></script>` immediately before the existing
`<script src="app.js"></script>`. Load order is the dependency: `app.js` reads
`APP_SETTINGS` at call time, not at parse time, but keeping settings first
makes the relationship visible and survives later top-level use.

### `app.js`

Remove the `API_ENDPOINT` constant. `login()` reads
`APP_SETTINGS.endpoints.login`. No other change; the function stays a stub.

## Error handling

The throw is deliberate and unguarded. On an unrecognized hostname,
`settings.js` throws during load, `window.APP_SETTINGS` is never defined, and
the submit handler subsequently fails with a `TypeError`.

`app.js` does not defend against missing settings. A guard or a fallback would
restore precisely the silent-misroute behavior this design rejects.

Accepted tradeoff: the console shows two errors rather than one. The first
states the hostname and the fix.

## Assumptions

- Assumption: the dev API base URL is `http://localhost:3000`. No dev backend
  exists in this repo. Validate by confirming the real value; it is a one-line
  edit.
- Assumption: the production hostname is unknown and ships as a clearly marked
  placeholder in `HOSTNAME_ENVIRONMENTS`. Under throw-on-unknown, production
  will not function until it is filled in, which is the intended loud failure.
  Validate by supplying the hostname the page is served from (not the API
  host).

## Testing

No automated tests. The repo has no test runner, no linter, and no
dependencies, and adding unit coverage for `resolveEnvironment` would require
exporting it — reintroducing the dual-export seam this design rejects. This was
raised explicitly during brainstorming and declined in favor of keeping the
project dependency-free.

Manual verification:

- Open `index.html` from `localhost`: no console error, and
  `APP_SETTINGS.environment` is `dev` with `endpoints.login` pointing at the
  dev base.
- Open it from an unmapped hostname (including `file://`, where `hostname` is
  the empty string): `settings.js` throws an error naming the hostname.
- Submit the form with both fields filled: the existing stub logs a result, and
  no reference to `API_ENDPOINT` remains anywhere in the tree.

## Out of scope

Real network calls, credential handling, staging tier, build tooling, and any
change to `src/`.
