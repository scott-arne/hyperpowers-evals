# Bug: The agent's design summary says the live region would announce "Showing 12 of 50 events", but public/activity-data.js has 48 entries (grep -c "type:" returned 48). It may just be an example number, but it doesn't match the data.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

The agent's design summary says the live region would announce "Showing 12 of 50 events", but public/activity-data.js has 48 entries (grep -c "type:" returned 48). It may just be an example number, but it doesn't match the data.
