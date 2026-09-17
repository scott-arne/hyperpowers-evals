# Approach Context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What's driving this — is there a concrete second form coming, or is this
cleanup ahead of future forms?**
A: Several forms planned. Multiple forms are coming and the shared layer should
be in place first, designed for the common cases across them.

**Q: Which forms are planned, and what kinds of rules do they need beyond
"required"?**
A: Required + format — required, plus built-in formats such as email,
min/max length, numeric range, pattern match. Cross-field rules (password
confirmation, date ranges) and async/server-side rules (username-taken checks)
were explicitly NOT selected.

**Q: How much should the shared layer own?**
A: Validator only — a pure function that computes validation results. Each form
keeps its own submit handler and its own error display. The shared layer does
not bind to form elements, does not listen for submit, and does not render
error messages.

**Q: How should the validation module be loaded?**
A: ES modules — `import`/`export` with `<script type="module">`. Serving
`index.html` over HTTP instead of `file://` is accepted. No bundler.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
working tree.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No test runner, no linter, no
formatter, no build step configured anywhere in the repo. No lockfile.

### `app.js` (complete)

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

Facts about the existing validation: it hardcodes the field names `username`
and `password`; it returns `{valid: false, error: "<single string>"}` or
`{valid: true}`; one error string for the whole form, not per field; errors are
only written to the console, never to the DOM.

### `index.html` (complete)

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

One form only. Inputs carry `id` attributes but no `name` attributes. No
elements exist for displaying validation errors. `app.js` is loaded as a
classic script (not `type="module"`).

### `src/index.js` and `src/utils.js` (complete)

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

`src/` is a CommonJS Node island unrelated to the browser app. Nothing in
`src/` is referenced by `index.html` or `app.js`.

## Question for you

Given the above, propose approaches for how the reusable validation layer
should be structured — in particular how validation rules are declared per
form, how the validator is invoked, and what shape the result takes.
