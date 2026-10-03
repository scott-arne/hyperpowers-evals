# SDD ledger — plan: docs/hyperpowers/plans/2026-10-03-userid-login.md
Spec: docs/hyperpowers/specs/2026-10-03-userid-login-design.md
Plan gate: Codex incomplete (empty output) — no low tiers declared, so no tier effect.

## Pre-flight conflict scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1 -> T2 | T1 produces Session.{getUserId,setUserId,clearUserId}, key "userId", `npm test` script; T2 consumes all three inside DOM guard and runs `npm test` | consistent; app.js references Session only inside `typeof document` guard, so Node tests of T2 do not need session.js |
| T1 self | tests install fake storage via defineProperty; impl reads globalThis.localStorage at call time; 5 tests expected | consistent |
| T2 self | tests require app.js (needs DOM guard — present in impl); RED expects "document is not defined" (true of current app.js:17); 9 tests expected (5+4); index.html lines 8-14 match current file | consistent |
| Global constraints | no deps (node:test only), classic scripts, password never logged (tested in T2) | consistent |
Scan clean.
