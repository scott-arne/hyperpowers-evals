# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId come from — returned from `login()`, passed in as a
parameter, or is `username` already the identifier?**
A: Returned from `login()`. The function keeps its `(username, password)`
signature and the user id comes back in the result object.

**Q: What does "track" mean — local console logging in this stub, or something
that persists?**
A: "It should persist and work across the app — other forms will need it later."

**Q: What shape should the tracked user data take — a single current-user value,
an append-only event log, or both?**
A: A current-user store: one live value for who is logged in now, which other
forms read.

**Q: How long should the logged-in user persist — in-memory only, `sessionStorage`,
or `localStorage`?**
A: `sessionStorage`.

## Settled constraints from those answers

1. `login(username, password)` keeps its signature; the user id is part of what
   it returns.
2. The user id must survive page reload and navigation and be readable by other
   forms/pages that do not exist yet.
3. The data model is a single current-user value, not an event history.
4. The persistence medium is `sessionStorage`.

## Codebase facts

Repository is a minimal static web app. Full file list (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

### `index.html` (complete)

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

Note: `app.js` is loaded as a **classic script**, not `type="module"`. There is
no bundler, no build step, and no dev server configured.

### `app.js` (complete)

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

`login()` is a stub: it does not call `API_ENDPOINT`, it returns a hardcoded
success, and there is currently no source of a user id anywhere in the app.
`login()` has exactly one call site, the submit handler above.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no `scripts` block. No test runner, no
linter, no formatter is configured. There are no tests in the repository.

### `src/`

`src/index.js` and `src/utils.js` are a CommonJS `greet()` demo
(`module.exports = { greet }`) unrelated to the browser app; `app.js` does not
reference them. `package.json` `main` points at `src/index.js`.

So the repo currently mixes two module worlds: CommonJS under `src/` (Node) and
global-scope classic scripts for the browser page. Nothing shares code between
them today.

### Git

Branch `feature/webapp-enhancement`, clean working tree. Recent commits:
`df69c0e Add simple webapp fixture`, `30bc3c3 add entry point`,
`424fba3 add utils module`, `2c4adf4 initial commit`.

## What is being asked of you

Propose approaches for introducing a persistent current-user store that
`login()` populates and that other, not-yet-written forms across this app can
read, under the four settled constraints above.

Things the approaches need to have a position on:

- How the store is shared with other pages/forms given the classic-script,
  no-build-step loading in `index.html`.
- The store's public interface and where it lives on disk.
- Where the user id comes from, given `login()` is a stub with no real API.
- What happens on read when nobody is logged in, and how the store is cleared.
- What testability is achievable given there is no test infrastructure at all.
