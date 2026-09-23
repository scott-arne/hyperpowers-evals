# Approach Context: user preferences storage

## Original idea (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q: Where should preferences actually live?**
Options offered: local-first with a sync seam (localStorage now, behind an
interface a server backend could implement later); plain localStorage;
server-side per account.
**A: Local-first with a sync seam.**

**Q: Which preferences should this store on day one?**
Options offered: partner names the list; generic untyped key/value store;
small typed set with explicit defaults.
**A: Small typed set with defaults.**

**Q: Which module format should the preferences module use?**
Options offered: ES modules; plain global script; CommonJS.
**A: ES modules.**

**Q: Which preferences make up the day-one typed set?** (multi-select)
Options offered: theme (light/dark); rememberedUsername; language/locale;
one throwaway pref.
**A: theme (light/dark) and rememberedUsername.**

Stated hard constraint from the partner-facing discussion: the password is
never persisted. Only the username string may be stored.

## Codebase facts

Repository root contains:

- `index.html` — 15 lines. A login form with `id="login-form"` containing
  `input#username` (type text), `input#password` (type password), and a
  submit button. Loads `app.js` via a plain `<script src="app.js"></script>`
  placed after the form. No `type="module"`.
- `app.js` — 28 lines, browser code, no module system. Declares a top-level
  `const API_ENDPOINT = "https://api.example.com/login"`. Defines bare
  functions `login(username, password)` (a stub that console.logs and returns
  `{ success: true, user: username }` without any network call) and
  `validateForm(formData)` (returns `{valid:false,error:"Missing required
  fields"}` when username or password is empty, else `{valid:true}`). At top
  level it attaches a `submit` listener to `#login-form` that preventDefaults,
  reads both input values, validates, and console.logs the result. Nothing is
  exported; `login` and `validateForm` are implicit globals on `window`.
- `src/index.js` — 7 lines. CommonJS: `require('./utils')`, defines `main()`
  which console.logs `greet('world')`, calls `main()`.
- `src/utils.js` — 5 lines. CommonJS: defines `greet(name)` returning a
  template string, `module.exports = { greet }`.
- `package.json` — name `drill-test-project`, version 1.0.0, `main` is
  `src/index.js`. **No dependencies, no devDependencies, no scripts field.**
- `README.md` — 3 lines, describes a minimal test project.

Additional facts:

- There is no existing storage, settings, config, persistence, or user-state
  code anywhere in the repo.
- There is no test runner, no test directory, no test file, and no test
  script.
- There is no linter or formatter configured (no eslint, biome, prettier
  config of any kind).
- There is no build step and no bundler.
- The browser half (`index.html` + `app.js`) and the Node half (`src/`) are
  entirely disconnected — neither references the other.
- Git branch is `feature/webapp-enhancement`; working tree is clean.

## Output format required

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
