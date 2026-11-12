# Bug: After the 'Keep the branch as-is' choice, the checkout was left on a detached HEAD at be3ba2d instead of on feature/textstats. The agent said so itself ('Run git switch feature/textstats to go back to the branch'). That's a surprising side effect for an option meant to leave things alone.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After the 'Keep the branch as-is' choice, the checkout was left on a detached HEAD at be3ba2d instead of on feature/textstats. The agent said so itself ('Run git switch feature/textstats to go back to the branch'). That's a surprising side effect for an option meant to leave things alone.
