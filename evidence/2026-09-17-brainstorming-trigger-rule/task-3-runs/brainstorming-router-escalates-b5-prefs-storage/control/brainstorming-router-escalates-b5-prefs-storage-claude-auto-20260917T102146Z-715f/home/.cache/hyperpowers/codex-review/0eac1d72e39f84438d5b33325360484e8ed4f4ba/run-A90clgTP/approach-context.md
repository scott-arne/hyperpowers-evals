# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

1. **What should the preferences store hold at first?** (The app has no
   user-facing settings today, only a login form.)
   → *A generic key/value store with no fixed schema; callers define their own
   keys as features need them.*

2. **Where should preferences live, and what should the read interface look
   like?**
   → *Browser localStorage, device-scoped for now, with a Promise-based
   (async) read/write interface and the storage backend behind a swappable
   adapter, so an account-scoped server backend can be added later without
   changing call sites.*

3. **Should preferences be scoped per logged-in user, or one set per
   browser?**
   → *Namespaced per username, with an anonymous namespace used before login.*

4. **How should the store behave when localStorage is unavailable or a write
   fails (private mode, disabled storage, quota exceeded)?**
   → *Never throw: degrade to an in-memory store for the lifetime of the page,
   and expose a flag (e.g. `isPersistent()`) so UI can warn that settings will
   not be saved.*

## Codebase facts

Repository root contains:

- `index.html` — plain HTML, no framework, no build step. Loads the app with a
  classic `<script src="app.js"></script>` tag (not `type="module"`). Body is a
  single login form with `#login-form`, `#username`, `#password`.
- `app.js` — browser code, plain script (no imports/exports). Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `function login(username, password)` — a stub that logs and returns
    `{ success: true, user: username }`. It does not perform a network call.
  - `function validateForm(formData)` — returns `{valid:false,error:"Missing
    required fields"}` when username or password is missing, else
    `{valid:true}`.
  - A `submit` listener on `#login-form` that prevents default, reads the two
    inputs, validates, and calls `login()`.
- `src/index.js` — Node-side entry point using CommonJS:
  `const { greet } = require('./utils');` then a `main()` that logs
  `greet('world')`. Unrelated to the browser app.
- `src/utils.js` — CommonJS: `function greet(name)` and
  `module.exports = { greet }`.
- `package.json` — name `drill-test-project`, version 1.0.0,
  `"main": "src/index.js"`. No `dependencies`, no `devDependencies`, no
  `scripts`, no `"type"` field.
- `README.md` — three lines, describes it as a minimal project.

Additional facts and constraints:

- There is no bundler, no transpiler, no test runner, no linter, and no
  formatter configured anywhere in the repo.
- There is no server-side component, no session token, and no real auth: the
  login flow is entirely a client-side stub.
- There is no existing storage, persistence, settings UI, or configuration
  module of any kind.
- The repo therefore currently mixes two module conventions: classic browser
  scripts (`app.js`, globals) and CommonJS (`src/`).
- Git: branch `feature/webapp-enhancement`, clean working tree.

## What to produce

Independent approaches for how to structure this preferences-storage module
inside this codebase, given the four answers above are already settled.
Relevant open design dimensions include (but are not limited to): how the
module is loaded and shared between the classic-script browser app and the
CommonJS `src/` code; the on-disk key/value layout in localStorage (for
example one storage key per preference versus one serialized document per
namespace) and what that implies for partial writes and for reading a whole
namespace; how the active username is supplied to the store and what happens
to preferences written in the anonymous namespace once a user logs in;
serialization and type handling; behavior across multiple open tabs; and
whether and how stored data is versioned for future migration.
