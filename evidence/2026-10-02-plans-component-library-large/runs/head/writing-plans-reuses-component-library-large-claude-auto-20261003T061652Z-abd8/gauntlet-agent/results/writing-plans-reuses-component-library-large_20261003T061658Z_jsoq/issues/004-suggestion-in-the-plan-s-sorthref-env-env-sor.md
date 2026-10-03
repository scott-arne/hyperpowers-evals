# Suggestion: In the plan's sortHref, `?env=${env}&sort=...` puts the env value into the URL without encoding it. That is fine only because env is checked against an allowlist first. It works, but it is a little fragile.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

In the plan's sortHref, `?env=${env}&sort=...` puts the env value into the URL without encoding it. That is fine only because env is checked against an allowlist first. It works, but it is a little fragile.
