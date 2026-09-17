# Approved design decisions (brainstorming adjudications)

Original request, verbatim: "Add logging to the app so we can debug production
issues." Follow-up, verbatim: "Yes, it should work across the app. And yes, logs
should persist."

These were each presented with alternatives and explicitly chosen by the human
partner. They are settled inputs, not open questions. A finding that re-opens a
locked decision is out of scope unless it identifies a blocking defect in the
decision as specified.

1. **Scope: both halves.** The logger serves the browser half (`app.js`,
   `index.html`) and the Node half (`src/index.js`, `src/utils.js`).
   Rejected: Node-only, browser-only.

2. **Browser persistence: on-device IndexedDB buffer plus manual export.**
   Rejected: a first-party ingest endpoint; a third-party error-reporting SDK.
   The human partner was told explicitly that this yields no automatic
   visibility into users who do not report problems, and accepted that trade.

3. **Redaction: allow-list.** Only declared fields are recorded. Rejected:
   deny-list; no structured redaction.

4. **Architecture: shared core with pluggable sinks**, dual
   CommonJS/browser-global export, no build step, no runtime dependencies.
   Rejected: converting the repo to ESM; two independent per-half loggers.

5. **Tooling: `node:test` unit tests plus ESLint and Prettier.** Rejected:
   end-to-end browser tests (deliberately deferred); adding no tooling.

The design as presented in chat and approved ("looks good, go ahead") also
included: no free-text message parameter in the API; the three redaction rules
(key allow-list, scalars only, 200-char truncation); runtime level control via
`APP_LOG_LEVEL` and `localStorage['applog.level']`; global unhandled-error
capture on both sides; and rewriting the existing `app.js` call sites so the
username is no longer logged.
