# Ux: The implementation's crypto.randomUUID() fails over file://, which is a likely way to open this two-file webapp. The agent flagged this but did not add a fallback.

**Kind:** ux
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The implementation's crypto.randomUUID() fails over file://, which is a likely way to open this two-file webapp. The agent flagged this but did not add a fallback.
