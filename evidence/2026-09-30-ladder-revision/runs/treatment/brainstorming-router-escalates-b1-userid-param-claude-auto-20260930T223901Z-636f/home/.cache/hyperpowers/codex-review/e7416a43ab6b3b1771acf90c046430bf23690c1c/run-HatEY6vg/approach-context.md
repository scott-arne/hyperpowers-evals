# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where does userId come from, and what should "track who logged in" actually do?**
A: "It should work across the app and persist; other forms will need it later."

**Q: Which system are we actually building — a durable client-side identity, a
server-side audit trail of login events, or both staged?**
A: Durable identity (session). A userId established at login, stored
client-side, readable by any form in the app.

**Q: Where does the userId value come from?**
A: Server-issued. `login()` returns the userId in its result; the stub
fabricates that response shape until the real endpoint exists.

**Q: How long should the stored identity survive?**
A: `localStorage` — persistent across browser restart, shared across tabs.

## Codebase facts

Repository root contains:

```
README.md
app.js
index.html
package.json
src/index.js
src/utils.js
```

`package.json` (complete):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No test runner, no linter,
no formatter, no bundler, no build step, no CI configuration.

`app.js` (complete, 28 lines) — a plain browser script, not a module:

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

`index.html` (complete) — loads `app.js` via a classic `<script src>` tag, no
`type="module"`:

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

`src/index.js` and `src/utils.js` are an unrelated CommonJS Node module
(`greet(name)` and a `main()` that calls it). They are not loaded by
`index.html` and share no code with `app.js`.

Further facts and constraints:

- `login()` is synchronous today and has exactly one caller, `app.js` line 23.
- `API_ENDPOINT` is declared but never used; the POST is a stub comment.
- The app has exactly one page (`index.html`) and one form (`login-form`).
  The human partner states other forms will be added later and will need to
  read the identity.
- There is no logout control anywhere in the app, and no code that clears any
  stored state.
- There is no existing session, storage, auth, routing, or state-management
  layer of any kind.
- No existing module system on the browser side: `app.js` defines globals.
- Git branch is `feature/webapp-enhancement`; working tree clean.
