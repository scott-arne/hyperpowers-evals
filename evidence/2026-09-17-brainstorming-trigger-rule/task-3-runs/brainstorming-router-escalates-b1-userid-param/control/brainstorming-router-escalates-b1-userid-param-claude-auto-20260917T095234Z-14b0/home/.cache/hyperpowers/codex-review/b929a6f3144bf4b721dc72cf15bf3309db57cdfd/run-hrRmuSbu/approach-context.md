# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where does the userId value come from when login() is called?**
A: "Yes, it should work across the app, and it should persist. Other forms will need it later."

**Q: Who mints the userId — where does the value originate?**
A: Server, at login. The login API returns the id after authenticating; it is
authoritative and tied to a real account. The client caches it. `login`
receives the id rather than sending it.

**Q: How long should the userId persist?**
A: Per tab — `sessionStorage`. Survives reloads and in-page navigation, cleared
when the tab closes.

**Q: What consumes the userId — what does "track who logged in" mean here?**
A: Make it available to the app and log locally (console), matching the
existing stub. No outbound analytics destination and no fetch wrapper at this
time; a real destination may be added later.

## Codebase facts

Repo root contains: `index.html`, `app.js`, `README.md`, `package.json`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
tree.

`index.html` (15 lines): a single page. One form `#login-form` with inputs
`#username` and `#password` and a submit button. Loads exactly one script:
`<script src="app.js"></script>`. No module type attribute, no bundler, no
other pages.

`app.js` (28 lines), the whole file:

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

Facts about the current state:

- `login` is a synchronous stub. It never performs a network call;
  `API_ENDPOINT` is declared but unused. It returns
  `{ success: true, user: username }` unconditionally.
- There is exactly one form and one caller of `login` today. The stated
  expectation is that additional forms will need the id later.
- `app.js` is a classic script in global scope — no `import`/`export`, no
  bundler, no build step.
- `src/index.js` and `src/utils.js` use CommonJS (`require`/`module.exports`)
  and are a separate Node-side entry point (`package.json` `main` is
  `src/index.js`). They are not loaded by `index.html`. So the repo currently
  mixes two module conventions in two disconnected halves.
- `package.json` declares no dependencies, no scripts, no test runner, no
  lint/format configuration. There is no test file anywhere in the repo and no
  CI configuration.
- There is no storage, session, identity, or logging layer of any kind.
- No logout path exists anywhere in the codebase.

## What to produce

Approaches for introducing a server-minted, `sessionStorage`-backed user
identity that `login` populates and that other parts of the app (including
forms that do not exist yet) can read, in this codebase as it actually is.
Consider the module/loading strategy given the no-bundler classic-script
constraint, the shape of the identity store's interface, how `login` changes
given it is currently a synchronous stub of an inherently asynchronous
operation, and how any of this can be tested given there is no test
infrastructure.
