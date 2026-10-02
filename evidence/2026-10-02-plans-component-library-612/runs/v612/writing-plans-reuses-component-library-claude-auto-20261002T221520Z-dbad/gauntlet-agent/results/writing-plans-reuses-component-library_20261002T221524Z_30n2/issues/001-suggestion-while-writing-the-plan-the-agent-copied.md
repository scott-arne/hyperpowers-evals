# Suggestion: While writing the plan, the agent copied the repo to a temp dir (`git archive HEAD | tar -x` into mktemp -d), applied the plan's code there and ran the test suite. It reported "34/34" passing. The repo itself was left alone, but this goes further than plan writing and may be more than a user who said 'don't start implementing' expects. The temp dir was probably not cleaned up.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

While writing the plan, the agent copied the repo to a temp dir (`git archive HEAD | tar -x` into mktemp -d), applied the plan's code there and ran the test suite. It reported "34/34" passing. The repo itself was left alone, but this goes further than plan writing and may be more than a user who said 'don't start implementing' expects. The temp dir was probably not cleaned up.
