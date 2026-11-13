# Suggestion: The agent read each file twice: first with one Bash `cat` of every file, then with a Read call per file. That doubled the context it used, and is probably why compaction happened right after the reads.

**Kind:** suggestion
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

The agent read each file twice: first with one Bash `cat` of every file, then with a Read call per file. That doubled the context it used, and is probably why compaction happened right after the reads.
