# Approach Context: login tracking

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where does the userId come from? The submit handler has only the two form
fields, so it has nothing to pass today.**
Decision: `login()` keeps its `(username, password)` signature. `userId` is not
an input parameter; it is surfaced in the returned object, resolved from the
auth response.

**Q: What should "track" actually do with it?**
Decision: a real tracking module — a separate module, not an inline
`console.log`. This is new structure in a repo that has no tracking layer.

**Q: Where should tracking events actually go?**
Decision: an async `track()` interface with a console sink behind it today, so
that swapping in a network transport later changes one file rather than every
caller. No backend endpoint exists. No third-party analytics SDK.

**Q: How is the app run; must `file://` keep working?**
Decision: convert to ES modules and serve the page over a local static server.
`file://` support is not required. No bundler.

**Q: Which login events should be emitted?**
Decision: successful logins and failed logins (rejected credentials).
Client-side validation rejects are NOT tracked. Identity is therefore nullable
on failure events, and a failure-reason field is needed. Passwords must never
appear in any event payload.

## Codebase facts

Repo is a 4-file test project. Git branch `feature/webapp-enhancement`, clean
tree.

`package.json` — no dependencies, no `scripts`, no test runner, no linter, no
formatter. `"main": "src/index.js"`.

`index.html` — 15 lines. Loads `<script src="app.js"></script>` (line 13, a
classic script, not `type="module"`). Contains `<form id="login-form">` with
`#username` (text) and `#password` (password) inputs and a submit button.

`app.js` — 28 lines, browser global script, no imports/exports:
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

`login()` is a synchronous stub. It never contacts `API_ENDPOINT`; it
unconditionally returns `{ success: true, user: username }`, so there is
currently no failure path and no real identity to report.

`src/index.js` and `src/utils.js` — CommonJS (`require` / `module.exports`),
Node-only, never loaded by the browser page. `src/utils.js` exports a single
`greet(name)`. These two files are unrelated to the login flow.

So the repo currently contains two incompatible module worlds: a browser
global script (`app.js`) and CommonJS (`src/`).

There is no existing tracking, telemetry, analytics, logging, or event module,
and no test file of any kind.

## Your task

Propose 2-3 genuinely different architectures for introducing the login
tracking capability described by the decisions above. Consider: where the
module boundary falls; how tracking is wired to the login flow; the event
schema and its nullable identity; how the sync stub interacts with an async
`track()`; how this is tested given there is no test infrastructure.
