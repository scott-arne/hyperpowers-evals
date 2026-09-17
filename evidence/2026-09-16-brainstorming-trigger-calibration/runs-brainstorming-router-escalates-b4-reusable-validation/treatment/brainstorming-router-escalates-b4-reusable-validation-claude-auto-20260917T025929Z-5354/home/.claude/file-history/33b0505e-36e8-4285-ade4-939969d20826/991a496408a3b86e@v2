# Approach Context

## Original idea (verbatim)

"Make the form validation reusable across multiple forms."

## Clarifying questions and answers

**Q: What's driving this — is there a specific second form coming, or is this preparatory?**
A: Preparatory / general. No specific second form yet; the goal is to extract the
login validation into something reusable so the next form is cheap to add.

**Q: How should the shared validation module be loaded?**
A: ES modules. `export`/`import`; `index.html` becomes `<script type="module">`.
Accepted cost: the page must be served over a local http server rather than opened
via `file://`.

**Q: How much should the shared module cover?**
A: Pure validation only. Data in, errors out. No DOM knowledge. Each form keeps its
own submit listener, field reading, and error display. Explicitly out of scope: a
form binder that attaches to a `<form>` element, and any error rendering into the DOM.

## Codebase facts

Repository is a minimal static webapp fixture. Full file list (excluding .git):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

### app.js (the only form code; loaded via plain `<script src="app.js">`)

```javascript
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

### index.html

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

### src/utils.js (CommonJS; unrelated to the webapp, not loaded by index.html)

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### src/index.js (CommonJS entry point; unrelated to the webapp)

```javascript
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### package.json

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### Relevant constraints and existing patterns

- No test framework, no test files, no test script in package.json.
- No build step, no bundler, no transpiler, no lockfile, no dependencies (there is
  no `dependencies` or `devDependencies` key at all).
- No linter or formatter configured.
- No framework. Plain DOM APIs only.
- Two module systems coexist today: `app.js` is browser-global script-tag code with
  no imports/exports; `src/` uses CommonJS `require`/`module.exports`. `package.json`
  has no `"type"` field, so Node currently treats `.js` as CommonJS.
- The current validation result shape is `{ valid: boolean, error?: string }` — a
  single error string for the whole form, not per-field.
- The only existing rule is "required" applied to two fields, with one shared
  message ("Missing required fields").
- Recent commits: "Add simple webapp fixture", "add entry point", "add utils module",
  "initial commit".

## What to produce

Propose 2-3 genuinely different approaches for how validation rules are declared and
how validation results are shaped, for a pure (DOM-free) ES module reused by multiple
forms. Consider the rule-declaration data model, the result/error shape, how per-field
vs whole-form errors are represented, how custom and cross-field rules fit, and how
the approach handles the fact that no test infrastructure exists yet.
