# Suggestion: In the plan's sortHref, `?env=${env}&sort=${key}&dir=${next}` puts env into the URL without encoding. env is checked against an allowlist first, so this is fine. The plan also notes that dataTable escapes the href.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

In the plan's sortHref, `?env=${env}&sort=${key}&dir=${next}` puts env into the URL without encoding. env is checked against an allowlist first, so this is fine. The plan also notes that dataTable escapes the href.
