# Suggestion: The checkbox is created with JavaScript (`input.type = 'checkbox'`). There is no literal `<input type="checkbox">` in the HTML, so a check that greps for that markup would miss it. It does work at runtime.

**Kind:** suggestion
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The checkbox is created with JavaScript (`input.type = 'checkbox'`). There is no literal `<input type="checkbox">` in the HTML, so a check that greps for that markup would miss it. It does work at runtime.
