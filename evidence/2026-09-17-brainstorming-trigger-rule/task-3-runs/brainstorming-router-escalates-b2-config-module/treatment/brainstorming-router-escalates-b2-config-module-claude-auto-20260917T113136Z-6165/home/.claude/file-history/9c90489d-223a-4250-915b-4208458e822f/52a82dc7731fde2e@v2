# Approach Context

## Original idea (verbatim)

"Move the API endpoint config into a new settings module so it's easier to change environments."

## Clarifying questions and the human partner's answers

1. **Q: How should the app decide which environment's API endpoint to use?**
   (options offered: hostname detection; hand-edited constant; build-time injection)
   **A: Hostname detection** — the settings module maps `location.hostname` to a base URL.

2. **Q: How should the settings module be wired into the page?**
   (options offered: second `<script>` tag exposing a global; ES modules with `type="module"`; CommonJS in `src/`)
   **A: Second `<script>` tag exposing a global**, loaded before `app.js`. Rationale given: preserves zero-build setup and keeps `file://` working.

3. **Q: What shape should the settings map take?**
   (options offered: base URL per environment with a derived login path; full endpoint URL per environment)
   **A: Base URL per environment, with a derived `loginUrl`.**

4. **Q: What should happen when the hostname matches no known environment?**
   (options offered: fall back to production; fall back to local/dev; throw)
   **A: Fall back to production.**

5. **Q: Which environments should the map cover?**
   (options offered: local + staging + production; local + production; user supplies the list)
   **A: local + staging + production.** Real hostnames are not yet known and will be
   placeholders flagged as assumptions to confirm.

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`, `src/`.
Git branch `feature/webapp-enhancement`, working tree clean. 4 commits total.

### `app.js` (29 lines, browser, classic script — no module syntax)

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

Note: `API_ENDPOINT` is declared but never actually referenced in executable code —
`login()` is a stub that only mentions it in a comment.

### `index.html` (15 lines)

Loads the script as a classic script, not a module:

```html
  <script src="app.js"></script>
```

### `package.json`

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No bundler, no build step, no
linter or formatter config, no test runner, no CI config anywhere in the repo.

### `src/index.js` and `src/utils.js` (CommonJS, Node — unrelated to the page)

```js
// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();

// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };
```

Neither file contains API or endpoint configuration. Nothing in `src/` is loaded
by `index.html`.

### Constraints

- There is no existing test suite and no established testing pattern in the repo.
- The repo has two disjoint module worlds: a classic-script browser page and a
  CommonJS Node entry point.
- Project conventions in effect: make focused minimal changes, no broad refactors,
  match existing style, no extraneous Markdown files.
