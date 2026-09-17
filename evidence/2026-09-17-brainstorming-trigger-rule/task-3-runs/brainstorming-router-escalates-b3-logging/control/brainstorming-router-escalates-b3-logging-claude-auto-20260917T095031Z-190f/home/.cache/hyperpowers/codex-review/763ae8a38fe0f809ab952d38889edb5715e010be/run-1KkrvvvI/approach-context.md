# Approach Context

## Original idea (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and answers

1. **Which runtime does the logging need to cover?**
   Browser app only (`app.js` — the login form, validation, and API call).

2. **Where should log lines end up in production?**
   A third-party SaaS observability vendor.

3. **How much should the SDK capture, and what is the redaction policy?**
   Errors plus masked breadcrumbs: auto-capture clicks/navigation/network with
   all input values masked, console mirroring off, plus explicit domain events
   at interesting points. Full session replay was explicitly ruled out.

4. **Which vendor?**
   Sentry.

## Codebase facts

Repository is a 6-file fixture on branch `feature/webapp-enhancement`.

Files:

- `index.html` — static page. A `<form id="login-form">` with `#username`
  (text), `#password` (password), and a submit button. Loads the script with a
  bare `<script src="app.js"></script>` tag. No bundler, no module type.
- `app.js` — the browser app, plain script (no imports/exports). Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `login(username, password)` — currently `console.log("Logging in:", username)`,
    then returns a stubbed `{ success: true, user: username }`. A comment notes
    it "would POST to API_ENDPOINT in a real app"; there is no actual network
    call today.
  - `validateForm(formData)` — returns `{ valid: false, error: "Missing required fields" }`
    when username or password is empty, else `{ valid: true }`.
  - A `submit` listener that calls `preventDefault()`, reads both field values
    from the DOM, validates, and on success calls `login()` and
    `console.log("Login result:", result)`; on failure
    `console.error("Validation error:", validation.error)`.
- `src/index.js` — separate Node entry point (`require('./utils')`, prints a
  greeting). Not loaded by `index.html`. Out of scope per answer 1.
- `src/utils.js` — exports `greet(name)`. Out of scope.
- `package.json` — `{ name: "drill-test-project", version: "1.0.0", main:
  "src/index.js" }`. No `dependencies`, no `devDependencies`, no `scripts`.
- `README.md` — three lines, no build or deploy documentation.

Constraints and existing patterns:

- **No build step, no package manager install, no bundler, no transpiler.**
  Anything added to the browser app must work as a plain script served
  statically.
- **No test runner, no linter, no formatter** configured anywhere in the repo.
- **No environment/config mechanism** exists for the browser app. There is no
  `.env`, no templating, no server-side render step — the page is static, so
  any vendor key and environment name are readable by anyone.
- **No deployment or environment separation** is described anywhere; there is
  no existing notion of "production" versus "development" in the codebase.
- `app.js` uses no modules, so it currently has no seam for dependency
  injection or substitution in tests.
- The three existing `console.*` calls are the only observability in the app,
  and one of them records a username.

## What to produce

Independent candidate approaches for how to structure this logging capability
in this codebase, given the four answers above.
