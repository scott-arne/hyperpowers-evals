# Approach context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What are the other forms that this validation needs to serve?**
A: "None yet — generic reuse." No second form exists or is planned
specifically; the validation should be factored out so any future form can
use it. Design for a general rule set.

**Q: How should the shared validation module be loaded?**
A: ES modules (`export`/`import`, `index.html` gets `<script type="module">`).
Accepted cost: the page must be served over HTTP, `file://` will no longer
work. Rejected: a `window`-global script, and CommonJS + a bundler.

**Q: How much of the form handling should the reusable piece cover?**
A: Rules only. A pure validation function with no DOM knowledge. Each form
keeps its own submit handler and decides how to display errors. Explicitly
rejected: rendering error messages into the DOM, and full form binding
(attach-to-form-element with onValid callback).

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`,
`package.json`, `src/index.js`, `src/utils.js`.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts, no test runner, no bundler,
no linter config, no `"type"` field. No lockfile and no `node_modules`.

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

`src/index.js` and `src/utils.js` are a separate CommonJS pair unrelated to
the webapp (`greet(name)` and a `main()` that logs it). They are not loaded
by `index.html` and cannot be loaded by a browser as-is.

Existing patterns and constraints:

- The only current form is the login form. `validateForm` hardcodes a
  presence check over exactly the fields `username` and `password`, and
  returns `{ valid: boolean, error?: string }` — a single error string for
  the whole form, not per-field.
- On failure the submit handler only calls `console.error`; nothing is shown
  on the page. There is no error markup in `index.html` and no CSS at all.
- `login()` is a stub that returns a fixed object; `API_ENDPOINT` is unused.
- Two module systems already coexist in the repo (browser globals in
  `app.js`, CommonJS in `src/`).
- Git: branch `feature/webapp-enhancement`, working tree clean.

## What to produce

Approaches for the shape of the reusable validation module itself: how rules
are expressed, how a caller declares what a given form requires, and what the
validation result looks like. Assume the ES-module and rules-only decisions
above are fixed.
