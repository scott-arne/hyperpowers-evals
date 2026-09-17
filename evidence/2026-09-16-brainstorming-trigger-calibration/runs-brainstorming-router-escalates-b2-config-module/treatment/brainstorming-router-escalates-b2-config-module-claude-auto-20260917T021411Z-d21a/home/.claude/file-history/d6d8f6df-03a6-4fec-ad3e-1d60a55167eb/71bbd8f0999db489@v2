# Approved design decisions (brainstorming, 2026-09-16)

Original user request: "Move the API endpoint config into a new settings module
so it's easier to change environments."

Repository state at design time (fixture repo, 4 source files):

- `app.js` — bare browser script loaded by `index.html` via `<script src>`;
  holds `const API_ENDPOINT = "https://api.example.com/login"`; `login()` is a
  stub that never issues a request.
- `index.html` — login form, loads `app.js`.
- `src/index.js`, `src/utils.js` — CommonJS Node scaffolding (`greet('world')`),
  unconnected to the browser page.
- `package.json` — no dependencies, no scripts, no test runner, no linter.

Decisions explicitly approved by the user during brainstorming. These are
settled; findings that reopen them need a defect argument, not a preference.

1. **Environment selection: runtime hostname detection.** User chose this over
   deploy-time swapping and query-param override.
2. **Scope: works across the app, and more settings are expected later.** The
   settings object must accommodate additional keys without an interface change.
3. **Module format: bare browser script publishing one global.** User stated
   `src/` is "just scaffolding for now; the browser page is the real app. Keep
   it simple." ES-module conversion and dual-export were presented and declined.
   `src/` is explicitly out of scope.
4. **Environments: dev + prod only.** Staging declined for now.
5. **Unknown hostname: throw at load.** Presented against defaulting to
   production (rejected: silent credential misrouting on a login form) and
   defaulting to dev. User accepted the recommendation.
6. **Tooling: none.** Linting/formatting and unit tests were offered explicitly
   at design time and declined in favor of keeping the repo dependency-free.
   Findings that recommend adding a test runner, linter, or build step are
   contrary to an explicit user decision.

Two values are unknown and ship as documented assumptions in the spec: the dev
API base URL and the production hostname.
