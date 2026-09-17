# Approach Context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: What validation rules do the other forms actually need?**
A: Required fields plus basic formats — email format, min/max length, numeric
range. Synchronous, self-contained per field. No cross-field rules, no
async/server-checked rules.

**Q: Validation failures currently go to `console.error`. What should users see
when a field is invalid?**
A: Inline per-field messages rendered next to the offending field in the DOM,
cleared on the next submit.

**Q: How should the shared validation module be loaded?**
A: Native ES modules (`<script type="module">`, `import`/`export`). No build
step. The page will be served over `http://`.

## Codebase facts

Repository: a minimal static webapp. Full file list (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

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

### `src/utils.js` and `src/index.js` (verbatim)

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

`src/` is unrelated to the webapp: it is CommonJS, is never loaded by
`index.html`, and has no connection to form handling.

### `package.json` (verbatim)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

## Constraints and existing patterns

- No build step, no bundler, no transpiler. No dependencies of any kind
  (`package.json` has no `dependencies`, no `devDependencies`, no `scripts`).
- No test runner and no existing tests anywhere in the repo.
- No linter or formatter configured.
- No framework. Plain DOM APIs only.
- Current style: 2-space indent, double-quoted strings in `app.js`, semicolons,
  function declarations, `const`/arrow callbacks.
- Validation today is one hardcoded function checking two specific field names
  and returning a single first-failure error string, plus a submit handler that
  reads DOM values by element id.
- Only one form exists today (`login-form`). The additional forms this work is
  meant to serve do not exist yet, so the shared layer's shape is not
  constrained by existing call sites.
- `index.html` has no markup for displaying error messages.

## What to produce

Independent candidate approaches for making validation reusable across
multiple forms, given the above.
