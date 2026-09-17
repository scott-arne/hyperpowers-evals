# Approach Context

## Original request (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

1. **Where should the userId value come from?**
   Answer: "It should work across the app and persist; other forms will need it later too."

2. **How should the parameter be added to the signature?**
   Answer: Optional third parameter, defaulting to null, so existing calls keep working.

3. **What should this identifier actually represent?** (anonymous visitor ID /
   per-session ID / authenticated user ID / anonymous linked to user ID)
   Answer: Anonymous visitor ID — generated client-side on first visit, persists
   indefinitely, identical before and after login.

4. **How should the shared module be delivered?** (ES modules / plain global
   script / dual CommonJS+global / add a bundler)
   Answer: ES modules — `export`/`import`, `index.html` switches to
   `<script type="module">`, accepting that the page must be served over HTTP.

5. **What consumes the visitor ID once it exists?** (client-side only / request
   body / cookie / third-party analytics SDK)
   Answer: Client-side only for now. Nothing leaves the browser yet.

6. **Which tooling should be set up from the start?**
   Answer: lint + format, unit tests, and a static server script. End-to-end
   tests were not selected.

## Codebase facts

Repository: a 4-file static webapp fixture. Git branch `feature/webapp-enhancement`,
clean tree.

### `app.js` (28 lines, loaded by `index.html` via plain `<script src="app.js">`)

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

- `login()` is a stub. It never calls `API_ENDPOINT`; no `fetch` exists anywhere
  in the repo.
- `login()` has exactly one call site, `app.js:23`.
- `app.js` uses no module system: plain script, function declarations at top level.

### `index.html` (15 lines)

Form `#login-form` with two inputs, `#username` (text) and `#password`. No other
form exists in the repo. Loads `app.js` with a plain `<script src>` tag.

### `src/index.js` (7 lines) and `src/utils.js` (5 lines)

CommonJS (`require`, `module.exports`). `src/utils.js` exports a single `greet`
function. These files are **not** loaded by `index.html` — they are a separate
Node-side tree, unreferenced from the browser code.

### `package.json` (6 lines)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `scripts`, no `dependencies`, no `devDependencies`. There is no test runner,
no linter, no formatter, no bundler, and no build step in the repository. No
test files exist. No CI configuration exists.

### Other

`README.md` is 3 lines. No existing storage, analytics, logging, or tracking code
of any kind. No consent or privacy handling exists.

## What the design must cover

A shared, persistent anonymous visitor identifier available to `login()` today and
to other forms later, delivered as an ES module, consumed client-side only, with
lint/format, unit tests, and a static server script established as part of the work.
