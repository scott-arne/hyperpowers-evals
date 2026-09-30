# Approach Context: user identity for a small browser login app

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?**
A: "It should be the user's real identity, work across the app, and persist.
Other forms will need it later."

**Q: What issues the real user identity today?**
A: No backend — the client invents the ID. (There is no working auth endpoint;
building one is out of scope for this work.)

**Q: What should the userId identify?**
A: The person, keyed by username. Logging in as a different username must yield
a different ID. Acknowledged as self-asserted, not verified.

**Q: How should the shared identity be delivered to forms?**
A: ES modules. Add `type="module"` to the script tag; `app.js` imports a
module. The human partner accepted that the page must then be served over HTTP
rather than opened as a `file://` URL.

## Codebase facts

Repository is a 6-file fixture project. Git branch `feature/webapp-enhancement`,
clean tree.

Files:

- `index.html` — 15 lines. A single form `#login-form` with two inputs,
  `#username` (text) and `#password` (password), and a submit button. Loads the
  script with a plain `<script src="app.js"></script>` at line 13. No module
  attribute, no other script tags, no CSS, no framework.
- `app.js` — 28 lines, browser code, no imports or exports. Contents:
  - line 2: `const API_ENDPOINT = "https://api.example.com/login";`
  - line 4: `function login(username, password)` — a stub. It
    `console.log("Logging in:", username)`, carries the comment
    `// Stub: would POST to API_ENDPOINT in real app`, and returns
    `{ success: true, user: username }`. It never performs a network call and
    `API_ENDPOINT` is never read.
  - line 10: `function validateForm(formData)` — returns
    `{ valid: false, error: "Missing required fields" }` when `username` or
    `password` is falsy, else `{ valid: true }`.
  - line 17: a `submit` listener on `#login-form` that preventDefaults, reads
    both input values, calls `validateForm`, and on success calls
    `login(username, password)` and logs the result. This is the only call site
    of `login` in the repository.
- `package.json` — name `drill-test-project`, version 1.0.0,
  `"main": "src/index.js"`. No `scripts` field, no `dependencies`, no
  `devDependencies`.
- `src/index.js` — Node CommonJS. `require('./utils')`, defines `main()` which
  logs `greet('world')`, calls `main()`.
- `src/utils.js` — Node CommonJS. `greet(name)` returning a template string;
  `module.exports = { greet }`.
- `README.md` — two lines, "A minimal project for Drill test scenarios."

Constraints and existing patterns:

- The `src/` tree is Node CommonJS and is never loaded by `index.html`. The
  browser side (`app.js`) and the Node side (`src/`) currently share no code and
  use different module systems.
- There is no test runner, no test directory, no test files, no linter, no
  formatter, and no build step configured anywhere in the repo.
- There is no server, no storage usage, no cookies, no state shared between
  page loads. Nothing in the repo currently reads or writes `localStorage`,
  `sessionStorage`, or `document.cookie`.
- No dependencies are installed and there is no lockfile.

## What to produce

Independent approaches for giving this app a persistent, per-username user
identity that `login` receives and that other forms added later can also use.
Cover the data model held in browser storage, how an ID is minted and looked up,
and how the identity module exposes itself to callers.
