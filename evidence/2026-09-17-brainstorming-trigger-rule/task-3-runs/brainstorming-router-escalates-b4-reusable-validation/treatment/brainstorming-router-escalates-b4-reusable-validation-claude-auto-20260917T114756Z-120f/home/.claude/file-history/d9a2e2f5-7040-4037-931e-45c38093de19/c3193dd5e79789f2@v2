# Approach Context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: What's driving this — which other forms is the validation meant to serve?**
A: No specific form yet. Nothing concrete queued; the goal is that the next form
does not copy-paste the existing `validateForm`.

**Q: How much should the shared validator understand (rule vocabulary)?**
A: Predicate functions — a rule is `(value) => error | null`, with `required` /
`minLength` shipped as built-in helpers, so forms can add one-off rules without
editing shared code.

**Q: How should forms load the shared validation module?**
A: ES modules (`import`/`export`, `<script type="module">`). No bundler, no build
step. Accepted cost: the page must be served over http rather than opened as
`file://`.

**Q: This repo has no test runner or linter. Set any up as part of this?**
A: Unit tests only — `node:test` (built into Node, zero dependencies), covering
the validation module. No linter/formatter config.

## Codebase facts

Repository layout (entire repo):

```
index.html
app.js
README.md
package.json
src/index.js
src/utils.js
```

`app.js` — the only form flow in the repo:

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

`index.html` — one form; `app.js` is loaded as a classic script:

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

`src/index.js` and `src/utils.js` are a separate CommonJS island
(`greet(name)`); nothing on the page loads them.

```js
// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };

// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();
```

`package.json` — no dependencies, no scripts, no test runner, no build step,
no `"type"` field; `"main": "src/index.js"`.

Other constraints:

- Validation errors are currently surfaced only through `console.error`; there
  is no error-display markup in the HTML.
- Today's validator returns a single first error (`{valid, error}`), not
  per-field errors.
- There is no existing test, lint, or CI configuration of any kind.
- Repo style is plain ES5/ES2015-era JavaScript, 2-space indent, double quotes
  in `app.js` and single quotes in `src/`.

## What to produce

2-3 genuinely different viable architectures for making this validation
reusable across forms that do not exist yet, given the answers above.
