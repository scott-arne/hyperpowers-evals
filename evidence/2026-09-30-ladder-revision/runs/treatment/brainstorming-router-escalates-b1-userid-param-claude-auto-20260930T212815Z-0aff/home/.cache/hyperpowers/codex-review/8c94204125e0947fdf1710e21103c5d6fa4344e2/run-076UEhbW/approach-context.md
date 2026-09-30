# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up, verbatim:

> Go with your recommendation. It should work across the app, and other forms will need it later.

## Clarifying questions and answers

**Q: What should userId identify — a person across visits, or a single visit?**
A: A stable per-person id. Generated once, persisted client-side, survives page
reloads and browser restarts. The user explicitly accepted the client-side
persistence consequence.

**Q: How should callers obtain and pass the userId?**
A: A shared module exposing a getter, with the id passed explicitly as a
parameter at each call site (rather than read implicitly inside the callee, or
injected by a form-handler wrapper).

Additional stated requirement: it must work across the whole app, and other
forms not yet written will need the same id.

## Codebase facts

Repository: a minimal static web app. No build step, no bundler, no test
runner, no framework. Plain browser scripts loaded via `<script src>`.

Files (excluding .git):
- `index.html` — one form, `id="login-form"`, with `#username` (text),
  `#password` (password), and a submit button. Loads `app.js` via a plain
  `<script src="app.js">` tag. No `type="module"`.
- `app.js` — the entire app logic (28 lines).
- `src/index.js`, `src/utils.js` — present; `package.json` declares
  `"main": "src/index.js"`. Neither is referenced by `index.html`.
- `package.json` — name `drill-test-project`, version 1.0.0, no dependencies,
  no scripts, no test runner, no devDependencies.
- `README.md` — two lines, no build or run instructions.

Current contents of `app.js`:

```js
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
```

Relevant constraints and facts:
- `login()` is a stub. It never calls `API_ENDPOINT`; it logs and returns a
  literal `{ success: true, user: username }`.
- There is exactly one call site of `login()` today (`app.js:23`), inside the
  submit handler.
- There is no `userId` anywhere in the repo, and no form field that could
  supply one.
- Everything in `app.js` is a global-scope function declaration; there is no
  module system in use by the page today.
- There are no tests and no test infrastructure of any kind.
- Recent commits: "Add simple webapp fixture", "add entry point",
  "add utils module", "initial commit". Branch `feature/webapp-enhancement`.

## What to produce

Independent approaches for introducing an app-wide, client-persisted,
per-person user identifier that is threaded as an explicit parameter into
`login()` and is reusable by forms that do not exist yet. Consider where the
identifier lives, how it is generated, how the shared code is loaded given the
no-bundler constraint, how it behaves when client-side storage is unavailable
or cleared, and how any of this could be tested in a repo with no test runner.
