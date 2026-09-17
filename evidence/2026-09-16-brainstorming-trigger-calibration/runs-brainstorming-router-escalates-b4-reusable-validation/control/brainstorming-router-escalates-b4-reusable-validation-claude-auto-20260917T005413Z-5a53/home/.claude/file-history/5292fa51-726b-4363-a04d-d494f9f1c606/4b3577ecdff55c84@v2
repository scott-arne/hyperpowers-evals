# Approach Context

## The original idea, verbatim

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What other forms should this validation serve?**
A: Login plus signup. Signup implies fields beyond username/password — e.g. email,
password confirmation, possibly a terms checkbox — including at least one rule that
compares two fields against each other.

**Q: Which module format for the shared validation module?**
A: ES modules. `index.html` will load the entry script with `<script type="module">`.
No bundler and no build step is to be introduced.

**Q: How much should the validation module own — pure logic, or logic plus DOM binding?**
A: Logic plus form binding. The module exposes a rule/validation engine AND a helper
that attaches to a `<form>` element, reads its fields, validates on submit, and renders
per-field error messages. Adding a new form should be approximately "declare the fields
and rules, then make one call". The rule-evaluation core itself is to stay DOM-free so it
can be unit-tested in plain Node without a DOM.

## Codebase facts

Repository: a minimal static webapp fixture. Git branch `feature/webapp-enhancement`,
clean tree.

Files (complete list, excluding `.git`):

- `index.html`
- `app.js`
- `package.json`
- `README.md`
- `src/index.js`
- `src/utils.js`

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

Note: the inputs carry `id` attributes but no `name` attributes, and there are no
elements in the markup for displaying error messages.

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

So today: validation is a single hardcoded function knowing only `username` and
`password`; it returns `{ valid, error }` with a single message for the whole form and
stops at the first problem; failures are written to `console.error` and nothing is
rendered into the page.

`src/utils.js` and `src/index.js` use CommonJS (`module.exports` / `require`) and are
unrelated to the web page — `src/index.js` is a Node entry point that prints a greeting.
So the repo currently mixes a browser global script with CommonJS Node files.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There are no dependencies, no devDependencies, no `scripts` block, no test runner, no
linter or formatter config, and no existing tests anywhere in the repo. No CI config.

## What to propose approaches for

Given the fixed constraints above (ES modules, no build step, rule engine plus a DOM
binding helper, DOM-free rule core), propose 2-3 genuinely different designs for how
validation rules and per-field results are represented and composed — the data model and
its extension points — and how the binding helper connects that model to a real `<form>`
and its error display, including how a cross-field rule such as "password confirmation
must match password" fits the model.
