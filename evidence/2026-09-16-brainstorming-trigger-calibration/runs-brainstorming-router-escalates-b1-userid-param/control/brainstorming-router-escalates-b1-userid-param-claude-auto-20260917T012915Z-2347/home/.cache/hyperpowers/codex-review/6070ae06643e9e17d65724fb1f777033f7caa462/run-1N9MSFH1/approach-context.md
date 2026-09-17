# Approach Context: userId tracking in a small webapp

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

1. **Where should the userId value come from?**
   Answer: The caller supplies it. It should work across the app, it should
   persist, and other forms will need it later.

2. **What kind of identifier is userId — an authenticated identity, or a
   client-side tracking id?**
   Answer: Server-issued, post-auth. The login API returns the real user id
   after authenticating.

3. **What does "track who logged in" actually need to produce?**
   Answer: Console logs only. No network sink, no event schema, no backend
   contract, no in-app audit UI.

4. **How long should the stored userId persist?**
   Answer: `sessionStorage` — survives reloads and navigation within the tab,
   cleared when the tab closes.

5. **How should the shared session module be loaded?**
   Answer: Classic `<script>` tag exposing a single global namespace object.
   Not ES modules, not a dual CommonJS/browser module.

## Codebase facts

Repository is a minimal fixture. Full file inventory: `README.md`,
`index.html`, `app.js`, `package.json`, `src/index.js`, `src/utils.js`.

`package.json` — name `drill-test-project`, `"main": "src/index.js"`. No
dependencies, no devDependencies, no scripts. No test runner, no linter, no
bundler, no build step configured anywhere in the repo.

`index.html` — a single page. Contains `<form id="login-form">` with
`<input type="text" id="username">`, `<input type="password" id="password">`,
and a submit button. Loads scripts with exactly one tag:
`<script src="app.js"></script>` — a classic script, no `type="module"`,
no `defer`.

`app.js` — a classic browser script, not a module. No `require`, no `import`,
no `export`. Contents:

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

`login()` is synchronous and stubbed — it never contacts `API_ENDPOINT`. It
has exactly one call site, the submit handler in `app.js`. There is no
`userId` string anywhere in the repository. There is no logout path, no
session concept, no storage access (`sessionStorage`/`localStorage` appear
nowhere), and no second page or second form yet.

`src/index.js` and `src/utils.js` are CommonJS Node files
(`require('./utils')`, `module.exports = { greet }`) implementing a `greet`
function and a `main()` that prints to the console. Nothing in `src/` is
loaded by `index.html`, and nothing in `app.js` references `src/`. The two
module worlds are disjoint today.

## Constraints to design within

- Browser side stays classic scripts; no bundler and no build step may be
  introduced. The app must remain openable without a server.
- Tracking output is `console` only.
- The stored identifier lives in `sessionStorage`.
- The identifier is issued by the server as part of authentication, so it
  does not exist before a successful login.
- The design must accommodate additional forms/pages reading the same
  identifier later, without those pages duplicating storage access.
- Existing behavior of `validateForm` and the submit handler's validation
  path should be preserved.

## What to produce

Independent candidate approaches for structuring this — how the identifier
flows from authentication into storage into tracked log output, where each
responsibility lives, and how future consumers read it.
