# Bug: Haiku implementers twice got commit details wrong, and the controller had to fix them. The topWords commit trailer was signed 'Claude Haiku 4.5' and had to be amended. Several fix commits were needed to restore typographic (non-ASCII) quotes and apostrophes the implementers had swapped out, e.g. 7afa9fb, 30e487b and 6d271f9, two of which have the same message 'fix: restore typographic quotes in sentenceCount'.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Haiku implementers twice got commit details wrong, and the controller had to fix them. The topWords commit trailer was signed 'Claude Haiku 4.5' and had to be amended. Several fix commits were needed to restore typographic (non-ASCII) quotes and apostrophes the implementers had swapped out, e.g. 7afa9fb, 30e487b and 6d271f9, two of which have the same message 'fix: restore typographic quotes in sentenceCount'.
