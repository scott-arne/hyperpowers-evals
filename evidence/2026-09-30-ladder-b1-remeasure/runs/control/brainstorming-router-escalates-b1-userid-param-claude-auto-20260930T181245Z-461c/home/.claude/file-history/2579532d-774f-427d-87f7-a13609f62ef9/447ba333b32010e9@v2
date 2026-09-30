# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where should the userId come from?**
A: The server returns it. `login()` POSTs to the API and reads `userId` from
the response.

**Q: What should "track" actually do with it?**
A: Send it to an analytics endpoint on successful login.

**Q: Do the login and analytics endpoints exist yet?**
A: Neither exists. Stub both behind a seam: define the expected contract,
build against fakes, leave one swap point for real URLs.

**Q: Set up test tooling as part of this work?**
A: Yes — add a minimal test runner plus a first passing test, so the async
login and the tracking call are verifiable.

## Codebase facts

Repository is a small static webapp fixture. Complete file list (excluding
`.git`): `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`.

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

`src/index.js` and `src/utils.js` are an unrelated CommonJS `greet('world')`
demo. `src/index.js` requires `./utils` and calls `main()` at module load.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Constraints and existing patterns:

- No dependencies, no `node_modules`, no lockfile, no `scripts` block.
- No test runner, no linter, no formatter, no CI configuration.
- No build step and no bundler. `app.js` is loaded directly by `index.html`
  as a plain browser script; it is not a module and exports nothing.
- Two module systems coexist: `app.js` is browser globals, `src/` is
  CommonJS. Nothing imports `app.js`.
- `login` is synchronous today and never performs network I/O. The
  `API_ENDPOINT` constant is declared but unused.
- `login` already receives `username`; the form collects only username and
  password. Nothing in the repo produces a user identifier of any kind.
- The submit handler is registered at module load against
  `document.getElementById("login-form")`, with no DOM-ready guard.
- Git: branch `feature/webapp-enhancement`, clean working tree.

## Output format required

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
