# Approved design decisions (brainstorming adjudications)

Original request, verbatim:

> Add user preferences storage so settings persist across sessions.

Each decision below was presented to the human partner with tradeoffs and
explicitly approved. They are settled — findings that merely re-litigate a
settled decision are out of scope; findings that show a decision is internally
inconsistent with the rest of the spec are in scope.

1. **Surface: browser webapp.** Preferences serve `index.html` + `app.js`,
   persisted in `localStorage`. Rejected: the Node program under `src/`; a
   shared browser+Node core.

2. **Scope: storage module plus one wired preference.** Rejected: a
   storage-only layer with no consumer; a full settings UI.

3. **Data model: single namespaced, versioned JSON blob** under one
   `localStorage` key. Rejected: one key per preference; an observable store
   with subscriptions and cross-tab `storage` events (deferred as premature,
   kept additive).

4. **Module format: `createPreferences(storage)` factory** with injectable
   storage and a dual browser/Node export shim. Rejected: ES modules (breaks
   `file://` loading); a plain global with no factory (would require a jsdom
   dependency).

5. **Demo preference: `rememberUsername` + `lastUsername`**, wired to the
   existing login form. Approved with: unchecking clears the stored username.

6. **Tooling: `node:test` unit tests, plus ESLint and Prettier.** Rejected:
   Playwright end-to-end (browser-binary download judged too costly for one
   checkbox — the resulting DOM-wiring coverage gap is knowingly accepted and
   documented in the spec); fuzz/mutation testing.

## Repository facts

Pre-existing files, unchanged by this design except where the spec says
otherwise: `index.html` (login form, classic script tag, no CSS/framework),
`app.js` (~30 lines of top-level globals, stubbed `login()`), `package.json`
(no scripts, no dependencies), `src/index.js` and `src/utils.js` (an unrelated
Node CommonJS program). No test runner, linter, formatter, CI, build step, or
existing persistence code of any kind. Branch `feature/webapp-enhancement`,
working tree clean apart from the new spec.

## Prior Codex involvement

The brainstorming approach gate fired and preflight returned `ok`, but the
companion returned an empty payload, so no independent Codex approaches were
contributed. The approaches in the spec's Alternatives Considered are Claude's
own.
