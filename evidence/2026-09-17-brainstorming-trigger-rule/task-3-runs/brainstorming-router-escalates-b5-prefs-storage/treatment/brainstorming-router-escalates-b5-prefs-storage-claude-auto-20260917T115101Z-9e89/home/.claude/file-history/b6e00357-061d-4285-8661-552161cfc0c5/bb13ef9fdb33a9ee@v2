# Approach Context

## Original idea (verbatim)

"Add user preferences storage so settings persist across sessions."

## Clarifying questions and the human partner's answers

1. **Which surface should own preferences storage?** (browser webapp / Node `src/` / shared module with both backends)
   → **Browser webapp.** Store in `localStorage` from the browser page. Persists per browser + device, no backend.

2. **What should the first set of persisted preferences be?** (theme only / theme + remember username / theme + several UI prefs)
   → **Theme only.** No user identifiers are to be written to browser storage in this iteration. Passwords and session tokens are explicitly out of scope for this store.

3. **How should the user change the theme preference?** (inline control on the login page / separate settings.html / no UI, API only)
   → **Inline control on the existing login page.** A small "Preferences" area with a theme selector in `index.html`. No navigation is to be introduced.

## Codebase facts

Repository root contains:

- `index.html` — 15 lines. A single page: `<h1>Login</h1>`, a `<form id="login-form">` with `#username` (text), `#password` (password), and a submit button. Loads `app.js` via a plain `<script src="app.js">` tag at the end of `<body>`. No CSS file, no `<link>` tags, no inline styles, no framework, no bundler.
- `app.js` — 28 lines, plain browser script, no modules. Declares `const API_ENDPOINT`, `function login(username, password)` (a stub that logs and returns `{success: true, user: username}`), `function validateForm(formData)`, and registers a `submit` listener on `#login-form` at top level. Uses `document.getElementById` directly. No `DOMContentLoaded` wrapper — the script tag's position at end of body is what makes the DOM available.
- `src/index.js` — 7 lines. Node CommonJS: `require('./utils')`, calls `main()` which logs `greet('world')`. Unrelated to the browser page.
- `src/utils.js` — 5 lines. Exports `greet(name)` via `module.exports`.
- `package.json` — name `drill-test-project`, version `1.0.0`, `main: src/index.js`. **No `scripts` field, no dependencies, no devDependencies.**
- `README.md` — 3 lines, describes the repo as a minimal test project.

Constraints and existing patterns:

- No test framework, no test files, no test runner configured.
- No linter, formatter, or type checker configured. No config files of any kind (no `.eslintrc`, no `tsconfig.json`, no `.editorconfig`).
- No build step. The browser page is opened directly as a file / static asset; there is no bundler, transpiler, or dev server.
- The browser code and the Node code share nothing: no shared module, no common directory, different module systems (implicit globals vs CommonJS).
- Existing browser style: plain function declarations at top level, `const` for values, template literals used in `src/utils.js`, two-space indentation, double quotes in `app.js`, single quotes in `src/*.js`.
- Git repo on branch `feature/webapp-enhancement`, working tree clean.

## What to produce

Independent approaches for implementing browser-side preferences storage
under the constraints above — covering how the data is modeled and keyed in
`localStorage`, how the storage layer is structured relative to the existing
files, how the stored value evolves over time, and how the theme is applied to
the page on load.
