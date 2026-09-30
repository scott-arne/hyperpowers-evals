# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up from the same partner, verbatim:

> Go with your recommendation. It should work across the app and persist — other forms will need it later.

## Clarifying questions and answers

**Q1. Should the persisted user ID be authoritative (sent as proof of identity) or a non-authoritative convenience copy?**
A: Server-held session with a client display copy. Login sets an httpOnly cookie; the browser attaches it to later requests. JavaScript keeps the `userId` only for display and audit purposes, never as a credential.

**Q2. Does this work include building the backend, or defining its contract and building the client against it?**
A: Client plus contract plus test fake. Build the client-side identity module, `login` returning the server's `userId`, and a fake that emulates cookie behaviour so the client is testable now. The spec documents what the real backend must do. No backend is built in this repo.

**Q3. Where should login events be recorded?**
A: Server-side audit only. One clause in the backend contract. No client-side tracking module, no analytics endpoint.

**Q4. How should the client re-learn the userId after a page reload?**
A: A `/me` call on page load. The server is the single source of truth; no `localStorage` mirror of the identity.

## Codebase facts

Repository root contains:

- `index.html` — single page. One form, `id="login-form"`, with `<input id="username">`, `<input id="password">`, and a submit button. Loads the script with a plain `<script src="app.js"></script>` tag. No module type attribute, no bundler, no framework, no import map.
- `app.js` — the whole webapp, 28 lines, browser globals only (no `import`/`export`, no `require`). Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";` (module-level constant, never used)
  - `function login(username, password)` — a stub. Body is `console.log("Logging in:", username);` then `return { success: true, user: username };`. It performs no network call and is synchronous.
  - `function validateForm(formData)` — returns `{valid:false,error:"Missing required fields"}` when username or password is empty, else `{valid:true}`.
  - A `submit` listener registered directly at top level via `document.getElementById("login-form").addEventListener(...)`. It preventDefaults, reads both input values, calls `validateForm`, and on success calls `login(username, password)` and `console.log`s the result. This is the only call site of `login`.
- `src/index.js` and `src/utils.js` — a separate CommonJS Node entry point (`require('./utils')`, `module.exports`). `src/index.js` calls `greet('world')` and logs it. Not referenced by `index.html` and unconnected to the webapp.
- `package.json` — `{"name":"drill-test-project","version":"1.0.0","main":"src/index.js"}`. No `scripts` field, no `dependencies`, no `devDependencies`, no `"type"` field.
- `README.md` — three lines, no build or run instructions.

Other facts:

- No test framework, test directory, or test file exists anywhere in the repo.
- No linter, formatter, or CI configuration exists.
- No server, no API code, no session handling, no storage access (`localStorage`/`sessionStorage`/`document.cookie` appear nowhere).
- Git working tree is clean; branch `feature/webapp-enhancement`; 4 commits, most recent `df69c0e Add simple webapp fixture`.

## Constraints

- The partner stated the identity must "work across the app and persist", and that "other forms will need it later". Only one form exists today; the additional forms and additional pages do not exist yet.
- Because the session cookie is httpOnly, client JavaScript cannot read it. The client can learn the `userId` only from a server response.
- The backend does not exist and is not being built here, so anything requiring a live server must be exercised through the test fake.

## What to produce

Propose 2-3 genuinely different ways to structure the **client-side** identity capability given the above: how the `userId` is obtained and held, how `login` and the existing submit handler change, and — importantly — how forms and pages that do not exist yet consume the current identity.
