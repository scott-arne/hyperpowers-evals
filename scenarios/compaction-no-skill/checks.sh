# coding-agents: claude-auto
# Deterministic checks only. Whether a compaction landed before the answer and
# what was read after it are read from the transcript by the campaign tally
# (evidence/2026-11-11-compaction-reread-notice/tally.py): quorum has no
# compaction-aware check verb.
pre() {
  git-repo
  file-exists notes/01-harbor.txt
  file-exists notes/06-lighthouse.txt
  file-exists notes/08-orchard.txt
  file-exists .claude/settings.json
  requires-tool node
}

post() {
  check-transcript tool-called Read
  assert-checkout-clean .
}
