# Approved design decisions (from brainstorming, 2026-09-26)

Original user request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

Four forks were presented to the user in chat with trade-offs; the user chose
each option below explicitly. These are settled decisions, not open questions.
Do not re-litigate them; review the spec for whether it implements them
completely and consistently.

1. **Environment selection: hostname detection.**
   Chosen over (a) a hand-edited `ACTIVE_ENV` constant and (b) build-time
   injection. Build-time injection was rejected because the repository has no
   bundler or build step and adding one was out of scope.

2. **Module loading: classic script tag exposing a global.**
   Chosen over ES modules. ES modules were rejected specifically because
   `type="module"` is fetched under CORS rules and would break opening
   `index.html` over `file://`, which the user wanted preserved.

3. **Config shape: base URL per environment, paths appended by callers.**
   Chosen over storing complete endpoint URLs per environment.

4. **Environments: dev + staging + prod.**

5. **Tooling: none added.**
   The user was explicitly offered unit tests (zero-dep `node:test`) and
   eslint+prettier, and declined both. The repository is zero-dependency and
   stays that way. Verification is manual. Absence of automated tests is a
   recorded decision, not an oversight — do not raise it as a blocking
   finding.

## Known-open items (already flagged to the user)

Three values are genuinely unknown and are written in the spec as explicit
`Assumption: ... validate by asking the repository owner` lines: the staging
hostname, the dev API base URL, and the staging API base URL. The user will
supply these at spec review. Flag them only if the spec handles them
inconsistently.

## Repository context

- `index.html` loads `app.js` via a plain `<script src="app.js">`.
- `app.js` holds `const API_ENDPOINT = "https://api.example.com/login";` and a
  stubbed `login()` that only logs — it issues no real HTTP request today.
- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node area and
  are out of scope.
- `package.json` has no dependencies and no scripts.
