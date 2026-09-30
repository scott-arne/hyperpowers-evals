# Approach Context

## Original idea (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

**Q: What does "track who logged in" need to actually do?**
A: Real tracking destination — login events get recorded somewhere durable or
queryable, not just a console line.

**Q: Where would the userId value come from?**
A: It doesn't exist yet. There is no user ID anywhere in this app today.

**Q: What establishes the user's identity for tracking?**
A: The auth API assigns it. `login()` POSTs to the endpoint and the server
returns a real `userId`.

**Q: Where should login events be recorded?**
A: Server-side, inside the auth endpoint. The backend records the login while
handling it. (Backend work is out of scope for this repo.)

**Q: How real should the client-side auth call be, given there is no reachable
backend?**
A: Real `fetch` against an agreed contract, plus a local mock so the code runs
and the error paths are actually tested.

**Q: Set up tooling now, before the code exists?**
A: Unit tests only (a runner, a test layout, a first passing fixture). No
linter or formatter requested.

## Codebase facts

Repository root contains: `index.html`, `README.md`, `package.json`, `app.js`,
`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
working tree.

`app.js` in full (29 lines):

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

- `login()` is synchronous and is a stub. It never contacts `API_ENDPOINT`. It
  returns `{ success: true, user: username }` unconditionally and has no
  failure mode at all.
- `login()` has exactly one caller: the submit handler at `app.js:23`, which
  uses the return value synchronously on the next line.
- `API_ENDPOINT` is `https://api.example.com/login` — a placeholder host, not a
  reachable server.
- `validateForm()` checks only for presence of `username` and `password`.
- `app.js` is browser code loaded by `index.html`. It uses `document` at module
  top level (the `addEventListener` call runs on load, not inside a guard), and
  uses no module system — no `import`, no `export`, no `require`.
- `src/index.js` and `src/utils.js` are an unrelated Node hello-world using
  CommonJS (`require` / `module.exports`). They do not reference `app.js`.
  `package.json` declares `"main": "src/index.js"`.
- `package.json` has no `scripts`, no `dependencies`, and no `devDependencies`.
  There is no test runner, no linter, no formatter, no bundler, no build step,
  and no lockfile present.
- There are no existing tests and no test directory.
- There is no `type` field in `package.json`, so `.js` files are CommonJS by
  Node's default resolution.

## What the design must cover

The client-side change in this repository that makes server-side login tracking
possible: `login()` performing a real authenticated request, surfacing the
server-assigned `userId`, and handling the failure modes it does not currently
have. Plus a mock seam that lets those paths be unit-tested, and the test
infrastructure to run them.

Note the tension the design must resolve: `app.js` is browser script code with
no module system and a top-level `document` reference, while the requested unit
tests must run outside a browser.
