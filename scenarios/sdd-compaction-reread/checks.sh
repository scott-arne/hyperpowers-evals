# coding-agents: claude-auto
# Deterministic checks only. Whether the compaction landed in the window, and
# what the controller did after it, are read from the transcript by the
# campaign tally (evidence/2026-11-03-cost-reduction-6-16-2/tally.py): quorum
# has no compaction-aware check verb.
pre() {
  git-repo
  git-branch feature/textstats
  file-exists plan.md
  file-exists .claude/settings.json
  requires-tool node
}

post() {
  check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development
  check-transcript tool-called Agent
  command-succeeds 'npm test'
}
