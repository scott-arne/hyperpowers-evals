# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where does the userId come from? (login returns it / caller passes it in / build login tracking)**
A: "We want to know who logged in, and it should persist. It should work across the app, and other forms will need it later."

**Q: What does the rest of the app need the identity for — attribution only (other forms stamp submissions with who sent them), or access state (views gate on logged-in status, logout exists, expiry handling)?**
A: "Attribution for now — other forms need to know who submitted. Keep it simple."

**Q: What value gets stored as the identity — username only, a record `{ id, username }` with id defaulting to the username, or a real server-issued id (implementing the API call now)?**
A: Record `{ id, username }`, where `id` is the username today and becomes a server-issued id later. Consumers read `.id`.

**Q: How long should the identity persist — session storage (clears on tab close), local storage (survives browser restart), or in-memory only?**
A: Session storage.

**Q: How is the page loaded during development — from disk via `file://`, or served over http?**
A: "Not sure / whatever is simpler." The decision is delegated; the chosen approach should state which tradeoff is being accepted.

## Codebase facts

Repository is a minimal static webapp. Full file list (excluding `.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

### `app.js` (complete contents)

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

### `index.html` (complete contents)

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

### `package.json` (complete contents)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### `src/utils.js` and `src/index.js`

```js
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}
module.exports = { greet };
```

```js
// src/index.js
const { greet } = require('./utils');
function main() {
  console.log(greet('world'));
}
main();
```

### Constraints derived from the above

- `app.js` is loaded by a **classic** `<script src="app.js">` tag. There is no
  `type="module"`, no bundler, no build step, and no dev server.
- `package.json` declares no `scripts`, no dependencies, and no dev
  dependencies. There is no test runner and no lint/format tooling configured.
- `src/` uses CommonJS (`require`/`module.exports`) but is a separate Node
  entry point; `index.html` never loads it. The page and `src/` share no code
  today.
- `login` is a stub: it never calls `API_ENDPOINT`. There is no network layer,
  no error handling, and no server-issued identifier available anywhere.
- There is exactly one caller of `login`, the submit handler in `app.js`.
- No `userId` value exists anywhere in the repository today.
- Attribution-only scope means **no logout** is being built, so nothing in the
  app will clear a stored identity.
- The "other forms" that will consume the identity do not exist yet; none of
  their files, pages, or submission paths are present in the repo.

## What is wanted

2-3 genuinely different approaches for structuring a persisted, app-wide
"who is logged in" identity for this codebase, given the answers and
constraints above, including how the store is shared with future forms and
how it can be tested.
