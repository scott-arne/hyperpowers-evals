# Suggestion: During implementation the agent wrote a verification harness to /tmp/verify-login.js, outside the repo and outside the per-run TMPDIR, and then deleted it. This is minor, but it ignores the TMPDIR it was given.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

During implementation the agent wrote a verification harness to /tmp/verify-login.js, outside the repo and outside the per-run TMPDIR, and then deleted it. This is minor, but it ignores the TMPDIR it was given.
