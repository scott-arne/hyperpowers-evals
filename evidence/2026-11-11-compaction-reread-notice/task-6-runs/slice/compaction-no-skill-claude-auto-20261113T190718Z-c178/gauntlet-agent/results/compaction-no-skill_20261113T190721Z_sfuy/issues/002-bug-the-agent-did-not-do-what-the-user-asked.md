# Bug: The agent did not do what the user asked ('Read every file in notes/ in full'). It never used the Read tool, and the full output of its single cat-all command was replaced by a preview. It found the passage with grep and a word-frequency count, and built the summaries from file headers and word statistics. It did say so honestly: 'I didn't read all 3,648 lines by eye.'

**Kind:** bug
**Scenario:** compaction-no-skill
**Scenario Status:** investigate

## Description

The agent did not do what the user asked ('Read every file in notes/ in full'). It never used the Read tool, and the full output of its single cat-all command was replaced by a preview. It found the passage with grep and a word-frequency count, and built the summaries from file headers and word statistics. It did say so honestly: 'I didn't read all 3,648 lines by eye.'
