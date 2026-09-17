# Approved design decisions (brainstorming adjudications)

Original request, verbatim: "Add user preferences storage so settings persist
across sessions."

The following were decided by the human partner during brainstorming and are
**fixed inputs**. Do not re-litigate them; review the spec for how faithfully
and completely it executes against them.

1. **Surface: browser / `localStorage`.** Chosen over a Node JSON config file
   and over a dual-backend shared core. Preferences are per-browser; no
   cross-device sync.
2. **Scope: plumbing plus two real preferences.** Chosen over plumbing-only and
   over plumbing-plus-one. The two are remember-username and a light/dark theme,
   wired into the existing page.
3. **Security constraint, stated by Claude and accepted:** the password is never
   persisted. Remember-me covers the username field only.
4. **Tooling: `node --test` plus a hand-written `localStorage` fake.** Chosen
   over Vitest+jsdom and over no tooling. ESLint/Prettier explicitly declined
   for now. No new runtime or dev dependencies.
5. **Data layout and module shape: approach C** — a single JSON blob under one
   key, behind an injected storage backend, with a declarative schema table.
   Chosen over (A) the same blob reading the `localStorage` global directly and
   (B) one flat `localStorage` key per preference.
6. The human partner approved the data-model and module-API sections in chat
   before the spec was written ("looks good, go ahead").

## Codebase facts the spec was written against

Repo root: `README.md`, `app.js`, `index.html`, `package.json`, `src/index.js`,
`src/utils.js`. Branch `feature/webapp-enhancement`, working tree clean.

`package.json` has no `dependencies`, `devDependencies`, `scripts`, or `type`
field. No lockfile, no bundler, no build step, no test runner, no linter config.

`app.js` is loaded by a bare `<script src="app.js">` tag; its functions are
plain top-level declarations. `src/` uses CommonJS. There is no build step to
bridge the two module systems.

`login()` in `app.js` is a stub that performs no network call and returns a
literal success object. There is no server and no session token.

`index.html` has no CSS at all — no `<link>`, no `<style>`, no inline styles.

Nothing in the repo reads or writes persistent state today, and there is no
existing settings screen or config object to extend.

## Codex approach gate

A Codex approach consultation was attempted earlier in this brainstorm and
returned an empty response, so the three approaches considered were
single-source (Claude's own). This is a known blind spot in the option set.
