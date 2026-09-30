# Approach Context: login userId + login-event tracking

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where does `userId` come from — caller-supplied, server-assigned, or a new form field?**
A: Server-assigned. It is an output of authentication, not an input. So the
change is to `login`'s return value, not its parameter list.

**Q: What should "track who logged in" actually do — extend the existing
console.log, or real tracking (persist/send)?**
A: Real tracking (persist/send). The repo has no such layer today.

**Q: What is the tracking for — product analytics, security/audit trail, or
debugging?**
A: Product analytics. Client-side emission is therefore acceptable; the record
does not need to be defensible or complete. Approximate data is fine.

**Q: Where should events be sent — third-party analytics vendor, own endpoint,
or build the seam and defer the transport?**
A: Build the seam and defer. A tracking module with a console transport now;
the real transport is dropped in later. No new dependency, no vendor decision
blocking this work.

**Q: How far should the `login` function itself change — async-shaped stub,
real async API call, or stay synchronous?**
A: Async-shaped stub. `login` stays fake but returns a promise carrying a
stubbed `userId`, and the caller awaits it. The interface is final; swapping in
a real `fetch` later should touch only `login`'s body.

## Codebase facts

Repository root contains exactly these files (no build step, no CI, no tests):

- `index.html` — static page. A `<form id="login-form">` with
  `<input type="text" id="username">`, `<input type="password" id="password">`,
  and a submit button. Loads `app.js` via a plain `<script src="app.js">` tag.
  No module type attribute.
- `app.js` — not a module; no imports, no exports. Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `function login(username, password)` — logs `"Logging in:", username`,
    carries the comment "Stub: would POST to API_ENDPOINT in real app", and
    returns `{ success: true, user: username }` synchronously.
  - `function validateForm(formData)` — returns
    `{ valid: false, error: "Missing required fields" }` when username or
    password is falsy, else `{ valid: true }`.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
    both input values, calls `validateForm`, and on valid input calls
    `login(username, password)` and `console.log`s the result; otherwise
    `console.error`s the validation error.
  - `login` has exactly one call site: the submit handler in this same file.
    It is not exported and nothing outside `app.js` references it.
- `src/index.js` — CommonJS. `require('./utils')`, defines `main()` which logs
  `greet('world')`, and calls `main()`. Unrelated to the login flow.
- `src/utils.js` — CommonJS. `greet(name)` returning a template string;
  `module.exports = { greet }`.
- `package.json` — `name: drill-test-project`, `version: 1.0.0`,
  `main: src/index.js`. **No dependencies, no devDependencies, no scripts.**
- `README.md` — two lines, describes a minimal test project.

Notable constraints and tensions:

- There are two module conventions already present: `app.js` is browser
  script-tag code with plain globals, while `src/` uses CommonJS `require`.
  Browser code cannot use `require` without a bundler, and no bundler exists.
- There is no test runner and no linter configured.
- No `userId` value exists anywhere in the repository today.
- Login events keyed to a user identifier are personal data under GDPR/CCPA;
  retention and whether the identifier is pseudonymous are open design
  questions that have not yet been put to the human partner.
- The page has no user-visible feedback mechanism at all — every outcome
  currently goes to the console.

## What to produce

Independent approaches for structuring (a) the async-shaped `login` returning a
server-assigned `userId` and (b) the deferred-transport login-event tracking
seam, within the constraints above.
