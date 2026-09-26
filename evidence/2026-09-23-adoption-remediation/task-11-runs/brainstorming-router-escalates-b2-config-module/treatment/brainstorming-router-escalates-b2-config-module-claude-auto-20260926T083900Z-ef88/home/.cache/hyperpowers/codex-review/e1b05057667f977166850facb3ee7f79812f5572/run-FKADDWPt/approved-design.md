# Approved design context

## Original request (verbatim)

"Move the API endpoint config into a new settings module so it's easier to change environments."

## Repository facts

- `app.js` (repo root): browser script, loaded by `index.html` via
  `<script src="app.js"></script>`. Contains
  `const API_ENDPOINT = "https://api.example.com/login";`, a stub `login()`
  that performs no request, `validateForm()`, and a submit listener.
- `index.html`: plain HTML with a login form; no bundler, no build step.
- `src/index.js`, `src/utils.js`: unrelated CommonJS Node code
  (`require` / `module.exports`). No API configuration.
- `package.json`: name/version/description/main only. No dependencies,
  no scripts, no `type` field.
- No test runner, linter, or formatter configured. No `node_modules`.
- Branch `feature/webapp-enhancement`, working tree clean.

## Decisions the user made during brainstorming

1. Environment selection mechanism — user chose **runtime hostname
   detection** (module holds an environment table, picks by
   `window.location.hostname`). Rejected: deploy-time file swap;
   build-time injection.
2. Module format — user chose **ES modules** (`export`/`import`,
   `<script type="module">`). Rejected: `window.APP_SETTINGS` global.
   The user was told and accepted that this breaks opening `index.html`
   via `file://`.
3. Environment table shape — user chose **local + staging + production,
   with unrecognized hostnames defaulting to production**. Rejected:
   defaulting to local; a local-and-production-only table.
4. Tooling — user chose **unit tests via the built-in `node --test`
   runner** only. Rejected: eslint+prettier; end-to-end tests; adding
   nothing at all.
5. The user approved the in-chat design and asked for the spec to be
   written.

## Known-unvalidated inputs

Only the production URL is derivable from existing code. The local API
URL, the staging API URL, and the staging frontend hostname are
placeholders the user has not yet confirmed; the spec records them as
assumptions with a validation method.
