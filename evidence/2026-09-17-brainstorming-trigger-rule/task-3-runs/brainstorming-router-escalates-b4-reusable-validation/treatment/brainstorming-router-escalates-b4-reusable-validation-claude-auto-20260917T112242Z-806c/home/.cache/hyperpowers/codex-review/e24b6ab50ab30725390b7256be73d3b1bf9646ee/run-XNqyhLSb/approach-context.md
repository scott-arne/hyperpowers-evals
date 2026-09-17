# Approach Context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: What's driving this — what forms are coming, and what do they need to validate?**
A: Unknown, wants the seam now. No specific forms yet; wants validation extracted so the
next form is cheap. Explicitly accepted the risk of over-building and asked for the
narrowest useful seam.

**Q: How much of the form should the reusable module own?**
A: Rules + form binding. The module exports validators plus a binding function that reads
named inputs, validates on submit, and hands back clean values. Error *rendering* into the
page is explicitly out of scope until a real form needs it.

**Q: Which module format should the shared validation module use?**
A: ES modules. `index.html` will switch to `<script type="module">`. Accepted cost: the page
must be served over HTTP rather than opened via `file://`.

**Q: This repo has no lint, format, or test tooling. What should be set up?**
A: Unit tests only, using built-in `node:test` + `node:assert`. No new dependencies. No
ESLint/Prettier, no Playwright.

## Codebase facts

Repository is a small static webapp. Full file list (excluding `.git`):
`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`, `src/utils.js`.

`app.js` (28 lines) — the entire webapp, loaded as a plain non-module `<script>`:

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

`index.html` (15 lines) — one form, inputs addressed by `id`, no `name` attributes:

```html
<form id="login-form">
  <input type="text" id="username" placeholder="Username" />
  <input type="password" id="password" placeholder="Password" />
  <button type="submit">Log In</button>
</form>
<script src="app.js"></script>
```

`src/utils.js` — unrelated CommonJS demo: `function greet(name)` returning a template
string, exported via `module.exports = { greet }`.

`src/index.js` — unrelated CommonJS demo: `require('./utils')`, calls `main()` which logs
`greet('world')`.

`package.json` — `{"name": "drill-test-project", "version": "1.0.0", "description": "Test
project for Drill scenarios", "main": "src/index.js"}`. No dependencies, no devDependencies,
no scripts, no `"type"` field.

Constraints and existing patterns:
- Zero third-party dependencies today; no `node_modules/`, no lockfile, no build step.
- Two module systems already coexist: `app.js` is browser-global script style, `src/` is
  CommonJS. The new shared module is intended to unify this going forward on ESM.
- The current validation is presence-only and hardcoded to the field names `username` and
  `password`. It returns a single `error` string, not per-field errors.
- There is exactly one form in the repo. Any "second form" is hypothetical at this point.
- No test files and no test runner exist anywhere in the repo.

## The open design question

Given the above decisions are already fixed (rules + binding, ESM, node:test, no deps), the
remaining open question is the **data model for how a form declares its validation rules**,
and the shape of the validation result that binding and future error rendering consume.
