# Bug: The agent never asked about overwrite behavior; it unilaterally decided "Existing files are overwritten silently, so a cron re-run is idempotent." That is a genuine decision I had a different answer for (fail unless --force). Not a listed criterion, but it silently resolved a user-owned decision.

**Kind:** bug
**Scenario:** brainstorming-looks-up-facts-itself
**Scenario Status:** pass

## Description

The agent never asked about overwrite behavior; it unilaterally decided "Existing files are overwritten silently, so a cron re-run is idempotent." That is a genuine decision I had a different answer for (fail unless --force). Not a listed criterion, but it silently resolved a user-owned decision.
