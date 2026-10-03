# Suggestion: The sortHref in the plan builds `?env=${env}&sort=...` without URL-encoding. The plan says dataTable escapes it for HTML, and env is checked against an allowed list, so this is probably fine. Worth a look anyway.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

The sortHref in the plan builds `?env=${env}&sort=...` without URL-encoding. The plan says dataTable escapes it for HTML, and env is checked against an allowed list, so this is probably fine. Worth a look anyway.
