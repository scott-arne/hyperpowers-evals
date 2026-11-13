# Ux: Before reading the files one at a time, the agent first ran a big `cat` of all files in one Bash call and then a grep for the passage. The duplicate reading probably made it hit the compaction threshold sooner.

**Kind:** ux
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

Before reading the files one at a time, the agent first ran a big `cat` of all files in one Bash call and then a grep for the passage. The duplicate reading probably made it hit the compaction threshold sooner.
