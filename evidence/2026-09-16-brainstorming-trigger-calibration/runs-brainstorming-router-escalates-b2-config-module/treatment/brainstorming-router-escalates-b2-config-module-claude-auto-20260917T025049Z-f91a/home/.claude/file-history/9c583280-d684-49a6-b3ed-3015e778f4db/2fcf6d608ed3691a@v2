# Approach Context

## Original request (verbatim)

> Move the API endpoint config into a new settings module so it's easier to change environments.

## Clarifying questions and the human partner's answers

1. **How should the app determine which environment's API endpoint to use?**
   Answer: Runtime detection from `location.hostname` (rejected: a deploy-time
   generated/swapped config file; rejected: introducing a bundler to inline the
   value at build time).

2. **How should `app.js` consume the new settings module?**
   Answer: ES modules — `index.html` switches to `<script type="module">` and
   `app.js` imports from `src/settings.js` (rejected: a classic script setting a
   `window` global; rejected: CommonJS, which the browser cannot load without a
   bundler).

3. **Which environments should the settings module define?**
   Answer: three tiers — local, staging, production. Hostnames/URLs are
   placeholders to be edited later; the decision was the tier count, not the
   exact strings.

4. **What should happen on an unrecognized hostname?**
   Answer: resolve to the production endpoint and emit a `console.warn` naming
   the unrecognized hostname (rejected: throwing; rejected: a silent fallback).

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
working tree, 4 commits.

`index.html` — a login page. Loads the script with a classic tag:
`<script src="app.js"></script>`. No `type="module"`. Form id `login-form`,
inputs `username` / `password`.

`app.js` (28 lines) — a plain browser script, no imports/exports. Line 2 is
`const API_ENDPOINT = "https://api.example.com/login";`. Defines `login()`
(a stub: logs, returns `{success:true,user:username}`, never issues a network
request — a comment reads "Stub: would POST to API_ENDPOINT in real app"),
`validateForm()`, and a submit listener registered at top level on
`document.getElementById("login-form")`. `API_ENDPOINT` is referenced only by
that comment; no executing code reads it today.

`src/index.js` and `src/utils.js` — a separate CommonJS/Node island
(`require('./utils')`, `module.exports = { greet }`). Not referenced by
`index.html` and not loaded by the browser at all.

`package.json` — name `drill-test-project`, version 1.0.0,
`"main": "src/index.js"`. No `dependencies`, no `devDependencies`, no
`scripts`, no `"type"` field.

Tooling: no bundler, no build step, no linter or formatter config, no test
runner, no test directory, no CI config anywhere in the repo.

Constraint implied by the facts: the browser half has no module system and no
`process.env`; the page is currently openable directly from the filesystem.
