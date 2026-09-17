# Approved design context — preferences storage

## Original request (verbatim)

"Add user preferences storage so settings persist across sessions."

## Repository facts

- `index.html` + `app.js`: a browser login form. `app.js` is a plain `<script>`,
  no module system. `login()` is a stub that does not call the network.
- `src/index.js` + `src/utils.js`: an unrelated Node CommonJS entry point
  (`greet`). Separate runtime.
- `package.json`: no dependencies, no scripts, `"main": "src/index.js"`.
- No test runner, no linter, no formatter, no storage or settings code.
- Branch `feature/webapp-enhancement`, clean tree at the start of this work.

## Decisions the user approved during brainstorming

1. **Surface: browser only.** Chosen over Node-only and over a dual-backend
   abstraction. Rationale: the login form is the only user-facing surface;
   a cross-runtime abstraction would be designed against imagined requirements.
2. **Scope: remembered username**, built on a small reusable preferences
   module. Chosen over theme/display settings and over a storage layer with no
   consumer. Rationale: gives the module a real consumer without inventing a
   settings UI.
3. **Testing: Node's built-in `node:test`** plus a hand-written `localStorage`
   stub, wired to `npm test`. Chosen over Vitest+jsdom (adds a dependency tree
   to a zero-dependency repo) and over no tests.
4. **No linter or formatter** in this change. User chose "not now".
5. **Module format: dual export** (`window` in the browser, `module.exports`
   under Node). Chosen over ES modules everywhere, which would require either
   `"type": "module"` plus converting unrelated files under `src/`, or an
   `.mjs` extension that some static servers serve with a MIME type browsers
   refuse to load as a module.

## Constraint stated by Claude and not contradicted by the user

The password must never be written to `localStorage`. "Stay logged in" is out
of scope; it requires a session token from a real backend.

## Known, accepted gap

The DOM wiring in `app.js` has no automated test, because jsdom was
deliberately excluded. It is to be verified manually in a browser and the
result reported.
