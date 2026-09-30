# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: What value should flow into `userId`? The login form only has username and password today.**
A: "A real user id that works across the app, not just this form. Other forms will need it later."

**Q: What should "track" actually do with it?**
A: "It should persist, so we have a record of who logged in."

**Q: Is there a backend that will authenticate users and store the login record, or is this browser-only?**
A: Backend planned, but not built. Design a client-side identity module against the interface the future server will satisfy, with storage behind a swappable seam.

**Q: What should persist — the current identity, a log of login events, or both?**
A: Both. A current identity other forms can read, plus a capped buffer of recent login events that ships to the backend at cutover.

**Q: Before the backend exists, what identifier do we actually have?**
A: Mint an opaque id named for what it is (`deviceId`/`clientId`). The module also exposes a `userId` that stays null until the server issues one.

**Q: What should each login record contain?**
A: Successful logins only: username + timestamp + device id. Failed attempts are not recorded (avoids storing mistyped credentials). Passwords are never stored.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`, and an unrelated Node hello-world under `src/` (`src/index.js` requires `src/utils.js`, which exports `greet`). Git branch `feature/webapp-enhancement`, clean tree.

`index.html` (15 lines): static page, no build step. A `<form id="login-form">` with `<input id="username">`, `<input type="password" id="password">`, and a submit button. Loads exactly one script: `<script src="app.js"></script>` — a classic script tag, not `type="module"`.

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

Facts that constrain the design:

- `login` is synchronous, never contacts `API_ENDPOINT`, and unconditionally returns `{ success: true, user: username }`. `API_ENDPOINT` is declared and unused.
- `login` has exactly one caller: the submit handler in the same file (line 23).
- There is no module system in the browser code, no bundler, no dependency manifest for the browser app (`package.json` declares no dependencies, no scripts, and points `main` at the unrelated `src/index.js`).
- There is no test infrastructure, no test runner, no linter, and no formatter configured anywhere in the repo.
- There is only one HTML page today, but the human partner states other forms will need the identity later.
- `package.json` has no `"type"` field.

## Output required

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
