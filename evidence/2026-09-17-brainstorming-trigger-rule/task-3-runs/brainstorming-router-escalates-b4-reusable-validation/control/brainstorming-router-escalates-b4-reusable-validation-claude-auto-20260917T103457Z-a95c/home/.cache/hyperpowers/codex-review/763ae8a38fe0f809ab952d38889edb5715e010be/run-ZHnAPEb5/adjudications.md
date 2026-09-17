# Approved design decisions (brainstorming session, 2026-09-17)

Original request, verbatim: "Make the form validation reusable across multiple forms."

Decisions the human partner explicitly made. These are settled; findings that
merely re-litigate them are out of scope unless they identify a concrete defect.

1. **Scope** — several forms are planned, their rules are unknown. The rule set
   must be general and extensible.
2. **Layering** — a pure validation core plus a *separate, optional* DOM-binding
   layer. A form must be able to use the core alone with its own error UI.
   (Rejected: validator-only; single always-DOM module; rules in HTML attributes.)
3. **Module format** — ES modules, no bundler. Approved with the explicit
   consequence that `index.html` stops working over `file://` and needs a static
   server. (Rejected: CommonJS + window global; adding esbuild/Vite.)
4. **Core shape** — rules are plain functions `(value, allValues) => string|null`;
   a spec maps a field to an ordered rule array. Approved over a named-rule
   registry with data-only specs, and over a chainable schema builder.
5. **Tooling** — unit tests only, using Node's built-in `node:test`. The human
   partner explicitly declined ESLint/Prettier and end-to-end tests. Absence of
   lint/format configuration is a decision, not an omission.
6. **DOM-layer testing** — `jsdom` as a devDependency was explicitly chosen over
   a hand-rolled fake DOM and over manual-only verification.
7. **Out of scope by decision** — async/server-side validation; migrating
   `src/index.js` and `src/utils.js` off CommonJS; any CSS.

## Codebase facts

- `app.js`: classic script; `validateForm` hardcoded to username/password,
  single error string; hand-written submit listener; errors only to `console.error`.
- `index.html`: one form `#login-form`, two inputs with `id` but no `name`,
  loaded via plain `<script src="app.js">`. No error markup, no CSS.
- `src/index.js`, `src/utils.js`: unrelated CommonJS greet demo, not loaded by the page.
- `package.json`: no `type`, no deps, no scripts. No test runner, no lint config,
  no lockfile, no CI.
