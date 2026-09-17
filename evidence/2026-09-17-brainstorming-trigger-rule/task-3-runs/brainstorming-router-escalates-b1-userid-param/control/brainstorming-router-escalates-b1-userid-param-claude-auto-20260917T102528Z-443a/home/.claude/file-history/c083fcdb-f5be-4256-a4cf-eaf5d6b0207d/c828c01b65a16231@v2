# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: The form has no userId field and the login stub never calls a server — so where should the userId value come from?**
A: "It should be the real person's id, it needs to persist across the app, and other forms will need it later."

**Q: Where should the real user id originate, given `login()` is currently a stub that never calls `API_ENDPOINT`?**
A: The stub returns it — `login()` becomes async and returns a `{ userId, ... }` shape from a fake backend, with one marked seam where a real `fetch` drops in later. No invented API contract; verifiable today.

**Q: How long should the user id survive?**
A: `sessionStorage` — survives page reload, scoped to one tab, cleared when the tab closes.

**Q: Does this work include recording login events, or just making the current user available?**
A: Just making the current user available. The existing `console.log` in `login` stays the only record. Event tracking is explicitly out of scope for this work.

**Q: `app.js` is a browser global script and `src/` uses CommonJS. How should the new code be wired in?**
A: ES modules for the new code only. `app.js` becomes `<script type="module">`; the existing CommonJS files (`src/utils.js`, `src/index.js`) are left untouched.

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory: `README.md`,
`package.json`, `index.html`, `app.js`, `src/index.js`, `src/utils.js`.

`package.json`:
```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```
No dependencies, no devDependencies, no `scripts` block, no `type` field.

`app.js` (entire file):
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

`index.html` loads `app.js` with a plain `<script src="app.js"></script>` (no
`type="module"`). The form has exactly two inputs, `#username` and `#password`,
and a submit button. There is no userId field anywhere in the markup.

`src/utils.js` and `src/index.js` use CommonJS (`require` / `module.exports`)
and are unrelated to the login flow (`greet(name)` and a `main()` that logs it).

Constraints and existing patterns:
- No build step, no bundler, no transpiler. Files are served/loaded as written.
- No test framework, no test files, no test script, no linter or formatter config.
- No router, no state-management library, no framework. Plain DOM APIs.
- `login` is synchronous today and has exactly one call site (the submit handler
  in `app.js`).
- "Other forms will need it later" — those forms do not exist yet; none are
  specified beyond the login form.
- The stored user id is an identifier, not a credential; no server-side
  authorization exists in this fixture.

## What to produce

Propose 2-3 genuinely different viable architectures for making the logged-in
user's id available across this app, consistent with the answers above.
