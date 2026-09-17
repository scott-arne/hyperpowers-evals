# Approach Context: user preferences storage

## Original idea (verbatim)

"Add user preferences storage so settings persist across sessions."

## Clarifying questions and the human partner's answers

**Q1. Which half of the repo should own persistent preferences?**
Options offered: browser/localStorage; Node/JSON config file; both via a
storage-agnostic core with pluggable backends.
**Answer: Browser / localStorage.** Preferences live in the webapp and persist
across tab closes. Per-browser, no cross-device sync.

**Q2. What should the change include beyond the storage module itself?**
Options offered: plumbing plus two real preferences; plumbing plus one; plumbing
only with no callers.
**Answer: plumbing plus both preferences** — a "remember my username" preference
(prefills the username field on return) and a light/dark theme toggle, wired
into the existing page. Constraint stated and accepted: the password is never
persisted; "remember me" covers the username field only.

**Q3. What tooling should the change set up?**
Options offered: node:test with a hand-written localStorage fake; Vitest +
jsdom; ESLint + Prettier; no tooling.
**Answer: node:test plus a hand-written localStorage fake.** Zero new runtime or
dev dependencies. A linter was explicitly deferred.

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`,
and `src/` (`src/index.js`, `src/utils.js`). Git branch
`feature/webapp-enhancement`; working tree clean. Four commits total; the most
recent is "Add simple webapp fixture".

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `dependencies`, no `devDependencies`, no `scripts`, no `type` field. No
lockfile, no `node_modules`, no build step, no bundler, no test runner, no
linter or formatter config anywhere in the repo.

`index.html` in full:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Simple Webapp</title>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script src="app.js"></script>
</body>
</html>
```

`app.js` in full:

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

`src/index.js` in full:

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` in full:

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Relevant structural facts and constraints:

- The browser half (`index.html` + `app.js`) and the Node half (`src/`) are
  entirely disconnected. Nothing imports across them.
- `app.js` is loaded via a plain `<script src="app.js">` tag — no module type,
  no bundler. Its functions are plain top-level declarations on the global
  scope. `src/` uses CommonJS (`require` / `module.exports`).
- Any module that must be both loaded by the browser page and unit-tested under
  `node --test` has to bridge these two module systems, since the page has no
  build step to do it.
- `login()` is a stub that does not perform any network call; it returns a
  literal success object. There is no server, no session token, no user record.
- No persistent state of any kind is read or written anywhere in the repo today.
- There is no existing settings screen, settings object, config file, or
  preferences concept to extend. This subsystem starts from nothing.
- The existing code style is 2-space indent, double-quoted strings in `app.js`,
  single-quoted in `src/`, semicolons throughout, `function` declarations rather
  than arrow consts for named functions.
- The theme preference implies some styling must exist to switch between; the
  page currently has no CSS at all, inline or linked.

## Requested output

Propose 2-3 genuinely different approaches for structuring this preferences
storage subsystem. Consider, among whatever else you judge relevant: how
preference data is laid out in localStorage; how the module is shaped so it is
usable by both the un-bundled browser page and `node --test`; how defaults,
unknown/corrupt stored values, and unavailable storage are handled; and how
schema evolution is handled if preference keys change later.
