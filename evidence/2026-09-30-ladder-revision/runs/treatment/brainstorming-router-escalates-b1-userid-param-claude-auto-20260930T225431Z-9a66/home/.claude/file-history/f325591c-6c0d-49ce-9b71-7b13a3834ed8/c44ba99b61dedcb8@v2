# Approved design decisions (brainstorming)

Original request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

Follow-up requirement, verbatim:

> It should identify the actual user, not just the attempt. It should persist,
> and other forms will need it later.

These were settled with the human partner and are NOT open questions. Do not
re-litigate them; review the spec against them.

| Decision | Approved choice | Alternatives considered and rejected |
|---|---|---|
| Id source | Server-issued at login, stubbed until a backend exists | Locally-minted anonymous id upgraded at login; local-only persistent id |
| Storage | `localStorage`, behind one module | Cookie; `sessionStorage` |
| Retention | 30-day TTL, enforced on read | 7-day TTL; no expiry |
| Structure | Global singleton module `identity.js` (approach A) | ES-module migration (deferred as a later step); event-driven pub/sub store (cut as YAGNI) |
| Tooling | `node:test` only, zero dependencies | `node:test` + Biome; no tooling |

Also approved section by section during brainstorming:

- Section 1 (architecture and components) — approved.
- Section 2 (data flow and error handling) — approved.
- Section 3 (testing) — approved, including the explicit decision that the DOM
  submit handler and `<script>` ordering are verified manually rather than by
  automated test, because a DOM implies a dependency the project declined.

Task classification was escalated mid-brainstorm from bounded to architectural
when the persistence and cross-form requirements surfaced.

Codebase facts: a minimal static webapp. `app.js` holds `login`,
`validateForm`, and a `#login-form` submit handler, all as classic browser
globals. `index.html` loads `app.js` with a plain script tag. `src/index.js`
and `src/utils.js` are CommonJS and unrelated to the page. `package.json` has
no dependencies, no scripts, and no `"type"` field. No tests, no linter, no
bundler. Branch `feature/webapp-enhancement`.
