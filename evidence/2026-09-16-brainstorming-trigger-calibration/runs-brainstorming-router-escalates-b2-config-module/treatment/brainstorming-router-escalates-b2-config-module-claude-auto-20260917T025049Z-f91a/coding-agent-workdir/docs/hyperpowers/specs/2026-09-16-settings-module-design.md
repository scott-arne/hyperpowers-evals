# Settings Module Design

Date: 2026-09-16
Status: approved design, not yet implemented
Branch: `feature/webapp-enhancement`

## Problem

The login endpoint is hardcoded as a top-level constant in `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application code. There is no configuration
layer of any kind in the repository, and the browser half of the project has no
module system and no access to environment variables.

## Goal

Introduce a settings module that owns the API endpoint and resolves it per
environment, so switching environments requires no edit to application logic.

## Non-goals

- Making `login()` issue a real network request. It remains a stub.
- Adding a bundler or any runtime dependency.
- Introducing a deploy-time configuration pipeline.
- Reworking the CommonJS files beyond the rename required by the module-system
  decision below.

## Decisions

Each was chosen by the human partner during brainstorming.

1. **Environment selection: runtime hostname detection.** The module maps
   `location.hostname` to an endpoint. Rejected: a deploy-time generated config
   file (requires a deploy step that does not exist); build-time inlining via a
   bundler (a full toolchain for a two-file static page).
2. **Module mechanism: ES modules.** `index.html` switches to
   `<script type="module">` and `app.js` imports the settings module. Rejected:
   a `window` global set by a classic script (reintroduces the implicit coupling
   the module is meant to remove); CommonJS (the browser cannot load it without
   a bundler).
3. **Environments: three tiers** — local, staging, production.
4. **Unrecognized hostname: fall back to production and warn.** The module
   resolves to the production endpoint and emits a `console.warn` naming the
   unrecognized hostname. Rejected: throwing (would break preview deploys not
   yet in the map); a silent fallback (same production risk, no signal).
5. **Interface: pure resolver plus a resolved object.** The module exports both
   `resolveApiEndpoint(hostname)` and a `settings` object resolved once at
   import. Rejected: a resolved constant alone (mapping only testable by
   stubbing a global `location`); a `getSettings()` factory (nothing requires
   re-resolution during a page load).
6. **Module system conflict: adopt ESM repo-wide.** Add `"type": "module"` to
   `package.json` and rename the two CommonJS files to `.cjs`. Rejected: naming
   the new file `src/settings.mjs` (leaves the island alone, but some minimal
   static servers send a non-JavaScript MIME type for `.mjs`, which makes
   browsers refuse the module).

## Global constraints

- No runtime dependencies; `package.json` stays free of `dependencies` and
  `devDependencies`.
- Unit tests use Node's built-in `node:test` runner. No linter or formatter is
  being introduced by this work.
- Endpoint URLs and the staging hostname are placeholders, collected in one map
  so they can be corrected in a single edit.

## Architecture

### New: `src/settings.js`

An ES module containing:

- `PRODUCTION_API_ENDPOINT` — the production login URL, also the fallback.
- An endpoint map keyed by hostname, covering all three tiers explicitly:
  `localhost` and `127.0.0.1` for local, the staging hostname for staging, and
  the production hostname(s) for production. Production is listed in the map
  even though it is also the fallback value; otherwise a normal production page
  load would take the unrecognized-hostname path and warn on every visit.
- `resolveApiEndpoint(hostname)` — a pure function. Returns the mapped endpoint
  for a known hostname. For an unknown hostname it calls `console.warn` naming
  that hostname and returns `PRODUCTION_API_ENDPOINT`. Takes the hostname as an
  argument, reads no globals.
- `settings` — an object with an `apiEndpoint` property, resolved once at import
  from `location.hostname`. This is what application code consumes.

### Changed: `app.js`

Remove the `API_ENDPOINT` constant. Import the settings module and read
`settings.apiEndpoint`. Update the stub comment inside `login()` to name the new
source. No behavioral change: nothing in the executing code reads the endpoint
today, so this is a pure move.

### Changed: `index.html`

`<script src="app.js"></script>` becomes
`<script type="module" src="app.js"></script>`.

### Changed: `package.json`

Add `"type": "module"`. Update `"main"` to the renamed entry point.

### Renamed: `src/index.js` -> `src/index.cjs`, `src/utils.js` -> `src/utils.cjs`

Required by decision 6. The `require('./utils')` call in the entry point is
updated to `require('./utils.cjs')`. These files are otherwise unchanged and
remain a Node-only island the browser never loads.

### Data flow

Page load -> `app.js` imports `src/settings.js` -> the module resolves
`location.hostname` against the map exactly once -> `app.js` reads
`settings.apiEndpoint`.

## Error handling

The single failure mode is a hostname absent from the map. It is handled by the
production fallback plus a `console.warn` that names the hostname, so the gap is
identifiable from the browser console. The module never throws.

## Testing

A `node:test` suite covering `resolveApiEndpoint`:

- each local hostname resolves to the local endpoint
- the staging hostname resolves to the staging endpoint
- the production hostname resolves to the production endpoint
- a mapped hostname, production included, does NOT warn
- an unrecognized hostname returns the production endpoint
- an unrecognized hostname triggers a warning naming that hostname

The resolver takes its hostname as an argument, so no DOM or global stubbing is
needed. The `settings` object's import-time resolution is not unit tested; it is
a one-line call to the covered resolver, and testing it would require the global
stubbing the interface was chosen to avoid.

Manual verification: serve the directory over HTTP (`python3 -m http.server`),
load the page, confirm the form still validates and submits, and confirm no
module-loading errors in the console.

## Consequences and risks

- **`index.html` no longer opens from the filesystem.** Module scripts are
  blocked on `file://`; the page must be served over HTTP. Inherent to decision
  2.
- **Every environment's endpoint ships in client-visible source.** Inherent to
  decision 1, and true of any browser-side configuration that is not injected at
  deploy time.
- **An unlisted host silently reaches production.** Accepted for now because
  `login()` issues no request. Assumption: the stub stays a stub; validate by
  revisiting decision 4 before `login()` performs a real POST, at which point
  throwing becomes the better default. Tightening it is a two-line change that
  does not alter the interface.
- **The `.cjs` renames touch files unrelated to the feature.** Contained to two
  renames and one `require` path, and it leaves the repository on a single
  module system rather than a split one.
