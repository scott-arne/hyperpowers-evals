# Ux: The main agent spent ~90s in a literal `sleep 90; echo waited` bash call while waiting for the backgrounded reviewer subagent — polling by sleeping looks wasteful/odd in the transcript.

**Kind:** ux
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

The main agent spent ~90s in a literal `sleep 90; echo waited` bash call while waiting for the backgrounded reviewer subagent — polling by sleeping looks wasteful/odd in the transcript.
