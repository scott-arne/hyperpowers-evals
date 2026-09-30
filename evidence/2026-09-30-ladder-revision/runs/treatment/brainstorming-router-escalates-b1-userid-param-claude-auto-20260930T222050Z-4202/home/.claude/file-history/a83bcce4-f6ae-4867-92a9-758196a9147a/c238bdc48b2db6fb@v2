# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where does the userId value come from?**
A: It comes back from auth — the real user ID only exists after the API
authenticates, so tracking reads it from the login result rather than from a
new parameter.

**Q: What should "track who logged in" actually do with the value?**
A: Persist it somewhere.

**Q: Does login become a real authenticated API call, or stay a stub?**
A: Make it real and async — login fetches API_ENDPOINT and returns the
server's userId. The existing caller converts to async.

**Q: Where do login records get persisted?**
A: A tracking endpoint — POST `{userId, timestamp}` to a server endpoint on
successful login.

**Q: This project has no tests, linter, or formatter. Set any up?**
A: Neither — keep it dependency-free. `package.json` gains no dependencies.

## Codebase facts

Repository is a minimal static web fixture. Full file list (excluding `.git`):
`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`.

`app.js` (28 lines) — browser script, loaded by `<script src="app.js">` at the
end of `index.html`. Not a module: no `import`/`export`, no bundler, no build
step. Current contents in full:

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

`login` has exactly one caller, at `app.js:23`, inside the submit handler.

`index.html` (15 lines) — a form `#login-form` with `#username` (text),
`#password` (password), and a submit button. No other inputs, so no userId
exists client-side today.

`API_ENDPOINT` is `https://api.example.com/login` — a placeholder host. No
real auth service is configured, and no tracking endpoint URL has been
supplied yet.

`src/index.js` and `src/utils.js` are an unrelated CommonJS Node pair
(`greet`); they do not interact with `app.js`.

`package.json` declares no dependencies, no devDependencies, and no scripts.
`"main"` points at `src/index.js`. There is no test runner, no linter, no
formatter, and no CI configuration anywhere in the repo.

Git: branch `feature/webapp-enhancement`, clean tree.

## Constraints

- No new runtime or dev dependencies. Browser-native APIs only.
- No build step; `app.js` must remain a plain script the browser can load
  directly.
- Login records carry user identity, so storage exposure and failure behavior
  matter.
- The tracking endpoint URL is not yet known.

## What to produce

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
