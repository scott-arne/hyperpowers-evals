# Bug: The agent's message said the page is "filtering 311 events", but public/activity-data.js has 48 entries (grep -c 'type:' returns 48). The number looks wrong. It may have been miscounted, or confused by context lost in compaction.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

The agent's message said the page is "filtering 311 events", but public/activity-data.js has 48 entries (grep -c 'type:' returns 48). The number looks wrong. It may have been miscounted, or confused by context lost in compaction.
