# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: What should `userId` actually be, given the form has no user identifier
before authentication?**

A (verbatim): "A real user identifier that identifies who logged in. It should
work across the app, it should persist, and other forms will need it later."

**Q: Where does the persistent user identifier come from?**

A: Server-issued — the backend authenticates and returns the canonical user ID
on successful login. The endpoint does not exist yet, so the response contract
has to be defined against a stub.

**Q: How long should the stored user identifier persist?**

A: `sessionStorage` — survives page reloads and in-tab navigation, cleared when
the tab closes, not shared between tabs.

**Q: How should the shared identity module be wired into the browser app?**

A: ES modules — `export`/`import` with `<script type="module">`. No bundler, no
new dependencies. Accepted consequence: the page must be served over HTTP
rather than opened via `file://`.

**Q: What surface should the identity module expose?**

A: Minimal — set on login, get synchronously, clear on logout. No change
notification/subscription, no automatic attachment of the ID to outbound
requests.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `package.json`, `README.md`,
`src/index.js`, `src/utils.js`. Total ~64 lines of code. Git branch
`feature/webapp-enhancement`, working tree clean.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts, no build step, no test runner,
no linter or formatter config anywhere in the repo.

`app.js` in full (28 lines, plain browser script, no module system):

```javascript
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

Facts about `login`: it is synchronous, performs no network call, and
fabricates its return value. `API_ENDPOINT` is referenced only in the comment.
There is exactly one call site, at `app.js:23`. Nothing reads the return value
beyond a `console.log`.

`index.html` in full (15 lines):

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

There is no `userId` field in the form, and the string `userId` does not appear
anywhere in the repository. There is no logout control anywhere in the UI.

`src/index.js` and `src/utils.js` are CommonJS Node files using
`require`/`module.exports`; `src/utils.js` exports a `greet(name)` function and
`src/index.js` calls it from a `main()`. They share no code with `app.js` and
are not loaded by `index.html`.

## The design question

Given the decisions above, propose approaches for introducing a persistent,
server-issued user identity that is established at login, stored in
`sessionStorage`, exposed through a minimal ES-module interface, and consumable
by browser forms that do not exist yet — including how `login` itself should
change shape, how the not-yet-existing server response contract should be
represented while the endpoint remains a stub, and how this should be tested in
a repo that currently has no test infrastructure.
