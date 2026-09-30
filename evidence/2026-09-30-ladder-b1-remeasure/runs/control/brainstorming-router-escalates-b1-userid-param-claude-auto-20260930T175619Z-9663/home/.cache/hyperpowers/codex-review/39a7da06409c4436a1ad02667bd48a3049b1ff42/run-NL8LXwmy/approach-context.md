# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where should userId come from, and how far should "track" go?**
A (user's own words): "Tracking should persist, and it should work across the
app — other forms will need it later too."

**Q: Where do tracked events get persisted?**
A: A backend endpoint. Events are POSTed to a server.

**Q: Does a tracking endpoint exist on the backend today?**
A: No. The wire contract must be defined as part of this design; the client is
built against it, and the server-side implementation is separate work outside
this repository.

**Q: How does the tracking module learn who the current user is?**
A: An `identify(userId)`-style call on successful login records the current
user; later `track(...)` calls attach that identity automatically, so
individual call sites do not plumb a user id.

**Q: If sending a tracking event fails, what should happen to the login?**
A: The login must not wait on tracking and must not fail because of it.
Delivery errors should still be visible (logged) rather than silently
swallowed.

## Codebase facts

Repository is a minimal static webapp. Full file inventory (excluding `.git`):
`index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`,
`src/utils.js`.

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There are no dependencies, no devDependencies, no scripts, no test runner, no
linter, no bundler, and no build step configured.

`app.js` (complete):

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

Relevant facts about the existing code:

- `login` is synchronous and a stub. It performs no network call. It logs the
  username and returns `{ success: true, user: username }`. It never fails and
  has no failure branch.
- `API_ENDPOINT` is a placeholder (`https://api.example.com/login`) and is
  never referenced by any code.
- `login` has exactly one call site: the form submit handler in the same file.
- `app.js` is loaded via a plain `<script src="app.js">` tag in `index.html`.
  There are no ES modules in the browser code; `app.js` declares bare
  top-level functions in global scope.
- `src/index.js` and `src/utils.js` are a separate, unrelated CommonJS
  (`require`/`module.exports`) Node entry point. They do not interact with
  `app.js` and are not loaded by `index.html`.
- The project therefore currently mixes two module conventions: global-scope
  browser script (`app.js`) and CommonJS (`src/`).
- The login form (`index.html`) collects only `username` and `password`. No
  user id exists anywhere in the client at the time `login` is called.
- There is no session layer, no user store, no storage of any kind, no
  analytics/telemetry/logging module, and no existing error-reporting path
  beyond `console.log` / `console.error`.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## Requirements to design against

1. A tracking capability that persists events to a backend endpoint.
2. Reusable across the app — other forms will emit tracking events later; the
   login form is the first consumer, not the only one.
3. Identity is established once at login and attached to later events
   automatically.
4. Event delivery must never block or fail the user-facing action, but
   delivery failures must remain visible.
5. The wire contract for the endpoint must be specified by this design.
6. Failed login attempts have no user id available (authentication is what
   produces it), so the event schema must handle events with no identity.

## Task

Propose 2-3 genuinely different architectures, module boundaries, and data
models for this tracking capability in this codebase, given the constraints
above. Consider at minimum: how the module is loaded and shared given the
current no-build, global-script setup; the transport mechanism; the event
schema and envelope; where identity state lives and how it is reset; and how
testability is achieved in a project with no test infrastructure.
