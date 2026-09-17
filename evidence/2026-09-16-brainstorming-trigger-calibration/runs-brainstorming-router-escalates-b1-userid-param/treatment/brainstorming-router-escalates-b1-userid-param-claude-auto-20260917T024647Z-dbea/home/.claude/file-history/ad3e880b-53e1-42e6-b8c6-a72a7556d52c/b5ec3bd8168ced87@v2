# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up from the human partner, verbatim:

> Yes, it should work across the app and persist, and other forms will need it later.

## Clarifying questions and answers

1. **Is there a real auth backend behind `API_ENDPOINT` that will return the
   userId, or does `login()` stay a stub?**
   Answer: stub, but async-shaped. `login()` should return a Promise that
   currently resolves a placeholder userId, so the signature does not change
   when a real backend lands.

2. **How long should the logged-in identity persist?**
   Answer: `sessionStorage` — survives refresh and in-app navigation, cleared
   when the tab closes.

3. **How should the session store be shared with `app.js` and future forms?**
   Answer: native ES modules (`<script type="module">`, `import`/`export`);
   no bundler.

4. **What should the persisted session record contain?**
   Answer: `userId`, `username`, `loginAt`.

## Codebase facts

Repository is a minimal static webapp fixture. Complete file list (excluding
`.git`): `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`.

`package.json` (complete):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no `scripts` block, no test runner, no
linter or formatter config, no CI config, no lockfile, no `node_modules`.

`app.js` (complete) — loaded by `index.html` via a classic `<script src="app.js">`
at the end of `<body>`:

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

`index.html` contains a single `#login-form` with `#username`, `#password`, and
a submit button. There is exactly one call site of `login()`, in `app.js`.
There are no other forms in the repo today.

`src/index.js` and `src/utils.js` are an unrelated CommonJS pair
(`require('./utils')`, `module.exports = { greet }`) that no browser page loads
and no bundler processes. `package.json` `main` points at `src/index.js`.

Environment: browsers only for the page itself; Node is available on the
machine. `index.html` is currently openable directly from the filesystem
(`file://`).
