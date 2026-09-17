# Approach context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: There's only one form in the repo right now (login). What are the other
forms this needs to serve?**
A: Unknown / general future-proofing. No specific second form exists or is
planned yet; the goal is that adding forms later is easy.

**Q: How should the shared validation module be loaded?**
A: ES modules — native `import`/`export`, no build step. Accepted consequence:
`index.html` can no longer be opened over `file://` and needs a local server.

**Q: What should the validation result look like?**
A: A per-field error map, `{ valid, errors: { field: message } }`, collecting
every failure rather than stopping at the first. Updating the single existing
call site is accepted.

## Codebase facts

Repository: a 6-file fixture webapp. Branch `feature/webapp-enhancement`,
working tree clean.

### `app.js` (28 lines, loaded by `index.html` as a plain `<script>`)

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

### `index.html` (15 lines) — the only form in the repo

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

There is no element for displaying error messages; failures currently go to
`console.error`.

### `src/utils.js` and `src/index.js` — CommonJS, unrelated to the page

```js
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}
module.exports = { greet };
```

```js
// src/index.js
const { greet } = require('./utils');
function main() {
  console.log(greet('world'));
}
main();
```

These are run by Node, never loaded by the browser. The repo therefore
currently mixes a plain browser script with CommonJS modules.

### `package.json` (6 lines)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `scripts`, no `dependencies`, no `devDependencies`, no `"type"` field. There
is no test runner, no linter, no formatter, and no build step configured
anywhere in the repo. No CI configuration exists.

## What to propose approaches for

Given the constraints above (ES modules; per-field error map; one existing
login form; no known second form), propose approaches for how validation rules
are declared and composed so that an arbitrary future form can reuse the
module — i.e. the data model and API shape of the shared validation layer, and
how a form's DOM fields are bound to it.
