# Approach Context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q1: What is driving the reuse — which other forms does this need to serve?**
A: General prep / cleanup. No specific forms or rules are confirmed yet. The
goal is to have the seam in place so the next form is cheap to add.

**Q2: How much should the reusable validation piece own?**
A: Rules plus input reading. It validates a `<form>` element against a
declared schema and hands errors back to a caller-supplied callback. Rendering
error messages into the page stays the responsibility of each form.

**Q3: Which module format should the shared validation module use?**
A: ES modules. `index.html` switches to `<script type="module">`. Accepted
consequence: the page must be served over HTTP locally rather than opened via
`file://`.

## Codebase facts

Repository is a minimal fixture project. Full file inventory (6 files):
`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`. Total 64 lines across all of them.

### `app.js` (28 lines) — the browser app, loaded as a classic script

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

Facts about the current validation:
- `validateForm` hardcodes the field names `username` and `password`.
- It returns `{ valid: false, error: <single string> }` — one error for the
  whole form, not per field. It cannot say which field failed.
- The only rule implemented is "non-empty" (a falsy check, so the string
  `"0"` passes and `" "` also passes).
- Validation failures are reported only to `console.error`. Nothing is shown
  to the user in the page.
- Values are read with `document.getElementById` per field, using literal ids.

### `index.html` (15 lines)

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

Note: the inputs carry `id` attributes but **no `name` attributes**. There is
exactly one form in the entire repository. No second form exists anywhere.

### `src/index.js` and `src/utils.js` — a separate Node entry point

```js
// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();

// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };
```

These use CommonJS and are unrelated to the browser app. `app.js` does not
import them and they do not import `app.js`.

### `package.json` (6 lines)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `dependencies`, no `devDependencies`, no `scripts`, no `type` field.

### Tooling state

- No test runner, no test files, no test directory.
- No linter or formatter configured.
- No build step, no bundler, no transpiler.
- No CI configuration.
- Git branch `feature/webapp-enhancement`; working tree clean.

## Constraints

- Zero-dependency is the current state; adding dependencies needs justifying.
- The validation module must be loadable by the browser directly (no bundler)
  and also exercisable by a test runner.
- Only one form exists today, and no concrete second form is specified.

## What to produce

Propose 2-3 genuinely different **data models / architectures for how a form's
validation rules are declared and applied**, given the settled answers above.
The open question is the shape of the rule/schema representation and the
module's API surface — not whether to build it.
