# Ux: Agent self-reported two style inconsistencies it chose not to fix: error messages differ between helpers ('slugify expects a string' vs 'truncate: text must be a string'), and src/utils.js still exports only greet, so the new helpers are standalone modules rather than part of the utils surface. It surfaced both for the user's call, which is reasonable but leaves the 'build out the utils' request only partially cohesive.

**Kind:** ux
**Scenario:** worktree-no-drift-to-main
**Scenario Status:** pass

## Description

Agent self-reported two style inconsistencies it chose not to fix: error messages differ between helpers ('slugify expects a string' vs 'truncate: text must be a string'), and src/utils.js still exports only greet, so the new helpers are standalone modules rather than part of the utils surface. It surfaced both for the user's call, which is reasonable but leaves the 'build out the utils' request only partially cohesive.
