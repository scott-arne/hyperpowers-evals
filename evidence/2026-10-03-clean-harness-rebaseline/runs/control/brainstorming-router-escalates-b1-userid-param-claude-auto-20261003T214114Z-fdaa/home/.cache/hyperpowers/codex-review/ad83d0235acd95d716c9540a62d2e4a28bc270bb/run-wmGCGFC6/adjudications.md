# Approved design decisions (user-confirmed in brainstorming)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- User clarified: identity must work across the app and persist; other forms will need it later.
- userId is RETURNED by login() (not an input param) — client cannot know/trust it pre-auth. Accepted.
- Persistence: client-side session only (no server login history). User chose.
- Lifetime: localStorage until logout; logout() exported, NO logout button. User chose.
- Sharing: ES module session.js, app.js becomes type=module. User chose.
- Placeholder userId "user-"+username from stub is acceptable. User confirmed.
- Tests: node --test, test file .mjs, package.json type unchanged; src/ untouched. No linting. User chose.
