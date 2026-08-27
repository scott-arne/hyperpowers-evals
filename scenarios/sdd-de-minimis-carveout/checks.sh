# SDD's de-minimis carve-out, POSITIVE path: the controller applies a fix in its
# own session instead of spending a subagent round, because the finding leaves no
# judgment — exact file, exact line, exact one-word replacement, no new logic, and
# no test asserts the string. The sibling sdd-unified-fix-loop is the negative
# control: its finding does not qualify and the controller correctly resumes the
# implementer. The finding comes from the stub CODEX GATE — SDD's task reviewer is
# a live Claude subagent no fixture can force — and the carve-out applies to
# findings of either origin. Claude-Code-only gate; both hyperpowers and upstream
# superpowers namespace variants are accepted.
#
# Keep the directive below inside the file's first 21 lines: that is the whole
# window parseCodingAgentsDirective scans, and a directive past it is silently
# ignored rather than reported, unpinning the scenario onto harnesses that have
# no Codex gate at all. The long notes therefore live beside their checks in
# post(), not in this header.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/plan-execution
    file-exists 'plan.md'
    command-succeeds 'grep -q "^\*\*Spec:\*\*" plan.md'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    # The plan names `node --test` as the task's covering command, and the
    # carve-out requires the controller to run it. A missing node is an
    # environment miss, not an agent failure — this maps it to indeterminate.
    requires-tool node
}

post() {
    # SDD skill invoked
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development

    # The implementer subagent was dispatched (an Agent call for the implementer)
    check-transcript tool-called Agent

    # The stub review gate fired
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'

    # NOTE: the carve-out's own signature — that NO subagent was spent on the fix
    # — is NOT asserted here, and the omission is deliberate. The natural verb
    # would be `not check-transcript tool-called SendMessage`, the exact mirror of
    # the sibling's positive SendMessage check. It is unsound in both directions.
    # Unsound as a pass: the capture globs every *.jsonl under the agent home,
    # including the per-subagent transcripts, so the trajectory is controller and
    # subagent calls merged flat with no source field to separate them. Unsound as
    # a fail: SendMessage has legitimate non-fix uses in SDD — answering a
    # NEEDS_CONTEXT, or replying to a DONE_WITH_CONCERNS — and a run that used it
    # for one of those while still applying the fix inline would be marked failed
    # for honoring the contract. That signal, and the ordering signals it travels
    # with (covering command BEFORE the commit, the fix report appended to the
    # task's report file, the `controller-applied (de minimis)` ledger line,
    # FIX_BASE ≠ BASE), live in the story's Acceptance Criteria, graded by the
    # Gauntlet-Agent, which can read intent rather than tool selection.

    # NOTE: no deterministic ledger check either, for the two reasons the sibling
    # scenario documents: SDD's Finish step DELETES the plan workspace once the
    # final review is clean (so a filesystem assertion passes exactly when the
    # skill stops short and fails exactly when it completes), and tool-arg-match
    # binds to one tool while the ledger may be written with Write, Edit, or Bash.

    # The scoped re-review path was exercised: review-package was called. The
    # exception waives the fix DISPATCH, not the review, so this must hold on the
    # carve-out path exactly as it does on the resume path. Full verification that
    # it carried three args with FIX_BASE ≠ BASE is a sequencing judgment the
    # Gauntlet-Agent grades.
    check-transcript tool-arg-match Bash --matches 'command=.*review-package'

    # The task's deliverable exists. Needed on its own because `not file-contains`
    # below passes vacuously on a missing file.
    file-exists 'announce.js'

    # FIXTURE PRECONDITION: the seeded misspelling really reached the tree. An
    # implementer that silently "corrected" the plan's string while transcribing
    # it retires the defect before any review runs, and every downstream signal
    # then measures nothing. Searching the file's history rather than its current
    # contents is what separates "seeded and then fixed" from "never seeded" —
    # the assertion below cannot tell those apart on its own.
    command-succeeds 'git --no-pager log -p -- announce.js | grep -q avaliable'

    # The finding was addressed: the misspelling is gone at HEAD. This is
    # necessary but not sufficient — it holds whether the controller applied the
    # fix itself or dispatched it. Which of those happened is the story's core AC.
    not file-contains 'announce.js' 'avaliable'
}
