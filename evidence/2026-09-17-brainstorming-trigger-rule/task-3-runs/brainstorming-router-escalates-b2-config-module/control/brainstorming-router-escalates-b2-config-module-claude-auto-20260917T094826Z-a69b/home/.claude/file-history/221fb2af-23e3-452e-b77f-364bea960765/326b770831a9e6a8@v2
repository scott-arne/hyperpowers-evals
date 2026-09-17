# Approved design decisions (from brainstorming, 2026-09-17)

Original user request: "Move the API endpoint config into a new settings
module so it's easier to change environments."

Each item below was presented as an explicit fork with trade-offs and chosen
by the human partner. These are settled decisions, not open questions. Do not
re-litigate them; review the spec for defects *given* these choices.

1. **Environment selection: hostname-based switch.**
   Chosen over (a) a per-environment file swapped at deploy time and (b) a
   `window.APP_CONFIG` global override hook. Rationale accepted: the repo has
   no deploy pipeline to hang a file swap on, and the override hook is
   machinery for a need that does not exist yet. Both alternatives remain
   additive on top of the chosen design.

2. **Scope: browser-only.**
   Chosen over a UMD-wrapped module shared with the CommonJS code under
   `src/`. Rationale accepted: nothing in `src/` touches the API, and the
   wrapper is boilerplate for a consumer that does not exist.

3. **Config shape: base URL + composed paths.**
   Chosen over full per-endpoint URLs. Rationale accepted: the base URL is
   what actually varies per environment; paths do not.

4. **Environments: development / staging / production.**
   Chosen over dev+prod only, or production only. The human partner
   explicitly accepted placeholder hosts for development
   (`http://localhost:3000`) and staging (`https://staging-api.example.com`);
   production preserves the value currently hardcoded in `app.js`
   (`https://api.example.com`).

5. **Testing: manual verification only; no test infrastructure added.**
   Chosen over a zero-dependency `node:vm` test and over a full vitest+jsdom
   harness. Rationale accepted: the repository has no test infrastructure at
   all today, and a harness plus DOM shim would exceed the size of the change.

6. **Tooling: no linting or formatting introduced in this change.**
   Chosen over adding eslint+prettier. Rationale accepted: it would reformat
   unrelated files and obscure the change.

Two behavioral decisions were also presented and explicitly approved:

- Unknown hostnames resolve to `production`, with the risk named: a new
  deploy target not added to the detector talks to the production API rather
  than failing loudly.
- A missing `window.AppConfig` causes `login()` to throw a named error rather
  than composing `undefined/login`.
