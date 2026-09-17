# Approach Context

## Original request (verbatim)

"Make the form validation reusable across multiple forms."

## Clarifying questions and the human partner's answers

**Q1. What is the scope of "multiple forms" for this work?**
A: Build the shared validation module, rewire the existing login form to use
it, and exercise a second, different field set in tests only. Do not invent
new UI / a new real form.

**Q2. How expressive should the validation rules be?**
A: A fixed set of built-in rules: `required`, `minLength`, `maxLength`,
`pattern`, `email`. Rules stay plain data (no arbitrary custom validator
functions for now; that escape hatch may be added later).

**Q3. How should the shared module be loaded by both the page and tests?**
A: Dual export, no build step. A single `validation.js` that attaches to
`window` for the browser page and sets `module.exports` when `module` exists
so Node tests can `require()` it. Page loading via `<script src>` must not
change.

## Codebase facts

Repository root contains exactly these tracked files:

```
README.md
package.json
index.html
app.js
src/index.js
src/utils.js
```

Git: branch `feature/webapp-enhancement`; recent commits are
`Add simple webapp fixture`, `add entry point`, `add utils module`,
`initial commit`.

### package.json (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no `scripts` block, no test runner
configured, no linter or formatter configured. No lockfile.

### index.html (complete)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Simple Webapp</title>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script src="app.js"></script>
</body>
</html>
```

Note: there is exactly ONE form in the application. There is no second form
anywhere in the repo. Inputs carry `id` attributes but no `name` attributes,
no `required` attributes, and no validation-related data attributes. There is
no element in the DOM for displaying validation error messages.

### app.js (complete)

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

Facts about current behavior:
- `validateForm` is hardcoded to the field names `username` and `password`.
- It returns `{ valid: false, error: "<string>" }` on failure — a single
  first-error string, with no indication of WHICH field failed.
- Errors are surfaced only via `console.error`; nothing is rendered to the
  user in the DOM.
- Field values are read by hardcoded `document.getElementById` calls at
  submit time.
- `app.js` runs in plain browser-global scope. There is no `import`, no
  `require`, no bundler, no `type="module"`.

### src/index.js (complete)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### src/utils.js (complete)

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Facts: `src/` is CommonJS and Node-side. It is entirely unrelated to the form
code in `app.js`; nothing in `src/` is loaded by `index.html`. So the repo
already contains two disconnected module worlds: CommonJS under `src/`, and
browser globals at the root.

## Constraints

- Zero runtime dependencies today; the human partner chose "no build step".
- The browser page must keep loading via `<script src="app.js">`.
- Node must be able to load the validation module for tests.
- No test runner exists yet, so one has to be chosen/set up as part of this
  work.
- The existing login flow must keep working after the rewire.
- Rules are plain data (see Q2).
- The project is tiny (~40 lines of application code). Solutions should be
  proportionate.

## What to produce

Propose 2-3 genuinely different viable architectures for the reusable
validation layer, given the decisions above. The open design space includes
(but is not limited to): where rules are declared, what the module's public
interface looks like, how a form's values are collected, what the result
shape is, and how much of DOM wiring / error rendering the shared module
owns versus each form.
