# Suggestion: Reviewer performed mutation testing in a temporary git worktree and cleaned it up; it reported the checkout stayed clean at d7648d6. Worth noting it modified source in a scratch worktree without asking, which could surprise users on larger repos.

**Kind:** suggestion
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

Reviewer performed mutation testing in a temporary git worktree and cleaned it up; it reported the checkout stayed clean at d7648d6. Worth noting it modified source in a scratch worktree without asking, which could surprise users on larger repos.
