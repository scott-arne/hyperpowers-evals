# Approved design context

Original user request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

## Decisions the user explicitly approved during brainstorming

1. **Do not add a `userId` parameter.** Track inside `login()` instead, using the
   identity it already receives. Chosen over (a) returning a user ID from the
   API and (b) adding the parameter literally. Rationale: no caller can supply a
   user ID; the sole call site has only username and password.
2. **Persistence required, reusable by future forms.** The user rejected the
   offered console-only and pluggable-sink options with: "It should persist, and
   other forms across the app will need it later."
3. **Purpose is product analytics.** Chosen over debugging visibility, audit
   trail/security, and scoping back down. Audit use was explicitly ruled out as
   unachievable client-side.
4. **Approach A — ES module tracker.** Chosen over a `window` global classic
   script and over declarative `data-track-*` delegated auto-tracking. The user
   accepted the stated consequence that `index.html` will no longer open over
   `file://`.
5. **Tooling: unit tests via `node:test` only.** Biome lint/format was offered
   and declined.
6. **Identity recorded as a pseudonymous ID** (hashed), chosen over raw username
   and over recording no identity.
7. **Async `track()` with salted SHA-256**, chosen over a synchronous FNV-1a
   hash, accepting an internal promise chain to serialize queue writes.

Design sections 1, 2, and 3 were each presented in chat and approved before the
spec was written.

## Process note

The brainstorming Codex approach gate fired and was invoked; the call returned an
empty response, so no independent Codex approaches were incorporated. The
approach shortlist in the spec has had no independent review.

## Codebase facts

Static webapp fixture. Files: `index.html`, `app.js`, `src/index.js`,
`src/utils.js`, `package.json`, `README.md`. `app.js` is a classic script with
no imports; `src/` is CommonJS and Node-side; nothing links them. No bundler, no
dependencies, no tests, no linter, no backend. `login()` is a synchronous stub
that logs and returns a hardcoded `{ success: true, user: username }`. One form
exists (`#login-form`, with a password field). Branch
`feature/webapp-enhancement`.
