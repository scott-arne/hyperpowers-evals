# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

1. **Where should userId live on the login function — returned by it, passed as a parameter, or handled by a separate tracking call?**
   Answer: passed as a parameter, as originally asked.

2. **Where does the caller get the userId to pass in? (offered: client-generated correlation ID, a new form field, reuse the username)**
   Answer, in their own words: "It should identify the person and work across the app — it should persist, and other forms will need it later."

3. **Where does the persistent person-identifying userId originate — server-issued and stored by the client, supplied by the person at login, or a browser-scoped ID promoted at login?**
   Answer: the server issues it. Noted explicitly to them that this means the value does not exist until login returns.

4. **How long should the stored userId persist — sessionStorage, localStorage, or in-memory only?**
   Answer: sessionStorage.

5. **What should "track who logged in" deliver in this increment — availability to other forms only, plus a local event log, or plus sending events to a backend?**
   Answer: availability only. No event recording in this increment.

## Codebase facts

Repository is a minimal test project. Current branch `feature/webapp-enhancement`, working tree clean.

Complete file inventory (excluding `.git`): `index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`, `src/utils.js`.

`app.js` (28 lines, browser, loaded via a plain `<script src="app.js">` tag — no module system, no bundler, no imports/exports):

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

`index.html` (15 lines): a single `#login-form` with `#username` (text) and `#password` (password) inputs and a submit button; loads `app.js` via a non-module script tag. No other pages or forms exist.

`src/index.js` and `src/utils.js`: an unrelated Node/CommonJS pair (`require('./utils')`, `module.exports = { greet }`). They are not loaded by the browser app and share no code with `app.js`. `package.json` declares `"main": "src/index.js"`, has no `"type"` field, no dependencies, no scripts, and no test runner.

There is no test infrastructure, no linter/formatter config, no build step, no state management, no storage layer, and no router in the repository.

`login()` is a stub: it does not call `API_ENDPOINT`; it synchronously returns `{ success: true, user: username }`. There is no real backend to issue a user ID today. It has exactly one caller, the submit handler in the same file.

## Constraints

- The server-issued user ID must be persisted in `sessionStorage` and readable by other forms that do not exist yet.
- This increment delivers availability of the ID only; no login-event recording.
- The human partner asked for `userId` as a parameter to the login function, and was told the server-issued choice conflicts with that literal shape.

## Your task

Propose 2-3 genuinely different viable architectures for making a server-issued
user identity available across this app, given the constraints above. Address
how the stubbed, synchronous `login()` and the absent module system affect the
design, and how the design should treat the human partner's original
"userId as a parameter to login" framing.
