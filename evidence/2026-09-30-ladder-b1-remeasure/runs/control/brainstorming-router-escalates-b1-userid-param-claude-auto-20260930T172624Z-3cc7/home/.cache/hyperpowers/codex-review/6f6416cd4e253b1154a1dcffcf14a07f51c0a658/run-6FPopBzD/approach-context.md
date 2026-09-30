# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: "Track who logged in" — what is actually wanted: reshape the login result, add the parameter as literally asked, or build real event tracking?**
A: "It should work across the app and persist; other forms will need it later."

**Q: Where should tracked login events live — browser storage, a backend endpoint, or a local buffer that flushes to a backend?**
A: Browser storage (`localStorage`), behind an interface that lets the storage backend be swapped later.

**Q: What identifies the user in a tracked event — an id taken from the login result, the username typed into the form, or a generated anonymous per-browser id?**
A: From the login result.

**Q: How should other forms call the tracker — a generic `track(eventName, data)` core with named helper wrappers, a generic function only, or one named function per case?**
A: Generic core plus named helpers.

**Q: How should the shared module be wired in, given `app.js` is a plain non-module `<script>` — ES modules, a global on `window`, or a bundler?**
A: ES modules.

Additional constraint stated to the partner and not objected to: the password
must never enter a tracked event, and stored fields stay minimal because
`localStorage` is readable by any script on the page.

## Codebase facts

Repository is a 4-commit fixture. Full file list (excluding `.git`):
`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`, `src/utils.js`.

`package.json` — no dependencies, no scripts, no devDependencies:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

`app.js` (28 lines, the entire browser app):

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

`index.html` (15 lines) loads it as a classic script: `<script src="app.js"></script>`.
The form has `id="login-form"` with inputs `id="username"` and `id="password"`.
There is exactly one form in the app today.

`src/index.js` and `src/utils.js` are CommonJS Node files (`require` /
`module.exports`) that nothing in the browser loads. `src/utils.js` exports a
single `greet(name)` function. They are disconnected from `app.js`.

Constraints and current state:
- No bundler, no build step, no transpiler.
- No test runner, no test files, no linter, no formatter configured.
- `API_ENDPOINT` is declared but never used; `login()` is a stub that performs
  no network call and always returns success.
- No `userId` value exists anywhere in the repository today. The only identity
  available at the call site is the `username` string read from the form input.
- The app is currently openable directly from disk (`file://`).
