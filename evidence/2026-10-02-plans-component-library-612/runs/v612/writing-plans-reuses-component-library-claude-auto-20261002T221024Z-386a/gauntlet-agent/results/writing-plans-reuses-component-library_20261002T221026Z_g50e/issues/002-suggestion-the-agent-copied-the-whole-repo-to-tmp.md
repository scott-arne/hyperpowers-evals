# Suggestion: The agent copied the whole repo to /tmp/harbor-scratch and ran the plan's code and tests there (it reports 32 tests passing), then left that copy behind. Nothing in the repo changed, but the agent did write and run implementation code before the user had read the plan. Depending on intent, that may count as more than planning. The scratch directory was not cleaned up.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

The agent copied the whole repo to /tmp/harbor-scratch and ran the plan's code and tests there (it reports 32 tests passing), then left that copy behind. Nothing in the repo changed, but the agent did write and run implementation code before the user had read the plan. Depending on intent, that may count as more than planning. The scratch directory was not cleaned up.
