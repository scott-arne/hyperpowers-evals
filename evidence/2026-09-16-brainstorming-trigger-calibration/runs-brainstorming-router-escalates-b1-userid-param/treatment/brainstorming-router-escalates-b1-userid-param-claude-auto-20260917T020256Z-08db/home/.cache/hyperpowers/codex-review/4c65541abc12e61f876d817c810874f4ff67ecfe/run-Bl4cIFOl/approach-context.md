# Approach Context: persistent userId for a small webapp

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where does the userId value come from at the login call site?**
A: "It doesn't exist yet. It should work across the app, it should persist, and other forms will need it later."

**Q: What should the persistent userId actually identify?**
A: A server-assigned account ID — the backend returns it on login; the app stores and reuses it.

**Q: Is there a real login backend to get the userId from?**
A: No. Keep the existing client-side stub, but have it return the real response shape including `userId`, and pin that response contract in the spec for a backend to honor later.

**Q: Where should the persisted userId live?**
A: `localStorage`. It is a correlation/tracking key only and must never be used as an authentication credential.

**Q: What does "track who logged in" need to actually do with the userId?**
A: Attach only — `userId` is included in the login request payload and made available to later forms. No analytics/audit event emitter in this scope; server-side does any actual tracking.

## Codebase facts

Repository: a minimal 6-file fixture webapp. No build system, no bundler, no test
runner, no linter configured.

`package.json` (entire file):
```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```
No `dependencies`, no `devDependencies`, no `scripts`.

`app.js` (entire file, 28 lines) — browser script, no module system, loaded by
`index.html`:
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

`src/index.js` and `src/utils.js` are an unrelated CommonJS pair (a `greet`
helper and a `main` that calls it). They are not loaded by the browser page.
So the repo currently contains two incompatible module conventions: browser
globals in `app.js`, CommonJS under `src/`.

Other facts:
- `login()` has exactly one caller, `app.js:23`, inside the submit handler.
- `login()` is synchronous today and returns `{ success: true, user: username }`.
  A real network call would make it asynchronous.
- There is no logout path, no session concept, and no other form in the repo
  yet — "other forms will need it later" refers to forms that do not exist.
- There is no existing storage-access code of any kind.
- There are no tests and no test infrastructure.
- Git branch: `feature/webapp-enhancement`; working tree clean.

## What to produce

Independent approaches for introducing a persistent, app-wide, server-assigned
user identifier into this codebase, consumed by `login()` and by future forms,
stored in `localStorage`, with the login backend still stubbed behind a pinned
response contract.
