# Approved Design Context — Settings Module

## Original user request (verbatim)

"Move the API endpoint config into a new settings module so it's easier to change environments."

## Brainstorming classification

Classified architectural (the request names a new module and a new notion of
environments — structure the repo does not have), not bounded.

## Clarifying questions and the user's answers

1. **How should the app determine which environment it's running in?**
   Answer: **Hostname + override** — settings maps `location.hostname` to an
   endpoint set; `window.APP_ENV` overrides it when set.
   Declined: explicit HTML marker only; build-time substitution.

2. **What module shape should the settings module use?**
   Answer: **Browser global** — `settings.js` loaded before `app.js` in
   `index.html`, exposing `window.AppSettings`. Still works from `file://`.
   Declined: ES module (`type="module"`); dual CommonJS/browser file in `src/`.

3. **What should settings store per environment?**
   Answer: **Base URL** — settings holds `apiBaseUrl`; callers compose
   `${apiBaseUrl}/login`.
   Declined: full endpoint URLs per environment.

4. **Which environments should the settings module define?**
   Answer: **local, staging, production.**
   Declined: two-tier; four-tier.

5. **What tooling should we set up as part of this change?**
   Answer: **`node:test` unit tests** (zero dependency).
   Declined: manual verification only; ESLint + Prettier.

6. **How should the tests reach into settings.js?**
   Answer: **CommonJS export guard** — test-only lines at the bottom of
   `settings.js`, ignored by browsers.
   Declined: loading the file via `node:vm`.

7. **Is the design settled enough to write the spec?**
   Answer: **Approved — write the spec.**
   The user did NOT choose "change the production fallback" and did NOT choose
   "reopen runtime-fetched config.json", so the quiet production fallback and
   hostname detection both stand as approved.

## Codex approach gate

Skipped. The architectural alternatives were enumerated in chat and settled by
the user's explicit choices above. A runtime-fetched `config.json` approach was
surfaced to the user and declined.

## Codebase facts

- Repo root contains: `README.md`, `app.js`, `index.html`, `package.json`, `src/`.
- `app.js` line 2: `const API_ENDPOINT = "https://api.example.com/login";`
  `app.js` also defines `login()` (a stub that logs and returns a canned
  success; it issues no request), `validateForm()`, and a submit handler.
- `index.html` loads `app.js` via a plain `<script src="app.js">` tag; there is
  no `type="module"`.
- `src/index.js` and `src/utils.js` are CommonJS (`require` / `module.exports`)
  and are not loaded by the page. They share no code with `app.js`.
- `package.json` has no dependencies and no scripts.
- No test runner, linter, formatter, or build step exists in the repo.
- Git branch `feature/webapp-enhancement`, working tree clean at brainstorm start.
