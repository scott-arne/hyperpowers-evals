# Approved design decisions (brainstorming session, 2026-09-26)

Original user request, verbatim:

> Add logging to the app so we can debug production issues.

Repository state at design time (this is the whole repo):

- `index.html` — login form, loads `app.js` via a classic `<script src>` tag
- `app.js` — login/validate handlers; three ad-hoc `console.*` calls, one of
  which logs the username from the login form
- `src/index.js`, `src/utils.js` — CommonJS Node entry point and a `greet` util
- `package.json` — no dependencies, no scripts, no test setup
- `README.md` — three lines

Decisions the user explicitly chose during brainstorming. These are settled;
findings should evaluate the spec against them rather than relitigate them.

1. **Scope** — both apps, one shared core. (Alternatives offered and declined:
   browser only; Node only.)
2. **Destination** — hosted vendor service behind a swappable sink interface.
   (Declined: own collector endpoint, because no backend exists in this repo;
   browser-local buffer only, because it is pull-not-push.)
3. **Redaction** — default-deny allowlist over structured fields, plus a
   scrubber over free-text messages and stack traces. (Declined: strict
   allowlist with no scrubber; redaction denylist, because it fails open.)
4. **Capture** — explicit logger API plus global error handlers only.
   (Declined: explicit calls only, because uncaught errors would go
   unrecorded; auto-instrumentation of fetch/XHR, because it would route the
   login POST body back through the logger.)
5. **Correlation** — anonymous per-session UUID on every record, plus an
   opt-in `setUser(opaqueId)` hook. (Declined: session ID alone; persistent
   device ID, which needs consent review.)
6. **Module system** — convert both sides to native ES modules, no bundler, no
   build step, zero runtime dependencies. Approved by the user as Section 1.
7. **Vendor integration** — reach the vendor's HTTP ingest API over `fetch`
   rather than installing its browser SDK. Approved with the stated cost:
   loss of source-map-aware stack traces and SDK release tracking.
8. **Tooling** — ESLint + Prettier, and `node:test` for unit tests. End-to-end
   test infrastructure explicitly declined by the user.
9. **Dropping `username` from logs** — the user explicitly approved that the
   username is not logged and is not on the field allowlist.

The user approved Sections 1 through 4 of the design in sequence before the
spec was written.
