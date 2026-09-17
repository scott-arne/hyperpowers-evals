# Approach Context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

1. **Q: What kinds of validation rules does the shared validator need to cover?**
   A: "Required + common types" — required fields, plus a small built-in set:
   email format, min/max length, numeric range. Not cross-field rules, not
   async/server-side rules.

2. **Q: How should the shared validation surface handle error reporting and display?**
   A: "Pure core + display helper" — a pure validator that returns per-field
   errors, plus a separate, opt-in helper that renders those errors into the
   form. The two layers stay distinct.

3. **Q: How should the shared validation module be loaded by the page and by tests?**
   A: "Dual export shim" — `module.exports` when available, otherwise attach to
   the browser `window` global. The page must keep working when `index.html` is
   opened directly from disk (`file://`), and Node must be able to load the
   module for unit tests. No bundler, no build step.

## Codebase facts

Repository is a 64-line fixture webapp. Complete file inventory (excluding
`.git`):

- `index.html` (15 lines)
- `app.js` (28 lines)
- `src/index.js` (7 lines)
- `src/utils.js` (5 lines)
- `package.json` (6 lines)
- `README.md` (3 lines)

### `index.html` (verbatim)

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

### `app.js` (verbatim)

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

### `src/index.js` and `src/utils.js` (verbatim)

```js
// src/index.js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

```js
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### `package.json` (verbatim)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### Constraints and existing patterns

- There is exactly **one** form today (the login form). "Multiple forms" refers
  to forms that do not exist yet; none are specified.
- `app.js` is loaded as a plain classic `<script src>` and defines top-level
  globals. `src/` uses CommonJS `require`/`module.exports`. The two halves of
  the repo currently share no code.
- No bundler, no transpiler, no lint config, no framework, no dependencies.
- `package.json` declares **no `scripts` and no `devDependencies`** — there is
  no test runner and no test directory. Node is available.
- Current validation returns `{ valid: false, error: "<single string>" }` —
  a single error for the whole form, not per-field — and the submit handler
  only `console.error`s it. The user is shown nothing today.
- Current field access is by hardcoded element id (`username`, `password`);
  `name` attributes are absent from the inputs.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## What to produce

Design approaches for making the form validation reusable across multiple
forms, consistent with the three answers above. Consider in particular how
validation rules should be expressed and how a form's fields are associated
with them, and how the display layer locates where to put each field's error.

Do not edit anything.
