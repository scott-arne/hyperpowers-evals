# Suggestion: To check the plan, the agent copied the whole repo into a temp dir with `cp -R . $T/` and ran the plan's code and tests there. That's allowed under 'don't implement', and no repo files changed. Still, it is more than writing a plan, and it isn't obvious to a user who asked for a plan only.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

To check the plan, the agent copied the whole repo into a temp dir with `cp -R . $T/` and ran the plan's code and tests there. That's allowed under 'don't implement', and no repo files changed. Still, it is more than writing a plan, and it isn't obvious to a user who asked for a plan only.
