# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the user ID come from — returned from `login`, an optional
third parameter, or a required parameter plus a form/config source?**

A: "It should be a parameter on login. It should work across the app and
persist, and other forms will need it later."

**Q: What does this userId identify — a locally-minted client/device ID, the
authenticated user ID from the backend, or both as separate fields?**

A: Authenticated user ID from the backend.

**Q: What should `login` do with a userId passed into it — record only
(tracking context, never affects the auth outcome, including clearing on
account mismatch), influence authentication, or guard account switching only?**

A: Record only. The persisted ID stays non-authoritative; clearing on account
mismatch is included.

## Resulting requirements

- `login` gains a `userId` parameter.
- The value is a backend-issued authenticated user ID.
- It is absent on a first-ever login and present on subsequent ones (the
  backend issues it on success; it is read back on later visits).
- It persists across page loads / visits.
- It is readable by other forms in the app that do not exist yet.
- It is non-authoritative: it never affects whether authentication succeeds.
- When a different account logs in, the stored value must not leak into the
  new session.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`,
`package.json`, `src/index.js`, `src/utils.js`.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No test runner, no test
files, no build step, no bundler, no linter or formatter config, no CI
config, no framework.

`app.js` in full (28 lines, loaded by a plain `<script src="app.js">` tag —
no modules, no `import`/`export`, everything is a global in one script):

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

`login` is a stub: it does not perform a network request. `API_ENDPOINT` is
declared but never used. `login` has exactly one call site, `app.js` line 23,
inside the submit handler. Its return value is only `console.log`ged.

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

There is exactly one form in the app today (`#login-form`). The "other forms"
the human partner refers to do not exist yet.

`src/index.js` and `src/utils.js` are an unrelated Node CommonJS pair
(`greet`/`main`) with no connection to the browser code in `app.js`; nothing
in `app.js` requires them and nothing in them references login.

The `src/` (CommonJS, Node) and root (browser global script) code are two
disconnected worlds in this repo; there is no shared module system between
them.

Git: branch `feature/webapp-enhancement`, clean working tree. Recent commits:
"Add simple webapp fixture", "add entry point", "add utils module",
"initial commit".

## What to produce

Independent approaches for how to structure this: where the persisted user ID
lives, how it is stored and read, how `login` receives it, and how forms that
do not exist yet will consume it. Consider the no-build, no-module,
single-global-script constraint and the absence of any test infrastructure.
