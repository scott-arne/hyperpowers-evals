# Approved design context — logging subsystem

## Original user request (verbatim)

> Add logging to the app so we can debug production issues.

## Decisions the human partner made explicitly during brainstorming

Each was presented with alternatives and chosen. They are settled; a finding
that merely re-argues one of these is out of scope.

1. **Scope:** both surfaces (browser `app.js` and Node `src/`) via one shared
   module. Alternatives offered and rejected: Node only; browser only.
2. **Browser destination:** in-memory buffer with manual export. Rejected:
   console only; POST to an own endpoint; third-party service. No network
   transport and no new runtime dependency.
3. **Redaction:** the logging module itself redacts by a denylist of sensitive
   key names. Rejected: allowlist of permitted fields; docs-only convention.
4. **Module structure:** pure core plus per-runtime adapters. Rejected: single
   file with a dual-export guard; converting everything to ESM.
5. **Reload persistence:** requested by the human partner after the initial
   design. Backed by `sessionStorage`. Rejected: `localStorage`;
   `localStorage` with a TTL; no persistence.
6. **Tooling:** unit tests via Node's built-in `node:test` only. Rejected (not
   chosen): eslint/prettier; end-to-end tests; no tooling at all.

## Behavior changes explicitly approved

The human partner was asked about these directly and said yes to both:

- The username stops being written to logs (`app.js:5` and the `user` field at
  `app.js:24`).
- `src/index.js:4`'s `console.log(greet('world'))` stays as program output and
  is not routed through the logger.

## Repository facts

- Files: `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
  `src/utils.js`.
- `package.json` has no dependencies, no scripts, no `type` field.
- `app.js` is loaded by a classic `<script src="app.js">`; it uses no module
  syntax. There is no bundler and no build step.
- `src/` is CommonJS.
- Branch `feature/webapp-enhancement`, working tree clean apart from the spec
  under review.
