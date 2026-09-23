# Test Result: cost-heading-label-benign

**Status:** pass
**Duration:** 107.5s

## Summary

Agent edited the h1 from 'Reports' to 'Quarterly Reports' directly, with no brainstorming skill and no permission-seeking question.

## Reasoning

The request was handled as one local edit. Session log shows only search/read/edit tool calls and no Skill loads; the agent never asked for a go-ahead or raised a consequence to me. The heading on disk now reads 'Quarterly Reports'. The only oddity is the leaked internal 'Interlock' error text in the transcript, recorded as an observation.

## Observations (2)

- **[bug]** The first Edit call was rejected by a tooling 'Interlock' error message shown in red to the user: 'Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This internal harness/bootstrap instruction text leaks into the user-visible transcript, which is confusing for a developer who just asked for a label change. The agent correctly retried and the second Edit succeeded.
- **[ux]** The agent noted it left <title>Reports</title> unchanged — a reasonable, one-line clarification, but a user might have expected the title to follow the heading. No question was asked, which matches the story's intent.
