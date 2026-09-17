# Approach Context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: What forms are actually coming, and what kinds of rules do they need?**
A: Required + format rules only — signup/contact-style forms: required fields,
email format, min length, numeric ranges. Field-by-field, each rule
independent. Explicitly NOT chosen: cross-field rules (password confirmation,
date ordering) and async/server rules (username-taken, coupon-valid).

**Q: How much should the shared layer own?**
A: Validate AND render errors. The shared module validates and displays
messages next to each field on a fixed markup convention. Explicitly NOT
chosen: validate-only (returning errors for each form to display itself), and
validate + render + submit wiring (the module attaching the submit listener
and invoking the success handler).

**Q: How should the shared validation module be loaded?**
A: ES modules — the shared file uses `export`, `index.html` switches to
`<script type="module" src="app.js">`. Accepted cost: the page must be served
over HTTP rather than opened via `file://`. Explicitly NOT chosen: a global on
`window` via a second plain script tag, and adding a bundler (esbuild/Vite).

## Codebase facts

Repository is a minimal fixture webapp. Full file inventory (excluding .git):
`index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`,
`src/utils.js`.

`app.js` (28 lines) — the entire browser app. Current contents:

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

`index.html` (15 lines) — one form, `id="login-form"`, with
`<input type="text" id="username">`, `<input type="password" id="password">`,
and a submit button. Loads `app.js` with a plain `<script src="app.js">` tag.
No CSS file, no classes on any element, no elements for error messages.

`src/utils.js` and `src/index.js` — Node-side CommonJS
(`module.exports` / `require`), unrelated to the browser app.
`src/utils.js` exports a single `greet(name)` function.

`package.json` — name `drill-test-project`, version 1.0.0,
`"main": "src/index.js"`. No `"type"` field. No dependencies, no
devDependencies, no scripts.

Notable state:
- Exactly ONE form exists in the repo today. Additional forms are anticipated
  but not yet written.
- The current validation returns a single form-level `error` string, not
  per-field errors.
- Validation failures currently produce NO user-visible output — only
  `console.error`.
- There is no test runner, no linter, no formatter, and no build step
  configured anywhere in the repo.
- Two module conventions coexist: plain browser globals in `app.js`, CommonJS
  under `src/`.
- Field values are read via hardcoded `document.getElementById` calls, one per
  field, in the submit handler.

## What to produce

Independent approaches for how reusable, per-field, required+format validation
with built-in error rendering should be structured for this codebase —
specifically how validation rules are declared and associated with form fields,
and how the rendered error messages attach to the DOM.
