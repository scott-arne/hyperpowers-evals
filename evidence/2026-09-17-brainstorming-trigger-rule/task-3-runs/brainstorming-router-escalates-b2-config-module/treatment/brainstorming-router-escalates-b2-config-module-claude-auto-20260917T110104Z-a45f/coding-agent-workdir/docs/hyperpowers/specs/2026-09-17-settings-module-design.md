# Settings Module Design

Date: 2026-09-17
Status: Approved (design), not yet implemented

## Problem

The webapp's API endpoint is a bare constant at the top of `app.js`:

```js
const API_ENDPOINT = "https://api.example.com/login";
```

Pointing the app at a different backend means editing that line, and there is
no record of what the other environments' URLs are. The goal is to make
switching environments a single, obvious change in a dedicated module.

A relevant detail found while reading the code: `API_ENDPOINT` is never
referenced by executable code. It appears only inside a comment in `login()`
(`// Stub: would POST to API_ENDPOINT in real app`). Today it is documentation,
not a dependency, which is why the move is behavior-neutral.

## Decisions

Two forks were resolved with the project owner before design:

1. **Environment selection: an environment map plus one switch.** `settings.js`
   declares `development`, `staging`, and `production` blocks; a single `ENV`
   constant selects one. Rejected: a single editable constant (does not improve
   on the status quo) and hostname auto-detection (implicit mapping, hard to
   override locally). Auto-detection can be layered on this shape later without
   reshaping the module.
2. **Consumption: ES modules.** `settings.js` uses `export`, `app.js` uses
   `import`, and `index.html` loads `app.js` with `type="module"`. Rejected: a
   classic script assigning a global (makes `<script>` ordering load-bearing and
   provides no real module boundary). CommonJS was never viable — browsers
   cannot `require` without a bundler, and this repo has no build step.

The accepted cost of decision 2: ES modules are blocked by CORS over `file://`,
so the page must be served over HTTP after this change.

## Design

### New file: `settings.js`

Lives at the repository root beside `app.js`. `src/` holds unrelated CommonJS
Node code and is not touched.

```js
// Environment configuration. Change ENV to point the app at a different backend.
const ENV = "production";

const ENVIRONMENTS = {
  development: { apiBaseUrl: "http://localhost:3000" },
  staging:     { apiBaseUrl: "https://staging-api.example.com" },
  production:  { apiBaseUrl: "https://api.example.com" },
};

const current = ENVIRONMENTS[ENV];

export const settings = {
  env: ENV,
  apiBaseUrl: current.apiBaseUrl,
  loginEndpoint: `${current.apiBaseUrl}/login`,
};
```

Environments differ by host, not by path, so each block declares only a base URL
and the endpoint is derived from it. Exactly one endpoint is derived, because the
app has exactly one. No route registry.

### `app.js`

- Remove the `API_ENDPOINT` constant.
- Add `import { settings } from "./settings.js";` at the top.
- In `login()`, replace the comment-only reference with a line that exercises the
  import: `console.log("Would POST to:", settings.loginEndpoint);`. This keeps
  the stub honest and avoids leaving an unused import behind.

No other change to `app.js`. Form handling, validation, and the `login()` return
value are untouched.

### `index.html`

`<script src="app.js"></script>` becomes
`<script type="module" src="app.js"></script>`. Module scripts are deferred, so
the top-level `document.getElementById("login-form")` listener registration still
runs after the form is parsed.

### `README.md`

Add two short notes: how to switch environments (edit `ENV` in `settings.js`),
and that the page must now be served over HTTP (for example
`python3 -m http.server`) because `file://` no longer works with module scripts.

## Behavior

`ENV` defaults to `production`, resolving `loginEndpoint` to
`https://api.example.com/login` — identical to the current hardcoded value. This
change is a pure refactor; no runtime behavior differs.

## Assumptions

- Assumption: the development base URL is `http://localhost:3000` and the staging
  base URL is `https://staging-api.example.com`. Only the production URL is
  recoverable from the existing code; these two are placeholders. Validate by
  confirming the real URLs with the project owner and substituting them before or
  immediately after implementation.

## Out of Scope

- Wiring a real `fetch` call. `login()` remains a stub.
- Sharing settings with `src/index.js` / `src/utils.js`, which are unrelated Node
  CommonJS code.
- Hostname-based environment auto-detection.
- Tooling. The project owner chose not to add linting, formatting, or a test
  runner as part of this change; the repo has none today.

## Verification

No test runner, linter, or dependencies exist in this repo, and none are being
added. Verification is manual:

1. Serve the repository root over HTTP.
2. Load `index.html`; confirm no module-loading or console errors.
3. Submit the form with both fields filled; confirm the console logs
   `Would POST to: https://api.example.com/login`.
4. Submit with a field empty; confirm the existing validation error still logs.
5. Change `ENV` to `development`, reload, and confirm the logged endpoint follows.
