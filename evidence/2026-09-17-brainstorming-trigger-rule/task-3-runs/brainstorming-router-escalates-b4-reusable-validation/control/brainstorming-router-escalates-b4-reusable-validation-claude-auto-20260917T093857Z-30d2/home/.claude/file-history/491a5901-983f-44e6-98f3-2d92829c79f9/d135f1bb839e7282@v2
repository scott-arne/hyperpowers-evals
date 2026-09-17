# Approach Context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: What's driving this — which forms are coming, and what do they need to validate?**
A: "A few similar forms" — e.g. signup, profile edit. Mostly required-field
checks plus a couple of format rules (email, min length). Modest rule set,
known up front.

**Q: How much should the shared module own?**
A: "Validation only" — a pure function: rules + data in, errors out. No DOM.
Each form keeps its own submit handler and error display.

**Q: How should the shared module be loaded?**
A: "ES modules" — `export`/`import`, `index.html` switches to
`<script type="module">`. No build step.

## Codebase facts

Repository is a small static webapp fixture. Full file list (excluding
`.git`): `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`. Total 64 lines across all files.

### `app.js` (28 lines, loaded as a plain `<script src="app.js">`)

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

### `src/utils.js` (5 lines) and `src/index.js` (7 lines)

CommonJS, Node-side, unrelated to the webapp:

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
function main() { console.log(greet('world')); }
main();
```

### `package.json` (6 lines)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### Constraints and existing patterns

- No dependencies, no `scripts` block, no test runner, no linter, no
  formatter, no build step, no CI configuration anywhere in the repo.
- Module systems are currently split: `app.js` is a classic browser script
  with implicit globals; `src/` is CommonJS. The partner has chosen ES
  modules for the new shared code.
- Exactly one form exists today (`#login-form`). The signup and profile-edit
  forms named above do not exist yet.
- The current validator returns `{ valid: false, error: "<single string>" }`
  — one message for the whole form, not per field.
- Inputs are located by `document.getElementById` with ids that happen to
  match the field names (`username`, `password`); there are no `name`
  attributes on the inputs.
- Error output today goes to `console.error`; there is no error display in
  the DOM.

## Question for you

Propose approaches for the design of the reusable validation module, given
the answers above. The decision with the longest half-life is how validation
rules are expressed and how results are shaped, since every form's rules get
rewritten if that format changes later.
