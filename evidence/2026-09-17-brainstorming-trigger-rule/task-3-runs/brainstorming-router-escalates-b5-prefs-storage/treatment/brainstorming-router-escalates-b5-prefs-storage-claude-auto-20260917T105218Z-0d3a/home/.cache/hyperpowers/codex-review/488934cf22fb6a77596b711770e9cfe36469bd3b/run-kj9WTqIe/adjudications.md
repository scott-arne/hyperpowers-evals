# Approved design decisions (brainstorming, 2026-09-17)

Original request, verbatim:

> Add user preferences storage so settings persist across sessions.

Decisions the user made and approved during brainstorming. These are settled
inputs to the spec, not open questions — a finding that re-opens one of these
as if undecided is out of scope unless the spec is internally inconsistent
with it.

1. **Scope of what persists: UI preferences only.** The user explicitly chose
   this over (a) remembering the username, (b) per-account backend-synced
   settings. No user-identifying data, no credentials, no backend.

2. **Deliverable: storage layer plus one preference wired end to end.** Chosen
   over (a) storage layer only, (b) storage plus a full settings panel. The
   intent is that a real caller exercises the module's API.

3. **Approach: declared-schema store.** Chosen over (a) a thin
   `get(key, fallback)` key-value wrapper with no schema, (b) an observable
   store with subscriptions and cross-tab `storage`-event sync. Rationale
   recorded in the spec.

4. **Tooling: unit tests via Node's built-in `node:test` only.** The user was
   offered, and did not select, a linter/formatter and end-to-end tests. The
   repo has no tooling today. Absence of a linter and of e2e/DOM coverage is a
   deliberate, recorded choice, not an oversight.

5. Design sections for module boundary, data model / failure behavior, and UI
   wiring were each presented in chat and approved before the spec was written.

Codex approach gate: fired during design, returned an empty response. The
approaches in the spec are the author's alone.
