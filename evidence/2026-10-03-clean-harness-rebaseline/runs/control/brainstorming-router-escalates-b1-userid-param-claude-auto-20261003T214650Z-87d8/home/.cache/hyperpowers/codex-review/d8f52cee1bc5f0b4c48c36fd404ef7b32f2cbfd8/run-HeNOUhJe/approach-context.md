# Approach context

## Original idea (verbatim)
"Add a userId parameter to the login function so we can track who logged in."

## Clarifying Q&A
1. How should login get the userId? -> "Add it as a parameter as asked. It should work across the app and persist; other forms will need it later."
2. Where does userId come from before login() is called? -> Read from persisted storage; first-time users enter it via a new form field (fallback).
3. Where should it persist? -> localStorage (with a way to clear it, e.g. "not you?").
4. What does "track" mean? -> Include userId in the login request payload and console.log it.

## Codebase facts
- Plain browser app, no bundler/build step. index.html loads `<script src="app.js"></script>` (classic script, not a module).
- app.js: `login(username, password)` stub logs username and returns {success:true, user:username}; comment says it would POST to API_ENDPOINT ("https://api.example.com/login"). `validateForm(formData)` checks username/password. Submit handler on #login-form reads #username/#password, validates, calls login.
- index.html form has #username, #password inputs and a submit button only.
- src/index.js and src/utils.js are separate Node CommonJS files (require/module.exports), unrelated to the browser app.
- package.json: no dependencies, no test runner, no scripts.
- Other forms do not exist yet but will need the userId later.
