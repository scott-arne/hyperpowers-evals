# Approved design decisions (brainstorming, 2026-09-16)

Original request, verbatim: "Add logging to the app so we can debug production issues."

Path classification: architectural (logging is a new subsystem; no existing
logging flow in the repo to modify).

Each item below was presented to the human partner as an explicit fork with
trade-offs, and answered by them. These are settled and are NOT open questions
for review.

1. **Surface** — "It should work across the app, wherever we have code running."
   Both runtimes (browser `app.js`, Node `src/index.js`) over a shared core.
   Rejected: browser-only; Node-only.

2. **Browser log destination** — app-owned `POST` endpoint. Console transport by
   default, remote HTTP transport enabled by config.
   Rejected: third-party service (Sentry/Datadog/LogRocket); console-only with
   the sink deferred.

3. **Redaction policy** — deny-by-default allowlist at the remote boundary; the
   console transport stays verbose locally.
   Rejected: denylist/key scrubbing; no automatic redaction.

4. **Capture** — global error handlers (`window.onerror`, `unhandledrejection`,
   `uncaughtException`, `unhandledRejection`) plus converting the existing
   `console` call sites.
   Rejected: explicit call sites only; adding `fetch` instrumentation now.

5. **Architecture** — pure shared core plus per-runtime adapters, using a
   dual-export footer.
   Rejected: single-file universal logger; migrating the repo to native ESM
   (would break `file://` loading of `index.html`).

6. **Error text on the wire** — allowlist `errorName`, `errorMessage`, and
   `stack`, each truncated to 512 characters, with the residual user-input leak
   risk knowingly accepted.
   Rejected: name + stack only; name only.

7. **Send failure** — one retry, then drop. Nothing persisted to the user's
   device.
   Rejected: persisting to `sessionStorage` and resending on a later page load.

8. **Tooling** — unit tests via `node:test` only (zero added dependencies).
   Explicitly declined: ESLint + Prettier; Playwright end-to-end tests;
   fast-check property tests.

## Process note

The Codex approach gate fired and its preflight returned `ok`, but the companion
call returned an empty result. Per the gate's one-shot rule it was recorded as a
degrade and not retried; the three approaches were authored without independent
Codex input.

## Repository facts the spec is written against

- `package.json` has no dependencies, no devDependencies, and no scripts.
- No bundler, no build step, no lockfile, no linter config, no test directory.
- `app.js` is a browser global script (`document`, no imports/exports).
- `src/index.js` and `src/utils.js` are Node CommonJS.
- `API_ENDPOINT` in `app.js` points at a stub (`https://api.example.com/login`)
  and is never used; `login()` performs no network call.
- Git branch `feature/webapp-enhancement`, working tree clean before this spec.
