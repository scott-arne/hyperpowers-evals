# Approved design context — user preferences storage

## Original user request

> Add user preferences storage so settings persist across sessions.

## Repository state before this work

- `index.html` + `app.js` — a vanilla-JS browser login form, no build step, no framework.
- `src/index.js` + `src/utils.js` — a separate CommonJS Node module that prints a greeting.
- `package.json` — no dependencies, no scripts, no test runner, no linter.
- No persistence, settings, or preferences code of any kind exists.

## Decisions the user explicitly approved during brainstorming

1. **Surface: browser, backed by `localStorage`.** Chosen over a Node/JSON-file
   implementation and over a both-surfaces shared-core implementation. Rationale
   accepted: the login form is the only interactive surface; the Node `src/`
   module is a greeting stub with no settings.

2. **Fixed schema with typed defaults and validation**, seeded with
   `rememberedUsername` and `theme`. Chosen over a `rememberedUsername`-only
   scope and over a generic key-value store. Rationale accepted: retrofitting
   validation onto data already in users' browsers is expensive, so the schema
   exists from the first commit.

3. **Tooling: Node's built-in `node:test` runner with an injected storage
   backend, zero new dependencies.** Chosen over adding Biome and over no
   tooling at all. Rationale accepted: the injection seam is what makes browser
   storage code testable under Node and is worth having regardless.

4. The user reviewed a five-section design in chat covering module/format, API
   and schema, error handling, UI wiring, and testing, and approved it verbatim
   with "looks good, go ahead". The spec under review is the written form of
   that approved design.

## Constraints carried from user/project instructions

- Focused, minimal changes; do not refactor unrelated code.
- The `src/` CommonJS module is out of scope and must not be disturbed.
- No new dependencies.
- The password must never be stored or persisted.
