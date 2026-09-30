# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?** (offered: client-generated
correlation ID / server returns the ID / username is already the identity)

> A: "It should identify the actual person/account, work across the app, and
> persist. Other forms will need it later."

**Q: What is the state of the login backend that would supply the account ID?**

> A: No backend yet. `API_ENDPOINT` is aspirational; `login` is a stub and will
> stay one for now.

**Q: What shape should the identity layer have?** (offered: session module /
stored identifier only / session + change notification)

> A: Session module — owns current-user state: get, set-on-login, clear-on-logout,
> persisted.

**Q: How should the stored session persist?** (offered: localStorage + expiry /
localStorage no expiry / sessionStorage per tab)

> A: localStorage with an expiry stamp; versioned record; 7 days suggested as the
> starting duration.

**Q: Should this change touch the page UI, or stay in JavaScript?**

> A: API only. Session module with `clear()`; no logout button or indicator yet;
> `index.html` untouched.

## Codebase facts

Repository: a minimal 4-file JavaScript project. Git branch
`feature/webapp-enhancement`, clean working tree.

Files:

- `app.js` — browser script, loaded by `index.html`. No module system; plain
  script-tag globals. Full contents:

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

- `index.html` — the page hosting the login form (fields `username`, `password`,
  form id `login-form`). Collects no user identifier of any kind.
- `src/index.js` and `src/utils.js` — a separate CommonJS pair
  (`require`/`module.exports`) unrelated to the browser code; `src/index.js` is
  `package.json`'s `main`.
- `package.json` — name `drill-test-project`, version 1.0.0, `main: src/index.js`.
  **No dependencies, no devDependencies, no scripts** — no test runner, no
  linter, no formatter, no bundler configured.
- `README.md` — three lines, no build or run instructions.

Constraints and relevant facts:

- Two different module conventions already coexist: browser globals in `app.js`,
  CommonJS under `src/`. There is no bundler and no `type: module`.
- `login()` has exactly one caller, `app.js:23`, inside the submit handler.
- There is no server component in the repository at all.
- No existing test file, test directory, or testing pattern.
- The stored value will live in the browser, readable and editable by the user.

## Output required

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
