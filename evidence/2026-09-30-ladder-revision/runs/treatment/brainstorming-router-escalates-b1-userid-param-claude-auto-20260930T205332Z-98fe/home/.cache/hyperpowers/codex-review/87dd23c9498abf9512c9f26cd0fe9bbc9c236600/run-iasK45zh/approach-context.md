# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?**
A: "It should work across the app and persist; other forms will need it later."

**Q: When does the userId first come into existence?**
A: Login creates it. The server returns a userId on successful login; login()
writes it to a store and later forms read it.

**Q: How long should the stored userId persist?**
A: `sessionStorage` — survives reloads and in-tab navigation, cleared when the
tab closes.

**Q: How should the session store be shared with app.js and future forms?**
A: Plain global script — a script file that attaches a small API to `window`,
loaded before `app.js`. No build step, must keep working when `index.html` is
opened directly from disk.

**Q: What does "track who logged in" need to do right now?**
A: Just store and expose the userId. No analytics emission, no backend
telemetry.

## Codebase facts

Repository is a minimal static webapp plus an unrelated Node script. Full file
inventory (no other source files exist):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

### `app.js` (complete, verbatim)

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

### `index.html` (complete, verbatim)

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

### Constraints and existing patterns

- No build system, no bundler, no transpiler. `package.json` declares no
  dependencies, no devDependencies, and no scripts.
- No test framework is installed and no test files exist. Any testing approach
  has to be proposed from zero.
- `app.js` is loaded as a classic (non-module) script. Everything in it is a
  top-level function declaration or a `const` at file scope.
- `login()` is currently a stub: it never calls `API_ENDPOINT`. It returns
  `{ success: true, user: username }` synchronously. A real implementation
  would be asynchronous.
- `login()` has exactly one caller: the submit handler at the bottom of
  `app.js`.
- `src/index.js` and `src/utils.js` are CommonJS Node code (`require`,
  `module.exports`) unrelated to the browser app. `package.json` `main` points
  at `src/index.js`.
- "Other forms will need it later" — additional pages/forms are anticipated but
  none exist yet.
- Git branch is `feature/webapp-enhancement`; working tree is clean.

## What to produce

Independent approaches for introducing a shared, sessionStorage-backed userId
that `login()` establishes and later forms consume, under the constraints
above. Consider in particular: where the store's write happens relative to
`login()`, how wide the store's interface should be, how the stubbed and later
asynchronous `login()` is accommodated, and how any of it can be tested given
there is currently no test infrastructure.
