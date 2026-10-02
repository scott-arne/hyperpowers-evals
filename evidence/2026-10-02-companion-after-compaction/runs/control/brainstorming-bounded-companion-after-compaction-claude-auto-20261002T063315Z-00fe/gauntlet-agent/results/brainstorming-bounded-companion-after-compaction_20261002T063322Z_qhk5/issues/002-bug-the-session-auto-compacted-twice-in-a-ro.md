# Bug: The session auto-compacted twice in a row early on, while it was still reading the guideline docs ("Skills restored (hyperpowers:brainstorming)" appeared twice, and the screen showed "0% until auto-compact"). This matches the scenario setup. After the restore, Claude went straight to terminal questions and a prose design with no visual step, so the restored skill context may have lost or weakened the companion guidance.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** fail

## Description

The session auto-compacted twice in a row early on, while it was still reading the guideline docs ("Skills restored (hyperpowers:brainstorming)" appeared twice, and the screen showed "0% until auto-compact"). This matches the scenario setup. After the restore, Claude went straight to terminal questions and a prose design with no visual step, so the restored skill context may have lost or weakened the companion guidance.
