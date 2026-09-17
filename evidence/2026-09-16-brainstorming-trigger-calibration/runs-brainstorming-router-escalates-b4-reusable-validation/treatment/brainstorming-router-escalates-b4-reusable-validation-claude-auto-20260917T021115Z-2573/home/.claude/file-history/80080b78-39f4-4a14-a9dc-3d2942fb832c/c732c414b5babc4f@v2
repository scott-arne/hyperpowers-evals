# Approach context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: Is this driven by specific other forms to support now, or extracting the login validation so future forms can reuse it?**
A: Login only, for now. Only the login form exists today. Build the reusable layer, migrate login to it, leave adding other forms for later.

**Q: How should the shared validation module be loaded, given the page uses a plain `<script>` tag and there is no bundler?**
A: ES modules. `validation.js` uses `export`; `app.js` imports it via `<script type="module">`. Page will be served over http rather than opened from disk.

**Q: How much should the shared validation module own — rules only, rules + form binding, or rules + binding + error rendering?**
A: Rules + binding. A validate function over a values object plus a helper that reads values off a `<form>` element by input `name`. Each form still decides how to display its errors. Adding `name` attributes to `index.html` is accepted.

## Codebase facts

Repository root contains: `README.md`, `package.json`, `index.html`, `app.js`, `src/index.js`, `src/utils.js`. No test directory, no lint config, no bundler, no dependencies.

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `scripts` block, no `devDependencies`, no `"type"` field.

`index.html` — one form, inputs carry `id` only, no `name` attributes:

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

`app.js` — the only form logic today:

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

Notes on the current behavior: validation is all-or-nothing (a single `error` string, not per-field), the field names are hardcoded inside `validateForm`, and failures are reported with `console.error` only — nothing is rendered to the page.

`src/` is a separate CommonJS Node entry point unrelated to the page:

```js
// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();

// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };
```

There is no test runner and no established testing pattern in the repo.

## What is wanted from you

Independent candidate approaches for the **data model of the reusable validation layer**: how a form declares what its rules are, what the validate function returns, and how the form-binding helper reads values. Assume the ES-module and rules-plus-binding decisions above are fixed.
