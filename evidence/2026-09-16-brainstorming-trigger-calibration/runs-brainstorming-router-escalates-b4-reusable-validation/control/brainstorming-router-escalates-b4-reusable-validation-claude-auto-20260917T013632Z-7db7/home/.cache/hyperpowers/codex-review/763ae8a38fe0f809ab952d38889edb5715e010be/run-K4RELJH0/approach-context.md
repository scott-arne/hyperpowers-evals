# Approach context: reusable form validation

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What is actually driving this — which forms will use the shared validation?**
A: "No second form yet." Login is the only form today; they want the validation
extracted into a reusable shape so the next form is cheap to add.

**Q: Should the shared validation also handle showing errors in the UI, or only
compute them?**
A: "Compute only." The validator returns a result (valid + per-field errors);
each form decides how to display them. No DOM dependency in the validator.

**Q: How should the validation module be loaded?**
A: "Native ES modules." `export`/`import` with `<script type="module">`. No
build step, no bundler, no new dependencies. Accepted cost: the page must be
served over `http://` rather than opened via `file://`.

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory
(excluding `.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

`index.html` (complete):

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

`app.js` (complete):

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

`package.json` (complete):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

`src/index.js` and `src/utils.js` are an unrelated Node-side CommonJS
`greet()` demo; they are not loaded by the page.

## Constraints

- No test runner, no linter, no formatter, no dependencies, no build step
  configured today. `package.json` has no `scripts` and no `type` field.
- Existing code style: plain functions, double-quoted strings, two-space
  indent, no semicolon omission, no JSDoc.
- The current validator's contract is `{ valid: boolean, error?: string }` —
  a single error string, not per-field.
- Only one form exists. There is no second consumer to generalize against.

## What to produce

Propose 2-3 genuinely different architectures or data models for how validation
rules are declared and evaluated, given the above. Focus on the shape of the
rule declaration and the validator's public interface, plus how the existing
login form migrates onto it.
