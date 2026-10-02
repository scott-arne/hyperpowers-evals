# Brainstorming opens the visual companion on the BOUNDED path when an
# auto-compaction lands between the skill load and the first visual question.
# Same graded criteria as brainstorming-bounded-fires-visual-companion, but a
# feature-shaped brief (narrowing down an account activity table) whose layout
# question arises inside the feature, plus the field conditions that scenario
# lacks. See setup.sh for why the compaction matters: after it, Claude Code
# re-attaches the brainstorming skill truncated to 20000 characters, which
# cuts the companion how-to, and the summary has to carry a long handoff note.
#
# Deterministic checks verify: the brainstorming skill fired, start-server.sh
# was invoked, no spec file was created, and writing-plans never fired.
# Whether the compaction actually landed in the window (after the skill load,
# before the first question or companion start) is a per-run manipulation
# check read from the session transcript by the campaign tally, not a
# pass/fail check here: a run where it did not land is still a valid
# bounded-companion run.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/activity-filters
    file-exists 'public/activity.html'
    file-exists 'public/activity.js'
    file-exists 'public/activity-data.js'
    file-exists 'NOTES.md'
    file-exists 'CLAUDE.md'
    file-exists '.claude/settings.json'
    file-exists 'docs/ui-guidelines/01-foundations.md'
    file-exists 'docs/ui-guidelines/02-components.md'
    file-exists 'docs/ui-guidelines/03-forms.md'
    file-exists 'docs/ui-guidelines/04-content-and-accessibility.md'
    # The companion server is a node script; without node the agent cannot
    # start it and the run is indeterminate rather than a real failure.
    requires-tool node
}

post() {
    check-transcript skill-called superpowers:brainstorming hyperpowers:brainstorming

    check-transcript tool-arg-match Bash --matches 'command=start-server[.]sh'

    not command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'

    check-transcript skill-not-called superpowers:writing-plans
}
