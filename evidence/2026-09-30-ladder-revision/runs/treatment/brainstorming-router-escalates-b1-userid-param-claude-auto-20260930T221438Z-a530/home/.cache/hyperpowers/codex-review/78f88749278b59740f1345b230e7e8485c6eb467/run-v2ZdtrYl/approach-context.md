# Approach Context

## Original request (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and answers

**Q: Where should the userId value come from?**
A: "It should identify the actual user across the app and persist; other forms will need it later."

**Q: Who issues the userId?**
A: Server on login — `login()` returns the userId after successful auth; the app stores what the server vouched for.

**Q: How should the identity persist?**
A: Server sets an HttpOnly session cookie (the real credential); userId lives in localStorage as a non-secret label the server re-verifies.

**Q: What's in scope for this change?**
A: Identity module, `login()` returning userId, plus logout/clear and handling a stored userId whose session has expired.

**Q: What's the backend situation?**
A: Frontend-only. `login()` keeps returning a fake userId; the cookie/session half is documented as a contract but not implemented. The spec must state plainly that no real auth exists.

## Codebase facts

Repository root contains exactly these files (no build tooling, no tests, no
linter config, no `node_modules`, no lockfile):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `type` field, no dependencies, no devDependencies, no scripts.

`app.js` in full (loaded by `index.html` via a plain `<script src="app.js">`
tag — not `type="module"`):

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

`src/index.js` and `src/utils.js` are a separate, unrelated CommonJS Node
entry point (`require('./utils')`, `module.exports`) implementing a `greet`
function. They share no code with `app.js` and are not loaded by the browser.
So the repo currently mixes two module conventions: CommonJS under `src/`
and bare browser globals in `app.js`.

`login()` is the only definition of that name; its only caller is the submit
handler at `app.js:23`. Nothing in the repo references `userId`, sessions,
cookies, storage, or authentication. There is no server component in the
repository. `API_ENDPOINT` points at the placeholder host
`https://api.example.com/login` and is never actually used — `login()` never
performs a network call.

There is no test framework, no test files, and no test script. There is no
bundler, transpiler, or dev server.

## What the design must cover

- A shared identity layer that stores the server-issued userId, readable by
  code other than the login form (future forms are stated as a requirement).
- `login()` returning the userId; the submit handler persisting it.
- Logout / explicit clear.
- Reconciling the case where a persisted userId outlives its session.
- How browser-side code shares this module given the current no-module-system,
  no-build-tooling setup.
- Whether to introduce test and lint tooling into a project that has none.
