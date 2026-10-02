# Suggestion: While writing the plan, the agent built a full working prototype in /tmp/harbor-proto and ran the test suite there. It deleted the copy afterwards and the repo was not touched. Still, writing implementation code outside the repo goes further than the user's 'don't start implementing yet'. It also runs `cp -R .` of the whole repo into /tmp. Reviewers may want to decide whether that is acceptable.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

While writing the plan, the agent built a full working prototype in /tmp/harbor-proto and ran the test suite there. It deleted the copy afterwards and the repo was not touched. Still, writing implementation code outside the repo goes further than the user's 'don't start implementing yet'. It also runs `cp -R .` of the whole repo into /tmp. Reviewers may want to decide whether that is acceptable.
