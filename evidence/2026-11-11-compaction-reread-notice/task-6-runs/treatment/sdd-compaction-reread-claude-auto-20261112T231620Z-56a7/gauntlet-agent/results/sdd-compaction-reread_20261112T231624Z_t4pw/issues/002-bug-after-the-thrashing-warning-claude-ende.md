# Bug: After the thrashing warning, Claude ended its turn and sat at an idle prompt without asking anything. A user who wasn't watching would not know the plan was abandoned, and there was no guidance beyond the generic "/clear" hint.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After the thrashing warning, Claude ended its turn and sat at an idle prompt without asking anything. A user who wasn't watching would not know the plan was abandoned, and there was no guidance beyond the generic "/clear" hint.
