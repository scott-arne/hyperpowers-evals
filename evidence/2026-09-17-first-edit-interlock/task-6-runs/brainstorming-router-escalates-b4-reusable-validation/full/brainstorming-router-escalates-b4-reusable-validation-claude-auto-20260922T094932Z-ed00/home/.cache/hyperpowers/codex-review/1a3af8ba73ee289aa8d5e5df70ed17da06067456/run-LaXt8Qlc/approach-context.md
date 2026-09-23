# Approach Context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What's driving this right now — is there a specific second form you're about to build, or is this groundwork ahead of one?**
A: Several forms planned. Multiple forms are coming and the shapes are roughly known.

**Q: Which kinds of validation do the planned forms need?** (multi-select: presence/required, format & length, cross-field, async/server)
A: Presence / required, and Format & length. Explicitly NOT cross-field rules (no confirm-password / date-range comparisons) and NOT async or server-backed checks.

**Q: How much should the shared module own — just the rules, or the form wiring and error display too?**
A: Both, layered — a pure validation core plus a separate optional helper that binds a form element (submit wiring, value reading, error rendering), so unusual forms can drop to the core.

**Q: How should the shared validation file be loaded in the browser?**
A: ES modules (`export`/`import`, `<script type="module">`). No bundler, no new dependency. Accepted cost: the page must be served over http rather than opened from `file://`.

## Codebase facts

Repository root contains exactly these tracked files (no build system, no `node_modules`, no dependencies, no tests, no linter or formatter config, no CI):

- `index.html` (15 lines)
- `app.js` (28 lines)
- `src/index.js` (7 lines)
- `src/utils.js` (5 lines)
- `package.json` (6 lines)
- `README.md` (3 lines)

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Note: no `scripts` block, no `type` field, no dependencies.

`index.html` in full:

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

Note: there are no elements in the markup for displaying validation errors, and
the inputs carry `id` attributes but no `name` attributes.

`app.js` in full:

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

Facts about the current validation behaviour:

- `validateForm` is a file-local function. It is not exported and has no callers
  outside `app.js`.
- It returns a single `error` string for the whole form, not per-field errors.
- Failures are reported only to the console; nothing is shown in the page.
- `login()` is a stub that logs and returns a canned success object; it never
  contacts `API_ENDPOINT`.

`src/` is a separate CommonJS island that the HTML page never loads:

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

So the repo currently mixes two module worlds: `app.js` is a classic
browser script with no module system, and `src/*.js` uses CommonJS `require` /
`module.exports`. Setting `"type": "module"` in `package.json` would affect how
the `src/*.js` CommonJS files are treated by Node.

Git: branch `feature/webapp-enhancement`, working tree clean.

## What to produce

Independent approaches for structuring reusable, shareable form validation
across several planned forms in this codebase, given the answers above.
