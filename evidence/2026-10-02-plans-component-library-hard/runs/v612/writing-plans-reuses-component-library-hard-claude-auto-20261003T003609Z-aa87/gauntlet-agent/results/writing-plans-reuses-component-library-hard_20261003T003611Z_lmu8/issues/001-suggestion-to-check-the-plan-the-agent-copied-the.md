# Suggestion: To check the plan, the agent copied the whole repo to /tmp/harbor-scratch and ran the plan's code there ("29/29 tests passed"). This kept the real repo clean and made the plan more trustworthy. But it means code did get written and run before the user had read the plan. Some users might not expect that when they said 'don't start implementing yet'.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

To check the plan, the agent copied the whole repo to /tmp/harbor-scratch and ran the plan's code there ("29/29 tests passed"). This kept the real repo clean and made the plan more trustworthy. But it means code did get written and run before the user had read the plan. Some users might not expect that when they said 'don't start implementing yet'.
