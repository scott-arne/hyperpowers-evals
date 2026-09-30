# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where does the userId come from?**
A: "A userId param on login. It should work across the app; other forms will
need it later."

**Q: What does "track" mean here?**
A: Real analytics/audit trail.

**Q: What is the audit trail actually for? (drives retention, PII handling,
delivery reliability)**
A: Security / compliance.

**Q: Do we control the service at API_ENDPOINT that actually authenticates?**
A: Yes, we own it.

**Q: What should this design cover?**
A: This repo only (design the frontend piece against an assumed backend
contract).

**Q: Existing audit-event schema or log sink to conform to?**
A: Nothing yet, greenfield.

## Codebase facts

Repository root contains: `index.html`, `README.md`, `package.json`, `app.js`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`,
working tree clean.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There are no dependencies, no devDependencies, and no `scripts` block. No test
runner, no linter, no formatter, no bundler, no framework are configured. There
is no `node_modules`, no lockfile, and no CI configuration.

`app.js` in full:

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

Notes on `app.js`:

- `login` is a stub. It performs no network call; the comment states a real app
  would POST to `API_ENDPOINT`. It is synchronous and returns a literal object.
- `login` has exactly one call site: the submit handler in the same file.
- The submit handler reads `username` and `password` from the DOM. No other
  identifier is available at the call site.
- Nothing anywhere in the repository produces, stores, or reads a value named
  `userId` or any equivalent user identifier.
- `app.js` is a browser script loaded as a plain global script; it uses no
  module system. `src/` uses CommonJS (`require`/`module.exports`) and is a
  separate, unrelated Node entry point (`src/index.js` prints a greeting).
- There is no HTTP client, no fetch wrapper, no request interceptor, no
  application state container, no session or storage layer, and no logging
  abstraction.
- There is currently exactly one form in the app (the login form in
  `index.html`). The stated expectation is that other forms will exist later
  and will also need to attach user identity.

`src/utils.js` exports a single `greet(name)` function. `src/index.js` calls it.
Neither relates to authentication.

## Constraints stated by the human partner

- The audit trail's purpose is security/compliance.
- The authenticating backend at `API_ENDPOINT` is owned by us, but the design
  scope is limited to this repository; the backend is not being designed here.
- The audit event schema is greenfield.
- The mechanism must work across the app, not only the login form, because
  other forms will need it later.
