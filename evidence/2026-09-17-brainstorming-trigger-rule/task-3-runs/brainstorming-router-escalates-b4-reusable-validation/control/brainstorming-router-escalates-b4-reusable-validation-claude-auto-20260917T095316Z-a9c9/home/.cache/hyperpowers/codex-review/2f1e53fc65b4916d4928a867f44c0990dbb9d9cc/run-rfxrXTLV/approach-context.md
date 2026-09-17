# Approach Context: reusable form validation

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What other forms are actually coming, and what validation do they need
beyond "field is non-empty"?**
A: "Other forms will need it later; it should work across the app." No
specific forms are named yet; no concrete rule list was given.

**Q: How much should the shared validation layer own — rules only, rules plus
DOM binding, or rules plus binding plus live per-field feedback?**
A: Rules + DOM binding. A pure validator module plus a thin binder that wires
a `<form>` element to a schema and renders errors; kept as two separate
modules. Live/blur revalidation was explicitly not chosen.

**Q: How should the shared modules be loaded, given index.html uses a plain
`<script src="app.js">` and the repo has no bundler or dependency?**
A: Native ES modules — `<script type="module">` with import/export, no build
step, no new dependencies.

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`,
`package.json`, `src/index.js`, `src/utils.js`. Git branch
`feature/webapp-enhancement`, clean tree.

`app.js` (28 lines, the entire front-end):

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

`index.html` (15 lines):

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

Notable: the inputs carry `id` attributes but **no `name` attributes**, and
there are no elements in the markup designated to hold error messages. There
is exactly one form in the repo.

`src/index.js` and `src/utils.js` are an unrelated CommonJS Node scratch
module (`greet(name)` and a `main()` that logs it). They are not loaded by
the web page and share no code with `app.js`.

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts, no test runner, no linter
config, no bundler, no CI configuration anywhere in the repo.

## Constraints

- No new runtime dependencies; the repo is currently zero-dependency.
- No build step (the human partner chose native ES modules specifically to
  avoid one).
- Current error reporting is `console.error` only; there is no existing
  in-page error display convention to follow.
- Validation must be reusable across forms that do not exist yet, so the
  schema format and any markup convention are the expensive-to-change parts.

## What to produce

Independent candidate approaches for structuring this reusable validation
layer: how validation rules are expressed and composed, how a form is bound
to them, how errors reach the DOM, and how the whole thing is tested given
there is no test infrastructure today.
