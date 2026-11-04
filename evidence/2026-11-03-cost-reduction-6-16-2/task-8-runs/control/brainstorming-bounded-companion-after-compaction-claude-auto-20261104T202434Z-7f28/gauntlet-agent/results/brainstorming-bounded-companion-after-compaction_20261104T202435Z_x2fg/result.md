# Test Result: brainstorming-bounded-companion-after-compaction

**Status:** investigate
**Duration:** 755.1s

## Summary

The agent loaded hyperpowers:brainstorming and read NOTES.md, the page files and the four UI guideline docs. It called the task bounded and said it would keep the design in chat with no spec file. On its own, without any visual cue from me, it ran start-server.sh, wrote placement.html with three layout options (A: filter bar, B: Filter button with a panel, C: quick group buttons) and gave me a localhost URL. I picked A. It then asked the non-visual follow-ups in the terminal, posted a design summary in chat, asked for approval and said "Status: starting commit 1". All 8 criteria pass. But after I approved, auto-compaction hit repeatedly (5 compact_boundary events in total). The agent kept re-reading the guideline docs until Claude Code stopped with "Autocompact is thrashing". No implementation code was written.

## Reasoning

All 8 acceptance criteria are met, and each is backed by log, screen or filesystem evidence. The companion opened on its own and at the right moment, even though a compaction happened between loading the skill and the first visual question. The bounded path held, with no spec or plan document. I'm reporting investigate rather than pass because the run ended with Claude Code's own "Autocompact is thrashing" warning: the agent re-read the large guideline docs after every compaction and never got to writing code. That doesn't break a criterion, since it did state it was starting implementation, but an engineer should look at it.

## Observations (5)

- **[bug]** After I approved the design, the session went into an auto-compaction loop. Each time, the agent re-read NOTES.md and the four long guideline docs, which filled the context again. Claude Code then stopped with: "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." No implementation code was written (`git diff --stat` empty). The log has 5 compact_boundary events in total.
- **[bug]** After each compaction, the brainstorming skill context re-read placement.html and waiting.html again ("Skills restored (hyperpowers:brainstorming)"). That adds context churn.
- **[ux]** The companion's scratch folder .hyperpowers/ is created inside the repo and isn't git-ignored. The agent pointed this out itself and offered to add it.
- **[ux]** The startup trust dialog and the Bypass Permissions dialog both have 'No, exit' selected by default. Claude Code also showed a 'Newer Opus model available... Currently pinned: Opus 5' prompt even though it was launched with --model claude-opus-5-5. I chose No, and the header then showed Opus 5.5.
- **[suggestion]** In its follow-up summary the agent said it would skip date range filtering, then asked anyway. When I selected it, the agent took it on without complaint. Its question about the missing shared token sheet was a good catch.
