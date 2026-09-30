# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where does the userId come from?**
A: "The server returns it. Yes, it should persist, work across the app, and
other forms will need it later."

**Q: What does "across the app" mean structurally — separate HTML pages, or
views inside one page?**
A: Not decided yet. (Design for the multi-page superset: must survive full
page loads.)

**Q: What is the stored userId used for — display/tracking only, identity that
later forms submit and the server trusts, or is a session token stored
alongside it?**
A: Display and tracking only. Non-secret. The server re-derives real identity
from its own session. No credential is stored client-side.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
working tree.

`app.js` (the whole browser side, 28 lines):

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

Constraints and existing patterns:

- `login` is a stub. It performs no network call; `API_ENDPOINT` is declared
  but never used. There is no real server response today.
- `login` is called from exactly one site, `app.js:23`.
- `app.js` is loaded by `index.html` via a plain `<script src="app.js">` tag
  at the end of `<body>`. Everything in it is a top-level global. There is no
  module system on the browser side, no `type="module"`, and no bundler.
- `index.html` is the only HTML document. Its form has exactly two inputs
  (`#username`, `#password`) and a submit button. No field could supply a
  user id today.
- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
  (`require('./utils')`, `module.exports`) exposing a `greet` function. They
  are unrelated to the browser app and are not loaded by `index.html`.
- `package.json` declares `main: "src/index.js"` and has no `scripts`, no
  `dependencies`, and no `devDependencies`. There is no test runner, no
  linter, and no formatter configured anywhere in the repo.
- There are no tests of any kind in the repository.
- Recent commits: "Add simple webapp fixture", "add entry point", "add utils
  module", "initial commit".

## What to propose approaches for

How to make a server-returned, non-secret user id available to the login flow
and to future forms/components across the app, given the repo state above,
including where that value lives, how it survives page loads, and how future
consumers reach it.
