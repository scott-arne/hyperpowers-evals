# Approved design context (brainstorming adjudications)

Original user request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

Repository state before the change: four files — `index.html`, `app.js`
(browser script, loaded by a plain `<script src>` tag), `src/index.js` and
`src/utils.js` (CommonJS, Node entry point), plus `package.json` with no
`type` field, no scripts, and no dependencies. No `node_modules`, no build
step, no linter, no test runner. The endpoint lives at `app.js:2` as
`const API_ENDPOINT = "https://api.example.com/login";`.

Decisions the human partner made explicitly during brainstorming. These are
settled; do not re-litigate them as findings unless the spec is internally
inconsistent with one of them or a decision is unbuildable as written.

1. **Environment selection: hostname detection.** Chosen over hand-editing a
   single value and over build-time injection. Rationale accepted: no new
   toolchain in a repo with no package manager.
2. **Module wiring: ES modules.** Chosen over a second `<script>` tag setting
   a `window.SETTINGS` global. The human partner was told explicitly, twice,
   that this breaks opening `index.html` over `file://` and accepted it.
3. **Environment set: local + staging + production.** Placeholder URLs for
   local and staging are acceptable; the production host is preserved from the
   current hard-coded value.
4. **Repository converts to ESM** (`"type": "module"` in `package.json`, and
   `src/utils.js` / `src/index.js` converted from CommonJS). Chosen over a
   `settings.mjs` filename and over shipping with no unit tests. The human
   partner was told explicitly that this edits two files outside the literal
   scope of the request, and accepted that cost.
5. **No linter or formatter.** ESLint/Prettier declined to keep the repository
   dependency-free.

Also approved in chat before the spec was written: `settings.js` lives at the
repository root beside `app.js`; configuration stores `apiBaseUrl` per
environment rather than a full endpoint URL; `settingsFor(hostname)` is a pure
function with a `location`-bound convenience export layered on top; an
unrecognized hostname falls back to production silently rather than throwing.
