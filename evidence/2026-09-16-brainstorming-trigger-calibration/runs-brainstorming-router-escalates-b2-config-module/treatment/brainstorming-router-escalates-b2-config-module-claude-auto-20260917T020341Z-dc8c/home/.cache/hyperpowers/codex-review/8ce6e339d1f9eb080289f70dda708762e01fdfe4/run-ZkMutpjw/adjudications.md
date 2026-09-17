# Approved Design Decisions (user-adjudicated during brainstorming)

Original user request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

Repository state at design time:

- `app.js` — plain browser script, no imports/exports, loaded by `index.html`
  via `<script src="app.js">`. Holds `const API_ENDPOINT =
  "https://api.example.com/login"` at line 2, referenced only in a comment
  inside the `login()` stub.
- `src/index.js`, `src/utils.js` — CommonJS Node code, unrelated to the page.
- No bundler, no test runner, no lint/format config. `package.json` has no
  scripts and no dependencies.

Decisions the user made explicitly (each chosen from presented options with
trade-offs):

1. **Module format: browser ES modules.** Chosen over a global script and over
   CommonJS-in-`src/`. The user was told, before choosing, that this breaks
   `file://` loading of `index.html`.
2. **Environment selection: hostname detection.** Chosen over a hand-edited
   `ENV` constant and over detection-plus-`?env=`-override.
3. **URL storage: per-environment `apiBaseUrl` with endpoints derived.** Chosen
   over storing a full URL per endpoint per environment.
4. **Unknown-hostname fallback: `dev`.** Chosen over `prod` and over throwing.
   Rationale accepted: an unlisted host must never reach the production API.
5. **Tooling: none.** The user was offered unit tests for `resolveEnvironment`,
   an npm `serve` script, and eslint/prettier, and selected "Nothing — keep it
   minimal." Therefore the absence of automated tests and of a serve script is
   a deliberate, adjudicated decision, not an oversight in the spec.

Not adjudicated / still open:

- The real dev, staging, and production hostnames and base URLs. The spec
  carries placeholders marked as assumptions pending user confirmation.
- Whether a `staging` environment is actually wanted. It appeared in the design
  the user approved and is flagged in the spec as droppable.
