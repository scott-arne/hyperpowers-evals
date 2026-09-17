# Approach Context

## The original idea, verbatim

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: What does "track who logged in" need to actually do here?**
A: "It should work across the app, and it should persist. Other forms will need it later too."

**Q: Where should the userId come from?** (options offered: client-generated / server-issued / derived from username / client-now-server-later)
A: Client-generated — the app mints an opaque id and reuses it.

**Q: How should the userId persist?** (options offered: localStorage / cookie / sessionStorage)
A: localStorage.

**Q: Does this need a consent gate and a way to clear the id?** (options offered: design it in / note it as a gap / out of scope)
A: Yes, design it in — no id is created before consent, and there must be a documented way to clear it.

**Q: What should this first spec cover?** (options offered: identity only / identity + event recording)
A: Identity only. Event recording stays as-is and gets its own spec once a real endpoint exists.

**Q: How does the user give consent?** (options offered: simple banner / API only / reuse existing mechanism)
A: A simple accept/decline banner in the existing page.

## Codebase facts

Repository is a small static webapp fixture. Full file inventory (excluding `.git`):
`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`, `src/utils.js`.

No build step, no bundler, no module system in use. `index.html` loads `app.js`
with a plain `<script src="app.js">` tag. No `type="module"` anywhere.

No test framework, no test files, no test script. `package.json` is:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Note `package.json` declares `main: src/index.js`, but `index.html` does not
load anything from `src/`. The browser app is `app.js` only.

No dependencies of any kind. No linter or formatter configured.

`app.js` in full (29 lines):

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

`API_ENDPOINT` is never fetched; `login` is a stub returning a hardcoded object.
There is no server component in this repository and no auth backend.

`login` is called exactly once, from the submit handler above. Nothing else in
the repo references it. The submit handler reads only `username` and `password`
from the DOM; no identifier distinct from the username exists anywhere today.

All functions in `app.js` are declared at top-level script scope (implicit
globals), which is the existing pattern.

## Constraints derived from the answers

- The identifier must be readable and writable from anywhere in the app, and
  future forms (which do not exist yet) are expected consumers.
- It must survive page reload and browser restart.
- It must not exist before consent is granted, which means consumers must
  handle the "no identifier" state.
- There must be a way to clear it.
- Only the identity mechanism plus threading it into `login` is in scope.
