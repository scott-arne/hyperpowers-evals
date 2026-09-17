# Approved design context (brainstorming decisions)

Original user request, verbatim:

> Add logging to the app so we can debug production issues.

The following were put to the human partner as explicit choices during
brainstorming and selected by them. They are settled and are not open questions
for this review.

1. **Scope** — both runtimes in the repo (the browser page and the Node entry
   point) under one shared design, rather than either alone.
2. **Destination** — console output plus an optional remote sink, rather than
   console-only or a third-party service (Sentry/LogRocket/Datadog). The remote
   sink defaults to off; no endpoint exists yet.
3. **Capture** — explicit log calls plus global error handlers
   (`window.onerror`, `unhandledrejection`, `uncaughtException`,
   `unhandledRejection`), rather than explicit calls only or
   explicit-plus-breadcrumbs.
4. **Redaction** — allowlist at the remote boundary (fail closed), rather than
   denylist scrubbing alone or documented discipline alone.
5. **Structure** — pure core plus runtime adapters, rather than a single
   dual-mode file or a full ES-modules migration. The ESM option was rejected
   specifically because it rewrites unrelated files and breaks opening
   `index.html` over `file://`.
6. **Tooling** — unit tests only, using Node's built-in `node --test` runner.
   The human partner was offered lint+format (Biome), end-to-end tests
   (Playwright), and "none," and selected only unit tests. Absence of a linter
   and of end-to-end infrastructure is therefore intentional, not an oversight.

An independent Codex approach consultation was attempted before the design was
formed. Preflight returned `ok` (version `0.0.0-stub`) but the call returned an
empty payload, so no external approaches informed the design.

## Relevant codebase facts

The repository contains only `README.md`, `package.json`, `index.html`,
`app.js`, `src/index.js`, and `src/utils.js`.

`package.json` has no dependencies, no devDependencies, and no scripts.
`index.html` loads `app.js` as a classic `<script src>` tag (not
`type="module"`). `src/index.js` uses CommonJS `require`. There is no bundler,
no dev server, and no build step.

`app.js` currently contains `login(username, password)`, which logs the username
via `console.log` on a code path that holds a credential. That is the motivating
case for the redaction decision.
