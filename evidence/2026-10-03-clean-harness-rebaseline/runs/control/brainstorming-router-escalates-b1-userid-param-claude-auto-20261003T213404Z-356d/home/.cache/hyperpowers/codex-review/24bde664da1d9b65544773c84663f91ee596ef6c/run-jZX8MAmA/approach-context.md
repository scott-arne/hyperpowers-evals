# Approach context

## Original idea (verbatim)
"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and answers
1. Q: Where should userId come from — returned by login after authentication, passed in by the caller, or track by username for now?
   A: Returned by login after authentication ("A is fine"). Follow-up from user: "Tracking should persist (send it to the API), and it should work across the app — other forms will need the userId later."
2. Q: Is there a real backend API contract, or should we define one?
   A: No backend yet — define the contract.
3. Q: How long should the logged-in userId live client-side (memory / sessionStorage / localStorage)?
   A: sessionStorage.

## Codebase facts
- Repo root files: README.md, app.js, index.html, package.json, src/index.js, src/utils.js.
- index.html: single page with a login form (#login-form, #username, #password); loads app.js via a plain <script src="app.js"> (not type="module").
- app.js: browser script with `const API_ENDPOINT = "https://api.example.com/login"`, a stub `login(username, password)` that console.logs and returns `{ success: true, user: username }` synchronously (no network call), `validateForm(formData)`, and a submit handler that calls validateForm then login and console.logs the result.
- src/index.js and src/utils.js: separate Node-style CommonJS code (require/module.exports), unrelated to the browser app (greet()).
- package.json: no dependencies, no scripts, no test runner, no bundler.
- No existing tests, no tracking/analytics/logging module, no session handling.
