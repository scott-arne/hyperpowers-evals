# Ux: The summary notes that codex-plugin-cc is not installed, prints install commands, and says it "logged the skipped check in the plugin's record of unreviewed items". That is noisy for a user who only asked for a plan, and it suggests a write somewhere outside the plan file. A follow-up `git status --short --untracked-files=all` showed nothing, so the record is either outside the repo or gitignored.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** fail

## Description

The summary notes that codex-plugin-cc is not installed, prints install commands, and says it "logged the skipped check in the plugin's record of unreviewed items". That is noisy for a user who only asked for a plan, and it suggests a write somewhere outside the plan file. A follow-up `git status --short --untracked-files=all` showed nothing, so the record is either outside the repo or gitignored.
