# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up from the same person, verbatim:

> Your recommendation is fine. It should work across the app and persist — other forms will need it later.

## Clarifying questions and answers

**Q: Where does `userId` come from — is it something the caller knows before
login, or something login learns afterward?**
A: Decided — it is assigned by the server and known only once the login API
responds. So it is NOT a parameter; `login()` returns it as part of its result.

**Q: What is the persisted `userId` allowed to be used for?**
A: Tracking only. Non-authoritative: used for logging/analytics attribution
across the app. Nothing may make a security or access-control decision based
on it. It is explicitly not session/auth state.

**Q: How long should the stored `userId` survive?**
A: Tab session. Survives page reloads and page-to-page navigation; cleared
when the tab closes.

**Stated future requirement:** other forms, which do not exist yet, will need
to read this id later.

## Codebase facts

Repository root contains:

- `index.html` — static page. Single `<form id="login-form">` with
  `#username` (text) and `#password` (password) inputs and a submit button.
  Loads the script with a plain `<script src="app.js"></script>` tag at the
  end of `<body>`. No `type="module"`.
- `app.js` — 28 lines, browser global-script style (no imports/exports).
  Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `function login(username, password)` — a stub. Body:
    `console.log("Logging in:", username);` then
    `return { success: true, user: username };`. Comment in the body says it
    "would POST to API_ENDPOINT in real app". No network call exists yet.
  - `function validateForm(formData)` — returns
    `{valid:false,error:"Missing required fields"}` when username or password
    is falsy, else `{valid:true}`.
  - A `submit` listener on `#login-form` that reads both inputs, calls
    `validateForm`, and on success calls `login(username, password)` and logs
    the result. This is the ONLY call site of `login()` in the repository.
- `src/index.js` and `src/utils.js` — a separate CommonJS Node module
  (`require('./utils')`, `module.exports = { greet }`, a `main()` that prints
  a greeting). Not referenced by `index.html` and not connected to the browser
  code in any way.
- `package.json` — name `drill-test-project`, version 1.0.0, `"main":
  "src/index.js"`. No dependencies, no devDependencies, no scripts.
- `README.md` — three lines, describes a minimal test project.

Toolchain facts:

- No bundler, no build step, no transpiler.
- No test framework, no test files, no test script.
- No linter or formatter configuration.
- Git repo, current branch `feature/webapp-enhancement`, working tree clean.

## The open question for you

Given the decisions above are fixed (server-assigned id returned from
`login()`; tracking-only; tab-session lifetime; future forms in this same
no-bundler static page must be able to read it), propose how the id should be
stored and made available across the app.
