# SDD ledger — plan: plan.md
session e1dd3687-0ccc-4b17-9810-4270efad533c: mode current-branch on detached integrating feature/textstats at /Users/johnss51/Development/agents/hyperpowers/evals/results/workspaces/sdd-compaction-reread-claude-auto-20261112T231620Z-e339/coding-agent-workdir started 2026-11-12T23:18:01Z
plan: integration feature/textstats code-root e20c8e7 plan-ref feature/textstats plan-root e20c8e7 spec none (fixture)
Spec: none (fixture) — conflicts have no tiebreaker but the human partner.
Decisions: none (no spec)
Pre-flight scan:
| Rows | Produces / consumes | Finding |
|---|---|---|
| T1 self | test vs behaviour | PASSAGE defined, used by no test (dead). Joiner rules (hyphen, apostrophe, decimal, stray joiner) in Behaviour have no tests although test file is "tokenizer rules" owner. |
| T2 self | test vs prose | Prose says passage hand-counted (8, verified by me) but no test uses PASSAGE. Abbreviation, decimal, closing-quote rules untested. |
| T3 self | test vs prose | Prose says "The passage test pins the ranking" — no such test. n RangeError, case/apostrophe folding, fresh objects untested. |
| T4 self | test vs prose | Prose mentions "multi-paragraph test" (270 words) — absent. wpm RangeError + fractional wpm untested. |
| T1-T2/T3/T4 | tokenize, assertText produced by T1, consumed by T2-4 | consistent; each task replaces only the export line. |
| T1-T4 | stated test counts 8/16/24/32 | consistent with code as written; adding tests changes them. |
deps: task=1 none; task=2 1; task=3 1,2; task=4 1,2,3. deps --check: clean.
