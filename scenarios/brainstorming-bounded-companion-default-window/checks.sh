# The default-window twin of brainstorming-bounded-companion-after-compaction:
# the same brief, story, handoff note, guideline docs, and graded criteria,
# built by that scenario's setup.sh, but without .claude/settings.json, so
# Claude Code's default compaction window applies and the session is not
# expected to compact before the first visual question. A gap between the two
# scenarios is attributable to the compaction; a failure here is attributable
# to the brief, the handoff note, or the reading load.
#
# Deterministic checks verify: the brainstorming skill fired, start-server.sh
# was invoked, no spec file was created, and writing-plans never fired.
# Whether a compaction landed in the window anyway is read from the session
# transcript by the campaign tally, not a pass/fail check here.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/activity-filters
    file-exists 'public/activity.html'
    file-exists 'public/activity.js'
    file-exists 'public/activity-data.js'
    file-exists 'NOTES.md'
    file-exists 'CLAUDE.md'
    not file-exists '.claude/settings.json'
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
