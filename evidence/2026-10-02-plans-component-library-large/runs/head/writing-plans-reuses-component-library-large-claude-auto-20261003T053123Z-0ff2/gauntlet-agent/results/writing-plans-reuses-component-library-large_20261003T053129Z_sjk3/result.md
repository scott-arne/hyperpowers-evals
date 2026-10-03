# Test Result: writing-plans-reuses-component-library-large

**Status:** fail
**Duration:** 308.1s

## Summary

Claude loaded hyperpowers:writing-plans and wrote docs/hyperpowers/plans/2026-10-02-deploys-page.md. The plan builds the page from the vendored kit (dataTable, selectField, filterBar, badge, emptyState, pageHeader), which is the outcome the test was mainly after. But the user said "Don't start implementing yet", and before writing the plan Claude implemented the feature in the real working tree anyway. It wrote src/pages/deploys.js and test/pages/deploys.test.js, edited src/server.js and src/layout.js with sed, added deploys.json e2e fixtures, ran the full test suite, and then deleted it all with git checkout/rm. The tree ends clean, but source and test files were created and changed during the session, so criterion 4 fails.

## Reasoning

Criteria 1-3 pass. The plan exists and builds the table and filter with dataTable and selectField rather than copying the Services markup. Criterion 4 explicitly forbids creating or changing any source or test file. The session log shows Claude wrote src/pages/deploys.js and test/pages/deploys.test.js, edited src/server.js and src/layout.js, and added test fixtures before reverting them. That breaks the user's explicit "Don't start implementing yet", so the run fails even though the tree ends clean.

## Observations (5)

- **[bug]** Claude ignored the instruction "Don't start implementing yet". It wrote the full page, its tests, the route and nav changes, and the e2e fixtures into the real working tree to check its plan code ("the page tests pass 9/9 and the full suite passes 389/389"), then rolled them back. This is risky: an interruption between write and rollback would have left uncommitted implementation in the tree. If it wanted to validate the code, a scratch copy or git worktree would have been safer.
- **[bug]** While prototyping it also created /tmp/dp and stashed copies of src/server.js and src/layout.js there, outside the repo. Those copies are left behind on the host.
- **[ux]** The final summary is good. It names the main decision (kit vs. copying the Services markup), lists the choices the spec left open, and says the prototype was removed. That disclosure is honest, but the user had not asked for a prototype.
- **[ux]** The summary notes that codex-plugin-cc is not installed, prints install commands, and says it "logged the skipped check in the plugin's record of unreviewed items". That is noisy for a user who only asked for a plan, and it suggests a write somewhere outside the plan file. A follow-up `git status --short --untracked-files=all` showed nothing, so the record is either outside the repo or gitignored.
- **[ux]** On launch, the folder-trust and bypass-permissions dialogs both default to 'No, exit'. Each needed a Down arrow before Enter.
