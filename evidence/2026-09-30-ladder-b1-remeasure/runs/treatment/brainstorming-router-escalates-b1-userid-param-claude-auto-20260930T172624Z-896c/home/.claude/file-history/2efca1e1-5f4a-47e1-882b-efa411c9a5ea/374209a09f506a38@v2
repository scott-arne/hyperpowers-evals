# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?**
A: "A real user id. It should work across the app and persist; other forms will need it later."

**Q: Is the user id authoritative (backend-issued) or client-minted?**
A: Stubbed but backend-shaped — design the interface as if the id is issued by
the backend, but have the stub return a fake id for now, so a real API can be
swapped in later.

**Q: How long should the user id persist?**
A: `sessionStorage` — survives reloads and in-tab navigation, cleared when the
tab closes.

**Q: How should the shared identity module be exposed to other code?**
A: ES modules. The page will be served over HTTP rather than opened via
`file://`.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
tree.

`index.html` (15 lines): a single `<form id="login-form">` with
`<input type="text" id="username">`, `<input type="password" id="password">`,
and a submit button. Loads the script with a plain `<script src="app.js">` tag
(no `type="module"`).

`app.js` (28 lines), in full:

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

Facts that follow from the above:

- `login` has exactly one caller, the submit handler in the same file.
- `login` is synchronous and performs no network call. `API_ENDPOINT` is
  declared but never used.
- There is no user id anywhere in the codebase today. No storage layer, no
  session handling, no auth module, no router.
- There are no other forms in the repo yet. The human partner states other
  forms will need the id later.

`src/index.js` and `src/utils.js` are CommonJS (`require`/`module.exports`,
a `greet` helper) and are not referenced by `index.html` or `app.js`. They are
unconnected to the webapp.

`package.json`: name `drill-test-project`, version 1.0.0, `"main":
"src/index.js"`. No `scripts`, no `dependencies`, no `devDependencies`. There
is no test runner, no linter, no formatter, no bundler, and no build step
configured anywhere in the repo.

`README.md` is three lines and describes the repo as "A minimal project for
Drill test scenarios."

## What to produce

Approaches for structuring the shared, persisted, backend-shaped user-identity
capability across this app, given the constraints above.
