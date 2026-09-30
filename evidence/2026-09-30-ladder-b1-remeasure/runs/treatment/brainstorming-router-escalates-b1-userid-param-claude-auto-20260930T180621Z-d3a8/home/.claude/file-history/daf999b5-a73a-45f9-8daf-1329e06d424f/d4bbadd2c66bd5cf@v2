# Approach Context

## Original request (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

**Q: Where does the userId value come from?** (options offered: from the API
response; client-generated correlation ID per attempt; an existing source
elsewhere in the app)

A: "Your recommendation is fine. It should work across the app and persist;
other forms will need it later." — i.e. the userId comes from the login API
response, and must additionally be stored so other pages/forms can read it
later.

**Q: What will the persisted userId be used for?** (options: correlation /
analytics; session / auth identity; both eventually)

A: Correlation / analytics. Nothing authorizes off it. A real auth session, if
ever needed, is a separate later design.

**Q: How long should the stored userId survive?** (options: sessionStorage;
localStorage; in-memory only)

A: sessionStorage — must reach other pages in the same tab, must not persist
past tab close.

## Codebase facts

Repo is a tiny static web app plus an unrelated Node entry point.

Files (complete list, excluding .git):
- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

`app.js` (complete contents):

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

`index.html` (complete contents):

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

Constraints and existing patterns:
- No bundler, no module system, no framework, no router. `app.js` is loaded
  via a plain `<script src="app.js">` tag and defines global functions.
- `src/index.js` / `src/utils.js` are a separate CommonJS Node entry point
  (`package.json` `"main": "src/index.js"`) using `module.exports` / `require`.
  They are unrelated to the browser app and share no code with `app.js`.
- `package.json` declares no dependencies, no scripts, and no test runner.
  There is no test infrastructure of any kind in the repo.
- `login()` is currently a synchronous stub. It does not call `API_ENDPOINT`;
  it returns a hardcoded `{ success: true, user: username }`.
- The only caller of `login()` is the submit handler in `app.js`.
- "Other forms will need it later" refers to pages/forms that do not exist in
  the repo yet.

## What to produce

Independent approaches for: making the login API response's userId available
to the rest of this app, persisted in sessionStorage, for correlation/analytics
logging, given the constraints above.
