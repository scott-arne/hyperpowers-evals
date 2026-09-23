# Approach Context

## Original idea (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and the human partner's answers

1. **Which program does "the app" mean for this logging work?**
   Answer: The browser app only (`index.html` + `app.js`, the login form). The
   Node CLI under `src/` is out of scope.

2. **What does debugging a production issue look like today?**
   Answer: Users report issues after the fact. Logs must leave the browser and
   land somewhere searchable later.

3. **Where should the shipped logs land?**
   Answer: An existing third-party error/log service, accessed through a
   first-party wrapper module.

4. **What user data may leave the browser in a log record?**
   Answer: An allowlist of explicitly-safe fields, plus a one-way hash of the
   username for correlation. Passwords never leave the browser under any
   option. Raw usernames are not to be sent.

5. **How should the logging SDK be packaged into the app?**
   Answer: npm dependency plus an esbuild build step, using Sentry, so that
   source maps can be uploaded and production stack traces are readable.

## Codebase facts

Repository root contains:

```
README.md
app.js
index.html
package.json
src/index.js
src/utils.js
```

- `package.json`: name `drill-test-project`, version `1.0.0`, `main` is
  `src/index.js`. There are **no** `dependencies`, no `devDependencies`, and no
  `scripts` block. The project currently has zero third-party dependencies and
  no build step of any kind.
- `index.html` (15 lines): a plain page with a `#login-form` containing
  `#username` (text), `#password` (password), and a submit button. It loads the
  app with a single non-module tag: `<script src="app.js"></script>`. The page
  can be opened directly from the filesystem today.
- `app.js` (28 lines, browser, non-module, no imports/exports):
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `login(username, password)` — currently calls
    `console.log("Logging in:", username)` and returns a stubbed
    `{ success: true, user: username }`. A comment states it would POST to
    `API_ENDPOINT` in a real app. The password parameter is accepted but unused.
  - `validateForm(formData)` — returns `{ valid: false, error: "Missing
    required fields" }` when username or password is empty, else `{ valid: true }`.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
    both input values, validates, then either calls `login()` and
    `console.log("Login result:", result)` or `console.error("Validation
    error:", validation.error)`.
  - There are four `console.*` call sites total and no error handling around
    `login()`.
  - There are no `window.onerror` or `unhandledrejection` handlers anywhere.
- `src/index.js` and `src/utils.js` are a CommonJS Node pair (`require`,
  `module.exports`) implementing a `greet(name)` stub. They share no code with
  `app.js` and are out of scope.
- No test framework, no test files, no linter or formatter config, no CI
  configuration exists in the repository.
- Git: branch `feature/webapp-enhancement`, clean working tree. Recent commits
  are fixture commits ("Add simple webapp fixture", "add entry point", "add
  utils module", "initial commit").

## What to produce

Independent approaches for how to structure browser-side logging in this
codebase under the constraints above: how log records are shaped and emitted,
how the redaction/allowlist rule is enforced, how uncaught errors are captured,
how the vendor SDK is isolated, and how the build step is introduced to a
repository that currently has none.
