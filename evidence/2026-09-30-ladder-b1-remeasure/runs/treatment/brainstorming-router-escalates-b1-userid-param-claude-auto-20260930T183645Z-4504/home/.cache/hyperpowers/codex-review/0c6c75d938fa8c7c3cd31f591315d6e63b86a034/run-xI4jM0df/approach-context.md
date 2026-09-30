# Approach Context

## Original request (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?**
A: "It should identify the actual person, persist, and work across the app; other
forms will need it later."

**Q: Should the new parameter be required or optional?**
A: Optional, last position (existing caller keeps working unchanged).

**Q: What establishes the user identity?**
A: Server-issued, stubbed for now — design the async server-issued shape, but have
the stub return a fake id until a real endpoint exists.

**Q: How should the user id persist?**
A: `sessionStorage` — survives page reload, cleared when the tab closes.

**Q: How is the identity shared with other forms?**
A: Not yet answered; under discussion. The `file://` vs dev-server tradeoff for ES
modules is known to the partner.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `package.json`, `README.md`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean tree.

`package.json` (complete):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts, no build step, no test runner, no
linter config, no bundler. No `type` field, so Node treats `src/` as CommonJS.

`app.js` (complete, 28 lines):

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

`index.html` (complete):

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

`src/index.js` and `src/utils.js` are an unrelated Node CommonJS program
(`greet(name)` returning a template string, called from `main()`). They are never
loaded by the browser and share no code with `app.js`.

Additional facts:

- `login` currently has exactly one call site: the submit handler in `app.js`.
- `login` is synchronous and performs no network I/O. `API_ENDPOINT` is declared but
  never used.
- There is no session, no storage access, no cookie use, and no auth code anywhere
  in the repository.
- `app.js` is loaded with a classic `<script src>` tag, not `type="module"`. There
  is no module system on the browser side.
- There is only one form in the application today. The partner states more forms
  will need the user id later; those forms do not exist yet.
- No server, no API mock, and no local dev server are configured in the repo.

## What to produce

Approaches for introducing a persisted, server-issued user identity that the login
function accepts as an optional trailing parameter and that future forms in this
app can consume.
