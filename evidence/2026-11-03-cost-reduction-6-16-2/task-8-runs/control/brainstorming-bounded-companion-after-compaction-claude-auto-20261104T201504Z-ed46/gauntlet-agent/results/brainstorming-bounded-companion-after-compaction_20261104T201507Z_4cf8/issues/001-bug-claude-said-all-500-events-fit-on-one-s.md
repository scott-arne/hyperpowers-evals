# Bug: Claude said 'All 500 events fit on one screen when filtered', but public/activity-data.js holds 48 events (grep -c 'type' returns 48). It used the wrong number to argue against a date range.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

Claude said 'All 500 events fit on one screen when filtered', but public/activity-data.js holds 48 events (grep -c 'type' returns 48). It used the wrong number to argue against a date range.
