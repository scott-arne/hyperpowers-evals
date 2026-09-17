# Approach context

## Original request (verbatim)

"Make the form validation reusable across multiple forms."

## Clarifying questions and answers

1. Q: What validation rules does the shared layer need to cover beyond "required field"?
   A: Required + common formats — required, minLength/maxLength, email, pattern/regex.
   (Explicitly NOT chosen: cross-field rules, async/network rules.)

2. Q: What should the shared validator return?
   A: A per-field error map — `{valid, errors: {field: message}}`. Each form decides how to
   display. Plain data, no DOM dependency, testable in Node. (Explicitly NOT chosen: the
   current single-message shape; a variant that also renders/clears messages in the DOM.)

3. Q: How should the shared validation module be loaded?
   A: Browser global plus a CommonJS export footer — one file that sets a global for the
   page and also `module.exports` for `require()` in Node. No build step; no changes to
   existing files' module systems. (Explicitly NOT chosen: ES modules, which would require
   serving over HTTP and converting existing `require()` files; browser-global-only, which
   is not loadable in Node.)

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory:

- `index.html` — one form only:
  ```html
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script src="app.js"></script>
  ```
- `app.js` — classic browser script (no modules, uses globals). Current contents:
  ```js
  const API_ENDPOINT = "https://api.example.com/login";

  function login(username, password) { /* stub */ }

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
    if (validation.valid) { ...login... } else { console.error(...); }
  });
  ```
  Note: validation errors are currently only logged to the console; nothing is rendered
  in the page.
- `src/index.js` — CommonJS: `const { greet } = require('./utils');`
- `src/utils.js` — CommonJS: `module.exports = { greet };`
- `package.json` — name/version/description/`main: src/index.js`. No dependencies, no
  devDependencies, no scripts (no test script), no `"type"` field.
- `README.md` — two lines, no build or run instructions.

Constraints and existing patterns:

- No build step, no bundler, no framework, no transpiler.
- No test runner or test directory exists yet.
- No linter or formatter configured.
- Two module conventions already coexist: browser globals (`app.js`) and CommonJS (`src/`).
- Only one form exists today; additional forms (e.g. signup) are anticipated but not
  present, so the shared layer's first real consumer is the existing login form.
- Project guidance in effect: make focused minimal changes, do not refactor unrelated
  files, match existing local patterns, add tests when the change is testable.

## What to produce

Propose 2-3 genuinely different designs for the reusable validation layer itself — its
API shape and how a form declares its rules — consistent with the answers above.
