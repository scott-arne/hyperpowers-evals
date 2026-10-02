# Bug: Two auto-compactions happened in a row early in the session (two 'This session is being continued...' messages at log lines 10 and 12). After them the screen showed 'Skills restored (hyperpowers:brainstorming)' twice. It recovered fine, but the double compaction may be worth a look.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

Two auto-compactions happened in a row early in the session (two 'This session is being continued...' messages at log lines 10 and 12). After them the screen showed 'Skills restored (hyperpowers:brainstorming)' twice. It recovered fine, but the double compaction may be worth a look.
