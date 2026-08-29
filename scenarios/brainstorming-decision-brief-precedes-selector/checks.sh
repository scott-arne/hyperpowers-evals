# Brainstorming must put a consequential decision's trade-offs in chat, where
# they can be read side by side, before collecting the choice in the selection
# widget.
#
# Baseline that motivated this (2026-08-28, sonnet, 5 reps against the
# unamended skill): every rep that reached for the widget wrote no comparison
# at all beforehand -- a one-line preamble, then the widget, with each option's
# entire trade-off compressed into a single description sentence. Zero of those
# reps offered a recommendation. Two independently added a fourth option worded
# "Not sure / explain tradeoffs", i.e. the agent recognised the human could not
# evaluate the choice and offered to explain ON REQUEST rather than up front.
# The one rep that answered in prose instead of the widget spontaneously
# produced both per-option consequences and a recommendation, which is what
# identified the widget -- not the skill's question guidance -- as the thing
# collapsing the reasoning.
#
# Deterministic checks below cover only the mechanical facts: the skill fired,
# the widget was used, and the bounded path did not escalate. Whether the chat
# message actually carried per-option consequences and a recommendation is a
# semantic judgment and lives in the story's Acceptance Criteria.
#
# Claude-Code-only: AskUserQuestion is a Claude Code tool, and the whole
# scenario is about how that widget is fed.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/descriptor-normalization
    file-exists 'src/simlib/distance.py'
    file-exists 'tests/test_distance.py'
}

post() {
    check-transcript skill-called superpowers:brainstorming hyperpowers:brainstorming

    # The widget was used to collect the decision. This pins the intended
    # shape -- comparison in chat, selection in the widget -- rather than
    # merely "explained more": an agent that drops the widget for a wall of
    # prose has also lost the affordance the widget provides.
    check-transcript tool-called AskUserQuestion

    # Bounded stays bounded. Writing a comparison is not a reason to escalate
    # into spec-and-plan ceremony.
    not command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'
    check-transcript skill-not-called superpowers:writing-plans

    # NOTE: no deterministic assertion that the chat message preceded the
    # widget. `tool-before` orders tool calls against each other, and the thing
    # that must come first here is assistant prose, which is not a tool call.
    # The ordering and the substance are both graded from the ACs.
}
