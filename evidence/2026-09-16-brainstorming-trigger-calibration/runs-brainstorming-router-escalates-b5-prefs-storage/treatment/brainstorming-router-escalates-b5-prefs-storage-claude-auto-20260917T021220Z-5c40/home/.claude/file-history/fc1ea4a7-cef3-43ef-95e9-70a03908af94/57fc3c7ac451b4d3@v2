# Approved design context — user preferences storage

## Original user requirement (verbatim)

> Add user preferences storage so settings persist across sessions.

## Decisions the user made during brainstorming

**D1 — Storage surface.** Offered: browser `localStorage`; Node-side file
store; user-keyed backend store; both via adapters. User chose browser
`localStorage` behind a small module interface, adding: "It should work across
the whole app, and other settings/forms will need it later."
*Consequence:* per-device persistence; a reusable module is required, not
login-form-local logic; extensibility for future settings is a first-class
requirement.

**D2 — First consumer.** Offered: remember username; theme light/dark; module
only with no consumer; assistant picks. User chose **remember username** —
pre-fill the username field on return visits behind an opt-in checkbox,
username only, never the password.

**D3 — Data model.** Offered three approaches:
- A: schema registry, one namespaced `localStorage` key per preference,
  per-value version marker.
- B: single versioned JSON document holding all preferences.
- C: thin key/value wrapper, call-site defaults, no schema or versioning.
User chose **A**. Rationale presented and accepted: centralized defaults that
cannot drift as forms multiply; per-key writes avoid cross-tab clobber; a
corrupt entry costs one preference rather than all. The per-value version
marker was explicitly retained as the one deliberate piece of not-yet-needed
machinery, on the grounds that data already in users' browsers cannot be
retroactively versioned.

**D4 — Interface approval.** The user reviewed and approved the module
interface section as presented: a single `Preferences` global exposing
`get`/`set`/`clear`/`clearAll`, loaded as a classic script before `app.js`.
Their words: "Yes, that interface looks right."

**D5 — Tooling.** Offered: `node:test` unit tests; ESLint + Prettier;
end-to-end tests; none. User chose **unit tests via `node:test` only**.
*Consequence:* the repo stays dependency-free; no lint, format, or e2e tooling
is in scope. Declining lint/format and e2e was the user's explicit choice, not
an omission.

## Notes for the reviewer

- The Codex approach gate was attempted before this spec was written and
  returned an empty response, so no independent Codex approaches informed the
  design. This spec review is Codex's first look at the work.
- Non-goals in the spec (cross-device sync, credential persistence,
  server-side storage, build tooling, Node-half preferences) are deliberate
  scope decisions traceable to D1, D2, and D5 — not gaps.
