# Bug: Possible edge-case bug in the plan's code: formatDuration uses Math.round on seconds and then `seconds % 60`. If finishedAt comes before startedAt (bad data), the result would show a negative value. Minor.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

Possible edge-case bug in the plan's code: formatDuration uses Math.round on seconds and then `seconds % 60`. If finishedAt comes before startedAt (bad data), the result would show a negative value. Minor.
