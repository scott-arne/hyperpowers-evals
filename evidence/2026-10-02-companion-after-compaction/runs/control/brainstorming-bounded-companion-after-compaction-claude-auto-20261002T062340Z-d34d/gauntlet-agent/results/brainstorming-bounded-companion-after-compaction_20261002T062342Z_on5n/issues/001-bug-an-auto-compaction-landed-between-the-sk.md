# Bug: An auto-compaction landed between the skill load and the design ('Compacting conversation…', then 'Skills restored (hyperpowers:brainstorming)'). Afterwards the agent never treated the layout as a visual question. It went straight to one prose design with no options to compare and no companion. The visual-companion step seems to be lost or ignored after compaction (or is never triggered on the bounded path).

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** fail

## Description

An auto-compaction landed between the skill load and the design ('Compacting conversation…', then 'Skills restored (hyperpowers:brainstorming)'). Afterwards the agent never treated the layout as a visual question. It went straight to one prose design with no options to compare and no companion. The visual-companion step seems to be lost or ignored after compaction (or is never triggered on the bounded path).
